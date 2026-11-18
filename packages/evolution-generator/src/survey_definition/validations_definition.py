# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: The Validations table of the survey definition. Several rows share one
# validation_name: together they are that validation, one row per error it can show, in
# source order. A widget names a validation in its validation column (see
# widgets_definition.py), which checks the name against this table.
#
# This module only defines the shape and the checks. See survey_definition.py for the
# bundle of all tables, and scripts/generate_validations.py for TypeScript generation.

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
from survey_definition.conditionals_definition import (
    CONDITIONAL_PATH_EXPANSION_TOKENS,
)
from survey_definition.row_checks import (
    _collect_language_columns,
    _raise_if_check_fails,
    _read_booleans,
    _strip_blanks,
)
from survey_definition.sheet_checks import (
    collect_sheet_issues,
    fields_in_survey_languages,
)
from survey_definition.validation_context import context_languages
from survey_definition.widgets_definition import BUILT_IN_VALIDATIONS

# Field names the Validations source must provide, even though path and value may be
# blank on a given row. The error_message columns (one per language) aren't listed: a
# missing one is reported by the rows that need it. The is_warning column is optional:
# a sheet that never uses it doesn't need it.
VALIDATION_REQUIRED_FIELD_NAMES: tuple[str, ...] = (
    "validation_name",
    "error_name",
    "path",
    "comparison_operator",
    "value",
)

# Prefix of the translated columns: one per language, e.g. error_message::fr.
VALIDATION_ERROR_MESSAGE_COLUMN_PREFIX = "error_message::"

# The operators that compare with `value`, and those that take no value.
VALIDATION_NUMBER_OPERATORS: tuple[str, ...] = (">", "<", ">=", "<=")
VALIDATION_EQUALITY_OPERATORS: tuple[str, ...] = ("===", "!==")
VALIDATION_UNARY_OPERATORS: tuple[str, ...] = ("isBlank", "isNotInteger")

type ValidationOperator = Literal[
    "===", "!==", ">", "<", ">=", "<=", "isBlank", "isNotInteger"
]


