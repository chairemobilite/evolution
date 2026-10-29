# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: The InputRange table of the survey definition: InputRangeDefinition, one
# Pydantic model per row (a slider configuration), validated on construction; and
# InputRanges, the whole checked table, whose validation also runs the rules across rows
# (input_range_name unique across the table, labels and units only in the survey
# languages).
#
# This module only defines the shape and the checks; it does not read any input source.
# See survey_definition.py for the
# bundle of all tables, and scripts/generate_input_range.py for TypeScript generation.

from collections.abc import Iterator
from typing import Any, Literal, Self

from pydantic import (
    BaseModel,
    ConfigDict,
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
    collect_sheet_issues,
    fields_in_survey_languages,
    unique_field,
)
from survey_definition.validation_context import context_languages

# Field names the InputRange source must provide. The label and unit columns (one per
# language) aren't listed: a missing one is reported by the rows that need it. Like
# value_when_hidden in Conditionals, the input_color column doesn't need to exist at
# all in a sheet that never sets it.
INPUT_RANGE_REQUIRED_FIELD_NAMES: tuple[str, ...] = (
    "input_range_name",
    "min_value",
    "max_value",
)

# Prefixes of the translated columns, by field: one column per language, e.g.
# label_min::fr, unit::en.
INPUT_RANGE_COLUMN_PREFIX_BY_FIELD: dict[str, str] = {
    "label_min": "label_min::",
    "label_middle": "label_middle::",
    "label_max": "label_max::",
    "unit": "unit::",
}

# Slider colors, each matching an `input-slider-<color>` CSS class of the frontend
# (see evolution-frontend/src/styles/survey/_question.scss). A blank input_color uses
# INPUT_RANGE_DEFAULT_COLOR.
InputRangeColor = Literal[
    "blue",
    "red-yellow-green",
    "red-white-green",
    "green-yellow-red",
    "green-white-red",
]
INPUT_RANGE_DEFAULT_COLOR: InputRangeColor = "blue"


