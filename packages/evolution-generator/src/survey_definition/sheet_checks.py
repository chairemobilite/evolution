# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Checks on the whole Sections sheet: parses every row into a
# SectionDefinition (see sections_definition.py), then checks the rules a single row
# can't check by itself (a field unique across the table, parent_section naming a real
# section). Reports every problem found, not just the first.

from pydantic import ValidationError

from survey_definition.row_checks import _strip_blanks, format_pydantic_errors
from survey_definition.sections_definition import SectionDefinition


# TODO: make this more global (one generic collect_*_issues shared by every table) once
# the other tables are enabled.
def collect_sections_issues(
    rows: list[dict], table_name: str = "Sections"
) -> tuple[list[SectionDefinition], list[str]]:
    """Parse every Sections row, then check table-wide rules (unique section/abbreviation, parent_section exists). Returns (parsed sections, every issue found)."""
    issues: list[str] = []
    parsed: list[tuple[int, SectionDefinition]] = []

    for row_number, row in enumerate(rows, start=2):
        try:
            section = SectionDefinition(**_strip_blanks(row))
        except ValidationError as exc:
            issues.extend(format_pydantic_errors(exc, table_name, row_number))
            continue
        parsed.append((row_number, section))

    issues.extend(_duplicate_value_issues(parsed, "section", table_name))
    issues.extend(_duplicate_value_issues(parsed, "abbreviation", table_name))
    issues.extend(_parent_section_issues(parsed, table_name))

    return [section for _, section in parsed], issues


def _duplicate_value_issues(
    rows: list[tuple[int, SectionDefinition]], field_name: str, table_name: str
) -> list[str]:
    """Find every value of `field_name` that repeats across `rows`."""
    prefix = f"Error in {table_name} - "
    row_numbers_by_value: dict[str, list[int]] = {}
    for row_number, section in rows:
        row_numbers_by_value.setdefault(getattr(section, field_name), []).append(
            row_number
        )
    return [
        f"{prefix}Duplicate {field_name} {value!r}: found in rows {row_numbers}"
        for value, row_numbers in row_numbers_by_value.items()
        if len(row_numbers) > 1
    ]


def _parent_section_issues(
    rows: list[tuple[int, SectionDefinition]], table_name: str
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