class ValidationDefinition(BaseModel):
    """
    One row of the Validations table: one error a validation can show, validated on
    construction.

    Input: one row's fields, as keyword arguments or a dict, keyed by the sheet's
        column names (e.g. `ValidationDefinition(**row)`). A blank or whitespace-only
        cell is treated as an absent value.
    Output: a validated instance if every rule passes (see Attributes below);
        otherwise raises `pydantic.ValidationError` naming every field that failed,
        not just the first.

    The row describes the error: the error is shown when the checked answer
    `comparison_operator` `value` is true, e.g. '<' 7 shows the error for an answer
    below 7. Every operator except isBlank is only checked on a non-blank answer, so a
    validation without an isBlank row lets the question be left blank.

    Build instances through `Validations(rows)` (below), which also checks the rules
    across rows (no error_name or check repeated in a validation). The survey languages
    come from the validation context, e.g. `Validations.model_validate(rows,
    context={"languages": ("fr", "en")})`. Validation is strict: no type coercion
    (e.g. the text "7" is rejected as the value of '<'), except that a number in an
    error message column is read as text.

    Attributes:
        validation_name: Name of the validation this row belongs to; shared by every
            row of the same validation, and written in the widgets' validation column.
            Required; must be a valid TypeScript identifier, not the name of a validation
            of Evolution (BUILT_IN_VALIDATIONS) and not end with 'CustomValidation',
            which names a validation written by hand in customValidations.tsx.
        error_name: Name of this error in its validation, e.g. 'tooHigh': its
            translation key is validations:<validation_name>.<error_name>. Required;
            must be a valid TypeScript identifier.
        path: Response path of the answer to check, e.g. 'household.carNumber'. Blank
            means the answer of the widget itself. May start with one expansion token
            (see CONDITIONAL_PATH_EXPANSION_TOKENS), e.g. '${currentPerson}.age'.
        comparison_operator: When the error is shown: the answer compared with `value`
            ('===', '!==', '>', '<', '>=', '<='), blank (isBlank) or not an integer
            (isNotInteger). Required. A text format (e.g. a postal code) is checked by
            a validation written by hand in customValidations.tsx.
        value: What the answer is compared with: a number for '>', '<', '>=' and '<=',
            a bool, number or text for '===' and '!=='. Required, except for isBlank
            and isNotInteger, which take none.
        error_message: The error message, by language, read from the
            `error_message::<language>` columns. Required in every survey language.
        is_warning: Whether this error is a warning: it is shown, but doesn't stop the
            participant from going on. Blank means false.
    """

    # strict=True: see SectionDefinition.
    model_config = ConfigDict(strict=True)

    @model_validator(mode="before")
    @classmethod
    def _prepare_cells(cls, data: Any) -> Any:
        """Treat a blank/whitespace-only cell as an absent key, read the is_warning cell, and gather the error_message::<language> columns."""
        if not isinstance(data, dict):
            return data
        return _collect_language_columns(
            _read_booleans(_strip_blanks(data), ("is_warning",)),
            "error_message",
            VALIDATION_ERROR_MESSAGE_COLUMN_PREFIX,
        )

    # No default: a blank value here is a genuinely missing required value.
    validation_name: str
    error_name: str
    comparison_operator: ValidationOperator

    path: str | None = None
    # Declared as object, then checked with the operator in _row_is_complete.
    value: object | None = None
    error_message: dict[str, str] = {}
    is_warning: bool = False

    @field_validator("validation_name")
    @classmethod
    def _validation_name_is_valid(cls, value: str, info: ValidationInfo) -> str:
        """Check that `validation_name` is a valid TypeScript identifier, neither built in nor custom."""
        _raise_if_check_fails(field_checks.valid_ts_identifier, value, info.data)
        if value in BUILT_IN_VALIDATIONS:
            raise ValueError(
                "Is the name of a validation of Evolution: use it directly in the "
                "widget's validation column, or choose another name"
            )
        if value.endswith("CustomValidation"):
            raise ValueError(
                "Must not end with 'CustomValidation': that suffix names a "
                "validation written by hand in customValidations.tsx"
            )
        return value

    @field_validator("error_name")
    @classmethod
    def _error_name_is_valid_identifier(cls, value: str, info: ValidationInfo) -> str:
        """Check that `error_name` is a valid TypeScript identifier."""
        _raise_if_check_fails(field_checks.valid_ts_identifier, value, info.data)
        return value

    @field_validator("path")
    @classmethod
    def _path_is_valid(cls, value: str | None, info: ValidationInfo) -> str | None:
        """
        Check that a non-blank `path` is a response path, optionally after one
        expansion token, e.g. '${currentPerson}.age'.
        """
        if value is None:
            return value
        tokens_found = [
            token for token in CONDITIONAL_PATH_EXPANSION_TOKENS if token in value
        ]
        if len(tokens_found) > 1:
            raise ValueError(
                "only one expansion token is allowed in the path; "
                f"found {', '.join(tokens_found)}"
            )
        rest = value
        if tokens_found:
            # The generator replaces the token and its dot by the path it stands for.
            token_prefix = f"{tokens_found[0]}."
            if not value.startswith(token_prefix):
                raise ValueError(
                    f"The expansion token must start the path, followed by a dot, "
                    f"e.g. '{token_prefix}age'"
                )
            rest = value.removeprefix(token_prefix)
        _raise_if_check_fails(field_checks.valid_response_path, rest, info.data)
        return value

    # One "after" validator for every rule between fields or needing the context:
    # Pydantic stops at the first failing one, so a second would hide its problems.
    @model_validator(mode="after")
    def _row_is_complete(self, info: ValidationInfo) -> Self:
        """
        Check that `value` suits the comparison_operator, and that the error message is
        in every survey language.
        """
        issues = []
        value_issue = self._value_issue()
        if value_issue is not None:
            issues.append(value_issue)
        languages = context_languages(info)
        issues.extend(
            f"{VALIDATION_ERROR_MESSAGE_COLUMN_PREFIX}{language} is required"
            for language in languages
            if language not in self.error_message
        )
        if issues:
            raise ValueError("; ".join(issues))
        return self

    def _value_issue(self) -> str | None:
        """What is wrong with `value` for the comparison_operator, or None."""
        operator = self.comparison_operator
        value = self.value
        if operator in VALIDATION_UNARY_OPERATORS:
            if value is not None:
                return f"value must be blank for comparison_operator {operator!r}"
            return None
        if value is None:
            return f"value is required for comparison_operator {operator!r}"
        if operator in VALIDATION_NUMBER_OPERATORS:
            if isinstance(value, bool) or not isinstance(value, (int, float)):
                return (
                    f"value must be a number for comparison_operator {operator!r}, "
                    f"got {value!r}"
                )
        elif not field_checks.primitive_value(value, {}):  # '===' or '!=='
            return (
                "value must be a bool, int, float, or str for comparison_operator "
                f"{operator!r}, got {value!r}"
            )
        return None


