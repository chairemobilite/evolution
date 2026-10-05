# Copyright 2026, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for scripts/generate_survey.py's Excel integrity/loading entry points.

from helpers.generator_helpers import (
    add_mocked_excel_sheet,
    create_mocked_excel_data,
    delete_file_if_exists,
)
from scripts.generate_survey import (
    check_excel_integrity,
    check_excel_integrity_with_messages,
    load_survey_definition_or_raise,
    load_survey_definition_with_messages,
)
from survey_definition.survey_definition import SurveyDefinition

MOCKED_EXCEL_FILE = "src/tests/references/test.xlsx"

VALID_SECTIONS_HEADERS = [
    "section",
    "title_fr",
    "title_en",
    "in_nav",
    "template",
    "parent_section",
    "abbreviation",
]
VALID_SECTIONS_ROWS = [["home", "Accueil", "Home", True, "", "", "HM_"]]

VALID_CONDITIONALS_HEADERS = [
    "conditional_name",
    "logical_operator",
    "path",
    "comparison_operator",
    "value",
    "parentheses",
    "value_when_hidden",
]
VALID_CONDITIONALS_ROWS = [["cond1", "", "household.size", "===", 1, "", ""]]


def _create_valid_workbook():
    workbook = create_mocked_excel_data(
        "Sections", VALID_SECTIONS_HEADERS, VALID_SECTIONS_ROWS
    )
    add_mocked_excel_sheet(
        workbook, "Conditionals", VALID_CONDITIONALS_HEADERS, VALID_CONDITIONALS_ROWS
    )


class TestLoadSurveyDefinitionWithMessages:
    def test_valid_file_returns_a_survey_definition_and_no_messages(self):
        _create_valid_workbook()
        try:
            survey_definition, messages = load_survey_definition_with_messages(
                MOCKED_EXCEL_FILE
            )
            assert isinstance(survey_definition, SurveyDefinition)
            assert messages == []
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_invalid_file_returns_none_and_messages(self):
        survey_definition, messages = load_survey_definition_with_messages(
            "nonexistent.xlsx"
        )
        assert survey_definition is None
        assert len(messages) == 1


class TestCheckExcelIntegrityWithMessages:
    def test_valid_file_returns_true(self):
        _create_valid_workbook()
        try:
            assert check_excel_integrity_with_messages(MOCKED_EXCEL_FILE) == (True, [])
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_invalid_file_returns_false(self):
        ok, messages = check_excel_integrity_with_messages("nonexistent.xlsx")
        assert ok is False
        assert len(messages) == 1


class TestCheckExcelIntegrity:
    def test_valid_file_returns_true(self):
        _create_valid_workbook()
        try:
            assert check_excel_integrity(MOCKED_EXCEL_FILE) is True
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_invalid_file_returns_false(self):
        assert check_excel_integrity("nonexistent.xlsx") is False


class TestLoadSurveyDefinitionOrRaise:
    def test_valid_file_returns_a_survey_definition(self):
        _create_valid_workbook()
        try:
            survey_definition = load_survey_definition_or_raise(MOCKED_EXCEL_FILE)
            assert isinstance(survey_definition, SurveyDefinition)
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_invalid_file_raises(self):
        try:
            load_survey_definition_or_raise("nonexistent.xlsx")
            assert False, "should have raised"
        except Exception as e:
            assert "Excel integrity check failed" in str(e)
