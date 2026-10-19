# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: The Choices table of the survey definition. Several rows share one choicesName:
# together they are that list of choices, in source order. A row is either one choice
# (value and labels) or a spread of another list (spreadChoicesName), which copies all of
# that list's choices in its place.
#
# This module only defines the shape and the checks. See survey_definition.py for the
# bundle of all tables (it also checks the labels against the survey languages and the
# conditionals against the Conditionals table), and scripts/generate_choices.py for
# TypeScript generation.

from collections.abc import Iterator
from typing import Any, Self

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
from survey_definition.row_checks import (
    _collect_language_columns,
    _raise_if_check_fails,
    _strip_blanks,
)
from survey_definition.sheet_checks import collect_sheet_issues

# Field names the Choices source must provide, even though value, spreadChoicesName and
# conditional may be blank on a given row. One label column per survey language
# (CHOICE_LABEL_COLUMN_PREFIX + language, e.g. label::fr) is required too. The
# label_one::<language> and hidden columns are left out: a sheet that never uses them
# doesn't need them at all.
CHOICE_REQUIRED_FIELD_NAMES: tuple[str, ...] = (
    "choicesName",
    "value",
    "spreadChoicesName",
    "conditional",
)

# Prefix of the label columns: one per survey language, e.g. label::fr, label::en.
CHOICE_LABEL_COLUMN_PREFIX = "label::"
# Prefix of the singular label columns, e.g. label_one::fr. Always optional.
CHOICE_LABEL_ONE_COLUMN_PREFIX = "label_one::"


class ChoiceDefinition(BaseModel):
    """
    One row of the Choices table: one choice of a list, or a spread of another list,
    validated on construction.

    Input: one row's fields, as keyword arguments or a dict, keyed by the sheet's
        column names (e.g. `ChoiceDefinition(**row)`, one row of the "Choices" sheet).
        A blank or whitespace-only cell is treated as an absent value.
    Output: a validated instance if every per-row rule passes; otherwise raises
        `pydantic.ValidationError` naming every field that failed, not just the first.

    Build instances through `Choices(rows)` (below), which also runs the rule that needs
    the whole table (`spreadChoicesName` names a list defined earlier). The rules that
    need another table or the survey languages (a label in every language,
    `conditional` names a real conditional) are checked by SurveyDefinition.
    Validation is strict: no type coercion (e.g. the string "yes" is rejected for
    `hidden`), except that a number in a label column is read as text.

    Attributes:
        choices_name: Name of the list this row belongs to (column `choicesName`);
            shared by every row of the same list. Required; must be a valid TypeScript
            identifier, since it names the exported list.
        value: Value saved when this choice is selected: a str, int, float or bool.
            Required unless `spread_choices_name` is set.
        label: Label shown for this choice, by language, read from the
            `label::<language>` columns (e.g. {"fr": "Oui", "en": "Yes"}). Required in
            every survey language unless `spread_choices_name` is set.
        label_one: Singular label, by language, read from the `label_one::<language>`
            columns, used when the label is addressed to a single person. Optional.
        spread_choices_name: Name of another list whose choices are copied in place of
            this row (column `spreadChoicesName`). If set, must name a list that starts
            in an earlier row; this row's value and labels are then not used.
        conditional: Name of the conditional that decides whether this choice is shown.
            If set, must end with "Conditional" or "CustomConditional"; a name not
            ending with "CustomConditional" must be in the Conditionals table.
        hidden: Whether this choice is hidden. Blank means false.
    """

    # strict=True: see SectionDefinition. validate_by_name lets code build an instance
    # with the attribute names (choices_name=...) as well as the sheet's column names.
    model_config = ConfigDict(strict=True, validate_by_name=True)

    @model_validator(mode="before")
    @classmethod
    def _strip_blank_cells(cls, data: Any) -> Any:
        """Treat a blank/whitespace-only cell as an absent key, and gather the label::<language> and label_one::<language> columns."""
        if not isinstance(data, dict):
            return data
        data = _strip_blanks(data)
        data = _collect_language_columns(data, "label", CHOICE_LABEL_COLUMN_PREFIX)
        return _collect_language_columns(
            data, "label_one", CHOICE_LABEL_ONE_COLUMN_PREFIX
        )

    # No default: a blank value here is a genuinely missing required value.
    choices_name: str = Field(alias="choicesName")

    # Declared as object, then checked by _value_is_primitive: a union of the four types
    # would report one error per type for a wrong value.
    value: object | None = None
    label: dict[str, str] = {}
    label_one: dict[str, str] = {}
    spread_choices_name: str | None = Field(default=None, alias="spreadChoicesName")
    conditional: str | None = None
    hidden: bool = False

    @field_validator("value")
    @classmethod
    def _value_is_primitive(
        cls, value: object | None, info: ValidationInfo
    ) -> object | None:
        """Check that a non-blank `value` is a bool, int, float, or str."""
        if value is not None:
            _raise_if_check_fails(field_checks.primitive_value, value, info.data)
        return value

    @field_validator("choices_name")
    @classmethod
    def _choices_name_is_valid_identifier(cls, value: str, info: ValidationInfo) -> str:
        """Check that `choices_name` is a valid TypeScript identifier."""
        _raise_if_check_fails(field_checks.valid_ts_identifier, value, info.data)
        return value

    @field_validator("conditional")
    @classmethod
    def _conditional_name_is_valid(
        cls, value: str | None, info: ValidationInfo
    ) -> str | None:
        """Check that a non-blank `conditional` ends with "Conditional"."""
        if value is not None:
            _raise_if_check_fails(field_checks.valid_conditional_name, value, info.data)
        return value

    @model_validator(mode="after")
    def _value_required_unless_spread(self) -> Self:
        """Check that `value` is set whenever `spread_choices_name` is blank."""
        if self.spread_choices_name is None and self.value is None:
            raise ValueError("value is required when spreadChoicesName is blank")
        return self


