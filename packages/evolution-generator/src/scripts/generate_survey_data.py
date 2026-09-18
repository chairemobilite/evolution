# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Defines the shape of the intermediate data layer between Generator inputs
# (Excel today; CSV/JSON/etc. later) and the generation scripts: one dataclass per
# sheet (SectionData, WidgetData, ChoiceData, InputRangeData, ConditionalData,
# LabelData), bundled together as SurveyData, plus the column specs used to validate
# a sheet's headers and row values before any script consumes the data.
#
# This module only defines the shape and the validation helpers; it does not read
# Excel files. See generator_helpers.py::load_survey_data() for that (loads a
# workbook and builds a SurveyData instance from these specs/dataclasses).

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable

from helpers import survey_custom_data_checks


@dataclass
class SurveyData:
    """
    The single source of truth for the survey definition, shared by (almost) every
    Generator script.

    The workbook is loaded a single time into one instance of this class, which is
    then passed to each script, so they all work from the same already-validated
    data rather than each re-parsing the Excel file on its own.

    One list per sheet: sections, widgets, choices, input_ranges, conditionals, labels.
    """

    sections: list[SectionData] = field(default_factory=list)
    ## widgets: list[WidgetData] = field(default_factory=list)
    ## choices: list[ChoiceData] = field(default_factory=list)
    ## input_ranges: list[InputRangeData] = field(default_factory=list)
    ## conditionals: list[ConditionalData] = field(default_factory=list)
    ## labels: list[LabelData] = field(default_factory=list)


# A per-cell check: takes the cell's own (already-non-None) value, plus the full row
# (field -> value, same shape collect_row_issues receives, for checks that depend on
# a sibling column), and returns True when valid, False when invalid. Its docstring's
# first line is used as the error message. Checks that only care about their own
# value can ignore `row`.
ColumnCheck = Callable[[Any, dict], bool]


@dataclass(frozen=True)
class ColumnReference:
    """
    Names another column whose non-blank values are the allowed set for a `references`
    column (e.g. Sections.parent_section references Sections.section: every
    parent_section must name a real section).

    `sheet=None` (the default) means "the same sheet this column belongs to", resolved
    by collect_sheet_issues. A named sheet (one of SHEET_COLUMN_SPECS's keys) means a
    different sheet, resolved by collect_survey_issues instead, since checking that
    requires that other sheet's rows too.
    """

    field: str
    sheet: str | None = None


@dataclass(frozen=True)
class ColumnSpec:
    """
    Describes one column of a SurveyData sheet.

    Attributes:
        field: python attribute name on the sheet's dataclass (e.g. "label_fr").
        header: Excel column header (e.g. "label::fr").
        required: the column must exist as a header in the sheet (checked by
            validate_required_headers). A column can be required to exist while
            still allowing a blank cell on any given row (e.g. Sections.parent_section).
        value_required: on top of `required`, every row's cell must also be
            non-blank (checked by collect_row_issues). Implies `required=True`.
        allowed_values: set of allowed values (e.g. {"Custom", "BuiltIn"}), or
            None to allow any value. Only evaluated for non-blank cell values.
        allowed_types: tuple of allowed types (e.g. (str,)), or None to allow
            any type. Only evaluated for non-blank cell values.
        unique: value must not repeat across the sheet's non-blank cells. Unlike the
            other rules, this can't be checked one row at a time (checked by
            collect_sheet_issues, not collect_row_issues).
        references: a ColumnReference this column's non-blank values must match, or
            None for no such constraint. See ColumnReference for same-sheet vs.
            cross-sheet resolution.
        custom_data_checks: extra per-cell checks beyond type/allowed-value (e.g.
            survey_custom_data_checks.valid_ts_identifier, .valid_path_chars). Only
            evaluated for non-blank cell values (see ColumnCheck for the (value, row)
            signature, e.g. to enforce a same-row conditional requirement).
    """

    field: str
    header: str
    required: bool
    value_required: bool
    allowed_values: frozenset | None
    allowed_types: tuple[type, ...] | None
    unique: bool
    references: ColumnReference | None
    custom_data_checks: tuple[ColumnCheck, ...]


