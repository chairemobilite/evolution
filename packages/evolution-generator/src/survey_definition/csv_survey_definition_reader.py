# Copyright Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This module reads the survey definition from a folder of CSV files, one per
# table (Sections.csv, Widgets.csv, ...), with the same columns as the sheets of the
# Generator Excel file. It is the layout the CSV copy of the Excel file is written in
# (see excel_to_csv_generator.py), so that copy can become the files a survey is edited in.
import csv
import os
from typing import List, Optional, Sequence

from survey_definition.survey_definition_reader import (
    check_headers,
    is_empty_value,
    languages_from_headers,
)

CSV_FILE_EXTENSION = ".csv"


class CsvSurveyDefinitionReader:
    """
    Reads the survey definition from a folder of CSV files: the survey languages
    (get_languages) and each table, one `<table name>.csv` file per table (get_table).
    A SurveyDefinitionReader (see survey_definition_reader.py).

    Every file is read when the reader is created, the same way as an Excel sheet:
    the first row is the header, empty cells are None, and the empty rows and columns
    after the data are dropped. Every value is text: the survey definition tables read
    the true/false and number cells from it.
    """

    def __init__(self, csv_folder_path: str) -> None:
        if not os.path.isdir(csv_folder_path):
            raise Exception(f"CSV folder not found: {csv_folder_path}")
        self.csv_folder_path = csv_folder_path
        self.warnings: List[str] = []
        self._tables = {
            os.path.splitext(file_name)[0]: _read_csv_file(
                os.path.join(csv_folder_path, file_name)
            )
            for file_name in sorted(os.listdir(csv_folder_path))
            if file_name.lower().endswith(CSV_FILE_EXTENSION)
            and os.path.isfile(os.path.join(csv_folder_path, file_name))
        }

    def get_languages(self) -> tuple[str, ...]:
        """
        Return the survey languages, read from Widgets.csv: one per
        `label::<language>` column, in column order, e.g. ("fr", "en").

        Raises if the file has no such column.
        """
        return languages_from_headers(self.get_headers("Widgets"))

    def get_table(
        self,
        table_name: str,
        required_fields: List[str],
        is_table_optional: bool = False,
    ) -> List[dict]:
        """
        Return every row of `<table_name>.csv` (row 1 is the header) as a dict keyed by
        its headers. Raises if the file or one of `required_fields` is missing; with
        `is_table_optional`, a missing file is read as an empty table (e.g. a survey
        without any slider can leave out InputRange.csv).

        Empty rows between rows with data are kept, like in an Excel sheet.
        """
        if is_table_optional and table_name not in self._tables:
            return []
        headers = self.get_headers(table_name, required_fields)
        return [
            dict(zip(headers, row, strict=True))
            for row in self._get_rows(table_name)[1:]
        ]

    def get_headers(
        self, table_name: str, expected_headers: Sequence[str] = ()
    ) -> List[Optional[str]]:
        """
        Return the values of the file's header row, one per column. Raises if the file
        or one of `expected_headers` is missing, or if a header before the first empty
        one has spaces.
        """
        headers = self._get_rows(table_name)[0]
        check_headers(table_name, headers, expected_headers)
        return headers

    def _get_rows(self, table_name: str) -> List[List[Optional[str]]]:
        if table_name not in self._tables:
            raise Exception(
                f"Missing {table_name}{CSV_FILE_EXTENSION} in CSV folder "
                f"{self.csv_folder_path}"
            )
        return self._tables[table_name]


def _read_csv_file(csv_file_path: str) -> List[List[Optional[str]]]:
    """
    Read a CSV file as rows of cells cut to the area that has data, like an Excel
    sheet (see excel_survey_definition_reader._ExcelSheet): an empty cell is None,
    rows after the last row with a value and columns after the last column with a
    value are dropped, and every row has the same number of cells.
    """
    # utf-8-sig: Excel's "CSV UTF-8" starts the file with a byte order mark.
    with open(csv_file_path, mode="r", encoding="utf-8-sig", newline="") as csv_file:
        rows: List[List[Optional[str]]] = [
            [cell if cell != "" else None for cell in row]
            for row in csv.reader(csv_file)
        ]

    while rows and all(is_empty_value(cell) for cell in rows[-1]):
        rows.pop()
    width = max(
        (
            index + 1
            for row in rows
            for index, cell in enumerate(row)
            if not is_empty_value(cell)
        ),
        default=0,
    )
    rows = [row[:width] + [None] * (width - len(row[:width])) for row in rows]
    return rows or [[]]
