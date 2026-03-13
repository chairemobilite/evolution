# Copyright 2026, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes a checker for the integrity of the Excel file.
# It is intended to be invoked from the generate_survey.py script or a button in the admin UI.

from dataclasses import dataclass
from typing import FrozenSet

from openpyxl import Workbook

from helpers.generator_helpers import (
    error_when_missing_required_fields,
    get_headers,
    get_values_from_row,
    get_workbook,
    is_excel_file,
    sheet_exists,
)


@dataclass(frozen=True)
class _ColumnSpec:
    """Spec for one column: controls expected headers, required fields, and value constraints."""

    # The name of the column.
    name: str
    # If True, this column is in expected_headers (sheet must have this header).
    required: bool
    # If not None, the cell (after treating "" as None) must be one of these values.
    allowed_values: FrozenSet[str | None] | None = None
    # If not None, the cell (when not None) must be an instance of one of these types.
    allowed_types: tuple[type, ...] | None = None


class CheckExcelIntegrity:
    """Checks the integrity of an Evolution Generator Excel file."""

    @staticmethod
    def _sheet_error_prefix(sheet_name: str) -> str:
        """Return error prefix for a given sheet so users know where the error is."""
        return f"Error in {sheet_name} sheet - "

    # Conditionals sheet: single source of truth for column order and per-column rules.
    CONDITIONALS_COLUMN_SPECS: tuple[_ColumnSpec, ...] = (
        _ColumnSpec(
            name="conditional_name",
            required=True,
            allowed_types=(str,),
        ),
        _ColumnSpec(
            name="logical_operator",
            required=False,
            allowed_values=frozenset({"||", "&&", None}),
        ),
        _ColumnSpec(
            name="path",
            required=True,
            allowed_types=(str,),
        ),
        _ColumnSpec(
            name="comparison_operator",
            required=True,
            allowed_values=frozenset({"===", "!==", ">", "<", ">=", "<="}),
        ),
        _ColumnSpec(
            name="value",
            required=True,
            allowed_types=(int, float, str),
        ),
        _ColumnSpec(
            name="parentheses",
            required=False,
            allowed_values=frozenset({"(", ")", None}),
        ),
    )

    # Expected headers (for get_headers): columns with required=True. Required fields (for error_when_missing_required_fields): columns with allowed_values is not None.
    CONDITIONALS_EXPECTED_HEADERS = tuple(
        s.name for s in CONDITIONALS_COLUMN_SPECS if s.required
    )
    CONDITIONALS_REQUIRED_FIELDS = tuple(
        s.name for s in CONDITIONALS_COLUMN_SPECS if s.allowed_values is not None
    )
    # All column names in spec order (e.g. for building a full sheet in tests).
    CONDITIONALS_ALL_HEADERS = tuple(s.name for s in CONDITIONALS_COLUMN_SPECS)

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
            print(f"{self._sheet_error_prefix('Conditionals')}{e}")
            return False

    def _validate_conditionals_row(self, row_dict: dict, row_number: int) -> None:
        """Validate a single row of the Conditionals sheet."""
        # Require columns that are in expected_headers (required=True) to be non-None.
        required_values = [
            row_dict.get(name) for name in self.CONDITIONALS_EXPECTED_HEADERS
        ]
        try:
            error_when_missing_required_fields(
                list(self.CONDITIONALS_EXPECTED_HEADERS),
                required_values,
                row_number,
            )
        except Exception as e:
            raise Exception(f"{self._sheet_error_prefix('Conditionals')}{e}") from e

        # Validate per-column rules from the specs (allowed values, string/number types, etc.).
        for spec in self.CONDITIONALS_COLUMN_SPECS:
            raw_value = row_dict.get(spec.name)

            if spec.allowed_types is not None and raw_value is not None:
                if not isinstance(raw_value, spec.allowed_types):
                    type_names = ", ".join(t.__name__ for t in spec.allowed_types)
                    raise Exception(
                        f"{self._sheet_error_prefix('Conditionals')}Invalid {spec.name} in row {row_number}: "
                        f"must be one of types ({type_names}), got {type(raw_value).__name__} with value {repr(raw_value)}"
                    )

                # Smart default: columns that only accept strings (e.g. conditional_name, path)
                # must be non-empty strings. We infer this from the spec (no special flag needed).
                # if spec.allowed_types == (str,) and raw_value == "":
                #     raise Exception(
                #         f"Invalid {spec.name} in row {row_number}: "
                #         f"must be a non-empty string, got ''"
                #     )

            if spec.allowed_values is not None:
                cell_value = self._empty_to_none(raw_value)
                if cell_value not in spec.allowed_values:
                    raise Exception(
                        f"{self._sheet_error_prefix('Conditionals')}Invalid {spec.name} in row {row_number}: "
                        f"must be one of {sorted(spec.allowed_values - {None})!r} or empty, got {repr(cell_value)}"
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
                            f"{self._sheet_error_prefix('Conditionals')}Unbalanced parentheses for conditional_name '{name}' in row {rn}: "
                            "too many ')' (closing parenthesis without matching opening)."
                        )
            if balance != 0:
                last_row = group[-1][0] if group else start_row_number
                raise Exception(
                    f"{self._sheet_error_prefix('Conditionals')}Unbalanced parentheses for conditional_name '{name}' (e.g. row {last_row}): "
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
                    f"{self._sheet_error_prefix('Conditionals')}Invalid logical_operator in row {first_row_number}: "
                    f"first row of a conditional must have empty logical_operator, got {repr(logical_operator)}"
                )

    @staticmethod
    def _empty_to_none(value) -> str | None:
        """Treat empty string as None for optional Excel cells (e.g. logical_operator, parentheses)."""
        return None if value == "" else value


# Public entry point used by generate_survey.py and the admin UI.
def check_excel_integrity(excel_file_path: str) -> bool:
    """Check the integrity of the Excel file. Entry point for scripts and UI."""
    result = CheckExcelIntegrity().check(excel_file_path)
    if result is True:
        print(f"Excel integrity check passed for {excel_file_path}")
    else:
        print(f"Excel integrity check FAILED for {excel_file_path}")
    return result