def _empty_to_none(value):
    """Treat an empty string cell the same as an absent (None) cell."""
    return None if value == "" else value


def validate_required_headers(
    headers: list, specs: tuple[ColumnSpec, ...], sheet_name: str
) -> None:
    """
    Raise if any header required by `specs` (required=True) is missing from `headers`.

    Mirrors generator_helpers.get_headers()'s checks (too-few-columns, missing header),
    but works from an already-extracted header list instead of an openpyxl sheet, so the
    same specs can validate headers regardless of where they came from.
    """
    expected_headers = [spec.header for spec in specs if spec.required]

    if len(headers) < len(expected_headers):
        raise Exception(f"Too few columns in {sheet_name} sheet")

    for expected in expected_headers:
        if expected not in headers:
            raise Exception(
                f"Missing expected header in {sheet_name} sheet: {expected}"
            )


def collect_row_issues(
    row: dict, specs: tuple[ColumnSpec, ...], sheet_name: str, row_number: int
) -> list[str]:
    """
    Return every validation issue found in one data row (empty list when the row is valid).

    Collects all problems in one pass (no early exit) so a single run reports every
    issue in the row, not just the first. `row` maps each spec's `field` name to its
    raw cell value.
    """
    prefix = f"Error in {sheet_name} sheet - "
    issues: list[str] = []

    missing_fields = [
        spec.header
        for spec in specs
        if spec.value_required and _empty_to_none(row.get(spec.field)) is None
    ]
    if missing_fields:
        issues.append(
            f"{prefix}Required field is missing in row {row_number}. "
            f"Missing fields: {missing_fields}"
        )
    missing_set = set(missing_fields)

    for spec in specs:
        if spec.header in missing_set:
            continue

        value = _empty_to_none(row.get(spec.field))
        if value is None:
            continue

        if spec.allowed_types is not None and not isinstance(value, spec.allowed_types):
            type_names = ", ".join(t.__name__ for t in spec.allowed_types)
            issues.append(
                f"{prefix}Invalid {spec.header} in row {row_number}: "
                f"must be one of types ({type_names}), got {type(value).__name__} with value {value!r}"
            )

        if spec.allowed_values is not None and value not in spec.allowed_values:
            allowed_display = sorted(
                str(allowed) for allowed in spec.allowed_values if allowed is not None
            )
            issues.append(
                f"{prefix}Invalid {spec.header} in row {row_number}: "
                f"must be one of {allowed_display!r} or empty, got {value!r}"
            )

        for check in spec.custom_data_checks:
            if not check(value, row):
                reason = (check.__doc__ or check.__name__).strip().splitlines()[0]
                issues.append(
                    f"{prefix}Invalid {spec.header} in row {row_number}: {value!r} - {reason}"
                )

    return issues


