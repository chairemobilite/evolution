# Copyright 2026, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script copies each sheet of the Generator Excel file to a CSV file
# so changes are easier to review in git diffs. It is intended to be invoked
# from the generate_survey.py script.
import csv
import os
import re

from helpers.excel_workbook import ExcelWorkbook
from helpers.generator_helpers import get_data_from_excel, get_workbook


class ExcelToCsvGenerator:
    """
    Copies each sheet of a Generator Excel file to a CSV file for readable git diffs.
    """

    def __init__(
        self,
        excel_file_path: str,
        workbook: ExcelWorkbook | None = None,
        clean_output_folder: bool = True,
    ):
        """
        Configure the generator for a given Excel file. Pass its already loaded
        `workbook` to avoid reading the file again.
        """
        self.excel_file_path = excel_file_path
        self.workbook = workbook
        self.output_folder_path = self.get_output_folder_path(excel_file_path)
        self.clean_output_folder = clean_output_folder

    @staticmethod
    def get_output_folder_path(excel_file_path: str) -> str:
        """Return "<excel_name>_csv" next to the Excel file."""
        excel_folder_path = os.path.dirname(excel_file_path)
        excel_file_name = os.path.splitext(os.path.basename(excel_file_path))[0]
        return os.path.join(excel_folder_path, f"{excel_file_name}_csv")

    @staticmethod
    def sanitize_sheet_title(sheet_title: str) -> str:
        """Return a sheet title that is safe to use as a file name."""
        sanitized_title = re.sub(r'[<>:"/\\|?*]+', "_", str(sheet_title)).strip()
        sanitized_title = re.sub(r"_+", "_", sanitized_title).strip("_")
        return sanitized_title or "Sheet"

    def copy(self) -> list[str]:
        """Write one CSV file per sheet and return their paths."""
        workbook = self.workbook or get_workbook(self.excel_file_path)
        os.makedirs(self.output_folder_path, exist_ok=True)

        if self.clean_output_folder:
            self.delete_existing_csv_files()

        return [
            self.write_sheet_to_csv(workbook, sheet_name)
            for sheet_name in workbook.sheetnames
        ]

    def delete_existing_csv_files(self) -> None:
        """Remove any .csv file already present in the output folder."""
        for file_name in os.listdir(self.output_folder_path):
            file_path = os.path.join(self.output_folder_path, file_name)
            if os.path.isfile(file_path) and file_name.lower().endswith(".csv"):
                os.remove(file_path)

    def write_sheet_to_csv(self, workbook: ExcelWorkbook, sheet_name: str) -> str:
        """Write a single sheet to "<SheetName>.csv" and return its path."""
        csv_file_name = f"{self.sanitize_sheet_title(sheet_name)}.csv"
        csv_file_path = os.path.join(self.output_folder_path, csv_file_name)

        with open(csv_file_path, mode="w", encoding="utf-8", newline="") as csv_file:
            writer = csv.writer(csv_file)

            # Use get_data_from_excel to properly bound rows and headers
            try:
                rows, headers = get_data_from_excel(workbook, sheet_name)

                # Write headers
                writer.writerow(headers)

                # Write data rows (skip header row at index 0)
                for row in rows[1:]:
                    values = [self.normalize_cell_value(cell.value) for cell in row]
                    # Trim trailing None/empty values to match header count
                    values = values[: len(headers)]
                    writer.writerow(values)

            except Exception as e:
                print(f"Error processing sheet '{sheet_name}': {e}")
                raise

        print(f"Generated {csv_file_path} successfully")
        return csv_file_path

    @staticmethod
    def normalize_cell_value(value):
        """Return a stable CSV representation for values read from Excel."""
        if isinstance(value, bool):
            return "TRUE" if value else "FALSE"
        return "" if value is None else value

    @classmethod
    def generate_csv_copy(
        cls,
        excel_file_path: str,
        workbook: ExcelWorkbook | None = None,
        clean_output_folder: bool = True,
    ) -> list[str]:
        """Copy every Excel sheet to a CSV file and return the generated file paths."""
        return cls(
            excel_file_path=excel_file_path,
            workbook=workbook,
            clean_output_folder=clean_output_folder,
        ).copy()
