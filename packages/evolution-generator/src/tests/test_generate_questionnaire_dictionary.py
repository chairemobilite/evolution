# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

from scripts.generate_questionnaire_dictionary import process_conditionals

CONDITIONALS_HEADERS = [
    "conditional_name",
    "logical_operator",
    "path",
    "comparison_operator",
    "value",
    "parentheses",
]

SECTIONS = {
    "home": {
        "title": "Home",
        "abbreviation": "hm_",
    }
}


class MockCell:
    def __init__(self, value: object) -> None:
        self.value = value


def conditional_row(**kwargs: object) -> list[MockCell]:
    values = dict.fromkeys(CONDITIONALS_HEADERS)
    values.update(kwargs)
    return [MockCell(values[header]) for header in CONDITIONALS_HEADERS]


def conditionals_data_rows(*rows: list[MockCell]) -> list[list[MockCell]]:
    """process_conditionals skips the first row, like Excel sheet data."""
    return [[MockCell(header) for header in CONDITIONALS_HEADERS], *rows]


class TestProcessConditionals:
    def test_nested_parentheses_preserve_opening_and_closing_order(self):
        rows = conditionals_data_rows(
            conditional_row(
                conditional_name="cond1",
                path="home.field1",
                comparison_operator="===",
                value=1,
                parentheses="((",
            ),
            conditional_row(
                conditional_name="cond1",
                logical_operator="&&",
                path="home.field2",
                comparison_operator="===",
                value=2,
            ),
            conditional_row(
                conditional_name="cond1",
                logical_operator="||",
                path="home.field3",
                comparison_operator="===",
                value=3,
                parentheses="(",
            ),
            conditional_row(
                conditional_name="cond1",
                logical_operator="&&",
                path="home.field4",
                comparison_operator="===",
                value=4,
                parentheses="))",
            ),
        )

        conditionals_map = process_conditionals(rows, CONDITIONALS_HEADERS, SECTIONS)

        assert conditionals_map["cond1"] == (
            "cond1 : ((hm_field1 === 1 && hm_field2 === 2 "
            "|| (hm_field3 === 3 && hm_field4 === 4))"
        )

    def test_empty_parentheses_cell_leaves_conditional_unchanged(self):
        rows = conditionals_data_rows(
            conditional_row(
                conditional_name="cond1",
                path="home.field1",
                comparison_operator="===",
                value=1,
                parentheses="",
            )
        )

        conditionals_map = process_conditionals(rows, CONDITIONALS_HEADERS, SECTIONS)

        assert conditionals_map["cond1"] == "cond1 : hm_field1 === 1"

    def test_opening_only_and_closing_only_parentheses(self):
        rows = conditionals_data_rows(
            conditional_row(
                conditional_name="cond1",
                path="home.field1",
                comparison_operator="===",
                value=1,
                parentheses="(",
            ),
            conditional_row(
                conditional_name="cond1",
                logical_operator="||",
                path="home.field2",
                comparison_operator="===",
                value=2,
                parentheses=")",
            ),
        )

        conditionals_map = process_conditionals(rows, CONDITIONALS_HEADERS, SECTIONS)

        assert conditionals_map["cond1"] == (
            "cond1 : (hm_field1 === 1 || hm_field2 === 2)"
        )

    def test_invalid_mixed_parentheses_use_prefix_suffix_split_without_validation(self):
        """Dictionary generation does not validate parentheses; invalid cells pass through."""
        rows = conditionals_data_rows(
            conditional_row(
                conditional_name="cond1",
                path="home.field1",
                comparison_operator="===",
                value=1,
                parentheses=")(",
            )
        )

        conditionals_map = process_conditionals(rows, CONDITIONALS_HEADERS, SECTIONS)

        assert conditionals_map["cond1"] == "cond1 : hm_field1 === 1)("
