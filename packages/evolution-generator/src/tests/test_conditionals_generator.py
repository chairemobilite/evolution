# Copyright 2026, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for scripts/conditionals_generator.py (ConditionalsGenerator).

import datetime
from collections import defaultdict
import pytest  # pyright: ignore[reportMissingImports]

from scripts.conditionals_generator import ConditionalsGenerator
from scripts.generate_survey import check_excel_integrity
from helpers.generator_helpers import create_mocked_excel_data, delete_file_if_exists

# TODO: Add tests for the remaining ConditionalsGenerator class methods:
# - ConditionalsGenerator.extract_conditionals_from_data (grouping logic for raw rows/headers).
# - ConditionalsGenerator.generate_typescript_code (shape and content of generated TS code).
# - ConditionalsGenerator.generate_conditionals (end-to-end generation from Excel to file).


# Path where create_mocked_excel_data writes the workbook; we delete it after each test.
MOCKED_EXCEL_FILE = "src/tests/references/test.xlsx"


# FIXME: We should not test private methods, we should test the public methods.
# FIXME: In these tests, we should still test the functionnalities of the private methods, but we should not test the private methods themselves.
class TestCheckExcelIntegrity:
    """Tests for the public entry point check_excel_integrity(excel_file_path)."""

    checker = ConditionalsGenerator()

    def test_valid_file_returns_true(self):
        """Full flow: load .xlsx from path and validate Conditionals sheet returns True."""
        create_mocked_excel_data(
            "Conditionals",
            list(ConditionalsGenerator.CONDITIONALS_ALL_HEADERS),
            [["cond1", "", "some.path", "===", "42", ""]],
        )
        try:
            assert check_excel_integrity(MOCKED_EXCEL_FILE) is True
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_missing_conditionals_sheet_returns_false(self):
        """When the workbook has no 'Conditionals' sheet, check_excel_integrity returns False."""
        create_mocked_excel_data(
            "OtherSheet",
            list(ConditionalsGenerator.CONDITIONALS_ALL_HEADERS),
            [["cond1", "", "some.path", "===", "42", ""]],
        )
        try:
            assert check_excel_integrity(MOCKED_EXCEL_FILE) is False
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_invalid_file_extension_returns_false(self):
        """When the path does not end with .xlsx, check_excel_integrity returns False."""
        assert check_excel_integrity("survey.txt") is False
        assert check_excel_integrity("survey.xls") is False

    def test_file_not_found_returns_false(self):
        """When the .xlsx file does not exist, check_excel_integrity returns False."""
        assert check_excel_integrity("nonexistent.xlsx") is False

    def test_valid_file_prints_success(self, capsys):
        """When validation passes, check_excel_integrity prints a success message."""
        create_mocked_excel_data(
            "Conditionals",
            list(ConditionalsGenerator.CONDITIONALS_ALL_HEADERS),
            [["cond1", "", "some.path", "===", "42", ""]],
        )
        try:
            result = check_excel_integrity(MOCKED_EXCEL_FILE)
            assert result is True
            captured = capsys.readouterr()
            assert "Excel integrity check passed for" in captured.out
            assert MOCKED_EXCEL_FILE in captured.out
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_invalid_file_prints_failure(self, capsys):
        """When validation fails, check_excel_integrity prints a failure message."""
        assert check_excel_integrity("survey.txt") is False
        captured = capsys.readouterr()
        assert "Excel integrity check FAILED for" in captured.out
        assert "survey.txt" in captured.out

    def test_check_with_messages_returns_two_errors_for_two_bad_rows(self):
        """
        One verify run can return multiple error strings: two invalid data rows
        each produce a distinct message (no early exit after the first).
        """
        rows = [
            [None, "", "some.path", "===", "42", ""],
            ["cond2", "", "some.path", "==", "42", ""],
        ]
        create_mocked_excel_data(
            "Conditionals",
            list(ConditionalsGenerator.CONDITIONALS_ALL_HEADERS),
            rows,
        )
        try:
            ok, msgs = self.checker.check_with_messages(MOCKED_EXCEL_FILE)
            assert ok is False
            assert len(msgs) == 2
            assert "Missing fields: ['conditional_name']" in msgs[0]
            assert "comparison_operator" in msgs[1] and "=='" in msgs[1]
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)


