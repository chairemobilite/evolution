# Copyright 2026, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This module defines ConditionalsGenerator: Excel validation (integrity checks) and
# TypeScript generation for survey conditionals. It is used from generate_survey.py and from CLI/API checks.

from collections import defaultdict
from dataclasses import dataclass
from openpyxl import Workbook

from helpers.generator_helpers import (
    INDENT,
    add_generator_comment,
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
    # If True, the column name is included in CONDITIONALS_EXPECTED_HEADERS and must appear in row 1 (see get_headers).
    required: bool
    # If not None, the cell (after treating "" as None) must be one of these values.
    allowed_values: frozenset[str | None] | None = None
    # If not None, the cell (when not None) must be an instance of one of these types.
    allowed_types: tuple[type, ...] | None = None


class ConditionalsGenerator:
    """Validate the Conditionals Excel sheet and generate TypeScript (conditionals.tsx) output."""

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
        _ColumnSpec(
            name="hidden_value",
            required=False,
            allowed_types=(int, float, str),
        ),
    )

    # Column names that get_headers requires in row 1 (required=True only; optional columns may still be present as extra headers).
    CONDITIONALS_EXPECTED_HEADERS = tuple(
        s.name for s in CONDITIONALS_COLUMN_SPECS if s.required
    )
    # All column names in spec order (e.g. for building a full sheet in tests).
    CONDITIONALS_ALL_HEADERS = tuple(s.name for s in CONDITIONALS_COLUMN_SPECS)

    def __init__(self) -> None:
        self._validation_errors = []

    @staticmethod
    def _sheet_error_prefix(sheet_name: str) -> str:
        """Return error prefix for a given sheet so users know where the error is."""
        return f"Error in {sheet_name} sheet - "

    def _clear_validation_errors(self) -> None:
        """Start a fresh validation run."""
        self._validation_errors.clear()

    def _append_validation_error(self, message: str, *, echo: bool = False) -> None:
        """Append one issue to ``_validation_errors``; when echo is True, also print (human-facing check). When False, messages stay in the list only (e.g. check_with_messages / JSON)."""
        self._validation_errors.append(message)
        if echo:
            print(message)

    def check_with_messages(self, excel_file_path: str) -> tuple[bool, list[str]]:
        """
        Check the integrity of the Excel file.

        Returns (True, []) when valid, or (False, messages) with human-readable issues.
        """
        self._clear_validation_errors()
        try:
            is_excel_file(excel_file_path)
            workbook = get_workbook(excel_file_path)
            result = self._check_conditionals_sheet(workbook, print_errors=False)
            # Pass only if the sheet check returned True and the error list is still empty (see _check_conditionals_sheet).
            integrity_ok = bool(result) and len(self._validation_errors) == 0
            return integrity_ok, self._validation_errors
        except Exception as e:
            self._append_validation_error(
                f"An error occurred during the Excel integrity check: {e}"
            )
            return False, self._validation_errors

    def _check_conditionals_sheet(
        self, workbook: Workbook, *, print_errors: bool = True
    ) -> bool:
        """Check the integrity of the Conditionals sheet. Issues are appended to ``self._validation_errors``; row-level issues echo when print_errors is True, and cross-row issues print only when that flag is True."""
        self._clear_validation_errors()
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
                row_issues = self._collect_row_validation_issues(row_dict, row_number)
                if row_issues:
                    for message in row_issues:
                        self._append_validation_error(message, echo=print_errors)
                        row_errors.append(message)
                else:
                    row_data.append((row_number, row_dict))

            # If any row-level validation failed, skip cross-row logical checks and report failure.
            if row_errors:
                return False

            # Cross-row rules: collect every issue (do not stop at the first group or first rule).
            cross_before = len(self._validation_errors)
            self._validate_conditional_logic(row_data)
            if len(self._validation_errors) > cross_before:
                if print_errors:
                    for line in self._validation_errors[cross_before:]:
                        print(line)
                return False

            return True
        except Exception as e:
            message = str(e)
            prefix = self._sheet_error_prefix("Conditionals")
            # If the message does not start with the prefix, add the prefix to the message.
            line = message if message.startswith(prefix) else f"{prefix}{message}"
            self._append_validation_error(line, echo=print_errors)
            return False

    def _collect_row_validation_issues(
        self, row_dict: dict, row_number: int
    ) -> list[str]:
        """
        Return every validation issue for this row (empty if the row is valid).

        Collects all missing required fields and all invalid columns in one pass (no early exit on the first problem) so one verify run can list every row issue.
        """
        issues: list[str] = []
        prefix = self._sheet_error_prefix("Conditionals")
        required_values = [
            row_dict.get(name) for name in self.CONDITIONALS_EXPECTED_HEADERS
        ]
        missing_fields = [
            field_name
            for field_value, field_name in zip(
                required_values, self.CONDITIONALS_EXPECTED_HEADERS, strict=True
            )
            if field_value is None
        ]
        if missing_fields:
            issues.append(
                f"{prefix}Required field is missing in row {row_number}. "
                f"Missing fields: {missing_fields}"
            )

        missing_set = set(missing_fields)

        for spec in self.CONDITIONALS_COLUMN_SPECS:
            raw_value = row_dict.get(spec.name)
            # Do not re-validate cells already covered by the missing-required message.
            if spec.name in missing_set:
                continue

            if spec.allowed_types is not None and raw_value is not None:
                if not isinstance(raw_value, spec.allowed_types):
                    type_names = ", ".join(t.__name__ for t in spec.allowed_types)
                    issues.append(
                        f"{prefix}Invalid {spec.name} in row {row_number}: "
                        f"must be one of types ({type_names}), got {type(raw_value).__name__} with value {repr(raw_value)}"
                    )

            if spec.allowed_values is not None:
                cell_value = self._empty_to_none(raw_value)
                if cell_value not in spec.allowed_values:
                    issues.append(
                        f"{prefix}Invalid {spec.name} in row {row_number}: "
                        f"must be one of {sorted(spec.allowed_values - {None})!r} or empty, got {repr(cell_value)}"
                    )

        return issues

    def _validate_conditionals_row(self, row_dict: dict, row_number: int) -> list[str]:
        """Return all validation issues for this row (empty if valid); for unit tests."""
        return self._collect_row_validation_issues(row_dict, row_number)

    def _group_row_data_by_conditional_name(
        self, row_data: list[tuple[int, dict]]
    ) -> dict:
        """
        Build one list per distinct conditional_name across the entire sheet (not split by consecutive blocks).
        Returns a dict mapping conditional_name -> list of (row_number, row_dict) in sheet order for that name
        (dict insertion order follows first occurrence of each name; all rows sharing a name are grouped).
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

        Appends every violation to ``self._validation_errors`` (never raises).
        """
        self._validate_conditionals_parentheses_balance(row_data)
        self._validate_conditionals_first_row_no_logical_operator(row_data)
        self._validate_conditionals_hidden_value_logic(row_data)

    def _validate_conditionals_hidden_value_logic(
        self, row_data: list[tuple[int, dict]]
    ) -> None:
        """
        Validate that for each conditional_name group, the optional hidden_value is either absent
        or unique across all rows of that conditional_name.
        """
        prefix = self._sheet_error_prefix("Conditionals")
        groups = self._group_row_data_by_conditional_name(row_data)
        for name, group_rows in groups.items():

            # Get all hidden values for the conditional_name
            # Treat empty string as None for optional Excel cells (e.g. hidden_value).
            hidden_values = {
                self._empty_to_none(row_dict.get("hidden_value"))
                for _row_number, row_dict in group_rows
                if self._empty_to_none(row_dict.get("hidden_value")) is not None
            }

            # Check if there are multiple hidden values for the same conditional_name
            # If there are, return an error
            if len(hidden_values) > 1:
                self._validation_errors.append(
                    f"{prefix}Multiple hidden_value for conditional_name '{name}': {sorted(hidden_values)}"
                )

    def _validate_conditionals_parentheses_balance(
        self, row_data: list[tuple[int, dict]]
    ) -> None:
        """
        Validate that for each conditional_name group (all rows with that name),
        parentheses are balanced: every '(' has a matching ')' and the balance never goes negative.
        """
        prefix = self._sheet_error_prefix("Conditionals")
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
            bad_negative = False
            for rn, paren in group:
                if paren == "(":
                    balance += 1
                elif paren == ")":
                    balance -= 1
                    if balance < 0:
                        self._validation_errors.append(
                            f"{prefix}Unbalanced parentheses for conditional_name '{name}' in row {rn}: "
                            "too many ')' (closing parenthesis without matching opening)."
                        )
                        bad_negative = True
                        break
            if bad_negative:
                continue
            if balance != 0:
                last_row = group[-1][0] if group else start_row_number
                self._validation_errors.append(
                    f"{prefix}Unbalanced parentheses for conditional_name '{name}' (e.g. row {last_row}): "
                    f"{balance} unclosed opening parenthesis/parentheses."
                )

    def _validate_conditionals_first_row_no_logical_operator(
        self, row_data: list[tuple[int, dict]]
    ) -> None:
        """
        For each distinct conditional_name, require empty logical_operator on that name's first sheet row only;
        later rows with the same name may use "||" or "&&".
        """
        prefix = self._sheet_error_prefix("Conditionals")
        groups = self._group_row_data_by_conditional_name(row_data)
        for name, group_rows in groups.items():
            if not group_rows:
                continue
            first_row_number, first_row_dict = group_rows[0]
            logical_operator = self._empty_to_none(
                first_row_dict.get("logical_operator")
            )
            if logical_operator is not None:
                self._validation_errors.append(
                    f"{prefix}Invalid logical_operator in row {first_row_number}: "
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
                values = get_values_from_row(row, headers)
                row_dict = dict(zip(headers, values, strict=True))

                # Get values from the row dictionary
                conditional_name = row_dict.get("conditional_name")
                logical_operator = row_dict.get("logical_operator")
                path = row_dict.get("path")
                comparison_operator = row_dict.get("comparison_operator")
                value = row_dict.get("value")
                parentheses = row_dict.get("parentheses")
                hidden_value = row_dict.get("hidden_value")

                conditional = {
                    "logical_operator": logical_operator,
                    "path": path,
                    "comparison_operator": comparison_operator,
                    "value": value,
                    "parentheses": parentheses,
                }
                hidden_value = ConditionalsGenerator._empty_to_none(hidden_value)
                if hidden_value is not None:
                    conditional["hidden_value"] = hidden_value

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

            # Emit one exported WidgetConditional (const) per conditional_name
            for conditional_name, conditionals in conditional_by_name.items():

                # Get the first non-None 'hidden_value' from the conditionals, or None if none is found.
                hidden_value = next(
                    (
                        c.get("hidden_value")
                        for c in conditionals
                        if c.get("hidden_value") is not None
                    ),
                    None,
                )

                # Check if any conditional has a path that contains "${relativePath}"
                conditionals_has_relative_path = any(
                    "${relativePath}" in conditional["path"]
                    for conditional in conditionals
                )
                declare_relative_path = (
                    f"{INDENT}const relativePath = path.substring(0, path.lastIndexOf('.')); "
                    f"// Remove the last key from the path{NEWLINE}"
                )

                # Check if any conditional has a path that contains "${currentPerson}"
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

                # Add hidden value if it exists
                if hidden_value is not None:
                    ts_code += (
                        INDENT + INDENT + f"hiddenValue: '{hidden_value}',{NEWLINE}"
                    )
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
        """Read the Conditionals sheet from ``input_file`` and write generated TypeScript to ``output_file`` (e.g. conditionals.tsx)."""
        rows, headers = get_data_from_excel(input_file, sheet_name="Conditionals")
        conditional_by_name = cls.extract_conditionals_from_data(rows, headers)
        ts_code = cls.generate_typescript_code(conditional_by_name)
        generate_output_file(ts_code, output_file)
