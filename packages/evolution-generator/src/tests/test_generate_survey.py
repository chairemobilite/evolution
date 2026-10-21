# Copyright 2026, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for scripts/generate_survey.py's Excel integrity/loading entry points.

import os
from unittest.mock import MagicMock

import pytest  # pyright: ignore[reportMissingImports]

from helpers.generator_helpers import (
    delete_file_if_exists,
)
from tests.mocked_excel import add_mocked_excel_sheet, create_mocked_excel_data
import scripts.generate_survey as generate_survey_module
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


VALID_WIDGETS_HEADERS = ["questionName", "label::fr", "label::en"]


def _create_workbook(
    sections_rows=VALID_SECTIONS_ROWS,
    conditionals_rows=VALID_CONDITIONALS_ROWS,
    widgets_headers=VALID_WIDGETS_HEADERS,
    sections_headers=VALID_SECTIONS_HEADERS,
):
    """Write a workbook whose Widgets sheet holds the survey languages (its label::<language> columns)."""
    workbook = create_mocked_excel_data("Sections", sections_headers, sections_rows)
    add_mocked_excel_sheet(
        workbook, "Conditionals", VALID_CONDITIONALS_HEADERS, conditionals_rows
    )
    add_mocked_excel_sheet(workbook, "Widgets", widgets_headers, [])


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

    def test_invalid_rows_in_both_sheets_return_every_message(self):
        _create_workbook(
            sections_rows=[["home", "Accueil", "Home", True, "", "", ""]],
            conditionals_rows=[["cond1", "", "", "===", 1, "", ""]],
        )
        try:
            ok, messages = check_excel_integrity_with_messages(MOCKED_EXCEL_FILE)
            assert ok is False
            # Conditionals first: the tables are validated in dependency order
            assert messages == [
                "Error in Conditionals - Required field is missing in row 2. Missing fields: ['path']",
                "Error in Sections - Required field is missing in row 2. Missing fields: ['abbreviation']",
            ]
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_missing_title_is_reported_with_the_other_sheets_errors(self):
        """The rule that needs the survey languages runs with each sheet's other checks."""
        _create_workbook(
            sections_rows=[["home", "", "Home", True, "", "", "HM_"]],
            conditionals_rows=[["cond1", "", "", "===", 1, "", ""]],
        )
        try:
            assert check_excel_integrity_with_messages(MOCKED_EXCEL_FILE) == (
                False,
                [
                    "Error in Conditionals - Required field is missing in row 2. Missing fields: ['path']",
                    "Error in Sections - Invalid row 2: title_fr is required when in_nav is true",
                ],
            )
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_checks_the_languages_of_the_widgets_sheet(self):
        # The Widgets sheet has label::es, but the Sections sheet has no title_es column
        _create_workbook(widgets_headers=["questionName", "label::fr", "label::es"])
        try:
            assert check_excel_integrity_with_messages(MOCKED_EXCEL_FILE) == (
                False,
                [
                    "Error in Sections - Invalid row 2: title_es is required when in_nav is true"
                ],
            )
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_reports_a_title_column_in_another_language(self):
        """A title_<language> column for a language of no label:: column, e.g. a typo, is reported."""
        _create_workbook(
            widgets_headers=["questionName", "label::fr"],
        )
        try:
            ok, messages = check_excel_integrity_with_messages(MOCKED_EXCEL_FILE)
            assert ok is False
            assert messages == [
                "Error in Sections - Unexpected columns: ['title_en']. The survey "
                "languages are ['fr']."
            ]
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_reports_a_widgets_sheet_without_label_columns(self):
        _create_workbook(widgets_headers=["questionName", "label"])
        try:
            ok, messages = check_excel_integrity_with_messages(MOCKED_EXCEL_FILE)
            assert ok is False
            assert messages == [
                "Missing label::<language> columns in Widgets sheet: the survey "
                "languages are read from them, e.g. label::fr and label::en."
            ]
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_reports_invalid_languages(self):
        _create_workbook(widgets_headers=["questionName", "label::French"])
        try:
            ok, messages = check_excel_integrity_with_messages(MOCKED_EXCEL_FILE)
            assert ok is False
            assert messages == [
                "Invalid survey languages ['French']: each must be a language code "
                "like 'fr' or 'en-CA'."
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

    def test_creates_a_locales_folder_per_survey_language(self, tmp_path):
        _create_workbook(
            widgets_headers=["questionName", "label::en"],
            sections_headers=[h for h in VALID_SECTIONS_HEADERS if h != "title_fr"],
            sections_rows=[["home", "Home", True, "", "", "HM_"]],
        )
        config_path = tmp_path / "generatorConfigs.yaml"
        config_path.write_text(
            f"survey_folder_path: {tmp_path}\n"
            f"excel_file_path: {MOCKED_EXCEL_FILE}\n"
            "enabled_scripts: {}\n"
        )
        try:
            generate_survey(str(config_path))
            assert sorted(os.listdir(tmp_path / "locales")) == ["en"]
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_loads_the_survey_definition_once(self, tmp_path, monkeypatch):
        load_survey_definition = MagicMock(
            wraps=generate_survey_module.load_survey_definition
        )
        monkeypatch.setattr(
            generate_survey_module, "load_survey_definition", load_survey_definition
        )
        _create_workbook()
        config_path = tmp_path / "generatorConfigs.yaml"
        config_path.write_text(
            f"survey_folder_path: {tmp_path}\n"
            f"excel_file_path: {MOCKED_EXCEL_FILE}\n"
        )
        try:
            generate_survey(str(config_path))
            load_survey_definition.assert_called_once_with(MOCKED_EXCEL_FILE)
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)
