# Copyright 2026, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for scripts/generate_survey.py's Excel integrity/loading entry points.

import filecmp
import os
import shutil
import sys
from unittest.mock import MagicMock

import openpyxl
import pytest  # pyright: ignore[reportMissingImports]
from openpyxl.styles import PatternFill

from helpers.generator_helpers import (
    delete_file_if_exists,
)
from tests.mocked_excel import add_mocked_excel_sheet, create_mocked_excel_data
import scripts.generate_survey as generate_survey_module
from scripts.excel_to_csv_generator import CsvCopyEditedError, ExcelToCsvGenerator
from scripts.generator_config import GeneratorConfigError
from scripts.generate_survey import (
    check_excel_integrity,
    check_excel_integrity_with_messages,
    check_excel_integrity_with_warnings,
    generate_survey,
    verify_excel_cli_main,
)
from survey_definition.excel_survey_definition_reader import (
    EMPTY_ROWS_WARNING_THRESHOLD,
    ExcelSurveyDefinitionReader,
)
from survey_definition.widgets_definition import WIDGET_REQUIRED_FIELD_NAMES

MOCKED_EXCEL_FILE = "src/tests/references/test.xlsx"
DEMO_EXCEL_FILE = os.path.join(
    os.path.dirname(__file__),
    "../../../../example/demo_generator/references/Household_Travel_Generate_Survey.xlsx",
)

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

VALID_INPUT_RANGE_HEADERS = [
    "input_range_name",
    "label_min::fr",
    "label_max::fr",
    "label_min::en",
    "label_max::en",
    "min_value",
    "max_value",
]
VALID_INPUT_RANGE_ROWS = [["slider", "Min", "Max", "Min", "Max", 0, 100]]

VALID_WIDGETS_HEADERS = [*WIDGET_REQUIRED_FIELD_NAMES, "label::fr", "label::en"]


def _create_workbook(
    sections_rows=VALID_SECTIONS_ROWS,
    conditionals_rows=VALID_CONDITIONALS_ROWS,
    widgets_headers=VALID_WIDGETS_HEADERS,
    sections_headers=VALID_SECTIONS_HEADERS,
    choices_rows=(),
    input_range_rows=None,
    widgets_rows=(),
):
    """
    Write a workbook whose Widgets sheet holds the survey languages (its
    label::<language> columns). The InputRange sheet, in French and English, is only
    added with `input_range_rows`: it is optional.
    """
    workbook = create_mocked_excel_data("Sections", sections_headers, sections_rows)
    add_mocked_excel_sheet(
        workbook, "Conditionals", VALID_CONDITIONALS_HEADERS, conditionals_rows
    )
    add_mocked_excel_sheet(workbook, "Widgets", widgets_headers, list(widgets_rows))
    add_mocked_excel_sheet(workbook, "Labels", ["namespace", "key"], [])
    add_mocked_excel_sheet(
        workbook,
        "Choices",
        [
            "choicesName",
            "value",
            "label::fr",
            "label::en",
            "spreadChoicesName",
            "conditional",
        ],
        list(choices_rows),
    )
    if input_range_rows is not None:
        add_mocked_excel_sheet(
            workbook, "InputRange", VALID_INPUT_RANGE_HEADERS, input_range_rows
        )


class TestCheckExcelIntegrityWithMessages:
    def test_valid_file_returns_true(self):
        _create_workbook(input_range_rows=VALID_INPUT_RANGE_ROWS)
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
            sections_rows=[["home", "Accueil", "Home", True, "", "", ""]],
            conditionals_rows=[["cond1", "", "", "===", 1, "", ""]],
            input_range_rows=[["slider", "Min", "Max", "Min", "Max", 100, 0]],
        )
        try:
            ok, messages = check_excel_integrity_with_messages(MOCKED_EXCEL_FILE)
            assert ok is False
            # Conditionals first: the tables are validated in dependency order
            assert messages == [
                "Error in Conditionals - Required field is missing in row 2. Missing fields: ['path']",
                "Error in Sections - Required field is missing in row 2. Missing fields: ['abbreviation']",
                "Error in InputRange - Invalid row 2: min_value (100) must be less than max_value (0)",
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
        _create_workbook(
            widgets_headers=[*WIDGET_REQUIRED_FIELD_NAMES, "label::fr", "label::es"]
        )
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
            widgets_headers=[*WIDGET_REQUIRED_FIELD_NAMES, "label::fr"],
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
        _create_workbook(widgets_headers=[*WIDGET_REQUIRED_FIELD_NAMES, "label"])
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
        _create_workbook(
            widgets_headers=[*WIDGET_REQUIRED_FIELD_NAMES, "label::French"]
        )
        try:
            ok, messages = check_excel_integrity_with_messages(MOCKED_EXCEL_FILE)
            assert ok is False
            assert messages == [
                "Invalid survey languages ['French']: each must be a language code "
                "like 'fr' or 'en-CA'."
            ]
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)