class TestCheckConditionalsSheet:
    """
    Tests for the _check_conditionals_sheet method.

    Row constants are lists of cell values in header order:
    conditional_name, logical_operator, path, comparison_operator, value, parentheses.
    """

    checker = ConditionalsGenerator()

    # Constants for test cases.
    CORRECT_SHEET_NAME = "Conditionals"
    CORRECT_HEADERS = list(ConditionalsGenerator.CONDITIONALS_ALL_HEADERS)
    # Headers missing 'conditional_name' to trigger missing-header error.
    INCORRECT_HEADERS = [
        "conditional_name_bad",
        "logical_operator",
        "path",
        "comparison_operator",
        "value",
        "parentheses",
    ]

    # Valid single row (all fields valid, optional cells empty).
    CORRECT_ROW = ["cond1", "", "some.path", "===", "42", ""]

    # Multiple rows with same conditional_name: parentheses must balance within the block.
    # Invalid: one ')' with no preceding '('.
    ROWS_UNBALANCED_PARENTHESES = [
        ["cond1", "", "some.path", "===", "42", ")"],
        ["cond1", "&&", "some.path", "===", "40", ""],
    ]
    # Valid: open then close, balance ends at 0.
    ROWS_BALANCED_PARENTHESES = [
        ["cond2", "", "some.path", "===", "42", ""],
        ["cond2", "||", "some.path", "===", "40", "("],
        ["cond2", "", "some.path", "===", "40", ")"],
    ]

    # First row of a conditional must have empty logical_operator; subsequent rows may have "||" or "&&".
    # Valid: first row "", second row "||".
    ROWS_FIRST_ROW_EMPTY_LOGICAL_OPERATOR = [
        ["cond1", "", "some.path", "===", "42", ""],
        ["cond1", "||", "some.path", "===", "35", ""],
    ]
    # Invalid: first row has "&&".
    ROWS_FIRST_ROW_HAS_LOGICAL_OPERATOR = [
        ["cond1", "&&", "some.path", "===", "42", ""],
        ["cond1", "&&", "some.path", "===", "42", ""],
    ]

    # Sheet-level and full-flow cases only; row-level validation is in TestValidateConditionalsRow.
    @pytest.mark.parametrize(
        "case",
        [
            pytest.param(
                {
                    "sheet_name": CORRECT_SHEET_NAME,
                    "headers": CORRECT_HEADERS,
                    "rows": [CORRECT_ROW],
                    "expected_result": True,
                    "expected_message": None,
                },
                id="Valid sheet returns True",
            ),
            pytest.param(
                {
                    "sheet_name": "OtherSheet",
                    "headers": CORRECT_HEADERS,
                    "rows": [CORRECT_ROW],
                    "expected_result": False,
                    "expected_message": "Error in Conditionals sheet - Sheet with name Conditionals does not exist",
                },
                id="Missing Conditionals sheet",
            ),
            pytest.param(
                {
                    "sheet_name": CORRECT_SHEET_NAME,
                    "headers": INCORRECT_HEADERS,
                    "rows": [CORRECT_ROW],
                    "expected_result": False,
                    "expected_message": "Error in Conditionals sheet - Missing expected header in Conditionals sheet: conditional_name",
                },
                id="Missing expected header (conditional_name)",
            ),
            pytest.param(
                {
                    "sheet_name": CORRECT_SHEET_NAME,
                    "headers": ["conditional_name", "path"],
                    "rows": [["cond1", "some.path"]],
                    "expected_result": False,
                    "expected_message": "Error in Conditionals sheet - Too few columns in Conditionals sheet",
                },
                id="Too few columns in Conditionals sheet",
            ),
            pytest.param(
                {
                    "sheet_name": CORRECT_SHEET_NAME,
                    "headers": CORRECT_HEADERS,
                    "rows": ROWS_UNBALANCED_PARENTHESES,
                    "expected_result": False,
                    "expected_message": "Error in Conditionals sheet - Unbalanced parentheses for conditional_name 'cond1' in row 2: too many ')' (closing parenthesis without matching opening).",
                },
                id="Unbalanced parentheses (same conditional_name)",
            ),
            pytest.param(
                {
                    "sheet_name": CORRECT_SHEET_NAME,
                    "headers": CORRECT_HEADERS,
                    "rows": ROWS_BALANCED_PARENTHESES,
                    "expected_result": True,
                    "expected_message": None,
                },
                id="Balanced parentheses (same conditional_name)",
            ),
            pytest.param(
                {
                    "sheet_name": CORRECT_SHEET_NAME,
                    "headers": CORRECT_HEADERS,
                    "rows": ROWS_FIRST_ROW_EMPTY_LOGICAL_OPERATOR,
                    "expected_result": True,
                    "expected_message": None,
                },
                id="First row empty logical_operator (valid)",
            ),
            pytest.param(
                {
                    "sheet_name": CORRECT_SHEET_NAME,
                    "headers": CORRECT_HEADERS,
                    "rows": ROWS_FIRST_ROW_HAS_LOGICAL_OPERATOR,
                    "expected_result": False,
                    "expected_message": "Error in Conditionals sheet - Invalid logical_operator in row 2: first row of a conditional must have empty logical_operator, got '&&'",
                },
                id="First row has logical_operator (invalid)",
            ),
        ],
    )
    def test_check_conditionals_sheet_cases(self, case, capsys):
        """
        Parametrized tests for _check_conditionals_sheet (sheet-level and full flow).
        Each case builds a workbook and asserts return value and printed error message.
        Row-level validation is unit-tested in TestValidateConditionalsRow.
        """
        try:
            workbook = create_mocked_excel_data(
                case["sheet_name"],
                case["headers"],
                case["rows"],
            )

            assert (
                self.checker._check_conditionals_sheet(workbook)
                is case["expected_result"]
            )

            # When validation fails, the script prints the error with "Error in Conditionals sheet - " prefix; we assert the full message.
            captured = capsys.readouterr()
            if case["expected_message"] is None:
                assert "Error in Conditionals sheet -" not in captured.out
            else:
                assert case["expected_message"] in captured.out
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_multiple_row_errors_are_all_reported_and_logic_skipped(self, capsys):
        """
        When multiple rows are invalid, all row-level errors are printed and
        the sheet-level check returns False without running cross-row logic.
        """
        # Two rows with different invalid issues to ensure we see two distinct messages.
        rows = [
            # Invalid: conditional_name is None (required)
            [None, "", "some.path", "===", "42", ""],
            # Invalid: comparison_operator is invalid
            ["cond2", "", "some.path", "==", "42", ""],
        ]
        workbook = create_mocked_excel_data(
            self.CORRECT_SHEET_NAME,
            self.CORRECT_HEADERS,
            rows,
        )

        result = self.checker._check_conditionals_sheet(workbook)
        assert result is False

        captured = capsys.readouterr().out
        # Both row-level errors should be printed so the user can fix them in one run.
        assert (
            "Required field is missing in row 2. Missing fields: ['conditional_name']"
            in captured
        )
        assert (
            "Invalid comparison_operator in row 3: must be one of ['!==', '<', '<=', '===', '>', '>='] or empty, got '=='"
            in captured
        )


