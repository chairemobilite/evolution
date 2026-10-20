# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: The InputRange table of the survey definition: InputRangeDefinition, one
# Pydantic model per row (a slider configuration), validated on construction; and
# InputRange, the whole checked table, whose validation also runs the rules across rows
# (input_range_name unique across the table).
#
# This module only defines the shape and the checks. See survey_definition.py for the
# bundle of all tables, and scripts/generate_input_range.py for TypeScript generation.

from collections.abc import Iterator
from typing import Any, Literal, Self

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    RootModel,
    ValidationInfo,
    field_validator,
    model_validator,
)

from survey_definition import field_checks
from survey_definition.row_checks import _raise_if_check_fails, _strip_blanks
from survey_definition.sheet_checks import collect_sheet_issues, unique_field

# Field names the InputRange source must provide. The middle labels, units and
# input_color are left out: like value_when_hidden in Conditionals, their columns don't
# need to exist at all in a sheet that never sets them.
# TODO: Build the label and unit columns from SurveyDefinition.languages instead of
# hardcoding fr and en, once https://github.com/chairemobilite/evolution/pull/2133 is merged.
INPUT_RANGE_REQUIRED_FIELD_NAMES: tuple[str, ...] = (
    "input_range_name",
    "label_min::fr",
    "label_max::fr",
    "label_min::en",
    "label_max::en",
    "min_value",
    "max_value",
)

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

    Input: one row's fields, keyed by their source names (e.g.
        `InputRangeDefinition(**row)`, one row of the "InputRange" sheet, where the
        labels are `label_min::fr`, ...). The Python attribute names (`label_min_fr`,
        ...) are accepted too. A blank or whitespace-only cell is treated as an
        absent value.
    Output: a validated instance if every per-row rule passes; otherwise raises
        `pydantic.ValidationError` naming every field that failed, not just the first.

    Build instances through `InputRange(rows)` (below), which also checks that
    `input_range_name` is unique across the table. Validation is strict: no type
    coercion (e.g. 10.5 or the text "10" is rejected for `min_value`).

    Attributes:
        input_range_name: Name of this slider, exported from inputRange.tsx and used in
            the Widgets sheet's `inputRange` column. Required; must be a valid
            TypeScript identifier and unique across the table.
        label_min_fr / label_min_en (`label_min::fr` / `label_min::en`): Label under
            the minimum value. Required.
        label_middle_fr / label_middle_en (`label_middle::fr` / `label_middle::en`):
            Label under the middle value. Optional, but both or neither must be set.
        label_max_fr / label_max_en (`label_max::fr` / `label_max::en`): Label under
            the maximum value. Required.
        min_value: Minimum value of the slider, a whole number. Required; must be less
            than `max_value`. A negative value leaves room for a "no answer" zone: the
            generated label is blank below 0.
        max_value: Maximum value of the slider, a whole number. Required.
        unit_fr / unit_en (`unit::fr` / `unit::en`): Unit shown after the selected
            value, e.g. "%". Optional, but both or neither must be set.
        input_color: Color of the slider track (see InputRangeColor). Blank means
            INPUT_RANGE_DEFAULT_COLOR.
    """

    # See SectionDefinition.model_config for why validation is strict. validate_by_name
    # also accepts the Python attribute names, so an instance can be built in code
    # without the `::` aliases.
    model_config = ConfigDict(
        strict=True, validate_by_name=True, validate_by_alias=True
    )

    @model_validator(mode="before")
    @classmethod
    def _strip_blank_cells(cls, data: Any) -> Any:
        """Treat a blank/whitespace-only cell as an absent key, not a genuinely blank value."""
        return _strip_blanks(data) if isinstance(data, dict) else data

    # No default: a blank value here is a genuinely missing required value.
    input_range_name: str
    label_min_fr: str = Field(alias="label_min::fr")
    label_max_fr: str = Field(alias="label_max::fr")
    label_min_en: str = Field(alias="label_min::en")
    label_max_en: str = Field(alias="label_max::en")
    min_value: int
    max_value: int

    label_middle_fr: str | None = Field(default=None, alias="label_middle::fr")
    label_middle_en: str | None = Field(default=None, alias="label_middle::en")
    unit_fr: str | None = Field(default=None, alias="unit::fr")
    unit_en: str | None = Field(default=None, alias="unit::en")
    input_color: InputRangeColor | None = None

    @field_validator("input_range_name")
    @classmethod
    def _input_range_name_is_valid_identifier(
        cls, value: str, info: ValidationInfo
    ) -> str:
        """Check that `input_range_name` is a valid TypeScript identifier."""
        _raise_if_check_fails(field_checks.valid_ts_identifier, value, info.data)
        return value

    @model_validator(mode="after")
    def _min_value_is_less_than_max_value(self) -> Self:
        """Check that `min_value` is less than `max_value`."""
        if self.min_value >= self.max_value:
            raise ValueError(
                f"min_value ({self.min_value}) must be less than max_value ({self.max_value})"
            )
        return self

    @model_validator(mode="after")
    def _translations_are_both_set_or_both_blank(self) -> Self:
        """Check that each optional translated value (middle label, unit) is set in every language, or in none."""
        # A value set in only one language is most likely a forgotten translation.
        issues = [
            f"{name}::fr and {name}::en must both be set, or both blank"
            for name, value_fr, value_en in (
                ("label_middle", self.label_middle_fr, self.label_middle_en),
                ("unit", self.unit_fr, self.unit_en),
            )
            if (value_fr is None) != (value_en is None)
        ]
        if issues:
            raise ValueError("; ".join(issues))
        return self

    @property
    def has_middle_label(self) -> bool:
        """Whether this slider has a middle label (both languages are then set)."""
        return self.label_middle_fr is not None

    @property
    def has_unit(self) -> bool:
        """Whether this slider has a unit (both languages are then set)."""
        return self.unit_fr is not None


class InputRange(RootModel[list[InputRangeDefinition]]):
    """
    The whole InputRange sheet: a list of InputRangeDefinition that has passed every
    check, the ones on each row and the ones across rows (see _collect_all_issues).

    Input: a list (or tuple/set/frozenset) of rows, each either a raw dict (e.g. every
        row of the "InputRange" sheet, as read from Excel) or an already-built
        InputRangeDefinition.
    Output: a validated instance — iterable, indexable, `len()`-able, one
        InputRangeDefinition per row in source order — if the whole sheet passes every
        rule (each row's own rules, plus unique `input_range_name`); otherwise raises
        `pydantic.ValidationError`, whose message lists every problem at once.

    An instance only exists if the sheet is valid, so whatever holds one doesn't need
    to check it again.
    """

    @model_validator(mode="wrap")
    @classmethod
    def _collect_all_issues(cls, rows: Any, handler) -> Any:
        # See Sections._collect_all_issues: this runs every row's checks up front and
        # raises one error listing every problem, instead of stopping at the first.
        if isinstance(rows, (list, tuple, set, frozenset)):
            rows = list(rows)
            if all(isinstance(row, (dict, InputRangeDefinition)) for row in rows):
                input_ranges, issues = collect_sheet_issues(
                    rows=rows,
                    model=InputRangeDefinition,
                    table_name="InputRange",
                    sheet_rules=[unique_field("input_range_name")],
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
