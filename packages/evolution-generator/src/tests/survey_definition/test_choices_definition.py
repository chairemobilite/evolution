# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for survey_definition/choices_definition.py: ChoiceDefinition and the
# Choices class that holds a checked sheet (constructing Choices runs the per-row rules,
# with the survey languages and the conditional names from the validation context, then
# the rules across rows: no label in another language, spreadChoicesName names a list
# that starts earlier).

import pytest  # pyright: ignore[reportMissingImports]
from pydantic import ValidationError

from survey_definition.choices_definition import Choices, ChoiceDefinition

CONTEXT = {"languages": ("fr", "en")}


class TestChoiceDefinition:
    def test_choice_definition_required_fields_and_defaults(self):
        choice = ChoiceDefinition.model_validate(
            {
                "choices_name": "yesNo",
                "value": "yes",
                "label": {"fr": "Oui", "en": "Yes"},
            },
            context=CONTEXT,
        )
        assert choice.label_one == {}
        assert choice.spread_choices_name is None
        assert choice.conditional is None
        assert choice.hidden is False

    def test_reads_the_sheet_column_names(self):
        choice = ChoiceDefinition.model_validate(
            {
                "choicesName": "yesNo",
                "value": "yes",
                "label::fr": "Oui",
                "label::en": "Yes",
                "label_one::fr": "Oui!",
                "label_one::en": "Yes!",
                "spreadChoicesName": None,
            },
            context=CONTEXT,
        )
        assert choice.choices_name == "yesNo"
        assert choice.label == {"fr": "Oui", "en": "Yes"}
        assert choice.label_one == {"fr": "Oui!", "en": "Yes!"}

    def test_leaves_out_a_blank_label(self):
        choice = ChoiceDefinition.model_validate(
            {"choicesName": "yes", "spreadChoicesName": "no", "label::fr": "  "},
            context=CONTEXT,
        )
        assert choice.label == {}


