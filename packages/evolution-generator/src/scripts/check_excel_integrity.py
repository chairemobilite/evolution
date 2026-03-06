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

    # Allowed values for optional cells (empty cell is treated as None).
    VALID_LOGICAL_OPERATORS = frozenset({"||", "&&", None})
    VALID_COMPARISON_OPERATORS = frozenset({"===", "!==", ">", "<", ">=", "<=", None})
    VALID_PARENTHESES = frozenset({"(", ")", None})

    # Conditionals sheet: column names and which ones are required.
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
            # Ensure .xlsx and load workbook before running any sheet checks.
            is_excel_file(excel_file_path)
            workbook = get_workbook(excel_file_path)
            result = self._check_conditionals_sheet(workbook)
            return result
        except Exception as e:
            print(f"An error occurred with check_excel_integrity: {e}")
            return False

    def _check_conditionals_sheet(self, workbook: Workbook) -> bool:
        """Check the integrity of the Conditionals sheet."""
        try:
            # Require the Conditionals sheet and validate its column headers.
            sheet_exists(workbook, "Conditionals")
            sheet = workbook["Conditionals"]
            headers = get_headers(
                sheet,
                expected_headers=self.CONDITIONALS_EXPECTED_HEADERS,
                sheet_name="Conditionals",
            )

            # Walk data rows (skip header); row_number is 1-based for error messages (e.g. row 2 = first data row).
            rows = list(sheet.rows)
            row_data = []
            for row_number, row in enumerate(rows[1:], start=2):
                values = get_values_from_row(row, headers)
                row_dict = dict(zip(headers, values))
                self._validate_conditionals_row(row_dict, row_number)
                row_data.append((row_number, row_dict))

            # Cross-row rules: apply per conditional block (consecutive rows with same conditional_name).
            # For each group of consecutive rows with the same conditional_name, '(' and ')' must balance.
            self._validate_conditionals_parentheses_balance(row_data)
            # First row of each conditional must have empty logical_operator (no "||" or "&&").
            self._validate_conditionals_first_row_no_logical_operator(row_data)

            return True
        except Exception as e:
            print(f"An error occurred with check_conditionals_sheet: {e}")
            return False

    def _validate_conditionals_row(self, row_dict: dict, row_number: int) -> None:
        """Validate a single row of the Conditionals sheet."""
        # Require all conditionals columns to be present (no missing required fields).
        required_values = [
            row_dict.get(name) for name in self.CONDITIONALS_REQUIRED_FIELDS
        ]
        error_when_missing_required_fields(
            self.CONDITIONALS_REQUIRED_FIELDS,
            required_values,
            row_number,
        )

        # conditional_name becomes a TypeScript constant name; must be a non-empty string (e.g. not a number).
        conditional_name = row_dict.get("conditional_name")
        if not isinstance(conditional_name, str) or not conditional_name:
            raise Exception(
                f"Invalid conditional_name in row {row_number}: "
                f"must be a non-empty string, got {repr(conditional_name)}"
            )

        # path is a dot-path used in generated TypeScript; must be a non-empty string.
        path = row_dict.get("path")
        if not isinstance(path, str) or not path:
            raise Exception(
                f"Invalid path in row {row_number}: "
                f"must be a non-empty string, got {repr(path)}"
            )

        # Optional fields: empty cell is allowed (stored as None after _empty_to_none).
        logical_operator = self._empty_to_none(row_dict.get("logical_operator"))
        if logical_operator not in self.VALID_LOGICAL_OPERATORS:
            raise Exception(
                f"Invalid logical_operator in row {row_number}: "
                f"must be '||', '&&', or empty, got {repr(logical_operator)}"
            )

        # comparison_operator: optional; used when building the conditional expression (e.g. path === value).
        comparison_operator = self._empty_to_none(row_dict.get("comparison_operator"))
        if comparison_operator not in self.VALID_COMPARISON_OPERATORS:
            raise Exception(
                f"Invalid comparison_operator in row {row_number}: "
                f"must be '===', '!==', '>', '<', '>=', '<=', or empty, got {repr(comparison_operator)}"
            )

        # parentheses: optional; each '(' and ')' must balance per conditional block (checked later).
        parentheses = self._empty_to_none(row_dict.get("parentheses"))
        if parentheses not in self.VALID_PARENTHESES:
            raise Exception(
                f"Invalid parentheses in row {row_number}: "
                f"must be '(', ')', or empty, got {repr(parentheses)}"
            )

        # value can be a number or string (for comparisons); other types (e.g. date) are invalid.
        value = row_dict.get("value")
        if value is not None and not isinstance(value, (int, float, str)):
            raise Exception(
                f"Invalid value in row {row_number}: "
                f"must be a number or a string, got {repr(value)}"
            )

    def _group_row_data_by_conditional_name(
        self, row_data: list[tuple[int, dict]]
    ) -> dict:
        """
        Build one ordered group per conditional_name across the entire row_data.
        Returns a dict mapping conditional_name -> list of (row_number, row_dict)
        in original order (order of first occurrence of each name; rows within
        each name preserve their order in row_data).
        """
        groups = {}
        for row_number, row_dict in row_data:
            name = row_dict.get("conditional_name")
            if name not in groups:
                groups[name] = []
            groups[name].append((row_number, row_dict))
        return groups

    def _validate_conditionals_parentheses_balance(
        self, row_data: list[tuple[int, dict]]
    ) -> None:
        """
        Validate that for each conditional_name group (all rows with that name),
        parentheses are balanced: every '(' has a matching ')' and the balance never goes negative.
        """
        groups = self._group_row_data_by_conditional_name(row_data)
        for name, group_rows in groups.items():
            # Collect (row_number, paren) for this group in order.
            group: list[tuple[int, str | None]] = [
                (row_number, self._empty_to_none(row_dict.get("parentheses")))
                for row_number, row_dict in group_rows
            ]

            # Running balance: '(' +1, ')' -1. Must never go negative and must end at 0.
            balance = 0
            start_row_number = group_rows[0][0] if group_rows else 0
            for rn, paren in group:
                if paren == "(":
                    balance += 1
                elif paren == ")":
                    balance -= 1
                    if balance < 0:
                        raise Exception(
                            f"Unbalanced parentheses for conditional_name '{name}' in row {rn}: "
                            "too many ')' (closing parenthesis without matching opening)."
                        )
            if balance != 0:
                last_row = group[-1][0] if group else start_row_number
                raise Exception(
                    f"Unbalanced parentheses for conditional_name '{name}' (e.g. row {last_row}): "
                    f"{balance} unclosed opening parenthesis/parentheses."
                )

    def _validate_conditionals_first_row_no_logical_operator(
        self, row_data: list[tuple[int, dict]]
    ) -> None:
        """
        Validate that the first row of each conditional_name group (in document order)
        has empty logical_operator (no "||" or "&&").
        """
        groups = self._group_row_data_by_conditional_name(row_data)
        for name, group_rows in groups.items():
            if not group_rows:
                continue
            first_row_number, first_row_dict = group_rows[0]
            logical_operator = self._empty_to_none(
                first_row_dict.get("logical_operator")
            )
            if logical_operator is not None:
                raise Exception(
                    f"Invalid logical_operator in row {first_row_number}: "
                    f"first row of a conditional must have empty logical_operator, got {repr(logical_operator)}"
                )

    @staticmethod
    def _empty_to_none(value) -> str | None:
        """Treat empty string as None for optional Excel cells (e.g. logical_operator, parentheses)."""
        return None if value == "" else value


# Public entry point used by generate_survey.py and the admin UI.
def check_excel_integrity(excel_file_path: str) -> bool:
    """Check the integrity of the Excel file. Entry point for scripts and UI."""
    return CheckExcelIntegrity().check(excel_file_path)