class InputRangeDefinition(BaseModel):
    """
    One row of the InputRange table: the configuration of one slider (InputRange
    widget), validated on construction.

    Input: one row's fields, as keyword arguments or a dict (e.g.
        `InputRangeDefinition(**row)`, one row of the "InputRange" sheet). A blank or
        whitespace-only cell is treated as an absent value.
    Output: a validated instance if every per-row rule passes; otherwise raises
        `pydantic.ValidationError` naming every field that failed, not just the first.

    Build instances through `InputRanges(rows)` (below), which also checks that
    `input_range_name` is unique across the table, and that no row has a label or unit
    in a language that isn't a survey language. The survey languages come from the
    validation context (see validation_context.py), e.g.
    `InputRanges.model_validate(rows, context={"languages": ("fr", "en")})`. Validation
    is strict: no type coercion (e.g. 10.5 or the text "10" is rejected for
    `min_value`).

    Attributes:
        input_range_name: Name of this slider, exported from inputRange.tsx and used in
            the Widgets sheet's `inputRange` column. Required; must be a valid
            TypeScript identifier and unique across the table.
        label_min: Label under the minimum value, by language, read from the
            `label_min::<language>` columns. Required, in every survey language.
        label_middle: Label under the middle value, by language, read from the
            `label_middle::<language>` columns. Optional, but when set, it must be in
            every survey language too.
        label_max: Label under the maximum value, by language, read from the
            `label_max::<language>` columns. Required, in every survey language.
        min_value: Minimum value of the slider, a whole number. Required; must be less
            than `max_value`. A negative value leaves room for a "no answer" zone: the
            generated label is blank below 0.
        max_value: Maximum value of the slider, a whole number. Required.
        unit: Unit shown after the selected value, e.g. "%", by language, read from the
            `unit::<language>` columns. Optional, but when set, it must be in every
            survey language too.
        input_color: Color of the slider track (see InputRangeColor). Blank means
            INPUT_RANGE_DEFAULT_COLOR.
    """

    # See SectionDefinition.model_config for why validation is strict.
    model_config = ConfigDict(strict=True)

    @model_validator(mode="before")
    @classmethod
    def _strip_blank_cells(cls, data: Any) -> Any:
        """Treat a blank/whitespace-only cell as an absent key, and gather the label and unit columns of each language."""
        if not isinstance(data, dict):
            return data
        data = _strip_blanks(data)
        for field_name, column_prefix in INPUT_RANGE_COLUMN_PREFIX_BY_FIELD.items():
            data = _collect_language_columns(data, field_name, column_prefix)
        return data

    # No default: a blank value here is a genuinely missing required value.
    input_range_name: str
    min_value: int
    max_value: int

    label_min: dict[str, str] = {}
    label_middle: dict[str, str] = {}
    label_max: dict[str, str] = {}
    unit: dict[str, str] = {}
    input_color: InputRangeColor | None = None

    @field_validator("input_range_name")
    @classmethod
    def _input_range_name_is_valid_identifier(
        cls, value: str, info: ValidationInfo
    ) -> str:
        """Check that `input_range_name` is a valid TypeScript identifier."""
        _raise_if_check_fails(field_checks.valid_ts_identifier, value, info.data)
        return value

    # One "after" validator for every rule between fields or needing the context:
    # Pydantic stops at the first failing one, so a second would hide its problems.
    @model_validator(mode="after")
    def _input_range_is_complete(self, info: ValidationInfo) -> Self:
        """
        Check that `min_value` is less than `max_value`, that the minimum and maximum
        labels are in every survey language, and that the middle label and the unit,
        when set, are in every survey language too.
        """
        issues = []
        if self.min_value >= self.max_value:
            issues.append(
                f"min_value ({self.min_value}) must be less than max_value ({self.max_value})"
            )
        languages = context_languages(info)
        for field_name in ("label_min", "label_max"):
            issues.extend(
                f"{field_name}::{language} is required"
                for language in languages
                if language not in getattr(self, field_name)
            )
        # A value set in only some languages is most likely a forgotten translation.
        for field_name in ("label_middle", "unit"):
            if getattr(self, field_name):
                issues.extend(
                    f"{field_name}::{language} is required when {field_name} is "
                    "set in another language"
                    for language in languages
                    if language not in getattr(self, field_name)
                )
        if issues:
            raise ValueError("; ".join(issues))
        return self


class InputRanges(RootModel[list[InputRangeDefinition]]):
    """
    The whole InputRange sheet: a list of InputRangeDefinition that has passed every
    check, the ones on each row and the ones across rows (see _collect_all_issues).

    Input: a list (or tuple/set/frozenset) of rows, each either a raw dict (e.g. every
        row of the "InputRange" sheet, as read from Excel) or an already-built
        InputRangeDefinition.
    Output: a validated instance — iterable, indexable, `len()`-able, one
        InputRangeDefinition per row in source order — if the whole sheet passes every
        rule (each row's own rules, plus unique `input_range_name` and labels and
        units only in the survey languages); otherwise raises
        `pydantic.ValidationError`, whose message lists every problem at once.

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
            if all(isinstance(row, (dict, InputRangeDefinition)) for row in rows):
                input_ranges, issues = collect_sheet_issues(
                    rows=rows,
                    model=InputRangeDefinition,
                    table_name="InputRange",
                    context=info.context,
                    # The rows check that no survey language is missing; this rule
                    # checks the other way, that no label or unit is in another
                    # language (e.g. a unit::fe typo), reported once for the sheet.
                    sheet_rules=[
                        unique_field("input_range_name"),
                        fields_in_survey_languages(
                            info, INPUT_RANGE_COLUMN_PREFIX_BY_FIELD
                        ),
                    ],
                )
                if issues:
                    raise ValueError("\n".join(issues))
                return handler(input_ranges)
        return handler(rows)

    def __iter__(self) -> Iterator[InputRangeDefinition]:  # type: ignore[override]
        return iter(self.root)

    def __len__(self) -> int:
        return len(self.root)

    def __getitem__(self, index: int) -> InputRangeDefinition:
        return self.root[index]