def collect_sheet_issues(
    rows: list[dict], specs: tuple[ColumnSpec, ...], sheet_name: str
) -> list[str]:
    """
    Return every validation issue across an entire sheet: every row's issues (see
    collect_row_issues), plus cross-row rules a single row can't check on its own
    (`unique` columns, and `references` columns that point within this same sheet).

    A `references` column pointing at a *different* sheet is skipped here — this
    function only has one sheet's rows, so it can't be checked without that other
    sheet's data too. See collect_survey_issues for that case.

    `rows` is one dict per data row, in sheet order, each mapping a spec's `field`
    name to its raw cell value (row 2 of the sheet is rows[0]).
    """
    prefix = f"Error in {sheet_name} sheet - "
    issues: list[str] = []

    for row_number, row in enumerate(rows, start=2):
        issues.extend(
            collect_row_issues(
                row=row, specs=specs, sheet_name=sheet_name, row_number=row_number
            )
        )

    for spec in specs:
        if not spec.unique:
            continue

        row_numbers_by_value: dict[object, list[int]] = {}
        for row_number, row in enumerate(rows, start=2):
            value = _empty_to_none(row.get(spec.field))
            if value is None:
                continue
            row_numbers_by_value.setdefault(value, []).append(row_number)

        for value, row_numbers in row_numbers_by_value.items():
            if len(row_numbers) > 1:
                issues.append(
                    f"{prefix}Duplicate {spec.header} {value!r}: found in rows {row_numbers}"
                )

    for spec in specs:
        if spec.references is None or spec.references.sheet is not None:
            continue  # no reference, or a cross-sheet one collect_survey_issues handles

        referenced_spec = next(s for s in specs if s.field == spec.references.field)
        referenced_values = {
            _empty_to_none(row.get(referenced_spec.field)) for row in rows
        } - {None}

        for row_number, row in enumerate(rows, start=2):
            value = _empty_to_none(row.get(spec.field))
            if value is None or value in referenced_values:
                continue
            issues.append(
                f"{prefix}Invalid {spec.header} in row {row_number}: {value!r} "
                f"does not match any {referenced_spec.header} value in this sheet"
            )

    return issues


def collect_survey_issues(rows_by_sheet: dict[str, list[dict]]) -> list[str]:
    """
    Validate every sheet in `rows_by_sheet` (via collect_sheet_issues: row-level rules,
    `unique`, and same-sheet `references`), plus any `references` column that points at
    a *different* sheet — the one thing collect_sheet_issues can't check on its own
    since it only sees one sheet's rows at a time.

    `rows_by_sheet` maps each sheet name (matching SHEET_COLUMN_SPECS's keys) to that
    sheet's rows, in the shape collect_sheet_issues expects. This is the entry point
    load_survey_data() will use once it reads every sheet.
    """
    issues: list[str] = []

    for sheet_name, specs in SHEET_COLUMN_SPECS.items():
        issues.extend(
            collect_sheet_issues(
                rows=rows_by_sheet[sheet_name], specs=specs, sheet_name=sheet_name
            )
        )

    for sheet_name, specs in SHEET_COLUMN_SPECS.items():
        prefix = f"Error in {sheet_name} sheet - "

        for spec in specs:
            if spec.references is None or spec.references.sheet is None:
                continue  # no reference, or a same-sheet one collect_sheet_issues already checked

            referenced_sheet_name = spec.references.sheet
            referenced_specs = SHEET_COLUMN_SPECS[referenced_sheet_name]
            referenced_spec = next(
                s for s in referenced_specs if s.field == spec.references.field
            )
            referenced_values = {
                _empty_to_none(row.get(referenced_spec.field))
                for row in rows_by_sheet[referenced_sheet_name]
            } - {None}

            for row_number, row in enumerate(rows_by_sheet[sheet_name], start=2):
                value = _empty_to_none(row.get(spec.field))
                if value is None or value in referenced_values:
                    continue
                issues.append(
                    f"{prefix}Invalid {spec.header} in row {row_number}: {value!r} "
                    f"does not match any {referenced_spec.header} value in the "
                    f"{referenced_sheet_name} sheet"
                )

    return issues


# ----------------------------------- Sections sheet -----------------------------------

