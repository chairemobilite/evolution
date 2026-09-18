# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Checks on a whole sheet (table) of the survey definition. collect_sheet_issues
# is the same for every table: it parses every row into the table's definition model
# (see sections_definition.py), then runs the rules a single row can't check by itself,
# given as a list of "sheet rules". Each table then has its own function that says
# which model and which rules to use (collect_sections_issues for the Sections sheet).
# Reports every problem found, not just the first.

from collections.abc import Callable, Sequence

from pydantic import BaseModel, ValidationError

from survey_definition.row_checks import _strip_blanks, format_pydantic_errors
from survey_definition.sections_definition import SectionDefinition

# A sheet rule gets every parsed row of the sheet as (row number, model), plus the
# table name for the error messages, and returns the issues it found (none if fine).
type SheetRule[M: BaseModel] = Callable[[Sequence[tuple[int, M]], str], list[str]]


def collect_sheet_issues[M: BaseModel](
    rows: list[dict],
    model: type[M],
    table_name: str,
    sheet_rules: Sequence[SheetRule[M]],
) -> tuple[list[M], list[str]]:
    """Parse every row into `model`, then run each of `sheet_rules` on the rows that parsed. Returns (parsed rows, every issue found)."""
    issues: list[str] = []
    parsed: list[tuple[int, M]] = []

    for row_number, row in enumerate(rows, start=2):
        try:
            definition = model(**_strip_blanks(row))
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


# -------------------------------------- Sections --------------------------------------


def collect_sections_issues(
    rows: list[dict], table_name: str = "Sections"
) -> tuple[list[SectionDefinition], list[str]]:
    """Parse every Sections row, then check table-wide rules (unique section/abbreviation, parent_section exists). Returns (parsed sections, every issue found)."""
    return collect_sheet_issues(
        rows,
        SectionDefinition,
        table_name,
        [unique_field("section"), unique_field("abbreviation"), _parent_section_issues],
    )


def _parent_section_issues(
    rows: Sequence[tuple[int, SectionDefinition]], table_name: str
) -> list[str]:
    """Find every non-blank `parent_section` that doesn't name a real section in `rows`."""
    prefix = f"Error in {table_name} - "
    valid_sections = {section.section for _, section in rows}
    return [
        f"{prefix}Invalid parent_section in row {row_number}: "
        f"{section.parent_section!r} does not match any section value"
        for row_number, section in rows
        if section.parent_section is not None
        and section.parent_section not in valid_sections
    ]
