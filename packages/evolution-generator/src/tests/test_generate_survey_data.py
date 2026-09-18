# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for scripts/generate_survey_data.py: the SurveyData shape (one Pydantic
# model per table) and the shared field-name/row validation helpers.

import pytest  # pyright: ignore[reportMissingImports]
from pydantic import ValidationError

from scripts.generate_survey_data import (
    SECTION_REQUIRED_FIELD_NAMES,
    SectionData,
    SurveyData,
    _raise_if_check_fails,
    _strip_blanks,
    collect_sections_issues,
    format_pydantic_errors,
    validate_required_field_names,
)


class TestDataclassShapes:
    def test_section_data_required_fields_and_defaults(self):
        # in_nav=False so title_fr/title_en aren't required for this minimal example.
        section = SectionData(section="home", in_nav=False, abbreviation="HM_")
        assert section.title_fr is None
        assert section.parent_section is None

    def test_survey_data_defaults_to_empty_lists(self):
        survey_data = SurveyData()
        assert survey_data.sections == []

    def test_survey_data_holds_parsed_rows(self):
        survey_data = SurveyData(
            sections=[SectionData(section="home", in_nav=False, abbreviation="HM_")],
        )
        assert len(survey_data.sections) == 1


class TestValidateRequiredFieldNames:
    def test_passes_when_all_required_field_names_present(self):
        # Extra/optional fields are ignored.
        validate_required_field_names(
            field_names=list(SECTION_REQUIRED_FIELD_NAMES) + ["someExtraField"],
            expected_field_names=SECTION_REQUIRED_FIELD_NAMES,
            table_name="Sections",
        )

    def test_raises_when_a_required_field_name_is_missing(self):
        # Keep the same field count (so the "too few fields" check doesn't fire
        # instead) but replace one required field name with an unrelated name.
        field_names = [
            name if name != "abbreviation" else "someUnrelatedField"
            for name in SECTION_REQUIRED_FIELD_NAMES
        ]

        with pytest.raises(Exception, match="abbreviation"):
            validate_required_field_names(
                field_names=field_names,
                expected_field_names=SECTION_REQUIRED_FIELD_NAMES,
                table_name="Sections",
            )

    def test_raises_when_too_few_field_names(self):
        # The message should name the required fields, not just say "too few".
        with pytest.raises(Exception, match="Too few fields.*abbreviation"):
            validate_required_field_names(
                field_names=["section"],
                expected_field_names=SECTION_REQUIRED_FIELD_NAMES,
                table_name="Sections",
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
            "Error in Sections - Invalid title_fr in row 2: None - "
            "title_fr and title_en are required when in_nav is true",
            "Error in Sections - Invalid title_en in row 2: None - "
            "title_fr and title_en are required when in_nav is true",
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


class TestStripBlanks:
    def test_drops_none_and_empty_string_values(self):
        assert _strip_blanks({"a": None, "b": "", "c": "kept"}) == {"c": "kept"}

    def test_keeps_falsy_values_that_are_not_blank(self):
        # False and 0 are real answers, not blank cells.
        assert _strip_blanks({"a": False, "b": 0}) == {"a": False, "b": 0}

    def test_does_not_modify_the_input(self):
        row = {"a": None, "b": "kept"}
        _strip_blanks(row)
        assert row == {"a": None, "b": "kept"}


class TestRaiseIfCheckFails:
    def test_does_nothing_when_the_check_passes(self):
        def check(value, row):
            """Must be positive."""
            return value > 0

        assert _raise_if_check_fails(check, 1, {}) is None

    def test_raises_with_the_first_docstring_line_as_the_message(self):
        def check(value, row):
            """Must be positive.

            More detail that should not end up in the message.
            """
            return value > 0

        with pytest.raises(ValueError) as error:
            _raise_if_check_fails(check, -1, {})
        assert str(error.value) == "Must be positive."

    def test_falls_back_to_the_function_name_without_a_docstring(self):
        def is_positive(value, row):
            return value > 0

        with pytest.raises(ValueError, match="is_positive"):
            _raise_if_check_fails(is_positive, -1, {})

    def test_passes_the_row_to_the_check(self):
        seen = {}

        def check(value, row):
            """Records the row it was given."""
            seen["row"] = row
            return True

        _raise_if_check_fails(check, "x", {"sibling": 1})
        assert seen["row"] == {"sibling": 1}


class TestFormatPydanticErrors:
    def _validation_error(self, **row) -> ValidationError:
        with pytest.raises(ValidationError) as error:
            SectionData(**row)
        return error.value

    def test_groups_every_missing_field_into_one_message(self):
        issues = format_pydantic_errors(
            self._validation_error(in_nav=False), table_name="Sections", row_number=5
        )
        assert issues == [
            "Error in Sections - Required field is missing in row 5. "
            "Missing fields: ['section', 'abbreviation']"
        ]

    def test_reports_each_other_error_on_its_own(self):
        issues = format_pydantic_errors(
            self._validation_error(section="home", in_nav="yes", abbreviation="HM"),
            table_name="Sections",
            row_number=3,
        )
        assert issues == [
            "Error in Sections - Invalid in_nav in row 3: 'yes' - "
            "Input should be a valid boolean",
            "Error in Sections - Invalid abbreviation in row 3: 'HM' - "
            "Must end with an underscore ('_'), e.g. 'h_'.",
        ]

    def test_puts_the_missing_message_first_then_the_others(self):
        issues = format_pydantic_errors(
            self._validation_error(in_nav="yes"), table_name="Widgets", row_number=9
        )
        assert issues == [
            "Error in Widgets - Required field is missing in row 9. "
            "Missing fields: ['section', 'abbreviation']",
            "Error in Widgets - Invalid in_nav in row 9: 'yes' - "
            "Input should be a valid boolean",
        ]