SECTION_COLUMN_SPECS: tuple[ColumnSpec, ...] = (
    ColumnSpec(
        field="section",
        header="section",
        required=True,
        value_required=True,
        allowed_values=None,
        allowed_types=(str,),
        unique=True,
        references=None,
        custom_data_checks=(survey_custom_data_checks.valid_ts_identifier,),
    ),
    ColumnSpec(
        field="title_fr",
        header="title_fr",
        required=True,
        value_required=False,
        allowed_values=None,
        allowed_types=(str,),
        unique=False,
        references=None,
        custom_data_checks=(),
    ),
    ColumnSpec(
        field="title_en",
        header="title_en",
        required=True,
        value_required=False,
        allowed_values=None,
        allowed_types=(str,),
        unique=False,
        references=None,
        custom_data_checks=(),
    ),
    ColumnSpec(
        field="in_nav",
        header="in_nav",
        required=True,
        value_required=True,
        allowed_values=None,
        allowed_types=(bool,),
        unique=False,
        references=None,
        custom_data_checks=(survey_custom_data_checks.requires_titles_when_true,),
    ),
    ColumnSpec(
        field="template",
        header="template",
        required=True,
        value_required=False,
        allowed_values=None,
        # True means "this section has a custom template.tsx"; a str names a builtin
        # template; blank means the default (no template) — see generate_section_configs.py's
        # has_custom_template/has_builtin_template checks.
        allowed_types=(bool, str),
        unique=False,
        references=None,
        custom_data_checks=(),
    ),
    ColumnSpec(
        field="parent_section",
        header="parent_section",
        required=True,
        value_required=False,
        allowed_values=None,
        allowed_types=None,
        unique=False,
        references=ColumnReference(field="section"),
        custom_data_checks=(),
    ),
    ColumnSpec(
        field="has_preload",
        header="has_preload",
        required=False,
        value_required=False,
        allowed_values=None,
        allowed_types=(bool,),
        unique=False,
        references=None,
        custom_data_checks=(),
    ),
    ColumnSpec(
        field="enable_conditional",
        header="enable_conditional",
        required=False,
        value_required=False,
        allowed_values=None,
        allowed_types=(str,),
        unique=False,
        references=None,
        custom_data_checks=(survey_custom_data_checks.valid_conditional_name,),
    ),
    ColumnSpec(
        field="completion_conditional",
        header="completion_conditional",
        required=False,
        value_required=False,
        allowed_values=None,
        allowed_types=(str,),
        unique=False,
        references=None,
        custom_data_checks=(survey_custom_data_checks.valid_conditional_name,),
    ),
    ColumnSpec(
        field="abbreviation",
        header="abbreviation",
        required=True,
        value_required=True,
        allowed_values=None,
        allowed_types=(str,),
        unique=True,
        references=None,
        custom_data_checks=(survey_custom_data_checks.ends_with_underscore,),
    ),
)


@dataclass
class SectionData:
    # Fields with no default mirror SECTION_COLUMN_SPECS's value_required=True columns
    # (section, in_nav, abbreviation); every other field may be blank on a given row.
    section: str
    in_nav: bool
    abbreviation: str
    title_fr: str | None = None
    title_en: str | None = None
    template: str | bool | None = None
    parent_section: str | None = None
    has_preload: bool | None = None
    enable_conditional: str | None = None
    completion_conditional: str | None = None


# ----------------------------------- Widgets sheet ------------------------------------

## WIDGET_COLUMN_SPECS: tuple[ColumnSpec, ...] = (
##     ColumnSpec(
##         field="question_name",
##         header="questionName",
##         required=True,
##         value_required=True,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(survey_custom_data_checks.valid_ts_identifier,),
##     ),
##     ColumnSpec(
##         field="input_type",
##         header="inputType",
##         required=True,
##         value_required=True,
##         allowed_values=frozenset(
##             {
##                 "Custom",
##                 "BuiltIn",
##                 "Radio",
##                 "RadioNumber",
##                 "Select",
##                 "String",
##                 "Number",
##                 "InfoText",
##                 "Range",
##                 "Checkbox",
##                 "NextButton",
##                 "Text",
##             }
##         ),
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="section",
##         header="section",
##         required=True,
##         value_required=True,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(survey_custom_data_checks.valid_ts_identifier,),
##     ),
##     ColumnSpec(
##         field="path",
##         header="path",
##         required=True,
##         value_required=True,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(survey_custom_data_checks.valid_path_chars,),
##     ),
##     ColumnSpec(
##         field="active",
##         header="active",
##         required=True,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=(bool,),
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="conditional",
##         header="conditional",
##         required=True,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="validation",
##         header="validation",
##         required=True,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="input_range",
##         header="inputRange",
##         required=True,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="help_popup",
##         header="help_popup",
##         required=True,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="choices",
##         header="choices",
##         required=True,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="confirm_popup",
##         header="confirm_popup",
##         required=False,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="comments",
##         header="comments",
##         required=False,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="parameters",
##         header="parameters",
##         required=False,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="label_fr",
##         header="label::fr",
##         required=False,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="label_en",
##         header="label::en",
##         required=False,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="label_one_fr",
##         header="label_one::fr",
##         required=False,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="label_one_en",
##         header="label_one::en",
##         required=False,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="group",
##         header="group",
##         required=False,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="two_columns",
##         header="twoColumns",
##         required=False,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=(bool,),
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="contains_html",
##         header="containsHtml",
##         required=False,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=(bool,),
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="appearance",
##         header="appearance",
##         required=False,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="custom_path",
##         header="customPath",
##         required=False,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="custom_choice",
##         header="customChoice",
##         required=False,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="default_value",
##         header="defaultValue",
##         required=False,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="include_not_applicable",
##         header="includeNotApplicable",
##         required=False,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=(bool,),
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
## )


