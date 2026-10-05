# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: The Conditionals table of the survey definition: ConditionalDefinition, one
# Pydantic model per row, validated on construction (types, allowed values, per-field
# checks); and Conditionals, the whole checked table, whose validation also runs the
# rules that depend on grouping rows by conditional_name (several rows together make
# one conditional's logical expression): balanced parentheses, only the first row of a
# group may omit logical_operator, and value_when_hidden must agree within a group.
#
# This module only defines the shape and the checks; it does not read any input source
# or generate TypeScript. See survey_definition.py for the bundle of all tables, and
# scripts/conditionals_generator.py for TypeScript generation from a built Conditionals.

from collections.abc import Iterator
from typing import Literal, Self

from pydantic import (
    BaseModel,
    ConfigDict,
    RootModel,
    ValidationInfo,
    field_validator,
    model_validator,
)

from survey_definition import field_checks
from survey_definition.row_checks import _raise_if_check_fails, _strip_blanks
from survey_definition.sheet_checks import collect_sheet_issues

# Field names the Conditionals source must provide, even though logical_operator,
# parentheses and value_when_hidden may be blank on a given row.
CONDITIONAL_REQUIRED_FIELD_NAMES: tuple[str, ...] = (
    "conditional_name",
    "logical_operator",
    "path",
    "comparison_operator",
    "value",
    "parentheses",
    "value_when_hidden",
)

# Tokens a path may expand to (see ConditionalsGenerator.CONDITIONALS_CURRENT_CONTEXT_SPECS,
# which carries the richer per-token data generate_typescript_code needs); a path may use
# at most one of these.
CONDITIONAL_PATH_EXPANSION_TOKENS: tuple[str, ...] = (
    "${relativePath}",
    "${currentPerson}",
    "${currentJourney}",
    "${currentTrip}",
    "${currentSegment}",
    "${currentVisitedPlace}",
)


class ConditionalDefinition(BaseModel):
    """
    One row of the Conditionals table: one term of a conditional's logical expression,
    validated on construction.

    Input: one row's fields, as keyword arguments or a dict (e.g.
        `ConditionalDefinition(**row)`, one row of the "Conditionals" sheet). A blank or
        whitespace-only cell is treated as an absent value.
    Output: a validated instance if every per-row rule passes; otherwise raises
        `pydantic.ValidationError` naming every field that failed, not just the first.

    Several rows share one `conditional_name`: together they are that conditional's
    logical expression, combined left to right by each row's `logical_operator` and
    grouped by `parentheses`. Build instances through `Conditionals(rows)` (below),
    which also runs the rules that need the whole group (balanced parentheses, only the
    first row of a group may omit `logical_operator`, `value_when_hidden` agrees across
    the group).

    Attributes:
        conditional_name: Name of the conditional this row belongs to; shared by every
            row of the same conditional. Required.
        logical_operator: How this row combines with the previous one ('||' or '&&').
            Required (non-blank) on every row of a conditional except its first.
        path: Interview path this row compares, e.g. 'household.size'. May contain at
            most one expansion token (see CONDITIONAL_PATH_EXPANSION_TOKENS). Required.
        comparison_operator: How `path` is compared to `value`. Required.
        value: Value `path` is compared against. Required.
        parentheses: Groups rows of a conditional: '(' opens a group, ')' closes it.
            Blank means this row is in no group of its own.
        value_when_hidden: Value the conditional evaluates to while its widget is
            hidden. Blank means no override. When several rows of the same conditional
            set it, they must all agree.
    """

    model_config = ConfigDict(strict=True)

    @model_validator(mode="before")
    @classmethod
    def _strip_blank_cells(cls, data) -> object:
        """Treat a blank/whitespace-only cell as an absent key, not a genuinely blank value."""
        return _strip_blanks(data) if isinstance(data, dict) else data

    # No default: a blank value here is a genuinely missing required value.
    conditional_name: str
    path: str
    comparison_operator: Literal["===", "!==", ">", "<", ">=", "<="]
    value: object

    logical_operator: Literal["||", "&&"] | None = None
    parentheses: Literal["(", ")"] | None = None
    value_when_hidden: object | None = None

    @field_validator("path")
    @classmethod
    def _path_has_at_most_one_expansion_token(
        cls, value: str, info: ValidationInfo
    ) -> str:
        """Check that `path` contains at most one expansion token."""
        tokens_found = [
            token for token in CONDITIONAL_PATH_EXPANSION_TOKENS if token in value
        ]
        if len(tokens_found) > 1:
            raise ValueError(
                "only one expansion token is allowed in the path; "
                f"found {', '.join(tokens_found)} in {value!r}"
            )
        return value

    @field_validator("value")
    @classmethod
    def _value_is_primitive(cls, value: object, info: ValidationInfo) -> object:
        """Check that `value` is a bool, int, float, or str."""
        _raise_if_check_fails(field_checks.primitive_value, value, info.data)
        return value

    @field_validator("value_when_hidden")
    @classmethod
    def _value_when_hidden_is_primitive(
        cls, value: object | None, info: ValidationInfo
    ) -> object | None:
        """Check that a non-blank `value_when_hidden` is a bool, int, float, or str."""
        if value is not None:
            _raise_if_check_fails(field_checks.primitive_value, value, info.data)
        return value


