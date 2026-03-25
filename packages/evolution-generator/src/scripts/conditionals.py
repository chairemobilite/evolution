# Copyright 2026, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes functions that validate and generate conditionals from the Excel sheet.
# These functions are intended to be invoked from the generate_survey.py script.

from collections import defaultdict
from dataclasses import dataclass
from openpyxl import Workbook

from helpers.generator_helpers import (
    INDENT,
    add_generator_comment,
    error_when_missing_required_fields,
    get_headers,
    get_values_from_row,
    get_workbook,
    is_excel_file,
    sheet_exists,
    get_data_from_excel,
    generate_output_file,
)


@dataclass(frozen=True)
class _ColumnSpec:
    """Spec for one column: controls expected headers, required fields, and value constraints."""

    # The name of the column.
    name: str
    # If True, this column is in expected_headers (sheet must have this header).
    required: bool
    # If not None, the cell (after treating "" as None) must be one of these values.
    allowed_values: frozenset[str | None] | None = None
    # If not None, the cell (when not None) must be an instance of one of these types.
    allowed_types: tuple[type, ...] | None = None


class Conditionals:
    """Shared logic for validating and generating Conditionals from the Excel sheet."""

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

    # Expected headers (for get_headers): columns with required=True.
    CONDITIONALS_EXPECTED_HEADERS = tuple(
        s.name for s in CONDITIONALS_COLUMN_SPECS if s.required
    )
    # All column names in spec order (e.g. for building a full sheet in tests).
    CONDITIONALS_ALL_HEADERS = tuple(s.name for s in CONDITIONALS_COLUMN_SPECS)

    @staticmethod
    def _sheet_error_prefix(sheet_name: str) -> str:
        """Return error prefix for a given sheet so users know where the error is."""
        return f"Error in {sheet_name} sheet - "

    def check_with_messages(self, excel_file_path: str) -> tuple[bool, list[str]]:
        """
        Check the integrity of the Excel file.

        Returns (True, []) when valid, or (False, messages) with human-readable issues.
        """
        msgs: list[str] = []
        try:
            is_excel_file(excel_file_path)
            workbook = get_workbook(excel_file_path)
            result = self._check_conditionals_sheet(workbook, msgs)
            # Pass only if the sheet check succeeded and nothing was appended to msgs.
            integrity_ok = bool(result) and len(msgs) == 0
            return integrity_ok, msgs
        except Exception as e:
            msgs.append(f"An error occurred with check_excel_integrity: {e}")
            return False, msgs

    def check(self, excel_file_path: str) -> bool:
        """Check the integrity of the Excel file. Returns True if valid, False on error."""
        ok, msgs = self.check_with_messages(excel_file_path)
        for message in msgs:
            print(message)
        return ok

    def _check_conditionals_sheet(self, workbook: Workbook, msgs: list[str] | None = None) -> bool:
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
            row_errors: list[str] = []
            for row_number, row in enumerate(rows[1:], start=2):
                values = get_values_from_row(row, headers)
                row_dict = dict(zip(headers, values, strict=True))
                try:
                    self._validate_conditionals_row(row_dict, row_number)
                    row_data.append((row_number, row_dict))
                except Exception as e:
                    # Collect row-level validation errors so users can fix multiple issues at once.
                    message = str(e)
                    if msgs is not None:
                        msgs.append(message)
                    else:
                        print(message)
                    row_errors.append(message)

            # If any row-level validation failed, skip cross-row logical checks and report failure.
            if row_errors:
                return False

            # Cross-row rules: apply per conditional block (consecutive rows with same conditional_name).
            self._validate_conditional_logic(row_data)

            return True
        except Exception as e:
            line = f"{self._sheet_error_prefix('Conditionals')}{e}"
            if msgs is not None:
                msgs.append(line)
            else:
                print(line)
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

    def _validate_conditional_logic(self, row_data: list[tuple[int, dict]]) -> None:
        """
        Run all cross-row logical validations that depend on grouping by conditional_name.

        Currently this includes:
        - Parentheses balance per conditional_name group.
        - First-row logical_operator rules per conditional_name group.
        """
        self._validate_conditionals_parentheses_balance(row_data)
        self._validate_conditionals_first_row_no_logical_operator(row_data)

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

    @staticmethod
    def extract_conditionals_from_data(rows, headers) -> defaultdict:
        """Extract conditionals from rows and group them by conditional_name."""
        conditional_by_name = defaultdict(list)

        try:
            for row_number, row in enumerate(rows[1:], start=2):
                (
                    conditional_name,
                    logical_operator,
                    path,
                    comparison_operator,
                    value,
                    parentheses,
                ) = get_values_from_row(row, headers)

                conditional = {
                    "logical_operator": logical_operator,
                    "path": path,
                    "comparison_operator": comparison_operator,
                    "value": value,
                    "parentheses": parentheses,
                }

                conditional_by_name[conditional_name].append(conditional)

        except Exception as e:
            print(f"Error extracting conditionals from Excel data: {e}")
            raise e

        return conditional_by_name

    @staticmethod
    def generate_typescript_code(conditional_by_name: defaultdict) -> str:
        """Generate TypeScript code based on conditionals grouped by name."""
        try:
            NEWLINE = "\n"
            ts_code = ""

            # Add Generator comment at the start of the file
            ts_code += add_generator_comment()

            # Add imports
            ts_code += (
                "import { checkConditionals } from "
                "'evolution-common/lib/services/widgets/conditionals/checkConditionals';"
                f"{NEWLINE}"
            )
            ts_code += (
                "import { type WidgetConditional } from "
                "'evolution-common/lib/services/questionnaire/types';"
                f"{NEWLINE}"
            )
            ts_code += (
                "import * as odSurveyHelpers from "
                "'evolution-common/lib/services/odSurvey/helpers';"
                f"{NEWLINE}"
            )

            # Create a TypeScript function for each conditional_name
            for conditional_name, conditionals in conditional_by_name.items():
                # Check if any conditional has a path that contains "${relativePath}"
                conditionals_has_relative_path = any(
                    "${relativePath}" in conditional["path"]
                    for conditional in conditionals
                )
                declare_relative_path = (
                    f"{INDENT}const relativePath = path.substring(0, path.lastIndexOf('.')); "
                    f"// Remove the last key from the path{NEWLINE}"
                )

                #  Check if any conditional has a path that contains "${currentPerson}"
                conditionals_has_current_person = any(
                    "${currentPerson}" in conditional["path"]
                    for conditional in conditionals
                )
                declare_current_person_id = (
                    f"{INDENT}const currentPersonId = odSurveyHelpers.getCurrentPersonId({{ interview, path }}); "
                    f"// Get the current person id{NEWLINE}"
                )

                ts_code += (
                    f"\nexport const {conditional_name}: WidgetConditional = (interview"
                )
                if conditionals_has_relative_path or conditionals_has_current_person:
                    ts_code += ", path"
                ts_code += f") => {{{NEWLINE}"
                ts_code += (
                    declare_relative_path if conditionals_has_relative_path else ""
                )
                ts_code += (
                    declare_current_person_id if conditionals_has_current_person else ""
                )
                ts_code += INDENT + "return checkConditionals({" + NEWLINE
                ts_code += INDENT + INDENT + "interview," + NEWLINE
                ts_code += INDENT + INDENT + "conditionals: [" + NEWLINE

                # Add conditionals
                for index, conditional in enumerate(conditionals):
                    new_value = (
                        "true"
                        if conditional["value"] is True
                        else (
                            "false"
                            if conditional["value"] is False
                            else (
                                int(conditional["value"])
                                if str(conditional["value"]).isdigit()
                                else f"'{conditional['value']}'"
                            )
                        )
                    )
                    conditional_has_path = (
                        "${relativePath}" in conditional["path"]
                        or "${currentPerson}" in conditional["path"]
                    )
                    quote = "`" if conditional_has_path else "'"
                    if "${currentPerson}" in conditional["path"]:
                        path = (
                            f"`household.persons.${{currentPersonId}}."
                            f"{conditional['path'].replace('${currentPerson}.', '')}`"
                        )
                    else:
                        path = f"{quote}{conditional['path']}{quote}"

                    ts_code += f"{INDENT}{INDENT}{INDENT}{{{NEWLINE}"
                    if conditional["logical_operator"]:
                        ts_code += (
                            f"{INDENT}{INDENT}{INDENT}{INDENT}logicalOperator: "
                            f"'{conditional['logical_operator']}',{NEWLINE}"
                        )
                    ts_code += f"{INDENT}{INDENT}{INDENT}{INDENT}path: {path},{NEWLINE}"
                    ts_code += (
                        f"{INDENT}{INDENT}{INDENT}{INDENT}comparisonOperator: "
                        f"'{conditional['comparison_operator']}',{NEWLINE}"
                    )
                    ts_code += (
                        f"{INDENT}{INDENT}{INDENT}{INDENT}value: {new_value},{NEWLINE}"
                    )
                    if conditional["parentheses"]:
                        ts_code += (
                            f"{INDENT}{INDENT}{INDENT}{INDENT}parentheses: "
                            f"'{conditional['parentheses']}',{NEWLINE}"
                        )
                    ts_code += f"{INDENT}{INDENT}{INDENT}}}"
                    ts_code += "," if index < len(conditionals) - 1 else ""
                    ts_code += f"{NEWLINE}"

                ts_code += f"{INDENT}{INDENT}]{NEWLINE}"
                ts_code += f"{INDENT}}});{NEWLINE}"
                ts_code += f"}};{NEWLINE}"

        except Exception as e:
            print(f"Error generating conditionals TypeScript code: {e}")
            raise e

        return ts_code

    @classmethod
    def generate_conditionals(cls, input_file: str, output_file: str) -> None:
        """Generate conditionals.tsx file based on input Excel file."""
        rows, headers = get_data_from_excel(input_file, sheet_name="Conditionals")
        conditional_by_name = cls.extract_conditionals_from_data(rows, headers)
        ts_code = cls.generate_typescript_code(conditional_by_name)
        generate_output_file(ts_code, output_file)
