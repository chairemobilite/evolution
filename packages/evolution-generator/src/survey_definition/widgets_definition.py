# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: The Widgets table of the survey definition: WidgetDefinition, one Pydantic model
# per row (one widget), validated on construction; and Widgets, the whole checked table,
# whose validation also runs the rules across rows (question_name unique, group naming a
# Custom or BuiltIn widget of the same section, join_with naming a neighbouring widget).
#
# The input_type decides most of a row's rules: which columns it needs, which ones it
# uses, and which parameters it accepts (see WIDGET_ALLOWED_INPUT_TYPES_BY_FIELD and
# WIDGET_ALLOWED_INPUT_TYPES_BY_PARAMETER). A column set on a row whose input type
# doesn't use it is reported, since the generator would silently drop it.
#
# This module only defines the shape and the checks; it does not read any input source.
# See survey_definition.py for the bundle of all tables, and scripts/generate_widgets.py
# for TypeScript generation.

import re
from collections.abc import Iterator, Sequence
from typing import Any, Literal, Self, get_args

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    PrivateAttr,
    RootModel,
    ValidationInfo,
    field_validator,
    model_validator,
)

from survey_definition import field_checks
from survey_definition.row_checks import (
    _collect_language_columns,
    _raise_if_check_fails,
    _strip_blanks,
)
from survey_definition.sheet_checks import (
    SheetRule,
    collect_sheet_issues,
    fields_in_survey_languages,
)
from survey_definition.validation_context import context_languages

# Field names the Widgets source must provide: the ones every row needs a value for.
# The other columns are optional: a sheet that never uses them doesn't need them. That
# includes the columns only some input types require (e.g. path, or choices for a Radio,
# see WIDGET_REQUIRED_FIELDS_BY_INPUT_TYPE) and the label columns (one per language):
# a missing one is reported by the rows that need it.
WIDGET_REQUIRED_FIELD_NAMES: tuple[str, ...] = (
    "question_name",
    "input_type",
    "active",
    "section",
)

# Prefixes of the translated columns: one per language, e.g. label::fr, label_one::en.
WIDGET_LABEL_COLUMN_PREFIX = "label::"
WIDGET_LABEL_ONE_COLUMN_PREFIX = "label_one::"

# The widget types the generator writes (see generate_widgets.py::generate_widget_statement).
WidgetInputType = Literal[
    "Custom",
    "BuiltIn",
    "Radio",
    "RadioNumber",
    "Select",
    "String",
    "Number",
    "InfoText",
    "Range",
    "Checkbox",
    "NextButton",
    "Text",
]
WIDGET_INPUT_TYPES: tuple[WidgetInputType, ...] = get_args(WidgetInputType)
# The sheet may write an input type in any case, e.g. Builtin: it is read as BuiltIn.
_INPUT_TYPE_BY_LOWER_CASE = {
    input_type.lower(): input_type for input_type in WIDGET_INPUT_TYPES
}

# The true/false columns. A spreadsheet sometimes turns TRUE/FALSE into 1/0 (e.g.
# LibreOffice), so 1 and 0 are read as true and false; other values stay errors.
_BOOLEAN_FIELD_NAMES = (
    "active",
    "contains_html",
    "two_columns",
    "include_not_applicable",
)

# The text columns of an inactive widget: a value of another type is dropped rather
# than reported, as an inactive widget isn't checked (see _readable_values).
_INACTIVE_WIDGET_TEXT_FIELD_NAMES = (
    "group",
    "path",
    "conditional",
    "validation",
    "choices",
    "help_popup",
    "confirm_popup",
    "input_range",
    "custom_path",
    "custom_choice",
    "default_value",
    "comments",
)

# Widgets written by hand (customWidgets.tsx) or taken from Evolution: the generator only
# exports them, so most columns don't apply. Their path, conditional and choices are still
# read by the questionnaire documentation and UI tests scripts.
HAND_WRITTEN_INPUT_TYPES: frozenset[WidgetInputType] = frozenset({"Custom", "BuiltIn"})

# The input types whose unused columns and parameters are a warning, not an error, and
# aren't checked: a widget made Custom often keeps the values it had before (copied to
# customWidgets.tsx), for the day it can be generated again.
_INPUT_TYPES_KEEPING_UNUSED_COLUMNS: frozenset[WidgetInputType] = frozenset({"Custom"})

# Widgets the generator writes as a question: they save an answer at their path.
QUESTION_INPUT_TYPES: frozenset[WidgetInputType] = frozenset(
    {"Radio", "RadioNumber", "Select", "String", "Number", "Range", "Checkbox", "Text"}
)

# Widgets the generator writes with a label (or a text, for InfoText).
LABELLED_INPUT_TYPES: frozenset[WidgetInputType] = (
    frozenset(WIDGET_INPUT_TYPES) - HAND_WRITTEN_INPUT_TYPES
)

# Which input types can use each optional column, e.g. only a Range can fill
# input_range. The generator silently drops a column its input type doesn't use, so
# filling one is reported as an error instead. A true/false column only counts when
# true. Columns not listed here (group, path, conditional, labels, ...) fit every type.
WIDGET_ALLOWED_INPUT_TYPES_BY_FIELD: dict[str, frozenset[WidgetInputType]] = {
    # The list of choices; the "additional choices" of a RadioNumber.
    "choices": frozenset({"Radio", "RadioNumber", "Select", "Checkbox"})
    | HAND_WRITTEN_INPUT_TYPES,
    # Only a question has an answer to validate, a help popup, two columns and can be
    # joined with its neighbour (appearance: join_with).
    "validation": QUESTION_INPUT_TYPES,
    "help_popup": QUESTION_INPUT_TYPES,
    "two_columns": QUESTION_INPUT_TYPES,
    "appearance": QUESTION_INPUT_TYPES,
    # The popup asking to confirm before going to the next section.
    "confirm_popup": frozenset({"NextButton"}),
    # The slider configuration, and its "not applicable" checkbox.
    "input_range": frozenset({"Range"}),
    "include_not_applicable": frozenset({"Range"}),
    # The "Other, specify" text input. Only generate_radio_widget writes them. A
    # Checkbox could have a custom_path too (InputCheckbox.tsx shows a text input
    # under its choices), but its type, InputCheckboxType, has no customPath yet.
    "custom_path": frozenset({"Radio"}),
    "custom_choice": frozenset({"Radio"}),
    # Only generate_string_widget writes a defaultValue.
    "default_value": frozenset({"String"}),
}