class TestExtractConditionalsFromData:
    """
    Regression test: extract_conditionals_from_data must not depend on column order.
    """

    def test_extract_conditionals_works_with_reordered_headers(self):
        """
        When the Conditionals sheet columns are reordered, extraction still picks values by header name.
        """
        # Reorder columns compared to the default spec order.
        headers = [
            "path",
            "conditional_name",
            "value",
            "comparison_operator",
            "parentheses",
            "logical_operator",
        ]
        rows = [
            ["some.path", "cond1", "42", "===", "", ""],
            ["some.path", "cond1", "40", "!==", "(", "&&"],
        ]
        try:
            workbook = create_mocked_excel_data("Conditionals", headers, rows)
            sheet = workbook["Conditionals"]
            extracted = ConditionalsGenerator.extract_conditionals_from_data(
                list(sheet.rows), headers
            )
            assert extracted["cond1"] == [
                {
                    "logical_operator": "",
                    "path": "some.path",
                    "comparison_operator": "===",
                    "value": "42",
                    "parentheses": "",
                },
                {
                    "logical_operator": "&&",
                    "path": "some.path",
                    "comparison_operator": "!==",
                    "value": "40",
                    "parentheses": "(",
                },
            ]
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)


class TestValidateConditionalsRow:
    """
    Unit tests for _validate_conditionals_row.

    Each test builds a row_dict (and optionally omits or corrupts one field)
    and asserts that the method either passes or raises the expected error.
    """

    checker = ConditionalsGenerator()
    ROW_NUMBER = 2

    def _row(
        self,
        conditional_name="cond1",
        logical_operator="",
        path="some.path",
        comparison_operator="===",
        value="42",
        parentheses="",
    ) -> dict:
        """Full row dict with valid defaults; override any key to test invalid cases."""
        return {
            "conditional_name": conditional_name,
            "logical_operator": logical_operator,
            "path": path,
            "comparison_operator": comparison_operator,
            "value": value,
            "parentheses": parentheses,
        }

    def test_valid_row_does_not_raise(self):
        """Row with all valid fields returns no issues."""
        assert (
            self.checker._validate_conditionals_row(self._row(), self.ROW_NUMBER) == []
        )

    def test_missing_required_field_raises(self):
        """Missing required field (e.g. conditional_name) returns one issue."""
        assert self.checker._validate_conditionals_row(
            self._row(conditional_name=None), self.ROW_NUMBER
        ) == [
            "Error in Conditionals sheet - Required field is missing in row 2. "
            "Missing fields: ['conditional_name']"
        ]

    def test_missing_optional_field_does_not_raise(self):
        """Missing optional field (e.g. logical_operator empty/None) returns no issues."""
        assert (
            self.checker._validate_conditionals_row(
                self._row(logical_operator=None), self.ROW_NUMBER
            )
            == []
        )

    def test_invalid_conditional_name_raises(self):
        """conditional_name must be a non-empty string (e.g. not a number)."""
        assert self.checker._validate_conditionals_row(
            self._row(conditional_name=10), self.ROW_NUMBER
        ) == [
            "Error in Conditionals sheet - Invalid conditional_name in row 2: "
            "must be one of types (str), got int with value 10"
        ]

    def test_invalid_path_raises(self):
        """path must be a non-empty string."""
        assert self.checker._validate_conditionals_row(
            self._row(path=5), self.ROW_NUMBER
        ) == [
            "Error in Conditionals sheet - Invalid path in row 2: "
            "must be one of types (str), got int with value 5"
        ]

    def test_invalid_logical_operator_raises(self):
        """logical_operator must be '||', '&&', or empty."""
        assert self.checker._validate_conditionals_row(
            self._row(logical_operator="OR"), self.ROW_NUMBER
        ) == [
            "Error in Conditionals sheet - Invalid logical_operator in row 2: "
            "must be one of ['&&', '||'] or empty, got 'OR'"
        ]

    def test_invalid_comparison_operator_raises(self):
        """comparison_operator must be one of the allowed operators or empty."""
        assert self.checker._validate_conditionals_row(
            self._row(comparison_operator="=="), self.ROW_NUMBER
        ) == [
            "Error in Conditionals sheet - Invalid comparison_operator in row 2: "
            "must be one of ['!==', '<', '<=', '===', '>', '>='] or empty, got '=='"
        ]

    def test_invalid_parentheses_raises(self):
        """parentheses must be '(', ')', or empty."""
        assert self.checker._validate_conditionals_row(
            self._row(parentheses="(("), self.ROW_NUMBER
        ) == [
            "Error in Conditionals sheet - Invalid parentheses in row 2: "
            "must be one of ['(', ')'] or empty, got '(('"
        ]

    def test_invalid_value_type_raises(self):
        """value must be int, float, str (e.g. not date)."""
        assert self.checker._validate_conditionals_row(
            self._row(value=datetime.date(2024, 1, 1)), self.ROW_NUMBER
        ) == [
            "Error in Conditionals sheet - Invalid value in row 2: "
            "must be one of types (int, float, str), got date with value datetime.date(2024, 1, 1)"
        ]

    def test_same_row_can_report_two_validation_issues(self):
        """When all required cells are present, every invalid optional/column is reported."""
        issues = self.checker._collect_row_validation_issues(
            self._row(logical_operator="OR", parentheses="(("),
            self.ROW_NUMBER,
        )
        assert len(issues) == 2
        assert any("logical_operator" in msg for msg in issues)
        assert any("parentheses" in msg for msg in issues)