class TestCheckExcelIntegrityChoices:
    def test_reports_a_choice_conditional_missing_from_the_conditionals_sheet(self):
        _create_workbook(
            choices_rows=[["yesNo", "yes", "Oui", "Yes", "", "nopeConditional"]]
        )
        try:
            assert check_excel_integrity_with_messages(MOCKED_EXCEL_FILE) == (
                False,
                [
                    "Error in Choices - Invalid row 2: conditional 'nopeConditional' "
                    "does not match any conditional_name of the Conditionals table"
                ],
            )
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_reports_the_choices_problems_with_the_other_sheets_ones(self):
        _create_workbook(
            sections_rows=[["home", "Accueil", "Home", True, "", "", ""]],
            choices_rows=[["yesNo", "yes", "Oui", "", "", ""]],
        )
        try:
            ok, messages = check_excel_integrity_with_messages(MOCKED_EXCEL_FILE)
            assert ok is False
            assert messages == [
                "Error in Sections - Required field is missing in row 2. Missing fields: ['abbreviation']",
                "Error in Choices - Invalid row 2: label::en is required",
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


class TestCheckExcelIntegrityWithWarnings:
    def test_warns_about_many_empty_rows_after_the_data(self):
        _create_workbook()
        # A formatted cell far below the data, with no value
        workbook = openpyxl.load_workbook(MOCKED_EXCEL_FILE)
        workbook["Widgets"].cell(
            row=EMPTY_ROWS_WARNING_THRESHOLD + 1, column=1
        ).fill = PatternFill(fill_type="solid", fgColor="FFFF00")
        workbook.save(MOCKED_EXCEL_FILE)
        try:
            assert check_excel_integrity_with_warnings(MOCKED_EXCEL_FILE) == (
                True,
                [],
                [
                    f"Widgets sheet has {EMPTY_ROWS_WARNING_THRESHOLD} empty "
                    "rows after its last row with data (row 1). Delete them in Excel "
                    "to make the file faster to open."
                ],
            )
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_warns_about_a_column_a_custom_widget_does_not_use(self):
        _create_workbook(
            widgets_headers=[*VALID_WIDGETS_HEADERS, "validation"],
            widgets_rows=[
                [
                    "homeMap",
                    "Custom",
                    True,
                    "home",
                    "Carte",
                    "Map",
                    "mapCustomValidation",
                ]
            ],
        )
        try:
            ok, messages, warnings = check_excel_integrity_with_warnings(
                MOCKED_EXCEL_FILE
            )
            assert (ok, messages) == (True, [])
            assert len(warnings) == 1
            assert warnings[0].startswith(
                "Widgets sheet, row 2: validation is not used by input_type 'Custom'"
            )
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_unreadable_file_has_no_warnings(self):
        ok, messages, warnings = check_excel_integrity_with_warnings("nonexistent.xlsx")
        assert ok is False
        assert len(messages) == 1
        assert warnings == []


def _write_config(tmp_path, survey_definition: str, enabled_scripts: str = "{}"):
    """Write a generatorConfigs.yaml generating in tmp_path, with this survey_definition block content."""
    config_path = tmp_path / "generatorConfigs.yaml"
    config_path.write_text(
        f"survey_folder_path: {tmp_path}\n"
        f"survey_definition:\n{survey_definition}"
        f"enabled_scripts: {enabled_scripts}\n"
    )
    return config_path


def _excel_source(excel_file_path, csv_folder_path=None) -> str:
    block = f"    source: excel\n    excel_file_path: {excel_file_path}\n"
    if csv_folder_path is not None:
        block += f"    csv_folder_path: {csv_folder_path}\n"
    return block


class TestGenerateSurvey:
    def test_missing_excel_file_aborts_generation(self, tmp_path):
        config_path = _write_config(tmp_path, _excel_source("nonexistent.xlsx"))
        with pytest.raises(
            GeneratorConfigError, match="excel_file_path not found: nonexistent.xlsx"
        ):
            generate_survey(str(config_path))
        # Nothing was generated in the survey folder
        assert list(tmp_path.iterdir()) == [config_path]

    def test_invalid_excel_file_aborts_generation(self, tmp_path):
        _create_workbook(
            sections_rows=[["home", "Accueil", "Home", "maybe", "", "", "HM_"]]
        )
        config_path = _write_config(tmp_path, _excel_source(MOCKED_EXCEL_FILE))
        try:
            with pytest.raises(
                Exception, match="Survey definition integrity check failed"
            ):
                generate_survey(str(config_path))
            # Nothing was generated in the survey folder
            assert list(tmp_path.iterdir()) == [config_path]
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_prints_what_it_reads_and_writes(self, tmp_path, capsys):
        _create_workbook()
        config_path = _write_config(tmp_path, _excel_source(MOCKED_EXCEL_FILE))
        try:
            generate_survey(str(config_path))
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)
        output = capsys.readouterr().out
        assert f"Config: {config_path}\n" in output
        assert f"Survey definition source: excel ({MOCKED_EXCEL_FILE})\n" in output
        assert "CSV copy: not written (no csv_folder_path)\n" in output

    def test_creates_a_locales_folder_per_survey_language(self, tmp_path):
        _create_workbook(
            widgets_headers=[*WIDGET_REQUIRED_FIELD_NAMES, "label::en"],
            sections_headers=[h for h in VALID_SECTIONS_HEADERS if h != "title_fr"],
            sections_rows=[["home", "Home", True, "", "", "HM_"]],
        )
        config_path = _write_config(tmp_path, _excel_source(MOCKED_EXCEL_FILE))
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
        config_path = _write_config(tmp_path, _excel_source(MOCKED_EXCEL_FILE))
        try:
            generate_survey(str(config_path))
            load_survey_definition.assert_called_once()
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_generates_the_choices_from_the_survey_definition(self, tmp_path):
        _create_workbook(choices_rows=[["yesNo", "yes", "Oui", "Yes", "", ""]])
        config_path = _write_config(tmp_path, _excel_source(MOCKED_EXCEL_FILE))
        try:
            generate_survey(str(config_path), only_scripts={"generate_choices"})
            choices_ts = (
                tmp_path / "src" / "survey" / "common" / "choices.tsx"
            ).read_text(encoding="utf-8")
            assert "export const yesNo: ChoiceType[] = [" in choices_ts
            assert "yes: Oui" in (
                tmp_path / "locales" / "fr" / "choices.yaml"
            ).read_text(encoding="utf-8")
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_reads_the_excel_file_once_for_every_script(self, tmp_path, monkeypatch):
        if not os.path.isfile(DEMO_EXCEL_FILE):
            pytest.skip(f"Demo generator file not found: {DEMO_EXCEL_FILE}")
        # The CSV copy is written next to the Excel file: copy it out of the repo.
        excel_file_path = tmp_path / "references" / "survey.xlsx"
        excel_file_path.parent.mkdir()
        shutil.copy(DEMO_EXCEL_FILE, excel_file_path)
        load_workbook = MagicMock(wraps=openpyxl.load_workbook)
        monkeypatch.setattr(openpyxl, "load_workbook", load_workbook)
        config_path = _write_config(
            tmp_path,
            _excel_source(excel_file_path, tmp_path / "references" / "survey_csv"),
            _all_scripts_but_generate_excel(),
        )
        generate_survey(str(config_path))
        load_workbook.assert_called_once()


