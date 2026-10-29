# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: The Choices table of the survey definition. Several rows share one choicesName:
# together they are that list of choices, in source order. A row is either one choice
# (value and labels) or a spread of another list (spreadChoicesName), which copies all of
# that list's choices in its place.
#
# This module only defines the shape and the checks; it does not read any input source.
# See survey_definition.py for the bundle of all tables, and scripts/generate_choices.py
# for TypeScript generation.

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
from survey_definition.sheet_checks import (
    collect_sheet_issues,
    fields_in_survey_languages,
)
from survey_definition.validation_context import context_languages

# Field names the Choices source must provide, even though value, spreadChoicesName and
# conditional may be blank on a given row. The label columns (one per language) aren't
# listed: a missing one is reported by the rows that need it. The label_one::<language>
# and hidden columns are optional: a sheet that never uses them doesn't need them.
CHOICE_REQUIRED_FIELD_NAMES: tuple[str, ...] = (
    "choicesName",
    "value",
    "spreadChoicesName",
    "conditional",
)

# Prefixes of the translated columns: one per language, e.g. label::fr, label_one::en.
CHOICE_LABEL_COLUMN_PREFIX = "label::"
CHOICE_LABEL_ONE_COLUMN_PREFIX = "label_one::"


class ChoiceDefinition(BaseModel):
    """
    One row of the Choices table: one choice of a list, or a spread of another list,
    validated on construction.

    Input: one row's fields, as keyword arguments or a dict, keyed by the sheet's
        column names (e.g. `ChoiceDefinition(**row)`, one row of the "Choices" sheet).
        A blank or whitespace-only cell is treated as an absent value.
    Output: a validated instance if every rule passes (see Attributes below);
        otherwise raises `pydantic.ValidationError` naming every field that failed,
        not just the first.

    Build instances through `Choices(rows)` (below), which also checks the rules across
    rows (`spreadChoicesName` names a list that starts earlier, no value repeated in a
    list, no label in another language than the survey languages). What a row can't know by itself comes from
    the validation context (see validation_context.py): the survey languages, and the
    conditional names of the Conditionals table, e.g. `Choices.model_validate(rows,
    context={"languages": ("fr", "en"), "conditional_names": {"isAdultConditional"}})`.
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
            columns, used when the label is addressed to a single person. Optional, but
            when set, it must be in every survey language too.
        spread_choices_name: Name of another list whose choices are copied in place of
            this row (column `spreadChoicesName`). If set, must name a list that starts
            in an earlier row; this row's value and labels are then not used.
        conditional: Name of the conditional that decides whether this choice is shown.
            If set, a generated one (not a custom conditional) must be in the
            Conditionals table.
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
        data = _collect_language_columns(
            _strip_blanks(data), "label_one", CHOICE_LABEL_ONE_COLUMN_PREFIX
        )
        return _collect_language_columns(data, "label", CHOICE_LABEL_COLUMN_PREFIX)

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

    # One "after" validator for every rule between fields or needing the context:
    # Pydantic stops at the first failing one, so a second would hide its problems.
    @model_validator(mode="after")
    def _choice_is_complete(self, info: ValidationInfo) -> Self:
        """
        Check that a choice (not a spread) has a value and a label in every survey
        language, that `label_one`, when set, is in every survey language too, and
        that `conditional`, unless custom, names a conditional of the Conditionals table.
        """
        issues = []
        if self.spread_choices_name is None:
            if self.value is None:
                issues.append("value is required when spreadChoicesName is blank")
            # The languages are only read here, so a spread row needs none.
            languages = context_languages(info)
            issues.extend(
                f"{CHOICE_LABEL_COLUMN_PREFIX}{language} is required"
                for language in languages
                if language not in self.label
            )
            if self.label_one:
                issues.extend(
                    f"{CHOICE_LABEL_ONE_COLUMN_PREFIX}{language} is required when "
                    "label_one is set in another language"
                    for language in languages
                    if language not in self.label_one
                )
        # A name ending with 'CustomConditional' is written by hand in
        # customConditionals.tsx, so it isn't in the Conditionals table. Without the
        # conditional names (the Conditionals table is invalid, and reported as such),
        # there is nothing to compare to.
        conditional_names = (info.context or {}).get("conditional_names")
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
        if issues:
            raise ValueError("; ".join(issues))
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
        problem, and the labels in another language than the survey languages, at
        once; `spreadChoicesName` and the duplicate values of a list are only checked
        once those pass.

    An instance only exists if the sheet is valid, so whatever holds one doesn't need
    to check it again. Build it from the rows as read from the source (dicts) or from
    ChoiceDefinition objects.
    """

    @model_validator(mode="wrap")
    @classmethod
    def _collect_all_issues(cls, rows: Any, handler, info: ValidationInfo) -> Any:
        # Report every row's problems at once, instead of stopping at the first one.
        if isinstance(rows, (list, tuple, set, frozenset)):
            rows = list(rows)
            if all(isinstance(row, (dict, ChoiceDefinition)) for row in rows):
                choices, issues = collect_sheet_issues(
                    rows=rows,
                    model=ChoiceDefinition,
                    table_name="Choices",
                    context=info.context,
                    # The rows check that no survey language is missing; this rule
                    # checks the other way, that no label is in another language
                    # (e.g. a label::fe typo), reported once for the sheet.
                    sheet_rules=[
                        fields_in_survey_languages(
                            info,
                            {
                                "label": CHOICE_LABEL_COLUMN_PREFIX,
                                "label_one": CHOICE_LABEL_ONE_COLUMN_PREFIX,
                            },
                        )
                    ],
                )
                if issues:
                    raise ValueError("\n".join(issues))
                return handler(choices)
        return handler(rows)

    @model_validator(mode="after")
    def _lists_are_valid(self) -> Self:
        """
        Check that every non-blank `spread_choices_name` names a list that starts in an
        earlier row, and that no value repeats within a list.
        """
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

        issues.extend(self._duplicate_value_issues(prefix))
        if issues:
            raise ValueError("\n".join(issues))
        return self

    def _duplicate_value_issues(self, prefix: str) -> list[str]:
        """
        Check that no value repeats within a list, counting the values its spread rows
        bring in: choices.tsx writes them all in the list.
        """
        # choices.tsx and the choices locales write each value as text, keyed by its
        # list (choices:<choicesName>.<value>), so e.g. 1 and "1" are the same value.
        # Lists are expanded in order of first appearance, so a valid spread names a
        # list already expanded; an invalid one (already reported) is skipped.
        expanded_values: dict[str, list[str]] = {}
        issues = []
        row_number_by_choice = {
            id(choice): row_number
            for row_number, choice in enumerate(self.root, start=2)
        }
        for choices_name, choices in self.by_name().items():
            # Each value with the row of this list it comes from, and the spread list
            # that brings it, if any.
            occurrences: list[tuple[str, int, str | None]] = []
            for choice in choices:
                row_number = row_number_by_choice[id(choice)]
                spread = choice.spread_choices_name
                if spread is None:
                    occurrences.append((str(choice.value), row_number, None))
                else:
                    occurrences.extend(
                        (value, row_number, spread)
                        for value in expanded_values.get(spread, [])
                    )
            expanded_values[choices_name] = [value for value, _, _ in occurrences]

            occurrences_by_value: dict[str, list[tuple[int, str | None]]] = {}
            for value, row_number, spread in occurrences:
                occurrences_by_value.setdefault(value, []).append((row_number, spread))
            for value, found in occurrences_by_value.items():
                if len(found) < 2:
                    continue
                spreads = ", ".join(
                    f"row {row_number} spreads {spread!r}"
                    for row_number, spread in found
                    if spread is not None
                )
                issues.append(
                    f"{prefix}Duplicate value {value!r} in choicesName "
                    f"{choices_name!r}: found in rows "
                    f"{[row_number for row_number, _ in found]}"
                    + (f" ({spreads})" if spreads else "")
                )
        return issues

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