class TestValidateConditionalsParenthesesBalance:
    """
    Unit tests for _validate_conditionals_parentheses_balance.

    row_data is a list of (row_number, row_dict); each row_dict must have
    "conditional_name" and "parentheses" (other keys are ignored for this check).
    """

    checker = ConditionalsGenerator()

    def setup_method(self):
        self.checker._clear_validation_errors()

    def _row(self, conditional_name: str, parentheses: str | None) -> dict:
        """Minimal row dict for balance checks."""
        return {"conditional_name": conditional_name, "parentheses": parentheses}

    def test_balanced_single_row_no_parentheses(self):
        """One row with no parentheses collects no issues."""
        row_data = [(2, self._row("cond1", ""))]
        self.checker._validate_conditionals_parentheses_balance(row_data)
        assert self.checker._validation_errors == []

    def test_balanced_open_then_close(self):
        """Group with '(' then ')' collects no issues."""
        row_data = [
            (2, self._row("cond1", "(")),
            (3, self._row("cond1", ")")),
        ]
        self.checker._validate_conditionals_parentheses_balance(row_data)
        assert self.checker._validation_errors == []

    def test_unbalanced_too_many_closing_raises(self):
        """')' without matching '(' appends the expected message."""
        row_data = [(2, self._row("cond1", ")"))]
        self.checker._validate_conditionals_parentheses_balance(row_data)
        assert self.checker._validation_errors == [
            "Error in Conditionals sheet - Unbalanced parentheses for conditional_name 'cond1' in row 2: "
            "too many ')' (closing parenthesis without matching opening)."
        ]

    def test_unbalanced_unclosed_opening_raises(self):
        """'(' without matching ')' appends the expected message."""
        row_data = [(2, self._row("cond1", "("))]
        self.checker._validate_conditionals_parentheses_balance(row_data)
        assert self.checker._validation_errors == [
            "Error in Conditionals sheet - Unbalanced parentheses for conditional_name 'cond1' (e.g. row 2): "
            "1 unclosed opening parenthesis/parentheses."
        ]

    def test_two_groups_each_balanced(self):
        """Consecutive groups with different conditional_name are checked separately; both balanced passes."""
        row_data = [
            (2, self._row("condA", "(")),
            (3, self._row("condA", ")")),
            (4, self._row("condB", "")),
        ]
        self.checker._validate_conditionals_parentheses_balance(row_data)
        assert self.checker._validation_errors == []

    def test_same_name_non_consecutive_balanced(self):
        """Same conditional_name appearing again later: condA, condB, condA; parentheses balanced across condA rows."""
        row_data = [
            (2, self._row("condA", "(")),
            (3, self._row("condB", "")),
            (4, self._row("condA", ")")),
        ]
        self.checker._validate_conditionals_parentheses_balance(row_data)
        assert self.checker._validation_errors == []

    def test_same_name_non_consecutive_unbalanced_raises(self):
        """Same conditional_name appearing again later with unclosed '(' in the combined group appends an issue."""
        row_data = [
            (2, self._row("condA", "(")),
            (3, self._row("condB", "")),
            (4, self._row("condA", "(")),
        ]
        self.checker._validate_conditionals_parentheses_balance(row_data)
        assert self.checker._validation_errors == [
            "Error in Conditionals sheet - Unbalanced parentheses for conditional_name 'condA' (e.g. row 4): "
            "2 unclosed opening parenthesis/parentheses."
        ]