# The columns each input type requires, besides the ones every row requires.
WIDGET_REQUIRED_FIELDS_BY_INPUT_TYPE: dict[WidgetInputType, tuple[str, ...]] = {
    "Radio": ("choices",),
    "Select": ("choices",),
    "Checkbox": ("choices",),
    "Range": ("input_range",),
}

# The input types that use each parameter of the parameters column, by its name in the
# sheet; a parameter set on a row of another input type is reported.
WIDGET_ALLOWED_INPUT_TYPES_BY_PARAMETER: dict[str, frozenset[WidgetInputType]] = {
    "customLabels": LABELLED_INPUT_TYPES,
    "builtInFunction": frozenset({"BuiltIn"}),
    "min": frozenset({"RadioNumber"}),
    "max": frozenset({"RadioNumber"}),
    "overMaxAllowed": frozenset({"RadioNumber"}),
    "formatter": frozenset({"String"}),
    "suffixLabel": frozenset({"String", "Number"}),
}

# A parameter name may be written in any case, e.g. Max is read as max.
_PARAMETER_BY_LOWER_CASE = {
    name.lower(): name for name in WIDGET_ALLOWED_INPUT_TYPES_BY_PARAMETER
}

# The parameters each input type requires. BuiltIn will require builtInFunction once the
# generator writes BuiltIn widgets: for now it only writes a placeholder comment (see
# generate_widgets.py::generate_built_in_widget).
WIDGET_REQUIRED_PARAMETERS_BY_INPUT_TYPE: dict[WidgetInputType, tuple[str, ...]] = {
    "RadioNumber": ("min", "max"),
}

# Most numbers a RadioNumber widget may show (max - min + 1): each one is a button, so a
# wide range makes the question unusable.
RADIO_NUMBER_MAX_CHOICES = 20

# TODO: BUILT_IN_VALIDATIONS and BUILT_IN_FORMATTERS (and the BuiltIn widgets, once
# the generator writes them) are copied from Evolution by hand, so they can go out of
# date when Evolution adds or renames one. Read them from Evolution instead.
# The validations exported by Evolution, written as validations.<name>, see
# evolution-common/src/services/widgets/validations/validations.ts. Any other validation
# must end with 'CustomValidation' and be in the survey's customValidations.tsx.
BUILT_IN_VALIDATIONS: frozenset[str] = frozenset(
    {
        "requiredValidation",
        "optionalValidation",
        "inputRangeValidation",
        "householdSizeValidation",
        "ageValidation",
        "emailValidation",
        "phoneValidation",
        "postalCodeValidation",
        "accessCodeValidation",
        "carNumberValidation",
        "bicycleNumberValidation",
        "twoWheelNumberValidation",
    }
)

# The formatters exported by Evolution, written as formatters.<name>, see
# evolution-common/src/utils/formatters.ts. Any other formatter must end with
# 'CustomFormatter' and be in the survey's customFormatters.tsx.
BUILT_IN_FORMATTERS: frozenset[str] = frozenset(
    {
        "accessCodeFormatter",
        "eightDigitsAccessCodeFormatter",
        "canadianPostalCodeFormatter",
    }
)

# A name in double braces, e.g. {{personSchoolTypeCustomLabels}}.
_BRACED_NAME_PATTERN = re.compile(r"\{\{(.+)\}\}")
# A question name in ${...}, e.g. ${contactEmail}.
_DOLLAR_NAME_PATTERN = re.compile(r"\$\{(.+)\}")
# A translation key with its namespace, e.g. home:home.size.valueSuffix.
_SUFFIX_LABEL_PATTERN = re.compile(r"[^:\s]+:[^:\s]+")
_INTEGER_PATTERN = re.compile(r"-?\d+")
_DECIMAL_PATTERN = re.compile(r"-?\d+\.\d+")


def _is_inactive(info: ValidationInfo) -> bool:
    """Whether the row being validated is inactive (`active` is validated first)."""
    return info.data.get("active") is False


def _is_ignored(info: ValidationInfo) -> bool:
    """
    Whether the column being validated is one a Custom widget doesn't use (see
    _INPUT_TYPES_KEEPING_UNUSED_COLUMNS): it is a warning, so its value isn't checked
    (`input_type` is validated before it).
    """
    input_types = WIDGET_ALLOWED_INPUT_TYPES_BY_FIELD.get(info.field_name)
    input_type = info.data.get("input_type")
    return (
        input_types is not None
        and input_type in _INPUT_TYPES_KEEPING_UNUSED_COLUMNS
        and input_type not in input_types
    )


def _readable_values(data: dict) -> dict:
    """
    The cells of an inactive row the generator can still read: a value of another
    type than its column's (e.g. a number in a text column) is dropped, as an inactive
    row isn't checked.
    """
    readable = {}
    for key, value in data.items():
        if key in _INACTIVE_WIDGET_TEXT_FIELD_NAMES and not isinstance(value, str):
            continue
        if key in _BOOLEAN_FIELD_NAMES and not isinstance(value, bool):
            continue
        if key in ("label", "label_one"):
            value = {
                language: text
                for language, text in value.items()
                if isinstance(text, str)
            }
        readable[key] = value
    return readable


