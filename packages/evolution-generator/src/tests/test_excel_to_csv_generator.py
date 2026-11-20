# Copyright 2026, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

import csv
import os

import openpyxl
import pytest  # pyright: ignore[reportMissingImports]

from scripts.excel_to_csv_generator import (
    COPY_CHECKSUMS_FILE_NAME,
    COPY_README_FILE_NAME,
    CsvCopyEditedError,
    ExcelToCsvGenerator,
    release_csv_folder,
)
from survey_definition.excel_survey_definition_reader import ExcelSurveyDefinitionReader


def create_workbook(excel_file_path: str):
    """Build a small two-sheet workbook used by the tests below."""
    workbook = openpyxl.Workbook()
    first_sheet = workbook.active
    first_sheet.title = "Sections"
    first_sheet.append(["section", "label"])
    first_sheet.append(["home", "Home"])
    first_sheet.append(["work", None])
    first_sheet.append(["optional", True])
    first_sheet.append(["required", False])
    first_sheet.append(["zeroValue", 0])
    first_sheet.append(["oneValue", 1])

    choices_sheet = workbook.create_sheet("Choices")
    choices_sheet.append(["choicesName", "value"])
    choices_sheet.append(["yesNo", "yes"])
    choices_sheet.append(["yesNo", "no"])

    workbook.save(excel_file_path)
    workbook.close()


def read_csv(csv_file_path: str) -> list[list[str]]:
    """Read a CSV file and return its rows as a list of string lists."""
    with open(csv_file_path, mode="r", encoding="utf-8", newline="") as csv_file:
        return list(csv.reader(csv_file))


class TestExcelToCsvGenerator:
    """Tests for ExcelToCsvGenerator.generate_csv_copy(reader, output_folder_path, ...)."""

    def test_get_output_folder_path(self, tmp_path):
        """The output folder is named "<excel_name>_csv" next to the Excel file."""
        excel_file_path = str(tmp_path / "generator.xlsx")

        assert ExcelToCsvGenerator.get_output_folder_path(excel_file_path) == str(
            tmp_path / "generator_csv"
        )

    def test_sanitize_sheet_title(self):
        """Invalid file name characters are replaced with underscores."""
        assert (
            ExcelToCsvGenerator.sanitize_sheet_title(' Bad<>:"/\\|?*Name ')
            == "Bad_Name"
        )

    def test_sanitize_sheet_title_falls_back_to_default_name(self):
        """A title with no safe file name characters falls back to "Sheet"."""
        assert ExcelToCsvGenerator.sanitize_sheet_title(' <>:"/\\|?* ') == "Sheet"

    def test_copies_each_sheet_to_its_own_csv_file(self, tmp_path):
        """Each sheet becomes its own CSV in the output folder."""
        excel_file_path = str(tmp_path / "generator.xlsx")
        create_workbook(excel_file_path)
        output_folder_path = str(tmp_path / "generator_csv")

        generated_files = ExcelToCsvGenerator.generate_csv_copy(
            ExcelSurveyDefinitionReader(excel_file_path), output_folder_path
        )

        assert generated_files == [
            os.path.join(output_folder_path, "Sections.csv"),
            os.path.join(output_folder_path, "Choices.csv"),
        ]
        assert read_csv(os.path.join(output_folder_path, "Sections.csv")) == [
            ["section", "label"],
            ["home", "Home"],
            ["work", ""],
            ["optional", "TRUE"],
            ["required", "FALSE"],
            ["zeroValue", "0"],
            ["oneValue", "1"],
        ]
        assert read_csv(os.path.join(output_folder_path, "Choices.csv")) == [
            ["choicesName", "value"],
            ["yesNo", "yes"],
            ["yesNo", "no"],
        ]

    def test_cleans_stale_csv_files_by_default(self, tmp_path):
        """Stale CSV files from a previous run are removed before writing."""
        excel_file_path = str(tmp_path / "generator.xlsx")
        output_folder_path = str(tmp_path / "generator_csv")
        create_workbook(excel_file_path)
        os.makedirs(output_folder_path)

        stale_csv_file_path = os.path.join(output_folder_path, "RemovedSheet.csv")
        with open(stale_csv_file_path, mode="w", encoding="utf-8") as stale_csv_file:
            stale_csv_file.write("stale")

        ExcelToCsvGenerator.generate_csv_copy(
            ExcelSurveyDefinitionReader(excel_file_path), output_folder_path
        )

        assert not os.path.exists(stale_csv_file_path)
        assert os.path.isfile(os.path.join(output_folder_path, "Sections.csv"))
        assert os.path.isfile(os.path.join(output_folder_path, "Choices.csv"))

    def test_can_keep_existing_csv_files(self, tmp_path):
        """With clean_output_folder=False, existing CSV files are left untouched."""
        excel_file_path = str(tmp_path / "generator.xlsx")
        output_folder_path = str(tmp_path / "generator_csv")
        create_workbook(excel_file_path)
        os.makedirs(output_folder_path)

        existing_csv_file_path = os.path.join(output_folder_path, "Existing.csv")
        with open(
            existing_csv_file_path, mode="w", encoding="utf-8"
        ) as existing_csv_file:
            existing_csv_file.write("existing")

        ExcelToCsvGenerator.generate_csv_copy(
            ExcelSurveyDefinitionReader(excel_file_path),
            output_folder_path,
            clean_output_folder=False,
        )

        assert os.path.isfile(existing_csv_file_path)