class Validations(RootModel[list[ValidationDefinition]]):
    """
    The whole Validations sheet: a list of ValidationDefinition that has passed every
    check, the ones on each row and the ones across rows of the same validation_name
    (see its model validators).

    Input: a list (or tuple/set/frozenset) of rows, each either a raw dict (e.g. every
        row of the "Validations" sheet, as read from Excel) or an already-built
        ValidationDefinition.
    Output: a validated instance — iterable, indexable, `len()`-able, one
        ValidationDefinition per row in source order — if the whole sheet passes every
        rule; otherwise raises `pydantic.ValidationError`. Its message lists every row
        problem, and the error messages in another language than the survey languages,
        at once; the rules across rows of a validation are only checked once those pass.

    An instance only exists if the sheet is valid, so whatever holds one doesn't need
    to check it again.
    """

    @model_validator(mode="wrap")
    @classmethod
    def _collect_all_issues(cls, rows: Any, handler, info: ValidationInfo) -> Any:
        # Report every row's problems at once, instead of stopping at the first one.
        if isinstance(rows, (list, tuple, set, frozenset)):
            rows = list(rows)
            if all(isinstance(row, (dict, ValidationDefinition)) for row in rows):
                validations, issues = collect_sheet_issues(
                    rows=rows,
                    model=ValidationDefinition,
                    table_name="Validations",
                    context=info.context,
                    # The rows check that no survey language is missing; this rule
                    # checks the other way, that no message is in another language
                    # (e.g. an error_message::fe typo), reported once for the sheet.
                    sheet_rules=[
                        fields_in_survey_languages(
                            info,
                            {"error_message": VALIDATION_ERROR_MESSAGE_COLUMN_PREFIX},
                        )
                    ],
                )
                if issues:
                    raise ValueError("\n".join(issues))
                return handler(validations)
        return handler(rows)

    @model_validator(mode="after")
    def _grouped_rules_are_valid(self) -> Self:
        """
        Check that no error_name, and no check (the same path, comparison_operator and
        value), repeats within a validation.
        """
        # Runs only once every row is valid (see _collect_all_issues), so row numbers
        # follow the source order.
        prefix = "Error in Validations - "
        rows_by_error: dict[tuple[str, str], list[int]] = {}
        rows_by_check: dict[tuple[str, str | None, str, str], list[int]] = {}
        for row_number, validation in enumerate(self.root, start=2):
            rows_by_error.setdefault(
                (validation.validation_name, validation.error_name), []
            ).append(row_number)
            # repr tells 7 from '7': the generated code compares them differently.
            check = (
                validation.validation_name,
                validation.path,
                validation.comparison_operator,
                repr(validation.value),
            )
            rows_by_check.setdefault(check, []).append(row_number)

        issues = [
            f"{prefix}Duplicate error_name {error_name!r} in validation_name "
            f"{validation_name!r}: found in rows {row_numbers}"
            for (validation_name, error_name), row_numbers in rows_by_error.items()
            if len(row_numbers) > 1
        ]
        issues.extend(
            f"{prefix}Duplicate check in validation_name {validation_name!r}: rows "
            f"{row_numbers} have the same path, comparison_operator and value"
            for (validation_name, _, _, _), row_numbers in rows_by_check.items()
            if len(row_numbers) > 1
        )
        if issues:
            raise ValueError("\n".join(issues))
        return self

    def by_name(self) -> dict[str, list[ValidationDefinition]]:
        """
        Group the rows by validation_name: each group is one validation, its errors in
        source order. Groups are in order of first appearance.
        """
        groups: dict[str, list[ValidationDefinition]] = {}
        for validation in self.root:
            groups.setdefault(validation.validation_name, []).append(validation)
        return groups

    def __iter__(self) -> Iterator[ValidationDefinition]:  # type: ignore[override]
        return iter(self.root)

    def __len__(self) -> int:
        return len(self.root)

    def __getitem__(self, index: int) -> ValidationDefinition:
        return self.root[index]
