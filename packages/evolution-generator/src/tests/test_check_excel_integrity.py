import datetime

import pytest  # pyright: ignore[reportMissingImports]

from scripts.check_excel_integrity import CheckExcelIntegrity, check_excel_integrity
from helpers.generator_helpers import create_mocked_excel_data, delete_file_if_exists


# Path where create_mocked_excel_data writes the workbook; we delete it after each test.
MOCKED_EXCEL_FILE = "src/tests/references/test.xlsx"


class TestCheckExcelIntegrity:
    """Tests for the public entry point check_excel_integrity(excel_file_path)."""

    def test_valid_file_returns_true(self):
        """Full flow: load .xlsx from path and validate Conditionals sheet returns True."""
        create_mocked_excel_data(
            "Conditionals",
            list(CheckExcelIntegrity.CONDITIONALS_ALL_HEADERS),
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
            list(CheckExcelIntegrity.CONDITIONALS_ALL_HEADERS),
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
            list(CheckExcelIntegrity.CONDITIONALS_ALL_HEADERS),
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


class TestCheckConditionalsSheet:
    """
    Tests for the _check_conditionals_sheet method.

    Row constants are lists of cell values in header order:
    conditional_name, logical_operator, path, comparison_operator, value, parentheses.
    """

    # Constants for test cases.
    GOOD_SHEET_NAME = "Conditionals"
    GOOD_HEADERS = list(CheckExcelIntegrity.CONDITIONALS_ALL_HEADERS)
    # Headers missing 'conditional_name' to trigger missing-header error.
    BAD_HEADERS = [
        "conditional_name_bad",
        "logical_operator",
        "path",
        "comparison_operator",
        "value",
        "parentheses",
    ]

    # Valid single row (all fields valid, optional cells empty).
    GOOD_ROW = ["cond1", "", "some.path", "===", "42", ""]

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
                    "sheet_name": GOOD_SHEET_NAME,
                    "headers": GOOD_HEADERS,
                    "rows": [GOOD_ROW],
                    "expected_result": True,
                    "expected_message": None,
                },
                id="Valid sheet returns True",
            ),
            pytest.param(
                {
                    "sheet_name": "OtherSheet",
                    "headers": GOOD_HEADERS,
                    "rows": [GOOD_ROW],
                    "expected_result": False,
                    "expected_message": "Error in Conditionals sheet - Sheet with name Conditionals does not exist",
                },
                id="Missing Conditionals sheet",
            ),
            pytest.param(
                {
                    "sheet_name": GOOD_SHEET_NAME,
                    "headers": BAD_HEADERS,
                    "rows": [GOOD_ROW],
                    "expected_result": False,
                    "expected_message": "Error in Conditionals sheet - Missing expected header in Conditionals sheet: conditional_name",
                },
                id="Missing expected header (conditional_name)",
            ),
            pytest.param(
                {
                    "sheet_name": GOOD_SHEET_NAME,
                    "headers": ["conditional_name", "path"],
                    "rows": [["cond1", "some.path"]],
                    "expected_result": False,
                    "expected_message": "Error in Conditionals sheet - Too few columns in Conditionals sheet",
                },
                id="Too few columns in Conditionals sheet",
            ),
            pytest.param(
                {
                    "sheet_name": GOOD_SHEET_NAME,
                    "headers": GOOD_HEADERS,
                    "rows": ROWS_UNBALANCED_PARENTHESES,
                    "expected_result": False,
                    "expected_message": "Error in Conditionals sheet - Unbalanced parentheses for conditional_name 'cond1' in row 2: too many ')' (closing parenthesis without matching opening).",
                },
                id="Unbalanced parentheses (same conditional_name)",
            ),
            pytest.param(
                {
                    "sheet_name": GOOD_SHEET_NAME,
                    "headers": GOOD_HEADERS,
                    "rows": ROWS_BALANCED_PARENTHESES,
                    "expected_result": True,
                    "expected_message": None,
                },
                id="Balanced parentheses (same conditional_name)",
            ),
            pytest.param(
                {
                    "sheet_name": GOOD_SHEET_NAME,
                    "headers": GOOD_HEADERS,
                    "rows": ROWS_FIRST_ROW_EMPTY_LOGICAL_OPERATOR,
                    "expected_result": True,
                    "expected_message": None,
                },
                id="First row empty logical_operator (valid)",
            ),
            pytest.param(
                {
                    "sheet_name": GOOD_SHEET_NAME,
                    "headers": GOOD_HEADERS,
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

            checker = CheckExcelIntegrity()
            assert (
                checker._check_conditionals_sheet(workbook) is case["expected_result"]
            )

            # When validation fails, the script prints the error with "Error in Conditionals sheet - " prefix; we assert the full message.
            captured = capsys.readouterr()
            if case["expected_message"] is None:
                assert "Error in Conditionals sheet -" not in captured.out
            else:
                assert case["expected_message"] in captured.out
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)


class TestValidateConditionalsRow:
    """
    Unit tests for _validate_conditionals_row.

    Each test builds a row_dict (and optionally omits or corrupts one field)
    and asserts that the method either passes or raises the expected error.
    """

    checker = CheckExcelIntegrity()
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
        """Row with all valid fields does not raise."""
        self.checker._validate_conditionals_row(self._row(), self.ROW_NUMBER)

    def test_missing_required_field_raises(self):
        """Missing required field (e.g. conditional_name) raises."""
        with pytest.raises(Exception) as exc_info:
            self.checker._validate_conditionals_row(
                self._row(conditional_name=None), self.ROW_NUMBER
            )
        assert str(exc_info.value) == (
            "Error in Conditionals sheet - Required field is missing in row 2. "
            "Missing fields: ['conditional_name']"
        )

    def test_missing_optional_field_does_not_raise(self):
        """Missing optional field (e.g. logical_operator empty/None) does not raise."""
        self.checker._validate_conditionals_row(
            self._row(logical_operator=None), self.ROW_NUMBER
        )

    def test_invalid_conditional_name_raises(self):
        """conditional_name must be a non-empty string (e.g. not a number)."""
        with pytest.raises(Exception) as exc_info:
            self.checker._validate_conditionals_row(
                self._row(conditional_name=10), self.ROW_NUMBER
            )
        assert str(exc_info.value) == (
            "Error in Conditionals sheet - Invalid conditional_name in row 2: "
            "must be one of types (str), got int with value 10"
        )

    def test_invalid_path_raises(self):
        """path must be a non-empty string."""
        with pytest.raises(Exception) as exc_info:
            self.checker._validate_conditionals_row(self._row(path=5), self.ROW_NUMBER)
        assert str(exc_info.value) == (
            "Error in Conditionals sheet - Invalid path in row 2: "
            "must be one of types (str), got int with value 5"
        )

    def test_invalid_logical_operator_raises(self):
        """logical_operator must be '||', '&&', or empty."""
        with pytest.raises(Exception) as exc_info:
            self.checker._validate_conditionals_row(
                self._row(logical_operator="OR"), self.ROW_NUMBER
            )
        assert str(exc_info.value) == (
            "Error in Conditionals sheet - Invalid logical_operator in row 2: "
            "must be one of ['&&', '||'] or empty, got 'OR'"
        )

    def test_invalid_comparison_operator_raises(self):
        """comparison_operator must be one of the allowed operators or empty."""
        with pytest.raises(Exception) as exc_info:
            self.checker._validate_conditionals_row(
                self._row(comparison_operator="=="), self.ROW_NUMBER
            )
        assert str(exc_info.value) == (
            "Error in Conditionals sheet - Invalid comparison_operator in row 2: "
            "must be one of ['!==', '<', '<=', '===', '>', '>='] or empty, got '=='"
        )

    def test_invalid_parentheses_raises(self):
        """parentheses must be '(', ')', or empty."""
        with pytest.raises(Exception) as exc_info:
            self.checker._validate_conditionals_row(
                self._row(parentheses="(("), self.ROW_NUMBER
            )
        assert str(exc_info.value) == (
            "Error in Conditionals sheet - Invalid parentheses in row 2: "
            "must be one of ['(', ')'] or empty, got '(('"
        )

    def test_invalid_value_type_raises(self):
        """value must be int, float, str (e.g. not date)."""
        with pytest.raises(Exception) as exc_info:
            self.checker._validate_conditionals_row(
                self._row(value=datetime.date(2024, 1, 1)), self.ROW_NUMBER
            )
        assert str(exc_info.value) == (
            "Error in Conditionals sheet - Invalid value in row 2: "
            "must be one of types (int, float, str), got date with value datetime.date(2024, 1, 1)"
        )


class TestGroupRowDataByConditionalName:
    """
    Unit tests for _group_row_data_by_conditional_name.

    Asserts that row_data is grouped by conditional_name across the entire list
    (not only consecutive blocks), with order preserved within each group and
    by first occurrence of each name.
    """

    checker = CheckExcelIntegrity()

    def _row(self, conditional_name: str) -> dict:
        """Minimal row dict for grouping (only conditional_name is used)."""
        return {"conditional_name": conditional_name}

    def test_single_name_one_row(self):
        """Single row yields one group with one entry."""
        row_data = [(2, self._row("cond1"))]
        groups = self.checker._group_row_data_by_conditional_name(row_data)
        assert groups == {"cond1": [(2, self._row("cond1"))]}

    def test_two_names_consecutive(self):
        """Two consecutive blocks become two groups with rows in order."""
        row_data = [
            (2, self._row("condA")),
            (3, self._row("condA")),
            (4, self._row("condB")),
        ]
        groups = self.checker._group_row_data_by_conditional_name(row_data)
        assert list(groups.keys()) == ["condA", "condB"]
        assert groups["condA"] == [(2, self._row("condA")), (3, self._row("condA"))]
        assert groups["condB"] == [(4, self._row("condB"))]

    def test_same_name_comes_back_later(self):
        """Same conditional_name in non-consecutive rows is one group: condA, condB, condA."""
        row_data = [
            (2, self._row("condA")),
            (3, self._row("condB")),
            (4, self._row("condA")),
        ]
        groups = self.checker._group_row_data_by_conditional_name(row_data)
        assert list(groups.keys()) == ["condA", "condB"]
        assert groups["condA"] == [(2, self._row("condA")), (4, self._row("condA"))]
        assert groups["condB"] == [(3, self._row("condB"))]


class TestValidateConditionalsParenthesesBalance:
    """
    Unit tests for _validate_conditionals_parentheses_balance.

    row_data is a list of (row_number, row_dict); each row_dict must have
    "conditional_name" and "parentheses" (other keys are ignored for this check).
    """

    checker = CheckExcelIntegrity()

    def _row(self, conditional_name: str, parentheses: str | None) -> dict:
        """Minimal row dict for balance checks."""
        return {"conditional_name": conditional_name, "parentheses": parentheses}

    def test_balanced_single_row_no_parentheses(self):
        """One row with no parentheses does not raise."""
        row_data = [(2, self._row("cond1", ""))]
        self.checker._validate_conditionals_parentheses_balance(row_data)

    def test_balanced_open_then_close(self):
        """Group with '(' then ')' does not raise."""
        row_data = [
            (2, self._row("cond1", "(")),
            (3, self._row("cond1", ")")),
        ]
        self.checker._validate_conditionals_parentheses_balance(row_data)

    def test_unbalanced_too_many_closing_raises(self):
        """')' without matching '(' raises with the expected message."""
        row_data = [(2, self._row("cond1", ")"))]
        with pytest.raises(Exception) as exc_info:
            self.checker._validate_conditionals_parentheses_balance(row_data)
        assert str(exc_info.value) == (
            "Error in Conditionals sheet - Unbalanced parentheses for conditional_name 'cond1' in row 2: "
            "too many ')' (closing parenthesis without matching opening)."
        )

    def test_unbalanced_unclosed_opening_raises(self):
        """'(' without matching ')' raises with the expected message."""
        row_data = [(2, self._row("cond1", "("))]
        with pytest.raises(Exception) as exc_info:
            self.checker._validate_conditionals_parentheses_balance(row_data)
        assert str(exc_info.value) == (
            "Error in Conditionals sheet - Unbalanced parentheses for conditional_name 'cond1' (e.g. row 2): "
            "1 unclosed opening parenthesis/parentheses."
        )

    def test_two_groups_each_balanced(self):
        """Consecutive groups with different conditional_name are checked separately; both balanced passes."""
        row_data = [
            (2, self._row("condA", "(")),
            (3, self._row("condA", ")")),
            (4, self._row("condB", "")),
        ]
        self.checker._validate_conditionals_parentheses_balance(row_data)

    def test_same_name_non_consecutive_balanced(self):
        """Same conditional_name appearing again later: condA, condB, condA; parentheses balanced across condA rows."""
        row_data = [
            (2, self._row("condA", "(")),
            (3, self._row("condB", "")),
            (4, self._row("condA", ")")),
        ]
        self.checker._validate_conditionals_parentheses_balance(row_data)

    def test_same_name_non_consecutive_unbalanced_raises(self):
        """Same conditional_name appearing again later with unclosed '(' in the combined group raises."""
        row_data = [
            (2, self._row("condA", "(")),
            (3, self._row("condB", "")),
            (4, self._row("condA", "(")),
        ]
        with pytest.raises(Exception) as exc_info:
            self.checker._validate_conditionals_parentheses_balance(row_data)
        assert str(exc_info.value) == (
            "Error in Conditionals sheet - Unbalanced parentheses for conditional_name 'condA' (e.g. row 4): "
            "2 unclosed opening parenthesis/parentheses."
        )


class TestValidateConditionalsFirstRowNoLogicalOperator:
    """
    Unit tests for _validate_conditionals_first_row_no_logical_operator.

    The first row of each group of consecutive rows with the same conditional_name
    must have empty logical_operator (no "||" or "&&"); subsequent rows may have one.
    """

    checker = CheckExcelIntegrity()

    def _row(self, conditional_name: str, logical_operator: str | None) -> dict:
        """Minimal row dict for first-row logical_operator checks."""
        return {
            "conditional_name": conditional_name,
            "logical_operator": logical_operator,
        }

    def test_first_row_empty_does_not_raise(self):
        """First row with empty logical_operator does not raise."""
        row_data = [(2, self._row("cond1", ""))]
        self.checker._validate_conditionals_first_row_no_logical_operator(row_data)

    def test_first_row_empty_second_has_operator_does_not_raise(self):
        """First row empty, second row has '||' is valid."""
        row_data = [
            (2, self._row("cond1", "")),
            (3, self._row("cond1", "||")),
        ]
        self.checker._validate_conditionals_first_row_no_logical_operator(row_data)

    def test_first_row_has_logical_operator_raises(self):
        """First row with '||' or '&&' raises (first row of a conditional must be empty)."""
        row_data = [(2, self._row("cond1", "&&"))]
        with pytest.raises(Exception) as exc_info:
            self.checker._validate_conditionals_first_row_no_logical_operator(row_data)
        assert str(exc_info.value) == (
            "Error in Conditionals sheet - Invalid logical_operator in row 2: "
            "first row of a conditional must have empty logical_operator, got '&&'"
        )

    def test_two_groups_both_valid(self):
        """Two conditionals, each with first row empty, does not raise."""
        row_data = [
            (2, self._row("condA", "")),
            (3, self._row("condA", "&&")),
            (4, self._row("condB", "")),
        ]
        self.checker._validate_conditionals_first_row_no_logical_operator(row_data)

    def test_second_group_first_row_has_operator_raises(self):
        """Second conditional's first row has '&&' raises (row 4)."""
        row_data = [
            (2, self._row("condA", "")),
            (3, self._row("condA", "||")),
            (4, self._row("condB", "&&")),
        ]
        with pytest.raises(Exception) as exc_info:
            self.checker._validate_conditionals_first_row_no_logical_operator(row_data)
        assert str(exc_info.value) == (
            "Error in Conditionals sheet - Invalid logical_operator in row 4: "
            "first row of a conditional must have empty logical_operator, got '&&'"
        )

    def test_same_name_comes_back_later_first_row_has_operator_raises(self):
        """When condA appears again after condB, the first occurrence of condA (row 2) must have empty logical_operator."""
        row_data = [
            (2, self._row("condA", "&&")),
            (3, self._row("condB", "")),
            (4, self._row("condA", "")),
        ]
        with pytest.raises(Exception) as exc_info:
            self.checker._validate_conditionals_first_row_no_logical_operator(row_data)
        assert str(exc_info.value) == (
            "Error in Conditionals sheet - Invalid logical_operator in row 2: "
            "first row of a conditional must have empty logical_operator, got '&&'"
        )

    def test_same_name_comes_back_later_first_row_empty_passes(self):
        """When condA appears again after condB, first occurrence of each name is checked; both empty passes."""
        row_data = [
            (2, self._row("condA", "")),
            (3, self._row("condB", "")),
            (4, self._row("condA", "||")),
        ]
        self.checker._validate_conditionals_first_row_no_logical_operator(row_data)


class TestEmptyToNone:
    """Tests for the _empty_to_none helper."""

    def test_empty_string_returns_none(self):
        """
        Empty string should be converted to None.
        """
        assert CheckExcelIntegrity._empty_to_none("") is None

    def test_none_stays_none(self):
        """
        None should remain None.
        """
        assert CheckExcelIntegrity._empty_to_none(None) is None

    def test_non_empty_string_unchanged(self):
        """
        Non-empty strings should be returned unchanged.
        """
        assert CheckExcelIntegrity._empty_to_none("foo") == "foo"
        assert CheckExcelIntegrity._empty_to_none(" ") == " "