## @dataclass
## class WidgetData:
##     question_name: str
##     input_type: str
##     section: str
##     path: str
##     active: bool | None = None
##     conditional: str | None = None
##     validation: str | None = None
##     input_range: str | None = None
##     help_popup: str | None = None
##     choices: str | None = None
##     confirm_popup: str | None = None
##     comments: str | None = None
##     parameters: str | None = None
##     label_fr: str | None = None
##     label_en: str | None = None
##     label_one_fr: str | None = None
##     label_one_en: str | None = None
##     group: str | None = None
##     two_columns: bool | None = None
##     contains_html: bool | None = None
##     appearance: str | None = None
##     custom_path: str | None = None
##     custom_choice: str | None = None
##     default_value: str | None = None
##     include_not_applicable: bool | None = None


## # ----------------------------------- Choices sheet ------------------------------------

## CHOICE_COLUMN_SPECS: tuple[ColumnSpec, ...] = (
##     ColumnSpec(
##         field="choices_name",
##         header="choicesName",
##         required=True,
##         value_required=True,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(survey_custom_data_checks.valid_ts_identifier,),
##     ),
##     ColumnSpec(
##         field="value",
##         header="value",
##         required=True,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="label_fr",
##         header="label::fr",
##         required=True,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="label_en",
##         header="label::en",
##         required=True,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="label_one_fr",
##         header="label_one::fr",
##         required=True,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="label_one_en",
##         header="label_one::en",
##         required=True,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="spread_choices_name",
##         header="spreadChoicesName",
##         required=True,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="conditional",
##         header="conditional",
##         required=True,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="hidden",
##         header="hidden",
##         required=False,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=(bool,),
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
## )


## @dataclass
## class ChoiceData:
##     choices_name: str
##     value: str | int | float | bool | None = None
##     label_fr: str | None = None
##     label_en: str | None = None
##     label_one_fr: str | None = None
##     label_one_en: str | None = None
##     spread_choices_name: str | None = None
##     conditional: str | None = None
##     hidden: bool = False


# ---------------------------------- InputRange sheet ----------------------------------

## INPUT_RANGE_COLUMN_SPECS: tuple[ColumnSpec, ...] = (
##     ColumnSpec(
##         field="input_range_name",
##         header="inputRangeName",
##         required=True,
##         value_required=True,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(survey_custom_data_checks.valid_ts_identifier,),
##     ),
##     ColumnSpec(
##         field="label_fr_min",
##         header="labelFrMin",
##         required=True,
##         value_required=True,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="label_fr_max",
##         header="labelFrMax",
##         required=True,
##         value_required=True,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="label_en_min",
##         header="labelEnMin",
##         required=True,
##         value_required=True,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="label_en_max",
##         header="labelEnMax",
##         required=True,
##         value_required=True,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="min_value",
##         header="minValue",
##         required=True,
##         value_required=True,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="max_value",
##         header="maxValue",
##         required=True,
##         value_required=True,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="unit_fr",
##         header="unitFr",
##         required=True,
##         value_required=True,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="unit_en",
##         header="unitEn",
##         required=True,
##         value_required=True,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="label_fr_middle",
##         header="labelFrMiddle",
##         required=False,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="label_en_middle",
##         header="labelEnMiddle",
##         required=False,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="input_color",
##         header="input_color",
##         required=False,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
## )