def _write_csv_copy(tmp_path) -> str:
    """Copy the workbook of create_workbook to tmp_path/generator_csv and return the folder."""
    excel_file_path = str(tmp_path / "generator.xlsx")
    if not os.path.isfile(excel_file_path):
        create_workbook(excel_file_path)
    output_folder_path = str(tmp_path / "generator_csv")
    ExcelToCsvGenerator.generate_csv_copy(
        ExcelSurveyDefinitionReader(excel_file_path), output_folder_path
    )
    return output_folder_path


class TestCsvCopyGuard:
    """The README.md and checksums written with the copy, and the guard they allow."""

    def test_writes_a_readme_and_the_checksums(self, tmp_path):
        output_folder_path = _write_csv_copy(tmp_path)
        with open(os.path.join(output_folder_path, COPY_README_FILE_NAME)) as readme:
            assert readme.read().startswith("# Copy of the Excel file: don't edit\n")
        assert sorted(os.listdir(output_folder_path)) == [
            COPY_CHECKSUMS_FILE_NAME,
            "Choices.csv",
            COPY_README_FILE_NAME,
            "Sections.csv",
        ]

    def test_writes_the_copy_again_when_nothing_was_edited(self, tmp_path):
        output_folder_path = _write_csv_copy(tmp_path)
        sections_path = os.path.join(output_folder_path, "Sections.csv")
        written = read_csv(sections_path)
        # The copy is written again from the Excel file, which changed since
        workbook = openpyxl.load_workbook(tmp_path / "generator.xlsx")
        workbook["Sections"].append(["newSection", "New"])
        workbook.save(tmp_path / "generator.xlsx")

        _write_csv_copy(tmp_path)

        assert read_csv(sections_path) == [*written, ["newSection", "New"]]

    def test_writes_the_copy_again_after_a_failed_copy(self, tmp_path, monkeypatch):
        output_folder_path = _write_csv_copy(tmp_path)
        write_sheet_to_csv = ExcelToCsvGenerator.write_sheet_to_csv

        def fail_on_the_second_sheet(self, sheet_name):
            if sheet_name == "Choices":
                raise OSError("disk full")
            return write_sheet_to_csv(self, sheet_name)

        monkeypatch.setattr(
            ExcelToCsvGenerator, "write_sheet_to_csv", fail_on_the_second_sheet
        )
        with pytest.raises(OSError):
            _write_csv_copy(tmp_path)
        monkeypatch.undo()

        # The half-written copy isn't taken for files edited by hand
        _write_csv_copy(tmp_path)
        assert os.path.isfile(os.path.join(output_folder_path, "Choices.csv"))

    def test_ignores_line_endings_changed_by_git(self, tmp_path):
        output_folder_path = _write_csv_copy(tmp_path)
        sections_path = os.path.join(output_folder_path, "Sections.csv")
        with open(sections_path, "rb") as file:
            content = file.read()
        with open(sections_path, "wb") as file:
            file.write(content.replace(b"\r\n", b"\n"))
        _write_csv_copy(tmp_path)

    @pytest.mark.parametrize("edit", ["change", "add", "remove"])
    def test_refuses_to_overwrite_csv_files_edited_by_hand(self, tmp_path, edit):
        output_folder_path = _write_csv_copy(tmp_path)
        sections_path = os.path.join(output_folder_path, "Sections.csv")
        edited_file_name = "Sections.csv"
        if edit == "change":
            with open(sections_path, "a", encoding="utf-8") as file:
                file.write("newSection,New\n")
        elif edit == "add":
            edited_file_name = "Notes.csv"
            with open(os.path.join(output_folder_path, edited_file_name), "w") as file:
                file.write("note\n")
        else:
            os.remove(sections_path)
        if edit != "remove":
            with open(sections_path, "rb") as file:
                before = file.read()

        with pytest.raises(CsvCopyEditedError) as error:
            _write_csv_copy(tmp_path)

        assert (
            f"were edited by hand, but the survey definition source is excel: {edited_file_name}\n"
            in str(error.value)
        )
        assert "set source: csv" in str(error.value)
        # Nothing was written
        if edit != "remove":
            with open(sections_path, "rb") as file:
                assert file.read() == before
        else:
            assert not os.path.exists(sections_path)

    def test_overwrites_a_folder_written_before_the_checksums(self, tmp_path):
        output_folder_path = _write_csv_copy(tmp_path)
        os.remove(os.path.join(output_folder_path, COPY_CHECKSUMS_FILE_NAME))
        with open(os.path.join(output_folder_path, "Sections.csv"), "a") as file:
            file.write("edited,Edited\n")
        _write_csv_copy(tmp_path)
        assert ["edited", "Edited"] not in read_csv(
            os.path.join(output_folder_path, "Sections.csv")
        )


