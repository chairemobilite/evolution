# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for survey_definition/conditionals_definition.py: ConditionalDefinition
# and the Conditionals class that holds a checked sheet (constructing Conditionals runs
# the per-row rules, then the rules that need every row of a conditional_name group
# together: balanced parentheses, first-row logical_operator, value_when_hidden).

import pytest  # pyright: ignore[reportMissingImports]
from pydantic import ValidationError

from survey_definition.conditionals_definition import (
    Conditionals,
    ConditionalDefinition,
)


class TestConditionalDefinition:
    def test_conditional_definition_required_fields_and_defaults(self):
        conditional = ConditionalDefinition(
            conditional_name="cond1",
            path="household.size",
            comparison_operator="===",
            value=1,
        )
        assert conditional.logical_operator is None
        assert conditional.parentheses is None
        assert conditional.value_when_hidden is None


class TestConditionals:
    def _row(self, conditional_name: str, **extra) -> dict:
        return {
            "conditional_name": conditional_name,
            "path": "household.size",
            "comparison_operator": "===",
            "value": 1,
            **extra,
        }

    def _issues(self, rows: list) -> list[str]:
        """Validate `rows` as a Conditionals sheet, expecting it to fail; return each issue reported."""
        with pytest.raises(ValidationError) as error:
            Conditionals(rows)
        assert error.value.error_count() == 1
        return str(error.value.errors()[0]["ctx"]["error"]).split("\n")

    def test_no_issues_for_a_valid_table(self):
        rows = [
            self._row("cond1"),
            self._row("cond1", logical_operator="&&", value=2),
            self._row("cond2"),
        ]
        conditionals = Conditionals(rows)
        assert len(conditionals) == 3
        assert [c.conditional_name for c in conditionals] == ["cond1", "cond1", "cond2"]
        assert conditionals[0].conditional_name == "cond1"

    def test_includes_each_row_s_own_issues(self):
        rows = [self._row("cond1"), {**self._row("cond2"), "path": None}]
        assert self._issues(rows) == [
            "Error in Conditionals - Required field is missing in row 3. "
            "Missing fields: ['path']"
        ]

    def test_reports_every_row_issue_at_once_and_skips_grouped_rules(self):
        """When several rows are individually invalid, every row issue is reported and
        the grouped rules (which need every row to be valid first) do not run."""
        rows = [
            {**self._row("cond1"), "conditional_name": None},
            {**self._row("cond2"), "comparison_operator": "=="},
        ]
        issues = self._issues(rows)
        assert len(issues) == 2
        assert any("conditional_name" in issue for issue in issues)
        assert any("comparison_operator" in issue for issue in issues)

    def test_reports_wrong_type(self):
        rows = [{**self._row("cond1"), "conditional_name": 10}]
        assert self._issues(rows) == [
            "Error in Conditionals - Invalid conditional_name in row 2: 10 - "
            "Input should be a valid string"
        ]

    def test_reports_invalid_comparison_operator(self):
        rows = [{**self._row("cond1"), "comparison_operator": "=="}]
        issues = self._issues(rows)
        assert len(issues) == 1
        assert "Invalid comparison_operator in row 2" in issues[0]

    def test_reports_invalid_logical_operator(self):
        rows = [{**self._row("cond1"), "logical_operator": "OR"}]
        issues = self._issues(rows)
        assert len(issues) == 1
        assert "Invalid logical_operator in row 2" in issues[0]

    def test_reports_invalid_parentheses(self):
        rows = [{**self._row("cond1"), "parentheses": "(("}]
        issues = self._issues(rows)
        assert len(issues) == 1
        assert "Invalid parentheses in row 2" in issues[0]

    def test_reports_non_primitive_value(self):
        rows = [{**self._row("cond1"), "value": [1, 2]}]
        assert self._issues(rows) == [
            "Error in Conditionals - Invalid value in row 2: [1, 2] - "
            "Must be a bool, int, float, or str."
        ]

    def test_reports_non_primitive_value_when_hidden(self):
        rows = [{**self._row("cond1"), "value_when_hidden": [1, 2]}]
        assert self._issues(rows) == [
            "Error in Conditionals - Invalid value_when_hidden in row 2: [1, 2] - "
            "Must be a bool, int, float, or str."
        ]

    def test_allows_blank_value_when_hidden(self):
        rows = [{**self._row("cond1"), "value_when_hidden": ""}]
        conditionals = Conditionals(rows)
        assert conditionals[0].value_when_hidden is None

    def test_accepts_single_expansion_token_in_path(self):
        for path in (
            "${relativePath}.someField",
            "${currentPerson}.age",
            "${currentTrip}.segments.0.mode",
        ):
            conditionals = Conditionals([{**self._row("cond1"), "path": path}])
            assert conditionals[0].path == path

    def test_rejects_more_than_one_expansion_token_in_path(self):
        path = "${relativePath}.${currentPerson}.age"
        issues = self._issues([{**self._row("cond1"), "path": path}])
        assert len(issues) == 1
        assert "only one expansion token" in issues[0]
        assert "${relativePath}" in issues[0]
        assert "${currentPerson}" in issues[0]

    def test_balanced_parentheses_across_a_group(self):
        rows = [
            self._row("cond1", parentheses="("),
            self._row("cond1", logical_operator="||", value=2, parentheses=")"),
        ]
        assert len(Conditionals(rows)) == 2

    def test_reports_too_many_closing_parentheses(self):
        rows = [self._row("cond1", parentheses=")")]
        assert self._issues(rows) == [
            "Error in Conditionals - Unbalanced parentheses for conditional_name 'cond1' "
            "in row 2: too many ')' (closing parenthesis without matching opening)."
        ]

    def test_reports_unclosed_opening_parenthesis(self):
        rows = [self._row("cond1", parentheses="(")]
        assert self._issues(rows) == [
            "Error in Conditionals - Unbalanced parentheses for conditional_name 'cond1' "
            "(e.g. row 2): 1 unclosed opening parenthesis/parentheses."
        ]

    def test_balances_parentheses_across_non_consecutive_rows_of_the_same_name(self):
        """A conditional_name split across non-consecutive rows (another name's rows in
        between) is still checked as one group, in source order."""
        rows = [
            self._row("condA", parentheses="("),
            self._row("condB"),
            self._row("condA", logical_operator="||", value=2, parentheses=")"),
        ]
        assert len(Conditionals(rows)) == 3

    def test_first_row_of_a_group_must_not_have_logical_operator(self):
        rows = [self._row("cond1", logical_operator="&&")]
        assert self._issues(rows) == [
            "Error in Conditionals - Invalid logical_operator in row 2: "
            "first row of a conditional must have empty logical_operator, got '&&'"
        ]

    def test_non_first_row_of_a_group_must_have_logical_operator(self):
        rows = [self._row("cond1"), self._row("cond1", value=2)]
        assert self._issues(rows) == [
            "Error in Conditionals - Missing logical_operator in row 3: "
            "non-first row of a conditional must have a logical_operator for conditional_name 'cond1'"
        ]

    def test_multiple_value_when_hidden_for_the_same_name_must_agree(self):
        rows = [
            self._row("cond1", value_when_hidden="defaultA"),
            self._row(
                "cond1", logical_operator="&&", value=2, value_when_hidden="defaultB"
            ),
        ]
        assert self._issues(rows) == [
            "Error in Conditionals - Multiple value_when_hidden for conditional_name "
            "'cond1': ['defaultA', 'defaultB']"
        ]

    def test_repeating_the_same_value_when_hidden_is_allowed(self):
        rows = [
            self._row("cond1", value_when_hidden="defaultA"),
            self._row(
                "cond1", logical_operator="&&", value=2, value_when_hidden="defaultA"
            ),
        ]
        assert len(Conditionals(rows)) == 2
