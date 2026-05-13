# Copyright 2026, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

import csv
import os

import openpyxl

from scripts.excel_to_csv_generator import ExcelToCsvGenerator


def create_workbook(excel_file_path: str):
    """Build a small two-sheet workbook used by the tests below."""
    workbook = openpyxl.Workbook()
    first_sheet = workbook.active
    first_sheet.title = "Sections"
    first_sheet.append(["section", "label"])
    first_sheet.append(["home", "Home"])
    first_sheet.append(["work", None])

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
    """Tests for ExcelToCsvGenerator.generate_csv_copy(excel_file_path, ...)."""

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

    def test_copies_each_sheet_to_default_csv_folder(self, tmp_path):
        """Each sheet becomes its own CSV in "<excel_name>_csv" next to the Excel file."""
        excel_file_path = str(tmp_path / "generator.xlsx")
        create_workbook(excel_file_path)

        generated_files = ExcelToCsvGenerator.generate_csv_copy(excel_file_path)

        output_folder_path = str(tmp_path / "generator_csv")
        assert generated_files == [
            os.path.join(output_folder_path, "Sections.csv"),
            os.path.join(output_folder_path, "Choices.csv"),
        ]
        assert read_csv(os.path.join(output_folder_path, "Sections.csv")) == [
            ["section", "label"],
            ["home", "Home"],
            ["work", ""],
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
            excel_file_path=excel_file_path,
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
            excel_file_path=excel_file_path,
            clean_output_folder=False,
        )

        assert os.path.isfile(existing_csv_file_path)