def _all_scripts_but_generate_excel() -> str:
    return "\n" + "".join(
        f"    {script_key}: {script_key != 'generate_excel'}\n"
        for script_key in generate_survey_module.SUPPORTED_SCRIPT_KEYS
    )


def _assert_same_files(left, right) -> None:
    """Assert that the two folders hold the same files, with the same content."""
    comparison = filecmp.dircmp(left, right)
    assert comparison.left_only == [] and comparison.right_only == []
    _, mismatch, errors = filecmp.cmpfiles(
        left, right, comparison.common_files, shallow=False
    )
    assert mismatch == [] and errors == []
    for sub_folder in comparison.common_dirs:
        _assert_same_files(
            os.path.join(left, sub_folder), os.path.join(right, sub_folder)
        )


@pytest.fixture
def demo_excel_file(tmp_path):
    """The demo survey's Excel file, copied out of the repo (its CSV copy is written next to it)."""
    if not os.path.isfile(DEMO_EXCEL_FILE):
        pytest.skip(f"Demo generator file not found: {DEMO_EXCEL_FILE}")
    excel_file_path = tmp_path / "references" / "survey.xlsx"
    excel_file_path.parent.mkdir()
    shutil.copy(DEMO_EXCEL_FILE, excel_file_path)
    return excel_file_path