def _name_in(pattern: re.Pattern[str], value: str) -> str | None:
    """The TypeScript identifier wrapped by `pattern` in `value`, e.g. 'someName' in '{{someName}}'; None if there is none."""
    match = pattern.fullmatch(value)
    if match and field_checks.valid_ts_identifier(match.group(1), {}):
        return match.group(1)
    return None


def _is_set(value: Any) -> bool:
    """Whether a value is set: not None, and not False for a true/false value (0 is set)."""
    return value is not None and value is not False


def _split_options(text: str) -> list[tuple[str, str | None]]:
    """
    Split a parameters or appearance cell into its (name, value) options, separated by
    new lines, ';' or spaces, e.g. "min=0\\nmax=5\\noverMaxAllowed" gives
    [("min", "0"), ("max", "5"), ("overMaxAllowed", None)]. The value is None for an
    option without '='.
    """
    options = []
    for option in re.split(r"[\s;]+", text.strip()):
        if option:
            name, separator, value = option.partition("=")
            options.append((name, value if separator else None))
    return options


class WidgetParameters(BaseModel):
    """
    The parameters column of a Widgets row, parsed: one attribute per parameter, None
    (False for overMaxAllowed) when not set. Which input types use each parameter is in
    WIDGET_ALLOWED_INPUT_TYPES_BY_PARAMETER, checked by WidgetDefinition.

    Attributes:
        custom_labels: Name of the function of customLabels.tsx that writes the label
            instead of the label columns (`customLabels={{someCustomLabels}}`).
        built_in_function: Name of the Evolution function that builds a BuiltIn widget
            (`builtInFunction={{someFunction}}`). Optional for now: the generator
            doesn't write BuiltIn widgets yet.
        min: Smallest number of a RadioNumber widget: a whole number, or the response
            path of the number to use, from the root of the response and without
            placeholders such as {_activePersonId} (`min=0`, `min=household.size`).
        max: Largest number of a RadioNumber widget, written like min.
        over_max_allowed: Whether a RadioNumber widget adds a "max or more" choice
            (`overMaxAllowed`, without a value).
        formatter: Function that formats a String widget's input as it is typed
            (`formatter=canadianPostalCodeFormatter`): one of BUILT_IN_FORMATTERS, or a
            name ending with 'CustomFormatter'.
        suffix_label: Translation key, with its namespace, of the text shown after a
            String or Number input (`suffixLabel=home:home.size.valueSuffix`).
    """

    model_config = ConfigDict(strict=True, validate_by_name=True, frozen=True)

    custom_labels: str | None = Field(default=None, alias="customLabels")
    built_in_function: str | None = Field(default=None, alias="builtInFunction")
    min: int | str | None = None
    max: int | str | None = None
    over_max_allowed: bool = Field(default=False, alias="overMaxAllowed")
    formatter: str | None = None
    suffix_label: str | None = Field(default=None, alias="suffixLabel")

    def names_set(self) -> list[str]:
        """The names, as written in the sheet, of the parameters set."""
        return [
            self.__class__.model_fields[field_name].alias or field_name
            for field_name in self.__class__.model_fields
            if _is_set(getattr(self, field_name))
        ]

    @classmethod
    def parse(
        cls, text: str, input_type: WidgetInputType | None = None
    ) -> "WidgetParameters":
        """
        Parse a parameters cell; raise ValueError listing every invalid parameter. A
        parameter a Custom widget doesn't use is a warning (see
        _INPUT_TYPES_KEEPING_UNUSED_COLUMNS), so its value is kept as written, unchecked.
        """
        values: dict[str, Any] = {}
        issues = []
        for written_name, value in _split_options(text):
            name = _PARAMETER_BY_LOWER_CASE.get(written_name.lower(), written_name)
            if name not in WIDGET_ALLOWED_INPUT_TYPES_BY_PARAMETER:
                issues.append(
                    f"unknown parameter {name!r}, expected one of "
                    f"{list(WIDGET_ALLOWED_INPUT_TYPES_BY_PARAMETER)}"
                )
            elif name in values:
                issues.append(f"parameter {name!r} is set more than once")
            else:
                try:
                    values[name] = _parameter_value(name, value)
                except ValueError as error:
                    if (
                        input_type in _INPUT_TYPES_KEEPING_UNUSED_COLUMNS
                        and input_type
                        not in WIDGET_ALLOWED_INPUT_TYPES_BY_PARAMETER[name]
                    ):
                        values[name] = True if name == "overMaxAllowed" else value
                    else:
                        issues.append(str(error))
        if issues:
            raise ValueError("; ".join(issues))
        return cls(**values)