## @dataclass
## class InputRangeData:
##     input_range_name: str
##     label_fr_min: str
##     label_fr_max: str
##     label_en_min: str
##     label_en_max: str
##     min_value: int | float
##     max_value: int | float
##     unit_fr: str
##     unit_en: str
##     label_fr_middle: str | None = None
##     label_en_middle: str | None = None
##     input_color: str | None = None


# --------------------------------- Conditionals sheet ---------------------------------

## CONDITIONAL_COLUMN_SPECS: tuple[ColumnSpec, ...] = (
##     ColumnSpec(
##         field="conditional_name",
##         header="conditional_name",
##         required=True,
##         value_required=True,
##         allowed_values=None,
##         allowed_types=(str,),
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="logical_operator",
##         header="logical_operator",
##         required=False,
##         value_required=False,
##         allowed_values=frozenset({"||", "&&", None}),
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="path",
##         header="path",
##         required=True,
##         value_required=True,
##         allowed_values=None,
##         allowed_types=(str,),
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="comparison_operator",
##         header="comparison_operator",
##         required=True,
##         value_required=True,
##         allowed_values=frozenset({"===", "!==", ">", "<", ">=", "<="}),
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="value",
##         header="value",
##         required=True,
##         value_required=True,
##         allowed_values=None,
##         allowed_types=(bool, int, float, str),
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="parentheses",
##         header="parentheses",
##         required=False,
##         value_required=False,
##         allowed_values=frozenset({"(", ")", None}),
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="value_when_hidden",
##         header="value_when_hidden",
##         required=False,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=(bool, int, float, str),
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
## )


## @dataclass
## class ConditionalData:
##     conditional_name: str
##     path: str
##     comparison_operator: str
##     value: bool | int | float | str
##     logical_operator: str | None = None
##     parentheses: str | None = None
##     value_when_hidden: bool | int | float | str | None = None


# ------------------------------------ Labels sheet ------------------------------------

## LABEL_COLUMN_SPECS: tuple[ColumnSpec, ...] = (
##     ColumnSpec(
##         field="namespace",
##         header="namespace",
##         required=True,
##         value_required=True,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="key",
##         header="key",
##         required=True,
##         value_required=True,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="label_fr",
##         header="label::fr",
##         required=True,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="label_en",
##         header="label::en",
##         required=True,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="label_one_fr",
##         header="label_one::fr",
##         required=False,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
##     ColumnSpec(
##         field="label_one_en",
##         header="label_one::en",
##         required=False,
##         value_required=False,
##         allowed_values=None,
##         allowed_types=None,
##         unique=False,
##         references=None,
##         custom_data_checks=(),
##     ),
## )


## @dataclass
## class LabelData:
##     namespace: str
##     key: str
##     label_fr: str | None = None
##     label_en: str | None = None
##     label_one_fr: str | None = None
##     label_one_en: str | None = None


# Maps each Excel sheet name to its column specs, so a `references` column can point
# at a different sheet (see ColumnReference) and collect_survey_issues can resolve it.
SHEET_COLUMN_SPECS: dict[str, tuple[ColumnSpec, ...]] = {
    "Sections": SECTION_COLUMN_SPECS,
    ## "Widgets": WIDGET_COLUMN_SPECS,
    ## "Choices": CHOICE_COLUMN_SPECS,
    ## "InputRange": INPUT_RANGE_COLUMN_SPECS,
    ## "Conditionals": CONDITIONAL_COLUMN_SPECS,
    ## "Labels": LABEL_COLUMN_SPECS,
}