class TestValidateConditionalsFirstRowNoLogicalOperator:
    """
    Unit tests for _validate_conditionals_first_row_no_logical_operator.

    The first row of each group of consecutive rows with the same conditional_name
    must have empty logical_operator (no "||" or "&&"); subsequent rows may have one.
    """

    checker = ConditionalsGenerator()

    def setup_method(self):
        self.checker._clear_validation_errors()

    def _row(self, conditional_name: str, logical_operator: str | None) -> dict:
        """Minimal row dict for first-row logical_operator checks."""
        return {
            "conditional_name": conditional_name,
            "logical_operator": logical_operator,
        }

    def test_first_row_empty_does_not_raise(self):
        """First row with empty logical_operator records no issues."""
        row_data = [(2, self._row("cond1", ""))]
        self.checker._validate_conditionals_first_row_no_logical_operator(row_data)
        assert self.checker._validation_errors == []

    def test_first_row_empty_second_has_operator_does_not_raise(self):
        """First row empty, second row has '||' is valid."""
        row_data = [
            (2, self._row("cond1", "")),
            (3, self._row("cond1", "||")),
        ]
        self.checker._validate_conditionals_first_row_no_logical_operator(row_data)
        assert self.checker._validation_errors == []

    def test_first_row_has_logical_operator_raises(self):
        """First row with '||' or '&&' records an issue (first row of a conditional must be empty)."""
        row_data = [(2, self._row("cond1", "&&"))]
        self.checker._validate_conditionals_first_row_no_logical_operator(row_data)
        assert self.checker._validation_errors == [
            "Error in Conditionals sheet - Invalid logical_operator in row 2: "
            "first row of a conditional must have empty logical_operator, got '&&'"
        ]

    def test_two_groups_both_valid(self):
        """Two conditionals, each with first row empty, records no issues."""
        row_data = [
            (2, self._row("condA", "")),
            (3, self._row("condA", "&&")),
            (4, self._row("condB", "")),
        ]
        self.checker._validate_conditionals_first_row_no_logical_operator(row_data)
        assert self.checker._validation_errors == []

    def test_second_group_first_row_has_operator_raises(self):
        """Second conditional's first row has '&&' records an issue (row 4)."""
        row_data = [
            (2, self._row("condA", "")),
            (3, self._row("condA", "||")),
            (4, self._row("condB", "&&")),
        ]
        self.checker._validate_conditionals_first_row_no_logical_operator(row_data)
        assert self.checker._validation_errors == [
            "Error in Conditionals sheet - Invalid logical_operator in row 4: "
            "first row of a conditional must have empty logical_operator, got '&&'"
        ]

    def test_same_name_comes_back_later_first_row_has_operator_raises(self):
        """When condA appears again after condB, the first occurrence of condA (row 2) must have empty logical_operator."""
        row_data = [
            (2, self._row("condA", "&&")),
            (3, self._row("condB", "")),
            (4, self._row("condA", "")),
        ]
        self.checker._validate_conditionals_first_row_no_logical_operator(row_data)
        assert self.checker._validation_errors == [
            "Error in Conditionals sheet - Invalid logical_operator in row 2: "
            "first row of a conditional must have empty logical_operator, got '&&'"
        ]

    def test_same_name_comes_back_later_first_row_empty_passes(self):
        """When condA appears again after condB, first occurrence of each name is checked; both empty passes."""
        row_data = [
            (2, self._row("condA", "")),
            (3, self._row("condB", "")),
            (4, self._row("condA", "||")),
        ]
        self.checker._validate_conditionals_first_row_no_logical_operator(row_data)
        assert self.checker._validation_errors == []

    def test_two_conditional_groups_invalid_first_row_yields_two_errors(self):
        """Two different conditional_name blocks can each produce a first-row logical_operator error."""
        row_data = [
            (2, self._row("condA", "&&")),
            (3, self._row("condB", "||")),
        ]
        self.checker._validate_conditionals_first_row_no_logical_operator(row_data)
        assert len(self.checker._validation_errors) == 2
        assert all(
            "Invalid logical_operator" in m for m in self.checker._validation_errors
        )
        assert "row 2" in self.checker._validation_errors[0]
        assert "row 3" in self.checker._validation_errors[1]


