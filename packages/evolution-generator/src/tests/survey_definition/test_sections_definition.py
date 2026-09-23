# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for survey_definition/sections_definition.py: SectionDefinition and the
# Sections class that holds a checked sheet (constructing Sections runs the per-row
# rules, then the rules across the whole table).

import pytest  # pyright: ignore[reportMissingImports]
from pydantic import ValidationError

from survey_definition.sections_definition import Sections, SectionDefinition


class TestSectionDefinition:
    def test_section_definition_required_fields_and_defaults(self):
        # in_nav=False so title_fr/title_en aren't required for this minimal example.
        section = SectionDefinition(section="home", in_nav=False, abbreviation="HM_")
        assert section.title_fr is None
        assert section.parent_section is None


class TestSections:
    def _row(self, section: str, abbreviation: str, **extra) -> dict:
        return {
            "section": section,
            "in_nav": False,
            "abbreviation": abbreviation,
            **extra,
        }

    def _issues(self, rows: list) -> list[str]:
        """Validate `rows` as a Sections sheet, expecting it to fail; return each issue reported."""
        with pytest.raises(ValidationError) as error:
            Sections(rows)
        assert error.value.error_count() == 1
        return str(error.value.errors()[0]["ctx"]["error"]).split("\n")

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
        sections = Sections(rows)
        assert [section.section for section in sections] == ["home", "profile"]

    def test_includes_each_row_s_own_issues(self):
        rows = [
            self._valid_section_row("home", "HM_"),
            {**self._valid_section_row("profile", "PR_"), "section": None},
        ]
        assert self._issues(rows) == [
            "Error in Sections - Required field is missing in row 3. "
            "Missing fields: ['section']"
        ]

    def test_blank_required_values_are_grouped_into_one_missing_message(self):
        rows = [
            {
                **self._valid_section_row("home", "HM_"),
                "section": "",
                "abbreviation": "",
            }
        ]
        assert self._issues(rows) == [
            "Error in Sections - Required field is missing in row 2. "
            "Missing fields: ['section', 'abbreviation']"
        ]

    def test_reports_section_that_is_not_a_valid_identifier(self):
        rows = [self._valid_section_row("1bad", "HM_")]
        assert self._issues(rows) == [
            "Error in Sections - Invalid section in row 2: '1bad' - "
            "Must be a valid TypeScript identifier "
            "(letters, digits, '_' or '$', not starting with a digit)."
        ]

    def test_reports_abbreviation_not_ending_with_underscore(self):
        rows = [{**self._valid_section_row("home", "HM"), "abbreviation": "HM"}]
        assert self._issues(rows) == [
            "Error in Sections - Invalid abbreviation in row 2: 'HM' - "
            "Must end with an underscore ('_'), e.g. 'h_'."
        ]

    def test_reports_enable_conditional_not_ending_with_conditional(self):
        rows = [
            {**self._valid_section_row("home", "HM_"), "enable_conditional": "hasSize1"}
        ]
        assert self._issues(rows) == [
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
        assert self._issues(rows) == [
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
        sections = Sections(rows)
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
        sections = Sections(rows)
        assert sections[0].enable_conditional is None
        assert sections[0].completion_conditional is None

    def test_reports_wrong_type(self):
        rows = [{**self._valid_section_row("home", "HM_"), "in_nav": "yes"}]
        assert self._issues(rows) == [
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
        assert self._issues(rows) == [
            "Error in Sections - Invalid row 2: "
            "title_fr and title_en are required when in_nav is true",
        ]

    def test_reports_only_the_missing_title_when_in_nav_is_true(self):
        rows = [{**self._valid_section_row("home", "HM_"), "title_en": None}]
        assert self._issues(rows) == [
            "Error in Sections - Invalid row 2: "
            "title_en is required when in_nav is true"
        ]

    def test_reports_whitespace_only_titles_when_in_nav_is_true(self):
        rows = [
            {
                **self._valid_section_row("home", "HM_"),
                "title_fr": "   ",
                "title_en": " ",
            }
        ]
        assert self._issues(rows) == [
            "Error in Sections - Invalid row 2: "
            "title_fr and title_en are required when in_nav is true",
        ]

    def test_treats_a_whitespace_only_template_as_absent(self):
        rows = [{**self._valid_section_row("home", "HM_"), "template": "  "}]
        sections = Sections(rows)
        assert sections[0].template is None

    def test_allows_missing_titles_when_in_nav_is_false(self):
        rows = [
            {
                **self._valid_section_row("home", "HM_"),
                "title_fr": None,
                "title_en": None,
                "in_nav": False,
            }
        ]
        Sections(rows)

    def test_collects_every_row_level_issue_in_one_pass(self):
        rows = [{**self._valid_section_row("1bad", "HM")}]
        assert self._issues(rows) == [
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
        assert self._issues(rows) == [
            "Error in Sections - Duplicate section 'home': found in rows [2, 4]"
        ]

    def test_reports_duplicate_abbreviations_too(self):
        # abbreviation is unique independently of section.
        rows = [
            self._valid_section_row("home", "HM_"),
            self._valid_section_row("profile", "HM_"),
        ]
        assert self._issues(rows) == [
            "Error in Sections - Duplicate abbreviation 'HM_': found in rows [2, 3]"
        ]

    def test_allows_parent_section_that_names_a_real_section(self):
        rows = [
            self._valid_section_row("home", "HM_"),
            {**self._valid_section_row("profile", "PR_"), "parent_section": "home"},
        ]
        Sections(rows)

    def test_reports_parent_section_that_names_no_section(self):
        rows = [
            self._valid_section_row("home", "HM_"),
            {
                **self._valid_section_row("profile", "PR_"),
                "parent_section": "doesNotExist",
            },
        ]
        assert self._issues(rows) == [
            "Error in Sections - Invalid parent_section in row 3: "
            "'doesNotExist' does not match any section value"
        ]

    def test_reports_parent_section_that_is_the_section_itself(self):
        rows = [
            self._valid_section_row("home", "HM_"),
            {**self._valid_section_row("profile", "PR_"), "parent_section": "profile"},
        ]
        assert self._issues(rows) == [
            "Error in Sections - Invalid parent_section in row 3: "
            "'profile' - A section cannot be its own parent. "
            "Name another section, or leave it blank."
        ]

    def test_an_invalid_row_is_not_checked_against_uniqueness_or_parent_section(self):
        # A row that failed its own validation is skipped by the table-wide checks
        # too — it's not in `sections`, so it can't spuriously trigger or absorb a
        # duplicate/parent_section issue.
        rows = [
            self._valid_section_row("home", "HM_"),
            {**self._valid_section_row("home", "HM2_"), "section": None},
        ]
        assert self._issues(rows) == [
            "Error in Sections - Required field is missing in row 3. "
            "Missing fields: ['section']"
        ]

    def test_builds_from_valid_source_rows(self):
        sections = Sections(
            [self._row("home", "HM_"), self._row("intro", "IN_", parent_section="home")]
        )
        assert [s.section for s in sections] == ["home", "intro"]
        assert len(sections) == 2

    def test_reports_every_problem_in_one_error(self):
        rows = [
            self._row("home", "HM_"),
            self._row("bad name", "X"),
            self._row("home", "HM_", parent_section="nope"),
        ]
        with pytest.raises(ValidationError) as error:
            Sections(rows)
        message = str(error.value)
        assert error.value.error_count() == 1
        assert "Invalid section in row 3: 'bad name'" in message
        assert "Invalid abbreviation in row 3: 'X'" in message
        assert "Duplicate section 'home': found in rows [2, 4]" in message
        # parent_section is only checked once every row is valid and section is unique.
        assert "Invalid parent_section" not in message

    def test_treats_blank_values_as_absent(self):
        sections = Sections([self._row("home", "HM_", template="")])
        assert sections[0].template is None

    def test_accepts_section_definition_objects_and_still_checks_the_sheet(self):
        first = SectionDefinition(section="home", in_nav=False, abbreviation="HM_")
        assert len(Sections([first])) == 1
        with pytest.raises(ValidationError, match="Duplicate section 'home'"):
            Sections([first, first])

    def test_leaves_input_that_is_not_a_list_of_rows_to_pydantic(self):
        with pytest.raises(ValidationError, match="valid list"):
            Sections("not a list")
        with pytest.raises(ValidationError, match="valid dictionary|SectionDefinition"):
            Sections([42])

    def test_checks_a_tuple_or_set_of_rows_too(self):
        # Pydantic accepts a tuple/set for a list field by coercing it, which would
        # otherwise skip our own checks entirely (they only ran for an actual list).
        row = {"section": "home", "in_nav": False, "abbreviation": "HM_"}
        with pytest.raises(ValidationError, match="Duplicate section 'home'"):
            Sections((row, row))
        assert len(Sections((row,))) == 1