def _parameter_value(name: str, value: str | None) -> Any:
    """The value of the parameter `name`, written `value` in the sheet; raise ValueError when invalid."""
    if name == "overMaxAllowed":
        if value is not None:
            raise ValueError(
                "overMaxAllowed takes no value: write overMaxAllowed alone"
            )
        return True
    if not value:
        raise ValueError(f"parameter {name!r} needs a value, e.g. {name}=...")
    if name in ("customLabels", "builtInFunction"):
        braced_name = _name_in(_BRACED_NAME_PATTERN, value)
        if braced_name is None:
            raise ValueError(f"{name} must be written {name}={{{{someName}}}}")
        return braced_name
    if name in ("min", "max"):
        if _INTEGER_PATTERN.fullmatch(value):
            return int(value)
        # A decimal such as 1.5 is also written like a path of two keys.
        # The generator reads the path with surveyHelper.getResponse, from the root of
        # the response, which doesn't replace a {placeholder} or ${...} token.
        if (
            not _DECIMAL_PATTERN.fullmatch(value)
            and "{" not in value
            and field_checks.valid_response_path(value, {})
        ):
            return value
        raise ValueError(
            f"{name} must be a whole number or a response path without "
            f"placeholders, e.g. household.size, got {value!r}"
        )
    if name == "formatter":
        if value in BUILT_IN_FORMATTERS or (
            value.endswith("CustomFormatter")
            and field_checks.valid_ts_identifier(value, {})
        ):
            return value
        raise ValueError(
            f"formatter {value!r} must be one of {sorted(BUILT_IN_FORMATTERS)}, or a "
            "name ending with 'CustomFormatter'"
        )
    # suffixLabel
    if not _SUFFIX_LABEL_PATTERN.fullmatch(value):
        raise ValueError(
            f"suffixLabel must be written suffixLabel=namespace:key, got {value!r}"
        )
    return value


class WidgetAppearance(BaseModel):
    """
    The appearance column of a Widgets row, parsed. Only question widgets use it (see
    WIDGET_ALLOWED_INPUT_TYPES_BY_FIELD).

    Attributes:
        join_with: question_name of the widget shown in the same box as this one
            (`join_with=${contactEmail}`), e.g. the fields of an address. It must be the
            widget just before or after this one in its section (see Widgets).
    """

    model_config = ConfigDict(strict=True, frozen=True)

    join_with: str | None = None

    @classmethod
    def parse(cls, text: str) -> "WidgetAppearance":
        """Parse an appearance cell; raise ValueError listing every invalid option."""
        values: dict[str, Any] = {}
        issues = []
        for name, value in _split_options(text):
            if name != "join_with":
                issues.append(f"unknown appearance {name!r}, expected 'join_with'")
            elif name in values:
                issues.append("join_with is set more than once")
            else:
                question_name = _name_in(_DOLLAR_NAME_PATTERN, value or "")
                if question_name is not None:
                    values[name] = question_name
                else:
                    issues.append(
                        "join_with must be written join_with=${questionName}, "
                        f"got {value!r}"
                    )
        if issues:
            raise ValueError("; ".join(issues))
        return cls(**values)