class TestEmptyToNone:
    """Tests for the _empty_to_none helper."""

    def test_empty_string_returns_none(self):
        """
        Empty string should be converted to None.
        """
        assert ConditionalsGenerator._empty_to_none("") is None

    def test_none_stays_none(self):
        """
        None should remain None.
        """
        assert ConditionalsGenerator._empty_to_none(None) is None

    def test_non_empty_string_unchanged(self):
        """
        Non-empty strings should be returned unchanged.
        """
        assert ConditionalsGenerator._empty_to_none("foo") == "foo"
        assert ConditionalsGenerator._empty_to_none(" ") == " "


class TestGenerateTypescriptCode:
    @pytest.mark.parametrize(
        "case",
        [
            pytest.param(
                {
                    "token_key": "currentPerson",
                    "conditional_path": "${currentPerson}.age",
                    "expected_helper_line": "const currentPersonId = odSurveyHelpers.getCurrentPersonId({ interview, path });",
                    "expected_path_snippet": "`household.persons.${currentPersonId}.age`",
                },
            ),
            pytest.param(
                {
                    "token_key": "currentJourney",
                    "conditional_path": "${currentJourney}.personDidTrips",
                    "expected_helper_line": "const currentJourneyId = odSurveyHelpers.getCurrentJourneyId({ interview, path });",
                    "expected_path_snippet": ".journeys.${currentJourneyId}.",
                },
            ),
            pytest.param(
                {
                    "token_key": "currentTrip",
                    "conditional_path": "${currentTrip}.segments.0.mode",
                    "expected_helper_line": "const currentTripId = odSurveyHelpers.getCurrentTripId({ interview, path });",
                    "expected_path_snippet": ".trips.${currentTripId}.",
                },
            ),
            pytest.param(
                {
                    "token_key": "currentVisitedPlace",
                    "conditional_path": "${currentVisitedPlace}.activity",
                    "expected_helper_line": "const currentVisitedPlaceId = odSurveyHelpers.getCurrentVisitedPlaceId({ interview, path });",
                    "expected_path_snippet": ".visitedPlaces.${currentVisitedPlaceId}.",
                },
            ),
        ],
    )
    def test_expands_current_context_tokens_in_paths(self, case):
        """
        When a conditional path contains a `${current...}` token, the generator should:
        - emit the corresponding `odSurveyHelpers.getCurrent*Id({ interview, path })` helper call
        - expand the conditional path to include the computed id in a template string
        """

        conditional_by_name = defaultdict(list)
        conditional_by_name[f"cond_{case['token_key']}"].append(
            {
                "logical_operator": "",
                "path": case["conditional_path"],
                "comparison_operator": "===",
                "value": "test",
                "parentheses": "",
            }
        )

        ts_code = ConditionalsGenerator.generate_typescript_code(conditional_by_name)
        assert case["expected_helper_line"] in ts_code
        assert case["expected_path_snippet"] in ts_code