class Conditionals(RootModel[list[ConditionalDefinition]]):
    """
    The whole Conditionals sheet: a list of ConditionalDefinition that has passed every
    check, the ones on each row and the ones across rows of the same conditional_name
    (see its model validators).

    Input: a list (or tuple/set/frozenset) of rows, each either a raw dict (e.g. every
        row of the "Conditionals" sheet, as read from Excel) or an already-built
        ConditionalDefinition.
    Output: a validated instance — iterable, indexable, `len()`-able, one
        ConditionalDefinition per row in source order — if the whole sheet passes every
        rule; otherwise raises `pydantic.ValidationError`. Its message lists every row
        problem at once; the grouped rules below are only checked once those pass.

    An instance only exists if the sheet is valid, so whatever holds one doesn't need
    to check it again. Build it from the rows as read from the source (dicts) or from
    ConditionalDefinition objects.
    """

    @model_validator(mode="wrap")
    @classmethod
    def _collect_all_issues(cls, rows: object, handler) -> object:
        # See Sections._collect_all_issues: this runs every row's checks up front and
        # raises one error listing every problem, instead of stopping at the first.
        if isinstance(rows, (list, tuple, set, frozenset)):
            rows = list(rows)
            if all(isinstance(row, (dict, ConditionalDefinition)) for row in rows):
                conditionals, issues = collect_sheet_issues(
                    rows=rows,
                    model=ConditionalDefinition,
                    table_name="Conditionals",
                    sheet_rules=[],
                )
                if issues:
                    raise ValueError("\n".join(issues))
                return handler(conditionals)
        return handler(rows)

    @model_validator(mode="after")
    def _grouped_rules_are_valid(self) -> Self:
        """Check the rules that need every row of the same conditional_name together."""
        # Runs only once every row is individually valid (see _collect_all_issues), so
        # row numbers follow the source order. A conditional_name is not unique: every
        # row sharing one name is one term of that conditional's logical expression.
        prefix = "Error in Conditionals - "
        groups: dict[str, list[tuple[int, ConditionalDefinition]]] = {}
        for row_number, conditional in enumerate(self.root, start=2):
            groups.setdefault(conditional.conditional_name, []).append(
                (row_number, conditional)
            )

        issues: list[str] = []
        issues.extend(self._parentheses_balance_issues(groups, prefix))
        issues.extend(self._logical_operator_issues(groups, prefix))
        issues.extend(self._value_when_hidden_issues(groups, prefix))

        if issues:
            raise ValueError("\n".join(issues))
        return self

    @staticmethod
    def _parentheses_balance_issues(
        groups: dict[str, list[tuple[int, "ConditionalDefinition"]]], prefix: str
    ) -> list[str]:
        """Check that for each conditional_name group, '(' and ')' balance and never go negative."""
        issues: list[str] = []
        for name, group in groups.items():
            balance = 0
            unbalanced = False
            for row_number, conditional in group:
                if conditional.parentheses == "(":
                    balance += 1
                elif conditional.parentheses == ")":
                    balance -= 1
                    if balance < 0:
                        issues.append(
                            f"{prefix}Unbalanced parentheses for conditional_name {name!r} in row {row_number}: "
                            "too many ')' (closing parenthesis without matching opening)."
                        )
                        unbalanced = True
                        break
            if unbalanced:
                continue
            if balance != 0:
                last_row_number = group[-1][0]
                issues.append(
                    f"{prefix}Unbalanced parentheses for conditional_name {name!r} (e.g. row {last_row_number}): "
                    f"{balance} unclosed opening parenthesis/parentheses."
                )
        return issues

    @staticmethod
    def _logical_operator_issues(
        groups: dict[str, list[tuple[int, "ConditionalDefinition"]]], prefix: str
    ) -> list[str]:
        """Check that only the first row of each conditional_name group omits logical_operator."""
        issues: list[str] = []
        for name, group in groups.items():
            first_row_number, first = group[0]
            if first.logical_operator is not None:
                issues.append(
                    f"{prefix}Invalid logical_operator in row {first_row_number}: "
                    f"first row of a conditional must have empty logical_operator, got {first.logical_operator!r}"
                )
            for row_number, conditional in group[1:]:
                if conditional.logical_operator is None:
                    issues.append(
                        f"{prefix}Missing logical_operator in row {row_number}: "
                        f"non-first row of a conditional must have a logical_operator for conditional_name {name!r}"
                    )
        return issues

    @staticmethod
    def _value_when_hidden_issues(
        groups: dict[str, list[tuple[int, "ConditionalDefinition"]]], prefix: str
    ) -> list[str]:
        """Check that value_when_hidden, when set more than once in a conditional_name group, agrees."""
        issues: list[str] = []
        for name, group in groups.items():
            values_when_hidden = {
                conditional.value_when_hidden
                for _row_number, conditional in group
                if conditional.value_when_hidden is not None
            }
            if len(values_when_hidden) > 1:
                issues.append(
                    f"{prefix}Multiple value_when_hidden for conditional_name {name!r}: "
                    f"{sorted(values_when_hidden)}"
                )
        return issues

    def __iter__(self) -> Iterator[ConditionalDefinition]:  # type: ignore[override]
        return iter(self.root)

    def __len__(self) -> int:
        return len(self.root)

    def __getitem__(self, index: int) -> ConditionalDefinition:
        return self.root[index]