class WidgetDefinition(BaseModel):
    """
    One row of the Widgets table: one widget of a section, validated on construction.

    Input: one row's fields, as keyword arguments or a dict, keyed by the sheet's
        column names (e.g. `WidgetDefinition(**row)`, one row of the "Widgets" sheet).
        A blank or whitespace-only cell is treated as an absent value.
    Output: a validated instance if every rule passes (see Attributes below);
        otherwise raises `pydantic.ValidationError` naming every field that failed.

    Build instances through `Widgets(rows)` (below), which also checks the rules across
    rows (unique `question_name`, `group`, `join_with`, no label in another language).
    What a row can't know by itself comes from the validation context (see
    validation_context.py): the survey languages, and the names of the other tables
    (`section_names`, `conditional_names`, `choice_values_by_name`,
    `input_range_names`). A name missing from the context isn't checked, e.g. when that
    table is invalid and already reported. Validation is strict: no type coercion
    (e.g. the string "yes" or "VRAI" is rejected for `active`), except for what a
    spreadsheet may have changed: a number in a label, `custom_choice` or
    `default_value` is read as text, and 1 and 0 as true and false. The input type and
    the parameter names may be written in any case (e.g. Builtin, Max).

    Attributes:
        question_name: Name of this widget: the exported const of widgets.tsx, its key
            in widgetsNames.ts and its translation key. Required; must be a valid
            TypeScript identifier and unique across the table.
        input_type: The kind of widget (see WidgetInputType). Required. It decides
            which other columns are required or used (see
            WIDGET_ALLOWED_INPUT_TYPES_BY_FIELD).
        active: Whether the widget is in the survey; an inactive one is left commented
            out. Required.
        section: The section this widget is in. Required; must name a section of the
            Sections table.
        group: question_name of the group widget this widget is repeated in, for each
            person, trip, ..., e.g. householdMembers (Custom) or personTrips (BuiltIn,
            from Evolution). Blank means not in a group. Must name a Custom or BuiltIn
            widget of the same section.
        path: Response path where the answer is saved, relative to the group's path
            in a group, e.g. 'age' or 'household.persons.{_activePersonId}.age'.
            Required unless `input_type` is Custom or BuiltIn.
        label: The label (the text, for InfoText) by language, read from the
            `label::<language>` columns. Required in every survey language, except
            for Custom and BuiltIn widgets and when the customLabels parameter is set.
        label_one: Singular label, by language, read from the `label_one::<language>`
            columns, used for a single person. Optional, but when set, it must be in
            every survey language too.
        parameters: The options of the input type (see WidgetParameters), written
            `name=value` and separated by new lines, ';' or spaces.
        appearance: How the widget is shown (see WidgetAppearance).
        conditional: Name of the conditional that decides whether this widget is shown.
            Blank means always shown. Must be a valid TypeScript identifier and, unless
            it ends with 'CustomConditional', in the Conditionals table.
        validation: Name of the validation of the answer: one of BUILT_IN_VALIDATIONS,
            or a name ending with 'CustomValidation'. Blank means requiredValidation.
        choices: Name of the list of choices: a choicesName of the Choices table, or a
            name ending with 'CustomChoices' (customChoices.tsx). Required for Radio,
            Select and Checkbox; the additional choices of a RadioNumber.
        help_popup: Name of the help popup of customHelpPopup.tsx shown with a question.
        confirm_popup: Name of the popup of customHelpPopup.tsx a NextButton shows to
            confirm before going on.
        input_range: Name of the slider configuration of a Range widget. Required for
            Range; must be an input_range_name of the InputRange table.
        contains_html: Whether the label contains HTML to render. Blank means false.
        two_columns: Whether a question is shown on two columns. Blank means false.
        custom_path: Response path where a Radio saves the text typed for its
            `custom_choice` (e.g. 'Other, specify'). Set with `custom_choice`.
        custom_choice: The choice value of a Radio that shows a text input, e.g.
            'other'. Set with `custom_path`; must be a value of its `choices` list.
        default_value: Value a String widget starts with.
        include_not_applicable: Whether a Range adds a "not applicable" checkbox.
            Blank means false.
        comments: Note about this widget, written as a comment above it in widgets.tsx.
    """

    # strict=True: see SectionDefinition.
    model_config = ConfigDict(strict=True)

    @model_validator(mode="before")
    @classmethod
    def _strip_blank_cells(cls, data: Any) -> Any:
        """Treat a blank/whitespace-only cell as an absent key, gather the label columns, and read the cells a spreadsheet may have changed (see below)."""
        if not isinstance(data, dict):
            return data
        data = _collect_language_columns(
            _strip_blanks(data), "label_one", WIDGET_LABEL_ONE_COLUMN_PREFIX
        )
        data = _collect_language_columns(data, "label", WIDGET_LABEL_COLUMN_PREFIX)
        # A spreadsheet stores a value like 97 or 1.5 as a number.
        for field_name in ("custom_choice", "default_value"):
            value = data.get(field_name)
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                data[field_name] = str(value)
        # 1 and 0 are true and false (type() is int: True is also an int in Python).
        for field_name in _BOOLEAN_FIELD_NAMES:
            value = data.get(field_name)
            if type(value) is int and value in (0, 1):
                data[field_name] = bool(value)
        input_type = data.get("input_type")
        if isinstance(input_type, str):
            data["input_type"] = _INPUT_TYPE_BY_LOWER_CASE.get(
                input_type.lower(), input_type
            )
        if data.get("active") is False:
            data = _readable_values(data)
        return data

    # No default: a blank value here is a genuinely missing required value. `active`
    # comes first: the field validators below read it (info.data) to skip the checks
    # of an inactive row.
    active: bool
    question_name: str
    input_type: WidgetInputType
    section: str

    group: str | None = None
    path: str | None = None
    label: dict[str, str] = {}
    label_one: dict[str, str] = {}
    parameters: WidgetParameters = Field(default_factory=WidgetParameters)
    appearance: WidgetAppearance = Field(default_factory=WidgetAppearance)
    conditional: str | None = None
    validation: str | None = None
    choices: str | None = None
    help_popup: str | None = None
    confirm_popup: str | None = None
    input_range: str | None = None
    contains_html: bool = False
    two_columns: bool = False
    custom_path: str | None = None
    custom_choice: str | None = None
    default_value: str | None = None
    include_not_applicable: bool = False
    comments: str | None = None

    # The problems that don't reject the row (see `warnings`).
    _warnings: list[str] = PrivateAttr(default_factory=list)

    @property
    def warnings(self) -> list[str]:
        """
        The columns and parameters set on a Custom widget that it doesn't use: the
        generator ignores them, and a widget made Custom often keeps the values it had
        before, for later, so they are warnings (see
        _INPUT_TYPES_KEEPING_UNUSED_COLUMNS). On another input type, they are errors.
        """
        return self._warnings

    @field_validator("parameters", mode="before")
    @classmethod
    def _parse_parameters(cls, value: Any, info: ValidationInfo) -> Any:
        """Parse the parameters cell into WidgetParameters (none, on an inactive row they don't parse)."""
        if not isinstance(value, str):
            return value
        try:
            return WidgetParameters.parse(value, info.data.get("input_type"))
        except ValueError:
            if _is_inactive(info):
                return WidgetParameters()
            raise

    @field_validator("appearance", mode="before")
    @classmethod
    def _parse_appearance(cls, value: Any, info: ValidationInfo) -> Any:
        """Parse the appearance cell into WidgetAppearance (none, on an inactive row it doesn't parse)."""
        if not isinstance(value, str):
            return value
        try:
            return WidgetAppearance.parse(value)
        except ValueError:
            if _is_inactive(info):
                return WidgetAppearance()
            if _is_ignored(info):
                # Kept as written, unchecked: only its warning is reported.
                return WidgetAppearance(join_with=value.strip())
            raise

    # A conditional is only checked as a name here, not for its 'Conditional' suffix:
    # whether a conditional must end with 'Conditional' is still open, for the
    # Conditionals sheet and every reference to it alike (see
    # chairemobilite/evolution#2157). Apply the rule decided there to `conditional` too.
    @field_validator(
        "question_name",
        "group",
        "conditional",
        "choices",
        "help_popup",
        "confirm_popup",
        "input_range",
    )
    @classmethod
    def _name_is_valid_identifier(
        cls, value: str | None, info: ValidationInfo
    ) -> str | None:
        """Check that a name used in the TypeScript code is a valid identifier."""
        if value is not None and not _is_inactive(info) and not _is_ignored(info):
            _raise_if_check_fails(field_checks.valid_ts_identifier, value, info.data)
        return value

    @field_validator("path", "custom_path")
    @classmethod
    def _path_is_valid(cls, value: str | None, info: ValidationInfo) -> str | None:
        """Check that a non-blank `path`/`custom_path` is a response path."""
        if value is not None and not _is_inactive(info) and not _is_ignored(info):
            _raise_if_check_fails(field_checks.valid_response_path, value, info.data)
        return value

    @field_validator("validation")
    @classmethod
    def _validation_name_is_valid(
        cls, value: str | None, info: ValidationInfo
    ) -> str | None:
        """Check that a non-blank `validation` is built in, or a custom validation."""
        if (
            value is None
            or value in BUILT_IN_VALIDATIONS
            or _is_inactive(info)
            or _is_ignored(info)
        ):
            return value
        if value.endswith("CustomValidation") and field_checks.valid_ts_identifier(
            value, {}
        ):
            return value
        raise ValueError(
            f"Must be one of {sorted(BUILT_IN_VALIDATIONS)}, or a name ending with "
            "'CustomValidation'"
        )

    # One "after" validator for every rule between fields or needing the context:
    # Pydantic stops at the first failing one, so a second would hide its problems.
    @model_validator(mode="after")
    def _widget_is_complete(self, info: ValidationInfo) -> Self:
        """
        Check the rules the input type decides (required and unused columns and
        parameters, RadioNumber range), the labels, and the names of the other tables.
        On a Custom widget, an unused column or parameter is a warning instead (see
        _INPUT_TYPES_KEEPING_UNUSED_COLUMNS). An inactive row isn't checked: it isn't
        in the survey, and may be kept as it was on purpose.
        """
        if not self.active:
            return self
        unused = [*self._unused_fields(), *self._unused_parameters()]
        if self.input_type in _INPUT_TYPES_KEEPING_UNUSED_COLUMNS:
            self._warnings = [f"{message}: it is ignored" for message in unused]
            unused = []
        issues = [
            *self._input_type_issues(),
            *unused,
            *self._parameters_issues(),
            *self._label_issues(info),
            *self._other_table_issues(info.context or {}),
        ]
        if issues:
            raise ValueError("; ".join(issues))
        return self

    def _uses(self, field_name: str) -> bool:
        """Whether this widget's input type uses the column (see WIDGET_ALLOWED_INPUT_TYPES_BY_FIELD)."""
        return self.input_type in WIDGET_ALLOWED_INPUT_TYPES_BY_FIELD[field_name]

    def _field_is_set(self, field_name: str) -> bool:
        """Whether a column is set: not blank, and true for a true/false column."""
        if field_name == "appearance":
            return self.appearance.join_with is not None
        return _is_set(getattr(self, field_name))

    def _input_type_issues(self) -> list[str]:
        """Check the columns the input type requires."""
        issues = []
        if self.path is None and self.input_type not in HAND_WRITTEN_INPUT_TYPES:
            issues.append(f"path is required for input_type {self.input_type!r}")
        issues.extend(
            f"{field_name} is required for input_type {self.input_type!r}"
            for field_name in WIDGET_REQUIRED_FIELDS_BY_INPUT_TYPE.get(
                self.input_type, ()
            )
            if not self._field_is_set(field_name)
        )
        if self._uses("custom_path") and (self.custom_path is None) != (
            self.custom_choice is None
        ):
            issues.append("custom_path and custom_choice must be set together")
        return issues

    def _ignores(self, field_name: str) -> bool:
        """Whether this is a Custom widget that doesn't use the column: its value isn't checked (see _INPUT_TYPES_KEEPING_UNUSED_COLUMNS)."""
        return (
            self.input_type in _INPUT_TYPES_KEEPING_UNUSED_COLUMNS
            and not self._uses(field_name)
        )

    def _unused_fields(self) -> list[str]:
        """The columns set that the input type doesn't use (see WIDGET_ALLOWED_INPUT_TYPES_BY_FIELD)."""
        return [
            f"{field_name} is not used by input_type {self.input_type!r} (only by "
            f"{sorted(input_types)})"
            for field_name, input_types in WIDGET_ALLOWED_INPUT_TYPES_BY_FIELD.items()
            if self._field_is_set(field_name) and not self._uses(field_name)
        ]

    def _unused_parameters(self) -> list[str]:
        """The parameters set that the input type doesn't use (see WIDGET_ALLOWED_INPUT_TYPES_BY_PARAMETER)."""
        return [
            f"parameter {name!r} is not used by input_type {self.input_type!r} (only "
            f"by {sorted(WIDGET_ALLOWED_INPUT_TYPES_BY_PARAMETER[name])})"
            for name in self.parameters.names_set()
            if self.input_type not in WIDGET_ALLOWED_INPUT_TYPES_BY_PARAMETER[name]
        ]

    def _parameters_issues(self) -> list[str]:
        """Check the parameters the input type requires, and the RadioNumber range."""
        names_set = self.parameters.names_set()
        issues = [
            f"parameter {name!r} is required for input_type {self.input_type!r}"
            for name in WIDGET_REQUIRED_PARAMETERS_BY_INPUT_TYPE.get(
                self.input_type, ()
            )
            if name not in names_set
        ]
        # A response path is only known in the interview, so only two numbers are compared.
        minimum, maximum = self.parameters.min, self.parameters.max
        if isinstance(minimum, int) and isinstance(maximum, int):
            if minimum >= maximum:
                issues.append(
                    f"parameter min ({minimum}) must be less than max ({maximum})"
                )
            elif maximum - minimum + 1 > RADIO_NUMBER_MAX_CHOICES:
                issues.append(
                    f"parameters min ({minimum}) and max ({maximum}) give "
                    f"{maximum - minimum + 1} choices, more than the "
                    f"{RADIO_NUMBER_MAX_CHOICES} a RadioNumber may show"
                )
        return issues

    def _label_issues(self, info: ValidationInfo) -> list[str]:
        """Check that the label is in every survey language where needed, and label_one too when set."""
        label_is_required = (
            self.input_type in LABELLED_INPUT_TYPES
            and self.parameters.custom_labels is None
        )
        if not label_is_required and not self.label and not self.label_one:
            return []
        # The languages are only read here, so a row without any label needs none.
        languages = context_languages(info)
        issues = []
        if label_is_required:
            issues.extend(
                f"{WIDGET_LABEL_COLUMN_PREFIX}{language} is required"
                for language in languages
                if language not in self.label
            )
        elif self.label:
            issues.extend(
                f"{WIDGET_LABEL_COLUMN_PREFIX}{language} is required when label is "
                "set in another language"
                for language in languages
                if language not in self.label
            )
        if self.label_one:
            issues.extend(
                f"{WIDGET_LABEL_ONE_COLUMN_PREFIX}{language} is required when "
                "label_one is set in another language"
                for language in languages
                if language not in self.label_one
            )
        return issues

    def _other_table_issues(self, context: dict) -> list[str]:
        """
        Check that the section, conditional, choices, custom_choice and input_range
        name rows of the other tables, from the validation context. A column a Custom
        widget doesn't use is a warning, so its value isn't checked.
        """
        issues = []
        section_names = context.get("section_names")
        if section_names is not None and self.section not in section_names:
            issues.append(
                f"section {self.section!r} does not match any section of the "
                "Sections table"
            )
        # A name ending with 'CustomConditional' is written by hand in
        # customConditionals.tsx, so it isn't in the Conditionals table. The suffix is
        # case-sensitive, as in the code the generator writes (generate_conditional);
        # only 'CustomChoices' is read in any case there.
        conditional_names = context.get("conditional_names")
        if (
            conditional_names is not None
            and self.conditional is not None
            and not self.conditional.endswith("CustomConditional")
            and self.conditional not in conditional_names
        ):
            issues.append(
                f"conditional {self.conditional!r} does not match any "
                "conditional_name of the Conditionals table"
            )
        # Likewise, a name ending with 'CustomChoices' is in customChoices.tsx. The
        # generator reads that suffix in any case (see generate_widgets.py), so does this.
        choice_values_by_name = context.get("choice_values_by_name")
        if (
            choice_values_by_name is not None
            and self.choices is not None
            and not self._ignores("choices")
            and not self.choices.lower().endswith("customchoices")
        ):
            if self.choices not in choice_values_by_name:
                issues.append(
                    f"choices {self.choices!r} does not match any choicesName of the "
                    "Choices table"
                )
            elif (
                self.custom_choice is not None
                and not self._ignores("custom_choice")
                and self.custom_choice not in choice_values_by_name[self.choices]
            ):
                issues.append(
                    f"custom_choice {self.custom_choice!r} does not match any value "
                    f"of the {self.choices!r} choices"
                )
        input_range_names = context.get("input_range_names")
        if (
            input_range_names is not None
            and self.input_range is not None
            and not self._ignores("input_range")
            and self.input_range not in input_range_names
        ):
            issues.append(
                f"input_range {self.input_range!r} does not match any "
                "input_range_name of the InputRange table"
            )
        return issues


