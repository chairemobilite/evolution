# Copyright 2026, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes a checker for the integrity of the Excel file.
# It is intended to be invoked from the generate_survey.py script or a button in the admin UI.

from openpyxl import Workbook

from helpers.generator_helpers import (
    error_when_missing_required_fields,
    get_headers,
    get_values_from_row,
    get_workbook,
    is_excel_file,
    sheet_exists,
)


class CheckExcelIntegrity:
    """Checks the integrity of an Evolution Generator Excel file."""

    VALID_LOGICAL_OPERATORS = frozenset({"||", "&&", None})
    VALID_COMPARISON_OPERATORS = frozenset({"===", "!==", ">", "<", ">=", "<=", None})
    VALID_PARENTHESES = frozenset({"(", ")", None})

    CONDITIONALS_EXPECTED_HEADERS = [
        "conditional_name",
        "logical_operator",
        "path",
        "comparison_operator",
        "value",
        "parentheses",
    ]
    CONDITIONALS_REQUIRED_FIELDS = [
        "conditional_name",
        "path",
        "comparison_operator",
        "value",
    ]

    def check(self, excel_file_path: str) -> bool:
        """Check the integrity of the Excel file. Returns True if valid, False on error."""
        try:
            is_excel_file(excel_file_path)
            workbook = get_workbook(excel_file_path)
            self._check_conditionals_sheet(workbook)
            return True
        except Exception as e:
            print(f"An error occurred with check_excel_integrity: {e}")
            return False

    def _check_conditionals_sheet(self, workbook: Workbook) -> bool:
        """Check the integrity of the Conditionals sheet."""
        try:
            sheet_exists(workbook, "Conditionals")
            sheet = workbook["Conditionals"]
            headers = get_headers(
                sheet,
                expected_headers=self.CONDITIONALS_EXPECTED_HEADERS,
                sheet_name="Conditionals",
            )

            rows = list(sheet.rows)
            for row_number, row in enumerate(rows[1:], start=2):
                values = get_values_from_row(row, headers)
                row_dict = dict(zip(headers, values))
                self._validate_conditionals_row(row_dict, row_number)

            return True
        except Exception as e:
            print(f"An error occurred with check_conditionals_sheet: {e}")
            return False

    def _validate_conditionals_row(self, row_dict: dict, row_number: int) -> None:
        """Validate a single row of the Conditionals sheet."""
        required_values = [
            row_dict.get(name) for name in self.CONDITIONALS_REQUIRED_FIELDS
        ]
        error_when_missing_required_fields(
            self.CONDITIONALS_REQUIRED_FIELDS,
            required_values,
            row_number,
        )

        logical_operator = self._empty_to_none(row_dict.get("logical_operator"))
        if logical_operator not in self.VALID_LOGICAL_OPERATORS:
            raise Exception(
                f"Invalid logical_operator in row {row_number}: "
                f"must be '||', '&&', or empty, got {repr(logical_operator)}"
            )

        comparison_operator = self._empty_to_none(row_dict.get("comparison_operator"))
        if comparison_operator not in self.VALID_COMPARISON_OPERATORS:
            raise Exception(
                f"Invalid comparison_operator in row {row_number}: "
                f"must be '===', '!==', '>', '<', '>=', '<=', or empty, got {repr(comparison_operator)}"
            )

        parentheses = self._empty_to_none(row_dict.get("parentheses"))
        if parentheses not in self.VALID_PARENTHESES:
            raise Exception(
                f"Invalid parentheses in row {row_number}: "
                f"must be '(', ')', or empty, got {repr(parentheses)}"
            )

        value = row_dict.get("value")
        if value is not None and not isinstance(value, (int, float, str)):
            raise Exception(
                f"Invalid value in row {row_number}: "
                f"must be a number or a string, got {repr(value)}"
            )

    @staticmethod
    def _empty_to_none(value) -> str | None:
        """Treat empty string as None for optional Excel cells."""
        return None if value == "" else value


def check_excel_integrity(excel_file_path: str) -> bool:
    """Check the integrity of the Excel file. Entry point for scripts and UI."""
    return CheckExcelIntegrity().check(excel_file_path)