class TestCsvSource:
    def test_csv_copy_generates_the_same_survey_as_the_excel_file(
        self, tmp_path, demo_excel_file
    ):
        csv_folder_path = tmp_path / "references" / "survey_csv"
        excel_survey, csv_survey = tmp_path / "from_excel", tmp_path / "from_csv"
        excel_survey.mkdir()
        csv_survey.mkdir()
        generate_survey(
            str(
                _write_config(
                    excel_survey,
                    _excel_source(demo_excel_file, csv_folder_path),
                    _all_scripts_but_generate_excel(),
                )
            )
        )
        generate_survey(
            str(
                _write_config(
                    csv_survey,
                    f"    source: csv\n    csv_folder_path: {csv_folder_path}\n",
                    _all_scripts_but_generate_excel(),
                )
            )
        )
        os.remove(excel_survey / "generatorConfigs.yaml")
        os.remove(csv_survey / "generatorConfigs.yaml")
        assert os.listdir(excel_survey / "src" / "survey" / "sections") != []
        _assert_same_files(excel_survey, csv_survey)

    def test_csv_source_releases_the_copy_and_keeps_its_edits(
        self, tmp_path, demo_excel_file, capsys
    ):
        csv_folder_path = tmp_path / "references" / "survey_csv"
        generate_survey(
            str(
                _write_config(tmp_path, _excel_source(demo_excel_file, csv_folder_path))
            )
        )
        labels_path = csv_folder_path / "Labels.csv"
        edited_labels = (
            labels_path.read_text(encoding="utf-8")
            + "home,editedInCsv,Modifié,Edited\n"
        )
        labels_path.write_text(edited_labels, encoding="utf-8")

        # The copy would lose the edit
        with pytest.raises(CsvCopyEditedError):
            generate_survey(
                str(
                    _write_config(
                        tmp_path, _excel_source(demo_excel_file, csv_folder_path)
                    )
                )
            )

        capsys.readouterr()
        generate_survey(
            str(
                _write_config(
                    tmp_path,
                    f"    source: csv\n    csv_folder_path: {csv_folder_path}\n",
                    "\n    generate_labels: true\n",
                )
            )
        )
        output = capsys.readouterr().out
        assert "is now the survey definition source" in output
        assert sorted(os.listdir(csv_folder_path)) == [
            "Choices.csv",
            "Conditionals.csv",
            "InputRange.csv",
            "Labels.csv",
            "Sections.csv",
            "Widgets.csv",
        ]
        assert labels_path.read_text(encoding="utf-8") == edited_labels
        assert "editedInCsv: Edited" in (
            tmp_path / "locales" / "en" / "home.yaml"
        ).read_text(encoding="utf-8")

    def test_checks_the_integrity_of_a_csv_folder(self, tmp_path, demo_excel_file):
        csv_folder_path = tmp_path / "survey_csv"
        ExcelToCsvGenerator.generate_csv_copy(
            ExcelSurveyDefinitionReader(str(demo_excel_file)), str(csv_folder_path)
        )
        assert check_excel_integrity_with_messages(str(csv_folder_path)) == (True, [])

        sections_path = csv_folder_path / "Sections.csv"
        sections_path.write_text(
            sections_path.read_text(encoding="utf-8").replace("TRUE", "maybe", 1),
            encoding="utf-8",
        )
        ok, messages = check_excel_integrity_with_messages(str(csv_folder_path))
        assert ok is False
        assert any("Invalid in_nav" in message for message in messages)


class TestVerifyExcelCli:
    def _run(self, monkeypatch, *args) -> int:
        monkeypatch.setattr(sys, "argv", ["verifyExcel", *args])
        return verify_excel_cli_main()

    def test_checks_an_excel_file(self, monkeypatch, demo_excel_file):
        assert self._run(monkeypatch, str(demo_excel_file)) == 0

    def test_checks_the_source_of_a_config(
        self, monkeypatch, tmp_path, demo_excel_file, capsys
    ):
        config_path = _write_config(tmp_path, _excel_source(demo_excel_file))
        assert self._run(monkeypatch, "--config_path", str(config_path)) == 0
        assert f"Survey definition source: excel ({demo_excel_file})" in (
            capsys.readouterr().out
        )

    def test_reports_an_invalid_config(self, monkeypatch, tmp_path, capsys):
        config_path = tmp_path / "generatorConfigs.yaml"
        config_path.write_text("survey_folder_path: survey\nexcel_file_path: a.xlsx\n")
        assert self._run(monkeypatch, "--config_path", str(config_path)) == 1
        assert "the survey_definition block is missing" in capsys.readouterr().err

    @pytest.mark.parametrize("args", [(), ("a.xlsx", "--config_path", "c.yaml")])
    def test_needs_either_a_source_or_a_config(self, monkeypatch, args):
        assert self._run(monkeypatch, *args) == 2