def _unique_question_names(
    rows: Sequence[tuple[int, WidgetDefinition]], table_name: str
) -> list[str]:
    """
    Sheet rule: a question_name is used by one row only, except a Custom or BuiltIn
    widget, which may be listed again in other sections (e.g. Evolution's
    activePersonTitle, at the top of each section about a person).

    widgetsConfigs.tsx gathers the widgets of every section in one object, keyed by
    question_name. A Custom or BuiltIn widget repeated in another section is the same
    hand-written widget each time, so it is fine. A widget the generator writes,
    repeated, would be two different widgets with one name: the last one would replace
    the other. So would a widget listed twice in the same section, or a name used by
    widgets of different input types. An inactive widget isn't counted: it isn't in
    the survey (e.g. an older version of a widget, kept on purpose).
    """
    rows_by_name: dict[str, list[tuple[int, WidgetDefinition]]] = {}
    for row_number, widget in _active_rows(rows):
        rows_by_name.setdefault(widget.question_name, []).append((row_number, widget))
    issues = []
    for name, found in rows_by_name.items():
        if len(found) < 2:
            continue
        widgets = [widget for _, widget in found]
        sections = [widget.section for widget in widgets]
        if (
            widgets[0].input_type in HAND_WRITTEN_INPUT_TYPES
            and all(widget.input_type == widgets[0].input_type for widget in widgets)
            and len(set(sections)) == len(sections)
        ):
            continue
        issues.append(
            f"Error in {table_name} - Duplicate question_name {name!r}: found in rows "
            f"{[row_number for row_number, _ in found]}. Only a Custom or BuiltIn "
            "widget may be repeated, once per section, with the same input_type."
        )
    return issues


