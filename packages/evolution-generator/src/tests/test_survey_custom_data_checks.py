# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for helpers/survey_custom_data_checks.py (reusable per-cell checks for ColumnSpec).
# Every check takes (value, row); these checks all ignore row, so an empty dict stands in.

from helpers import survey_custom_data_checks


class TestValidTsIdentifier:
    def test_accepts_simple_name(self):
        assert (
            survey_custom_data_checks.valid_ts_identifier("householdSize", {}) is True
        )

    def test_accepts_underscore_and_dollar_prefixes(self):
        assert survey_custom_data_checks.valid_ts_identifier("_privateName", {}) is True
        assert survey_custom_data_checks.valid_ts_identifier("$specialName", {}) is True

    def test_rejects_name_starting_with_digit(self):
        assert survey_custom_data_checks.valid_ts_identifier("1stQuestion", {}) is False

    def test_rejects_name_with_spaces(self):
        assert (
            survey_custom_data_checks.valid_ts_identifier("household size", {}) is False
        )

    def test_rejects_name_with_dots(self):
        assert (
            survey_custom_data_checks.valid_ts_identifier("household.size", {}) is False
        )


class TestValidPathChars:
    def test_accepts_simple_path(self):
        assert survey_custom_data_checks.valid_path_chars("household.size", {}) is True

    def test_accepts_curly_brace_tokens(self):
        # Widgets.path uses `{token}` placeholders (see generate_widgets.py::generate_path);
        # the `${token}` expansion syntax is specific to the Conditionals sheet's path column.
        assert (
            survey_custom_data_checks.valid_path_chars(
                "household.persons.{personId}.age", {}
            )
            is True
        )

    def test_rejects_spaces(self):
        assert survey_custom_data_checks.valid_path_chars("household size", {}) is False

    def test_rejects_disallowed_characters(self):
        assert survey_custom_data_checks.valid_path_chars("household/size", {}) is False
        assert survey_custom_data_checks.valid_path_chars("household-size", {}) is False


class TestNonBlank:
    def test_accepts_non_empty_string(self):
        assert survey_custom_data_checks.non_blank("hello", {}) is True

    def test_accepts_non_string_values(self):
        assert survey_custom_data_checks.non_blank(0, {}) is True
        assert survey_custom_data_checks.non_blank(False, {}) is True

    def test_rejects_empty_string(self):
        assert survey_custom_data_checks.non_blank("", {}) is False

    def test_rejects_whitespace_only_string(self):
        assert survey_custom_data_checks.non_blank("   ", {}) is False


class TestEndsWithUnderscore:
    def test_accepts_value_ending_with_underscore(self):
        assert survey_custom_data_checks.ends_with_underscore("h_", {}) is True

    def test_rejects_value_not_ending_with_underscore(self):
        assert survey_custom_data_checks.ends_with_underscore("h", {}) is False

    def test_rejects_underscore_in_the_middle_only(self):
        assert survey_custom_data_checks.ends_with_underscore("h_m", {}) is False


class TestValidConditionalName:
    def test_accepts_generated_conditional_name(self):
        assert (
            survey_custom_data_checks.valid_conditional_name(
                "hasHouseholdSize1Conditional", {}
            )
            is True
        )

    def test_accepts_custom_conditional_name(self):
        # "CustomConditional" already ends with "Conditional", so one check covers both.
        assert (
            survey_custom_data_checks.valid_conditional_name(
                "isCompleteCustomConditional", {}
            )
            is True
        )

    def test_rejects_name_not_ending_with_conditional(self):
        assert (
            survey_custom_data_checks.valid_conditional_name("hasHouseholdSize1", {})
            is False
        )


class TestRequiresTitlesWhenTrue:
    def test_ignores_a_false_value(self):
        assert survey_custom_data_checks.requires_titles_when_true(False, {}) is True

    def test_accepts_true_with_both_titles_set(self):
        row = {"title_fr": "Accueil", "title_en": "Home"}
        assert survey_custom_data_checks.requires_titles_when_true(True, row) is True

    def test_rejects_true_with_a_missing_title(self):
        row = {"title_fr": "Accueil", "title_en": None}
        assert survey_custom_data_checks.requires_titles_when_true(True, row) is False

    def test_rejects_true_with_both_titles_missing(self):
        assert survey_custom_data_checks.requires_titles_when_true(True, {}) is False
