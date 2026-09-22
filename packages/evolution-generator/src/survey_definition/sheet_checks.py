# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Checks on a whole sheet (table) of the survey definition, the same for every
# table. collect_sheet_issues parses every row into the table's definition model, then
# runs the rules a single row can't check by itself, given as a list of "sheet rules".
# Each table's module says which model and which rules to use (see
# sections_definition.py::Sections.collect_sections_issues). Reports every problem
# found, not just the first.

from collections.abc import Callable, Sequence

from pydantic import BaseModel, ValidationError

from survey_definition.row_checks import format_pydantic_errors

type SheetRule[M: BaseModel] = Callable[[Sequence[tuple[int, M]], str], list[str]]


def collect_sheet_issues[M: BaseModel](
    rows: list[dict | M],
    model: type[M],
    table_name: str,
    sheet_rules: Sequence[SheetRule[M]],
) -> tuple[list[M], list[str]]:
    """Parse every row into `model`, then run each of `sheet_rules` on the rows that parsed. Returns (parsed rows, every issue found).

    A row that is already a `model` instance was checked when it was built, so it is
    kept as is; the sheet rules still apply to it. Blank-stripping isn't done here:
    each table's own model handles that itself (see SectionDefinition._strip_blank_cells).
    """
    issues: list[str] = []
    parsed: list[tuple[int, M]] = []

    for row_number, row in enumerate(rows, start=2):
        if isinstance(row, model):
            parsed.append((row_number, row))
            continue
        try:
            definition = model(**row)
        except ValidationError as exc:
            issues.extend(format_pydantic_errors(exc, table_name, row_number))
            continue
        parsed.append((row_number, definition))

    for sheet_rule in sheet_rules:
        issues.extend(sheet_rule(parsed, table_name))

    return [definition for _, definition in parsed], issues


def unique_field(field_name: str) -> SheetRule[BaseModel]:
    """Build a sheet rule: the value of `field_name` must not repeat across rows."""

    def rule(rows: Sequence[tuple[int, BaseModel]], table_name: str) -> list[str]:
        prefix = f"Error in {table_name} - "
        row_numbers_by_value: dict[str, list[int]] = {}
        for row_number, definition in rows:
            row_numbers_by_value.setdefault(getattr(definition, field_name), []).append(
                row_number
            )
        return [
            f"{prefix}Duplicate {field_name} {value!r}: found in rows {row_numbers}"
            for value, row_numbers in row_numbers_by_value.items()
            if len(row_numbers) > 1
        ]

    return rule