def _active_rows(
    rows: Sequence[tuple[int, WidgetDefinition]],
) -> list[tuple[int, WidgetDefinition]]:
    """The rows of active widgets: an inactive one isn't checked."""
    return [(row_number, widget) for row_number, widget in rows if widget.active]


def _for_active_rows(rule: SheetRule) -> SheetRule:
    """A sheet rule run on the rows of active widgets only."""
    return lambda rows, table_name: rule(_active_rows(rows), table_name)


class Widgets(RootModel[list[WidgetDefinition]]):
    """
    The whole Widgets sheet: a list of WidgetDefinition that has passed every check,
    the ones on each row and the ones across rows (see its model validators).

    Input: a list (or tuple/set/frozenset) of rows, each either a raw dict (e.g. every
        row of the "Widgets" sheet, as read from Excel) or an already-built
        WidgetDefinition.
    Output: a validated instance — iterable, indexable, `len()`-able, one
        WidgetDefinition per row in source order — if the whole sheet passes every
        rule; otherwise raises `pydantic.ValidationError`. Its message lists every row
        problem, repeated question_name and label in another language at once;
        `group` and `join_with` are only checked once those pass.

    An instance only exists if the sheet is valid, so whatever holds one doesn't need
    to check it again.
    """

    @model_validator(mode="wrap")
    @classmethod
    def _collect_all_issues(cls, rows: Any, handler, info: ValidationInfo) -> Any:
        # See Sections._collect_all_issues: this runs every row's checks up front and
        # raises one error listing every problem, instead of stopping at the first.
        if isinstance(rows, (list, tuple, set, frozenset)):
            rows = list(rows)
            if all(isinstance(row, (dict, WidgetDefinition)) for row in rows):
                widgets, issues = collect_sheet_issues(
                    rows=rows,
                    model=WidgetDefinition,
                    table_name="Widgets",
                    context=info.context,
                    # The rows check that no survey language is missing; this rule
                    # checks the other way, that no label is in another language
                    # (e.g. a label::fe typo), reported once for the sheet.
                    sheet_rules=[
                        _unique_question_names,
                        _for_active_rows(
                            fields_in_survey_languages(
                                info,
                                {
                                    "label": WIDGET_LABEL_COLUMN_PREFIX,
                                    "label_one": WIDGET_LABEL_ONE_COLUMN_PREFIX,
                                },
                            )
                        ),
                    ],
                )
                if issues:
                    raise ValueError("\n".join(issues))
                return handler(widgets)
        return handler(rows)

    @model_validator(mode="after")
    def _references_between_widgets_are_valid(self) -> Self:
        """Check that every `group` and `join_with` names a fitting widget."""
        # Runs only once every row is valid and question_name is unique in each
        # section (see _collect_all_issues), so row numbers follow the source order
        # and a widget is found by its section and question_name.
        prefix = "Error in Widgets - "
        # An inactive widget may share its name with an active one (see
        # _unique_question_names): the active one is the widget referenced.
        widgets_by_key = {
            (widget.section, widget.question_name): widget
            for widget in sorted(self.root, key=lambda widget: widget.active)
        }
        sections_by_name: dict[str, list[str]] = {}
        for widget in self.root:
            sections_by_name.setdefault(widget.question_name, []).append(widget.section)
        issues = []
        for row_number, widget in enumerate(self.root, start=2):
            if not widget.active:
                continue
            reason = self._group_issue(widget, widgets_by_key, sections_by_name)
            if reason:
                issues.append(
                    f"{prefix}Invalid group in row {row_number}: {widget.group!r} - {reason}"
                )
            reason = self._join_with_issue(widget, widgets_by_key, sections_by_name)
            if reason:
                issues.append(
                    f"{prefix}Invalid join_with in row {row_number}: "
                    f"{widget.appearance.join_with!r} - {reason}"
                )
        if issues:
            raise ValueError("\n".join(issues))
        return self

    @staticmethod
    def _group_issue(
        widget: WidgetDefinition,
        widgets_by_key: dict[tuple[str, str], WidgetDefinition],
        sections_by_name: dict[str, list[str]],
    ) -> str | None:
        """
        Check the widget's `group`: it must name a Custom or BuiltIn widget (the group
        widget, e.g. householdMembers) of the same section.

        Returns the reason it is invalid, for the error message, or None if it is
        valid or blank.
        """
        if widget.group is None:
            return None
        if widget.group == widget.question_name:
            return "A widget cannot be its own group."
        group = widgets_by_key.get((widget.section, widget.group))
        if group is None:
            if widget.group in sections_by_name:
                return (
                    f"The group is in section {sections_by_name[widget.group][0]!r}, "
                    f"not in {widget.section!r}."
                )
            return "Does not match any question_name."
        if group.input_type not in HAND_WRITTEN_INPUT_TYPES:
            return (
                f"Must name a Custom or BuiltIn widget (the group), but it is a "
                f"{group.input_type} widget."
            )
        return None

    def _join_with_issue(
        self,
        widget: WidgetDefinition,
        widgets_by_key: dict[tuple[str, str], WidgetDefinition],
        sections_by_name: dict[str, list[str]],
    ) -> str | None:
        """
        Check the widget's `join_with`: it must name the active widget just before or
        after this one, in the same section and group.

        Returns the reason it is invalid, for the error message, or None if it is
        valid or blank. An inactive widget isn't checked: it isn't in the survey.
        """
        join_with = widget.appearance.join_with
        # An input type that doesn't use appearance ignores join_with (a warning, see
        # WidgetDefinition.warnings): what it names doesn't matter.
        if join_with is None or not widget.active or not widget._uses("appearance"):
            return None
        if join_with == widget.question_name:
            return "A widget cannot join with itself."
        other = widgets_by_key.get((widget.section, join_with))
        if other is None and join_with not in sections_by_name:
            return "Does not match any question_name."
        if other is None or other.group != widget.group:
            return "Must name a widget of the same section and group."
        if not other.active:
            return "Must name an active widget."
        # The widgets as shown: the active ones of this section and group, in order.
        shown = [
            row.question_name
            for row in self.root
            if row.active and (row.section, row.group) == (widget.section, widget.group)
        ]
        if abs(shown.index(join_with) - shown.index(widget.question_name)) != 1:
            return "Must name the widget just before or after this one."
        return None

    def warnings(self) -> list[str]:
        """
        The problems that don't reject the sheet, one per row and problem (see
        WidgetDefinition.warnings), e.g. a column its input type doesn't use.
        """
        return [
            f"Widgets sheet, row {row_number}: {warning}"
            for row_number, widget in enumerate(self.root, start=2)
            for warning in widget.warnings
        ]

    def __iter__(self) -> Iterator[WidgetDefinition]:  # type: ignore[override]
        return iter(self.root)

    def __len__(self) -> int:
        return len(self.root)

    def __getitem__(self, index: int) -> WidgetDefinition:
        return self.root[index]