class TestReleaseCsvFolder:
    def test_removes_the_readme_of_the_copy(self, tmp_path):
        output_folder_path = _write_csv_copy(tmp_path)
        assert release_csv_folder(output_folder_path) is True
        assert sorted(os.listdir(output_folder_path)) == [
            COPY_CHECKSUMS_FILE_NAME,
            "Choices.csv",
            "Sections.csv",
        ]
        assert release_csv_folder(output_folder_path) is False

    def test_keeps_the_checksums_to_find_the_files_edited_since(self, tmp_path):
        output_folder_path = _write_csv_copy(tmp_path)
        release_csv_folder(output_folder_path)
        sections_path = os.path.join(output_folder_path, "Sections.csv")
        with open(sections_path, "a", encoding="utf-8") as file:
            file.write("editedInCsv,Edited\n")

        # Back to source excel: the copy would lose the edit
        with pytest.raises(CsvCopyEditedError, match="Sections.csv"):
            _write_csv_copy(tmp_path)
        assert ["editedInCsv", "Edited"] in read_csv(sections_path)

    def test_keeps_a_readme_edited_by_the_user(self, tmp_path):
        output_folder_path = _write_csv_copy(tmp_path)
        readme_path = os.path.join(output_folder_path, COPY_README_FILE_NAME)
        with open(readme_path, "w", encoding="utf-8") as readme:
            readme.write("# Our survey tables\n")
        assert release_csv_folder(output_folder_path) is False
        assert os.path.isfile(readme_path)

    def test_keeps_a_readme_that_is_not_utf8(self, tmp_path):
        output_folder_path = _write_csv_copy(tmp_path)
        readme_path = os.path.join(output_folder_path, COPY_README_FILE_NAME)
        with open(readme_path, "w", encoding="cp1252") as readme:
            readme.write("# Tables du questionnaire: café\n")
        assert release_csv_folder(output_folder_path) is False
        assert os.path.isfile(readme_path)

    def test_leaves_a_folder_that_was_not_a_copy(self, tmp_path):
        (tmp_path / COPY_README_FILE_NAME).write_text("# Notes\n")
        assert release_csv_folder(str(tmp_path)) is False
        assert (tmp_path / COPY_README_FILE_NAME).is_file()
