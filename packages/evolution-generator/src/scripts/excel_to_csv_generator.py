# Copyright 2026, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script copies each sheet of the Generator Excel file to a CSV file
# so changes are easier to review in git diffs. It is intended to be invoked
# from the generate_survey.py script, when the config's survey_definition has source
# excel and a csv_folder_path (see generator_config.py). The folder gets a README.md
# saying it is written from the Excel file, and the checksums of the files written, so
# a CSV file edited by hand is never overwritten: to edit the CSV files instead, the
# survey_definition source becomes csv.
import csv
import hashlib
import json
import os
import re

from scripts.generator_config import default_csv_folder_path
from survey_definition.excel_survey_definition_reader import ExcelSurveyDefinitionReader

# Written in the CSV folder with the copy: what it is (README.md) and the checksum of
# every CSV file written (COPY_CHECKSUMS_FILE_NAME), to find the files edited since.
COPY_README_FILE_NAME = "README.md"
COPY_CHECKSUMS_FILE_NAME = ".excel_copy_checksums.json"
COPY_README_TEXT = (
    "# Copy of the Excel file: don't edit\n\n"
    "These CSV files are written from the Excel file by the Evolution Generator, each "
    "time it runs, so changes are easier to review in git diffs. The Generator stops "
    "instead of overwriting a file edited here.\n\n"
    "To edit the CSV files instead of the Excel file, set `source: csv` in the "
    '`survey_definition` block of `generatorConfigs.yaml`. See "Excel or CSV '
    'source" in packages/evolution-generator/README.md.\n'
)


class CsvCopyEditedError(Exception):
    """CSV files of the copy were edited by hand: writing the copy would lose the edits."""


def release_csv_folder(csv_folder_path: str) -> bool:
    """
    Remove the checksums written with the copy of the Excel file, and its README.md
    if it is still the one written, now that the CSV files are the source. Returns
    whether there was a copy to release.
    """
    checksums_path = os.path.join(csv_folder_path, COPY_CHECKSUMS_FILE_NAME)
    if not os.path.isfile(checksums_path):
        return False
    os.remove(checksums_path)
    readme_path = os.path.join(csv_folder_path, COPY_README_FILE_NAME)
    if os.path.isfile(readme_path):
        with open(readme_path, "r", encoding="utf-8") as readme_file:
            is_written_readme = readme_file.read().replace("\r\n", "\n") == (
                COPY_README_TEXT
            )
        if is_written_readme:
            os.remove(readme_path)
    return True