class Choices(RootModel[list[ChoiceDefinition]]):
    """
    The whole Choices sheet: a list of ChoiceDefinition that has passed every check,
    the ones on each row and the ones across rows (see its model validators).

    Input: a list (or tuple/set/frozenset) of rows, each either a raw dict (e.g. every
        row of the "Choices" sheet, as read from Excel) or an already-built
        ChoiceDefinition.
    Output: a validated instance — iterable, indexable, `len()`-able, one
        ChoiceDefinition per row in source order — if the whole sheet passes every
        rule; otherwise raises `pydantic.ValidationError`. Its message lists every row
        problem at once; `spreadChoicesName` is only checked once those pass.

    An instance only exists if the sheet is valid, so whatever holds one doesn't need
    to check it again. Build it from the rows as read from the source (dicts) or from
    ChoiceDefinition objects.
    """

    @model_validator(mode="wrap")
    @classmethod
    def _collect_all_issues(cls, rows: Any, handler) -> Any:
        # See Sections._collect_all_issues: this runs every row's checks up front and
        # raises one error listing every problem, instead of stopping at the first.
        if isinstance(rows, (list, tuple, set, frozenset)):
            rows = list(rows)
            if all(isinstance(row, (dict, ChoiceDefinition)) for row in rows):
                choices, issues = collect_sheet_issues(
                    rows=rows,
                    model=ChoiceDefinition,
                    table_name="Choices",
                    sheet_rules=[],
                )
                if issues:
                    raise ValueError("\n".join(issues))
                return handler(choices)
        return handler(rows)

    @model_validator(mode="after")
    def _spread_choices_names_are_valid(self) -> Self:
        """Check that every non-blank `spread_choices_name` names a list that starts in an earlier row."""
        # Runs only once every row is valid (see _collect_all_issues), so row numbers
        # follow the source order. choices.tsx declares each list as a const, in order
        # of first appearance, so a spread can only use a list declared before its own.
        prefix = "Error in Choices - "
        first_row_by_name: dict[str, int] = {}
        for row_number, choice in enumerate(self.root, start=2):
            first_row_by_name.setdefault(choice.choices_name, row_number)
        issues = []

        for row_number, choice in enumerate(self.root, start=2):
            spread = choice.spread_choices_name
            if spread is None:
                continue
            if spread == choice.choices_name:
                reason = "A list cannot spread itself. Name another choicesName."
            elif spread not in first_row_by_name:
                reason = "Does not match any choicesName value."
            elif first_row_by_name[spread] > first_row_by_name[choice.choices_name]:
                reason = (
                    f"The {spread!r} list must start in an earlier row than the "
                    f"{choice.choices_name!r} list. Move its rows above."
                )
            else:
                continue
            issues.append(
                f"{prefix}Invalid spreadChoicesName in row {row_number}: "
                f"{spread!r} - {reason}"
            )
        if issues:
            raise ValueError("\n".join(issues))
        return self

    def by_name(self) -> dict[str, list[ChoiceDefinition]]:
        """
        Group the rows by choices_name: each group is one list of choices, rows in
        source order. Groups are in order of first appearance.
        """
        groups: dict[str, list[ChoiceDefinition]] = {}
        for choice in self.root:
            groups.setdefault(choice.choices_name, []).append(choice)
        return groups

    def __iter__(self) -> Iterator[ChoiceDefinition]:  # type: ignore[override]
        return iter(self.root)

    def __len__(self) -> int:
        return len(self.root)

    def __getitem__(self, index: int) -> ChoiceDefinition:
        return self.root[index]