class TestExpandTokenizedPath:
    def test_expands_relative_path_and_current_person(self):
        specs = (
            {
                "token": "${currentPerson}",
                "prefix": "household.persons.${currentPersonId}.",
            },
        )

        assert (
            ConditionalsGenerator._expand_tokenized_path(
                "${relativePath}.age", current_context_specs=specs
            )
            == "`${relativePath}.age`"
        )
        assert (
            ConditionalsGenerator._expand_tokenized_path(
                "${currentPerson}.age", current_context_specs=specs
            )
            == "`household.persons.${currentPersonId}.age`"
        )


class TestCurrentContextVarsNeeded:
    @pytest.mark.parametrize(
        "case",
        [
            pytest.param(
                {
                    "name": "currentPerson",
                    "path": "${currentPerson}.age",
                    "expected_needed": {"currentPersonId"},
                }
            ),
            pytest.param(
                {
                    "name": "currentJourney",
                    "path": "${currentJourney}.personDidTrips",
                    "expected_needed": {"currentJourneyId", "currentPersonId"},
                }
            ),
            pytest.param(
                {
                    "name": "currentTrip",
                    "path": "${currentTrip}.segments.0.mode",
                    "expected_needed": {
                        "currentTripId",
                        "currentJourneyId",
                        "currentPersonId",
                    },
                }
            ),
            pytest.param(
                {
                    "name": "currentVisitedPlace",
                    "path": "${currentVisitedPlace}.activity",
                    "expected_needed": {"currentVisitedPlaceId", "currentPersonId"},
                }
            ),
        ],
    )
    def test_returns_deps_for_each_token(self, case):
        specs = (
            {
                "token": "${currentPerson}",
                "id_var": "currentPersonId",
                "deps": (),
            },
            {
                "token": "${currentJourney}",
                "id_var": "currentJourneyId",
                "deps": ("currentPersonId",),
            },
            {
                "token": "${currentTrip}",
                "id_var": "currentTripId",
                "deps": ("currentPersonId", "currentJourneyId"),
            },
            {
                "token": "${currentVisitedPlace}",
                "id_var": "currentVisitedPlaceId",
                "deps": ("currentPersonId",),
            },
        )

        conditionals = [{"path": case["path"]}]
        needed = ConditionalsGenerator._current_context_vars_needed(
            conditionals, current_context_specs=specs
        )

        # Check if the needed variables are the ones that are needed for the conditional path
        assert needed == case["expected_needed"], case["name"]
