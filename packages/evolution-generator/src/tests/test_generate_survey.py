# Copyright 2026, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for scripts/generate_survey.py's Excel integrity/loading entry points.

import pytest  # pyright: ignore[reportMissingImports]

from helpers.generator_helpers import (
    delete_file_if_exists,
)
from tests.mocked_excel import add_mocked_excel_sheet, create_mocked_excel_data
from scripts.generate_survey import (
    check_excel_integrity,
    check_excel_integrity_with_messages,
    generate_survey,
)

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

VALID_CHOICES_HEADERS = [
    "choicesName",
    "value",
    "label::fr",
    "label::en",
    "spreadChoicesName",
    "conditional",
]
VALID_CHOICES_ROWS = [["yesNo", "yes", "Oui", "Yes", "", ""]]


def _create_workbook(
    sections_rows=VALID_SECTIONS_ROWS,
    conditionals_rows=VALID_CONDITIONALS_ROWS,
    choices_rows=VALID_CHOICES_ROWS,
):
    workbook = create_mocked_excel_data(
        "Sections", VALID_SECTIONS_HEADERS, sections_rows
    )
    add_mocked_excel_sheet(
        workbook, "Conditionals", VALID_CONDITIONALS_HEADERS, conditionals_rows
    )
    add_mocked_excel_sheet(workbook, "Choices", VALID_CHOICES_HEADERS, choices_rows)


class TestCheckExcelIntegrityWithMessages:
    def test_valid_file_returns_true(self):
        _create_workbook()
        try:
            assert check_excel_integrity_with_messages(MOCKED_EXCEL_FILE) == (True, [])
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_invalid_file_returns_false(self):
        ok, messages = check_excel_integrity_with_messages("nonexistent.xlsx")
        assert ok is False
        assert len(messages) == 1

    def test_invalid_rows_in_every_sheet_return_every_message(self):
        _create_workbook(
            sections_rows=[["home", "", "Home", True, "", "", "HM_"]],
            conditionals_rows=[["cond1", "", "", "===", 1, "", ""]],
            choices_rows=[["yesNo", "", "Oui", "Yes", "", ""]],
        )
        try:
            ok, messages = check_excel_integrity_with_messages(MOCKED_EXCEL_FILE)
            assert ok is False
            assert messages == [
                "Error in Sections - Invalid row 2: title_fr is required when in_nav is true",
                "Error in Conditionals - Required field is missing in row 2. Missing fields: ['path']",
                "Error in Choices - Invalid row 2: value is required when spreadChoicesName is blank",
            ]
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_choice_conditional_missing_from_conditionals_returns_message(self):
        """Once every sheet is valid on its own, the rules across sheets are checked."""
        _create_workbook(
            choices_rows=[["yesNo", "yes", "Oui", "Yes", "", "unknownConditional"]],
        )
        try:
            ok, messages = check_excel_integrity_with_messages(MOCKED_EXCEL_FILE)
            assert ok is False
            assert messages == [
                "Error in Choices - Invalid conditional in row 2: 'unknownConditional' "
                "does not match any conditional_name of the Conditionals table",
            ]
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)


class TestCheckExcelIntegrity:
    def test_valid_file_returns_true(self):
        _create_workbook()
        try:
            assert check_excel_integrity(MOCKED_EXCEL_FILE) is True
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_invalid_file_returns_false(self):
        assert check_excel_integrity("nonexistent.xlsx") is False


class TestGenerateSurvey:
    def test_invalid_excel_file_aborts_generation(self, tmp_path):
        config_path = tmp_path / "generatorConfigs.yaml"
        config_path.write_text(
            f"survey_folder_path: {tmp_path}\n"
            "excel_file_path: nonexistent.xlsx\n"
            "enabled_scripts: {}\n"
        )
        with pytest.raises(Exception, match="Excel integrity check failed"):
            generate_survey(str(config_path))
        # Nothing was generated in the survey folder
        assert list(tmp_path.iterdir()) == [config_path]