class TestChoices:
    def _row(self, choices_name: str, value="yes", **extra) -> dict:
        return {
            "choicesName": choices_name,
            "value": value,
            "label::fr": "Oui",
            "label::en": "Yes",
            **extra,
        }

    def _choices(self, rows, **context) -> Choices:
        """Validate `rows` as a Choices sheet, in French and English unless `context` says otherwise."""
        return Choices.model_validate(rows, context={**CONTEXT, **context})

    def _spread(self, choices_name: str, spread_choices_name: str) -> dict:
        return {"choicesName": choices_name, "spreadChoicesName": spread_choices_name}

    def _issues(self, rows: list, **context) -> list[str]:
        """Validate `rows` as a Choices sheet, expecting it to fail; return each issue reported."""
        with pytest.raises(ValidationError) as error:
            self._choices(rows, **context)
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
        choices = self._choices(rows)
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
        assert self._choices([self._row("yesNo", value=value)])[0].value == value

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
        choices = self._choices([self._row("yes"), self._spread("yesNo", "yes")])
        assert choices[1].value is None

    def test_reads_a_number_label_as_text(self):
        """A spreadsheet stores a label like "1" as a number."""
        choice = self._choices([self._row("count", value=1, **{"label::fr": 1})])[0]
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
        assert self._choices([self._row("yesNo", hidden="")])[0].hidden is False

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
        self._choices(
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
        groups = self._choices(rows).by_name()
        assert list(groups.keys()) == ["yes", "yesNo"]
        assert [c.value for c in groups["yes"]] == ["yes", "oui"]

    def test_accepts_choice_definition_objects(self):
        choice = ChoiceDefinition.model_validate(
            {
                "choices_name": "yesNo",
                "value": "yes",
                "label": {"fr": "Oui", "en": "Yes"},
            },
            context=CONTEXT,
        )
        assert len(self._choices([choice])) == 1

    def test_checks_a_tuple_of_rows_too(self):
        with pytest.raises(ValidationError, match="Does not match any choicesName"):
            self._choices((self._spread("yesNo", "nope"),))

    def test_label_is_required_in_every_survey_language(self):
        assert self._issues([self._row("yesNo", **{"label::en": None})]) == [
            "Error in Choices - Invalid row 2: label::en is required"
        ]

    def test_reads_the_survey_languages_from_the_context(self):
        row = {"choicesName": "yesNo", "value": "yes", "label::es": "Sí"}
        choices = self._choices([row], languages=("es",))
        assert choices[0].label == {"es": "Sí"}

    def test_spread_row_needs_no_label(self):
        choices = self._choices([self._row("yes"), self._spread("yesNo", "yes")])
        assert choices[1].label == {}

    def test_label_one_is_optional(self):
        assert self._choices([self._row("yesNo")])[0].label_one == {}

    def test_label_one_is_required_in_every_survey_language_when_set(self):
        assert self._issues([self._row("yesNo", **{"label_one::fr": "Oui!"})]) == [
            "Error in Choices - Invalid row 2: label_one::en is required when "
            "label_one is set in another language"
        ]

    def test_reports_labels_in_another_language_once(self):
        rows = [
            self._row("yesNo", **{"label::fe": "Oui"}),
            self._row("yesNo", value="no", **{"label::fe": "Non"}),
        ]
        assert self._issues(rows) == [
            "Error in Choices - Unexpected columns: ['label::fe']. "
            "The survey languages are ['fr', 'en']."
        ]

    def test_accepts_a_conditional_of_the_conditionals_table(self):
        rows = [self._row("yesNo", conditional="isAdultConditional")]
        self._choices(rows, conditional_names={"isAdultConditional"})

    def test_reports_a_conditional_missing_from_the_conditionals_table(self):
        rows = [self._row("yesNo", conditional="isKidConditional")]
        assert self._issues(rows, conditional_names={"isAdultConditional"}) == [
            "Error in Choices - Invalid row 2: conditional 'isKidConditional' does "
            "not match any conditional_name of the Conditionals table"
        ]

    def test_accepts_a_custom_conditional_missing_from_the_conditionals_table(self):
        """A custom conditional is written in customConditionals.tsx, not in the Conditionals table."""
        rows = [self._row("yesNo", conditional="isKidCustomConditional")]
        self._choices(rows, conditional_names=set())

    def test_does_not_check_conditionals_without_the_conditional_names(self):
        """E.g. the Conditionals table is invalid, which is reported on its own."""
        self._choices([self._row("yesNo", conditional="isKidConditional")])

    def test_reports_every_problem_of_a_row_at_once(self):
        rows = [
            self._row(
                "yesNo",
                value=None,
                conditional="isKidConditional",
                **{"label::en": None}
            )
        ]
        assert self._issues(rows, conditional_names=set()) == [
            "Error in Choices - Invalid row 2: value is required when "
            "spreadChoicesName is blank; label::en is required; conditional "
            "'isKidConditional' does not match any conditional_name of the "
            "Conditionals table"
        ]

    def test_needs_the_survey_languages_in_its_context(self):
        """Without them, a choice's labels can't be checked: an error in the calling code."""
        with pytest.raises(RuntimeError, match="survey languages are missing"):
            Choices([self._row("yesNo")])

    def test_is_built_empty_without_the_survey_languages(self):
        """No row needs them, e.g. SurveyDefinition's default empty table."""
        assert len(Choices([])) == 0

    def test_reports_a_value_repeated_in_a_list(self):
        rows = [
            self._row("yesNo", value="yes"),
            self._row("yesNo", value="no"),
            self._row("yesNo", value="yes"),
        ]
        assert self._issues(rows) == [
            "Error in Choices - Duplicate value 'yes' in choicesName 'yesNo': "
            "found in rows [2, 4]"
        ]

    def test_reports_values_that_are_the_same_as_text(self):
        """A value is written as text, so 1 and "1" are the same value."""
        rows = [self._row("count", value=1), self._row("count", value="1")]
        assert self._issues(rows) == [
            "Error in Choices - Duplicate value '1' in choicesName 'count': "
            "found in rows [2, 3]"
        ]

    def test_accepts_the_same_value_in_two_lists(self):
        self._choices([self._row("yesNo", value="yes"), self._row("yes", value="yes")])

    def test_does_not_count_a_spread_row_as_a_value(self):
        """A spread row copies another list's values; it has none of its own."""
        self._choices(
            [
                self._row("yes", value="yes"),
                self._spread("yesNo", "yes"),
                self._spread("yesNo2", "yes"),
            ]
        )

    def test_reports_a_value_that_a_spread_brings_in_twice(self):
        """choices.tsx writes the spread list's values in the list, next to its own."""
        rows = [
            self._row("yes", value="yes"),
            self._spread("yesNo", "yes"),
            self._row("yesNo", value="yes"),
        ]
        assert self._issues(rows) == [
            "Error in Choices - Duplicate value 'yes' in choicesName 'yesNo': "
            "found in rows [3, 4] (row 3 spreads 'yes')"
        ]

    def test_reports_a_value_brought_in_by_two_spreads(self):
        rows = [
            self._row("yes", value="yes"),
            self._row("yesAgain", value="yes"),
            self._spread("yesNo", "yes"),
            self._spread("yesNo", "yesAgain"),
        ]
        assert self._issues(rows) == [
            "Error in Choices - Duplicate value 'yes' in choicesName 'yesNo': "
            "found in rows [4, 5] (row 4 spreads 'yes', row 5 spreads 'yesAgain')"
        ]

    def test_follows_nested_spreads(self):
        """A list spreading a list that spreads another one gets all their values."""
        rows = [
            self._row("yes", value="yes"),
            self._spread("yesNo", "yes"),
            self._row("yesNo", value="no"),
            self._spread("yesNoDontKnow", "yesNo"),
            self._row("yesNoDontKnow", value="no"),
        ]
        assert self._issues(rows) == [
            "Error in Choices - Duplicate value 'no' in choicesName 'yesNoDontKnow': "
            "found in rows [5, 6] (row 5 spreads 'yesNo')"
        ]

    def test_accepts_spreads_that_bring_different_values(self):
        self._choices(
            [
                self._row("yes", value="yes"),
                self._row("no", value="no"),
                self._spread("yesNo", "yes"),
                self._spread("yesNo", "no"),
                self._row("yesNo", value="dontKnow"),
            ]
        )