class ExcelToCsvGenerator:
    """
    Copies each sheet of a Generator Excel file to a CSV file for readable git diffs.
    """

    def __init__(
        self,
        reader: ExcelSurveyDefinitionReader,
        output_folder_path: str,
        clean_output_folder: bool = True,
    ):
        """Configure the generator to copy the sheets read by `reader` to `output_folder_path`."""
        self.reader = reader
        self.output_folder_path = output_folder_path
        self.clean_output_folder = clean_output_folder

    @staticmethod
    def get_output_folder_path(excel_file_path: str) -> str:
        """Return "<excel_name>_csv" next to the Excel file."""
        return default_csv_folder_path(excel_file_path)

    @staticmethod
    def sanitize_sheet_title(sheet_title: str) -> str:
        """Return a sheet title that is safe to use as a file name."""
        sanitized_title = re.sub(r'[<>:"/\\|?*]+', "_", str(sheet_title)).strip()
        sanitized_title = re.sub(r"_+", "_", sanitized_title).strip("_")
        return sanitized_title or "Sheet"

    def copy(self) -> list[str]:
        """
        Write one CSV file per sheet, with the folder's README.md and checksums, and
        return the CSV files' paths. Raises CsvCopyEditedError, before writing
        anything, if a CSV file was edited since the last copy.
        """
        os.makedirs(self.output_folder_path, exist_ok=True)
        self.check_not_edited()

        if self.clean_output_folder:
            self.delete_existing_csv_files()

        csv_file_paths = [
            self.write_sheet_to_csv(sheet_name)
            for sheet_name in self.reader.sheet_names
        ]
        self.write_readme()
        self.write_checksums()
        return csv_file_paths

    def _csv_file_names(self) -> list[str]:
        return sorted(
            file_name
            for file_name in os.listdir(self.output_folder_path)
            if file_name.lower().endswith(".csv")
            and os.path.isfile(os.path.join(self.output_folder_path, file_name))
        )

    def _checksums(self) -> dict[str, str]:
        """
        The SHA-256 of every CSV file of the folder, by file name. Line endings are
        ignored: git may change them when the folder is checked out.
        """
        checksums = {}
        for file_name in self._csv_file_names():
            with open(os.path.join(self.output_folder_path, file_name), "rb") as file:
                content = file.read().replace(b"\r\n", b"\n")
            checksums[file_name] = hashlib.sha256(content).hexdigest()
        return checksums

    def check_not_edited(self) -> None:
        """
        Raise CsvCopyEditedError if a CSV file of the folder was edited, added or
        removed since the last copy. A folder without checksums (written before they
        existed) is overwritten as before.
        """
        checksums_path = os.path.join(self.output_folder_path, COPY_CHECKSUMS_FILE_NAME)
        if not os.path.isfile(checksums_path):
            return
        with open(checksums_path, "r", encoding="utf-8") as checksums_file:
            written = json.load(checksums_file)
        current = self._checksums()
        edited = sorted(
            file_name
            for file_name in written.keys() | current.keys()
            if written.get(file_name) != current.get(file_name)
        )
        if edited:
            raise CsvCopyEditedError(
                f"These CSV files of {self.output_folder_path} were edited by hand, "
                f"but the survey definition source is excel: {', '.join(edited)}\n"
                "Writing the copy of the Excel file would lose the edits. Either:\n"
                "- set source: csv in the survey_definition block of "
                "generatorConfigs.yaml, to keep the edits and edit the CSV files "
                "from now on, or\n"
                "- delete the folder (or undo the edits), to write it again from the "
                "Excel file."
            )

    def write_readme(self) -> None:
        """Write the README.md saying the folder is written from the Excel file."""
        with open(
            os.path.join(self.output_folder_path, COPY_README_FILE_NAME),
            mode="w",
            encoding="utf-8",
            newline="\n",
        ) as readme_file:
            readme_file.write(COPY_README_TEXT)

    def write_checksums(self) -> None:
        """Write the checksums of the CSV files just written (see check_not_edited)."""
        with open(
            os.path.join(self.output_folder_path, COPY_CHECKSUMS_FILE_NAME),
            mode="w",
            encoding="utf-8",
            newline="\n",
        ) as checksums_file:
            json.dump(self._checksums(), checksums_file, indent=4, sort_keys=True)
            checksums_file.write("\n")

    def delete_existing_csv_files(self) -> None:
        """Remove any .csv file already present in the output folder."""
        for file_name in os.listdir(self.output_folder_path):
            file_path = os.path.join(self.output_folder_path, file_name)
            if os.path.isfile(file_path) and file_name.lower().endswith(".csv"):
                os.remove(file_path)

    def write_sheet_to_csv(self, sheet_name: str) -> str:
        """Write a single sheet to "<SheetName>.csv" and return its path."""
        csv_file_name = f"{self.sanitize_sheet_title(sheet_name)}.csv"
        csv_file_path = os.path.join(self.output_folder_path, csv_file_name)

        with open(csv_file_path, mode="w", encoding="utf-8", newline="") as csv_file:
            writer = csv.writer(csv_file)

            try:
                writer.writerow(
                    self.normalize_cell_value(header)
                    for header in self.reader.get_headers(sheet_name)
                )
                # Each row has one cell per header (see get_data_rows)
                for row in self.reader.get_data_rows(sheet_name):
                    writer.writerow(
                        self.normalize_cell_value(cell.value) for cell in row
                    )

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
        reader: ExcelSurveyDefinitionReader,
        output_folder_path: str,
        clean_output_folder: bool = True,
    ) -> list[str]:
        """Copy every Excel sheet to a CSV file and return the generated file paths."""
        return cls(
            reader=reader,
            output_folder_path=output_folder_path,
            clean_output_folder=clean_output_folder,
        ).copy()
