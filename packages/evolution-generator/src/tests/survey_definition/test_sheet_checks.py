# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for survey_definition/sheet_checks.py: collect_sections_issues
# (per-row rules, then the rules across the whole table).

from pydantic import BaseModel

from survey_definition.sheet_checks import (
    collect_sections_issues,
    collect_sheet_issues,
    unique_field,
)


class TestCollectSectionsIssues:
    def _valid_section_row(self, section: str, abbreviation: str) -> dict:
        return {
            "section": section,
            "title_fr": "Accueil",
            "title_en": "Home",
            "in_nav": True,
            "abbreviation": abbreviation,
        }

    def test_no_issues_for_a_valid_table(self):
        rows = [
            self._valid_section_row("home", "HM_"),
            self._valid_section_row("profile", "PR_"),
        ]
        sections, issues = collect_sections_issues(rows)
        assert issues == []
        assert [section.section for section in sections] == ["home", "profile"]

    def test_includes_each_row_s_own_issues(self):
        rows = [
            self._valid_section_row("home", "HM_"),
            {**self._valid_section_row("profile", "PR_"), "section": None},
        ]
        sections, issues = collect_sections_issues(rows)
        assert issues == [
            "Error in Sections - Required field is missing in row 3. "
            "Missing fields: ['section']"
        ]
        # The invalid row is skipped, not included in the parsed sections.
        assert [section.section for section in sections] == ["home"]

    def test_blank_required_values_are_grouped_into_one_missing_message(self):
        rows = [
            {
                **self._valid_section_row("home", "HM_"),
                "section": "",
                "abbreviation": "",
            }
        ]
        _, issues = collect_sections_issues(rows)
        assert issues == [
            "Error in Sections - Required field is missing in row 2. "
            "Missing fields: ['section', 'abbreviation']"
        ]

    def test_reports_section_that_is_not_a_valid_identifier(self):
        rows = [self._valid_section_row("1bad", "HM_")]
        _, issues = collect_sections_issues(rows)
        assert issues == [
            "Error in Sections - Invalid section in row 2: '1bad' - "
            "Must be a valid TypeScript identifier "
            "(letters, digits, '_' or '$', not starting with a digit)."
        ]

    def test_reports_abbreviation_not_ending_with_underscore(self):
        rows = [{**self._valid_section_row("home", "HM"), "abbreviation": "HM"}]
        _, issues = collect_sections_issues(rows)
        assert issues == [
            "Error in Sections - Invalid abbreviation in row 2: 'HM' - "
            "Must end with an underscore ('_'), e.g. 'h_'."
        ]

    def test_reports_enable_conditional_not_ending_with_conditional(self):
        rows = [
            {**self._valid_section_row("home", "HM_"), "enable_conditional": "hasSize1"}
        ]
        _, issues = collect_sections_issues(rows)
        assert issues == [
            "Error in Sections - Invalid enable_conditional in row 2: "
            "'hasSize1' - Must end with 'Conditional' or 'CustomConditional' "
            "(e.g. 'hasHouseholdSize1Conditional', 'isCompleteCustomConditional')."
        ]

    def test_reports_completion_conditional_not_ending_with_conditional(self):
        rows = [
            {
                **self._valid_section_row("home", "HM_"),
                "completion_conditional": "isDone",
            }
        ]
        _, issues = collect_sections_issues(rows)
        assert issues == [
            "Error in Sections - Invalid completion_conditional in row 2: "
            "'isDone' - Must end with 'Conditional' or 'CustomConditional' "
            "(e.g. 'hasHouseholdSize1Conditional', 'isCompleteCustomConditional')."
        ]

    def test_accepts_valid_conditional_names(self):
        rows = [
            {
                **self._valid_section_row("home", "HM_"),
                "enable_conditional": "hasSize1Conditional",
                "completion_conditional": "isDoneCustomConditional",
            }
        ]
        sections, issues = collect_sections_issues(rows)
        assert issues == []
        assert sections[0].enable_conditional == "hasSize1Conditional"
        assert sections[0].completion_conditional == "isDoneCustomConditional"

    def test_allows_blank_conditionals(self):
        rows = [
            {
                **self._valid_section_row("home", "HM_"),
                "enable_conditional": "",
                "completion_conditional": None,
            }
        ]
        sections, issues = collect_sections_issues(rows)
        assert issues == []
        assert sections[0].enable_conditional is None
        assert sections[0].completion_conditional is None

    def test_reports_wrong_type(self):
        rows = [{**self._valid_section_row("home", "HM_"), "in_nav": "yes"}]
        _, issues = collect_sections_issues(rows)
        assert issues == [
            "Error in Sections - Invalid in_nav in row 2: 'yes' - "
            "Input should be a valid boolean"
        ]

    def test_reports_missing_titles_when_in_nav_is_true(self):
        rows = [
            {
                **self._valid_section_row("home", "HM_"),
                "title_fr": None,
                "title_en": None,
            }
        ]
        _, issues = collect_sections_issues(rows)
        assert issues == [
            "Error in Sections - Invalid row 2: "
            "title_fr and title_en are required when in_nav is true",
        ]

    def test_reports_only_the_missing_title_when_in_nav_is_true(self):
        rows = [{**self._valid_section_row("home", "HM_"), "title_en": None}]
        _, issues = collect_sections_issues(rows)
        assert issues == [
            "Error in Sections - Invalid row 2: "
            "title_en is required when in_nav is true"
        ]

    def test_allows_missing_titles_when_in_nav_is_false(self):
        rows = [
            {
                **self._valid_section_row("home", "HM_"),
                "title_fr": None,
                "title_en": None,
                "in_nav": False,
            }
        ]
        _, issues = collect_sections_issues(rows)
        assert issues == []

    def test_collects_every_row_level_issue_in_one_pass(self):
        rows = [{**self._valid_section_row("1bad", "HM")}]
        _, issues = collect_sections_issues(rows)
        assert issues == [
            "Error in Sections - Invalid section in row 2: '1bad' - "
            "Must be a valid TypeScript identifier "
            "(letters, digits, '_' or '$', not starting with a digit).",
            "Error in Sections - Invalid abbreviation in row 2: 'HM' - "
            "Must end with an underscore ('_'), e.g. 'h_'.",
        ]

    def test_reports_duplicate_section_values(self):
        rows = [
            self._valid_section_row("home", "HM_"),
            self._valid_section_row("profile", "PR_"),
            self._valid_section_row("home", "HM2_"),
        ]
        _, issues = collect_sections_issues(rows)
        assert issues == [
            "Error in Sections - Duplicate section 'home': found in rows [2, 4]"
        ]

    def test_reports_duplicate_abbreviations_too(self):
        # abbreviation is unique independently of section.
        rows = [
            self._valid_section_row("home", "HM_"),
            self._valid_section_row("profile", "HM_"),
        ]
        _, issues = collect_sections_issues(rows)
        assert issues == [
            "Error in Sections - Duplicate abbreviation 'HM_': found in rows [2, 3]"
        ]

    def test_allows_parent_section_that_names_a_real_section(self):
        rows = [
            self._valid_section_row("home", "HM_"),
            {**self._valid_section_row("profile", "PR_"), "parent_section": "home"},
        ]
        _, issues = collect_sections_issues(rows)
        assert issues == []

    def test_reports_parent_section_that_names_no_section(self):
        rows = [
            self._valid_section_row("home", "HM_"),
            {
                **self._valid_section_row("profile", "PR_"),
                "parent_section": "doesNotExist",
            },
        ]
        _, issues = collect_sections_issues(rows)
        assert issues == [
            "Error in Sections - Invalid parent_section in row 3: "
            "'doesNotExist' does not match any section value"
        ]

    def test_an_invalid_row_is_not_checked_against_uniqueness_or_parent_section(self):
        # A row that failed its own validation is skipped by the table-wide checks
        # too — it's not in `sections`, so it can't spuriously trigger or absorb a
        # duplicate/parent_section issue.
        rows = [
            self._valid_section_row("home", "HM_"),
            {**self._valid_section_row("home", "HM2_"), "section": None},
        ]
        sections, issues = collect_sections_issues(rows)
        assert issues == [
            "Error in Sections - Required field is missing in row 3. "
            "Missing fields: ['section']"
        ]
        assert len(sections) == 1


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
