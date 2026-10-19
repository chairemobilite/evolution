# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for survey_definition/choices_definition.py: ChoiceDefinition and the
# Choices class that holds a checked sheet (constructing Choices runs the per-row rules,
# then the rule across rows: spreadChoicesName names a list that starts earlier). The
# rules that need the survey languages or the Conditionals table are tested in
# test_survey_definition.py.

import pytest  # pyright: ignore[reportMissingImports]
from pydantic import ValidationError

from survey_definition.choices_definition import Choices, ChoiceDefinition


class TestChoiceDefinition:
    def test_choice_definition_required_fields_and_defaults(self):
        choice = ChoiceDefinition(choices_name="yesNo", value="yes")
        assert choice.label == {}
        assert choice.label_one == {}
        assert choice.spread_choices_name is None
        assert choice.conditional is None
        assert choice.hidden is False

    def test_reads_the_sheet_column_names(self):
        choice = ChoiceDefinition(
            **{
                "choicesName": "yesNo",
                "value": "yes",
                "label::fr": "Oui",
                "label::en": "Yes",
                "label_one::fr": "Oui!",
                "label_one::en": " ",
                "spreadChoicesName": None,
            }
        )
        assert choice.choices_name == "yesNo"
        assert choice.label == {"fr": "Oui", "en": "Yes"}
        # A blank label is left out
        assert choice.label_one == {"fr": "Oui!"}


class TestChoices:
    def _row(self, choices_name: str, value="yes", **extra) -> dict:
        return {
            "choicesName": choices_name,
            "value": value,
            "label::fr": "Oui",
            "label::en": "Yes",
            **extra,
        }

    def _spread(self, choices_name: str, spread_choices_name: str) -> dict:
        return {"choicesName": choices_name, "spreadChoicesName": spread_choices_name}

    def _issues(self, rows: list) -> list[str]:
        """Validate `rows` as a Choices sheet, expecting it to fail; return each issue reported."""
        with pytest.raises(ValidationError) as error:
            Choices(rows)
        assert error.value.error_count() == 1
        return str(error.value.errors()[0]["ctx"]["error"]).split("\n")

    def test_no_issues_for_a_valid_table(self):
        rows = [
            self._row("yes"),
            self._row("no", value="no"),
            self._spread("yesNo", "yes"),
            self._spread("yesNo", "no"),
            self._row("yesNo", value="dontKnow"),
        ]
        choices = Choices(rows)
        assert len(choices) == 5
        assert [c.choices_name for c in choices] == [
            "yes",
            "no",
            "yesNo",
            "yesNo",
            "yesNo",
        ]

    @pytest.mark.parametrize("value", ["yes", 0, 1.5, True, False])
    def test_accepts_a_str_number_or_bool_value(self, value):
        assert Choices([self._row("yesNo", value=value)])[0].value == value

    def test_reports_value_of_another_type(self):
        assert self._issues([self._row("yesNo", value=[1])]) == [
            "Error in Choices - Invalid value in row 2: [1] - "
            "Must be a bool, int, float, or str."
        ]

    def test_reports_missing_choices_name(self):
        assert self._issues([self._row("yesNo", choicesName=None)]) == [
            "Error in Choices - Required field is missing in row 2. "
            "Missing fields: ['choicesName']"
        ]

    def test_reports_choices_name_that_is_not_a_valid_identifier(self):
        assert self._issues([self._row("yes no")]) == [
            "Error in Choices - Invalid choicesName in row 2: 'yes no' - "
            "Must be a valid TypeScript identifier "
            "(letters, digits, '_' or '$', not starting with a digit)."
        ]

    def test_reports_missing_value_when_not_a_spread(self):
        assert self._issues([self._row("yesNo", value="  ")]) == [
            "Error in Choices - Invalid row 2: "
            "value is required when spreadChoicesName is blank"
        ]

    def test_spread_row_needs_no_value(self):
        choices = Choices([self._row("yes"), self._spread("yesNo", "yes")])
        assert choices[1].value is None

    def test_reads_a_number_label_as_text(self):
        """A spreadsheet stores a label like "1" as a number."""
        choice = Choices([self._row("count", value=1, **{"label::fr": 1})])[0]
        assert choice.label["fr"] == "1"

    def test_reports_label_of_another_type(self):
        assert self._issues([self._row("yesNo", **{"label::en": True})]) == [
            "Error in Choices - Invalid label.en in row 2: True - "
            "Input should be a valid string"
        ]

    def test_reports_hidden_that_is_not_a_bool(self):
        assert self._issues([self._row("yesNo", hidden="yes")]) == [
            "Error in Choices - Invalid hidden in row 2: 'yes' - "
            "Input should be a valid boolean"
        ]

    def test_blank_hidden_is_false(self):
        assert Choices([self._row("yesNo", hidden="")])[0].hidden is False

    def test_reports_conditional_not_ending_with_conditional(self):
        assert self._issues([self._row("yesNo", conditional="isAdult")]) == [
            "Error in Choices - Invalid conditional in row 2: 'isAdult' - "
            "Must end with 'Conditional' or 'CustomConditional' "
            "(e.g. 'hasHouseholdSize1Conditional', 'isCompleteCustomConditional')."
        ]

    def test_reports_spread_choices_name_that_names_no_list(self):
        assert self._issues([self._spread("yesNo", "doesNotExist")]) == [
            "Error in Choices - Invalid spreadChoicesName in row 2: "
            "'doesNotExist' - Does not match any choicesName value."
        ]

    def test_reports_spread_choices_name_that_is_the_list_itself(self):
        assert self._issues([self._row("yesNo"), self._spread("yesNo", "yesNo")]) == [
            "Error in Choices - Invalid spreadChoicesName in row 3: "
            "'yesNo' - A list cannot spread itself. Name another choicesName."
        ]

    def test_reports_spread_of_a_list_that_starts_later(self):
        """choices.tsx declares the lists in order, so a spread list must be declared first."""
        assert self._issues([self._spread("yesNo", "yes"), self._row("yes")]) == [
            "Error in Choices - Invalid spreadChoicesName in row 2: 'yes' - "
            "The 'yes' list must start in an earlier row than the 'yesNo' list. "
            "Move its rows above."
        ]

    def test_accepts_spread_of_a_list_that_continues_after(self):
        """Only where a list starts matters: its later rows may come after the spread."""
        Choices(
            [
                self._row("yes"),
                self._spread("yesNo", "yes"),
                self._row("yes", value="oui"),
            ]
        )

    def test_reports_every_row_issue_at_once_and_skips_spread_check(self):
        rows = [
            self._row("yesNo", value=None),
            self._row("yes no"),
            self._spread("other", "doesNotExist"),
        ]
        issues = self._issues(rows)
        assert len(issues) == 2
        assert "value is required" in issues[0]
        assert "'yes no'" in issues[1]

    def test_by_name_groups_rows_in_source_order(self):
        rows = [
            self._row("yes"),
            self._row("yesNo", value="no"),
            self._row("yes", value="oui"),
        ]
        groups = Choices(rows).by_name()
        assert list(groups.keys()) == ["yes", "yesNo"]
        assert [c.value for c in groups["yes"]] == ["yes", "oui"]

    def test_accepts_choice_definition_objects(self):
        choice = ChoiceDefinition(choices_name="yesNo", value="yes")
        assert len(Choices([choice])) == 1

    def test_checks_a_tuple_of_rows_too(self):
        with pytest.raises(ValidationError, match="Does not match any choicesName"):
            Choices((self._spread("yesNo", "nope"),))
