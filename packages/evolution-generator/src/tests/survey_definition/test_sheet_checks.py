# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for survey_definition/sheet_checks.py: collect_sheet_issues and unique_field,
# the checks shared by every table (see test_sections_definition.py for the Sections ones).

from pydantic import BaseModel

from survey_definition.sheet_checks import collect_sheet_issues, unique_field


class TestCollectSheetIssues:
    # Any model works, not only SectionDefinition: this is what the other tables reuse.
    class _Item(BaseModel):
        name: str
        code: int

    def test_parses_every_row_and_reports_row_errors_with_the_table_name(self):
        rows = [{"name": "a", "code": 1}, {"name": "b"}]
        items, issues = collect_sheet_issues(rows, self._Item, "Items", [])
        assert [item.name for item in items] == ["a"]
        assert issues == [
            "Error in Items - Required field is missing in row 3. "
            "Missing fields: ['code']"
        ]

    def test_runs_every_sheet_rule_on_the_rows_that_parsed(self):
        rows = [
            {"name": "a", "code": 1},
            {"name": "a", "code": 2},
            {"name": "b", "code": 2},
            {"name": "c"},
        ]
        _, issues = collect_sheet_issues(
            rows, self._Item, "Items", [unique_field("name"), unique_field("code")]
        )
        assert issues == [
            "Error in Items - Required field is missing in row 5. "
            "Missing fields: ['code']",
            "Error in Items - Duplicate name 'a': found in rows [2, 3]",
            "Error in Items - Duplicate code 2: found in rows [3, 4]",
        ]
