# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for survey_definition/survey_definition.py: the SurveyDefinition bundle.

import pytest  # pyright: ignore[reportMissingImports]
from pydantic import ValidationError

from survey_definition.sections_definition import SectionDefinition
from survey_definition.survey_definition import SurveyDefinition


class TestSurveyDefinition:
    def test_survey_definition_defaults_to_empty_lists(self):
        survey_definition = SurveyDefinition()
        assert len(survey_definition.sections) == 0
        assert len(survey_definition.conditionals) == 0
        assert len(survey_definition.choices) == 0

    def test_survey_definition_holds_parsed_rows(self):
        survey_definition = SurveyDefinition(
            sections=[
                SectionDefinition(section="home", in_nav=False, abbreviation="HM_")
            ],
        )
        assert len(survey_definition.sections) == 1

    def test_survey_definition_builds_sections_from_source_rows(self):
        survey_definition = SurveyDefinition(
            sections=[{"section": "home", "in_nav": False, "abbreviation": "HM_"}],
        )
        assert [s.section for s in survey_definition.sections] == ["home"]

    def test_survey_definition_rejects_sections_with_problems(self):
        # A SurveyDefinition can't be built around a sheet that has duplicates.
        row = {"section": "home", "in_nav": False, "abbreviation": "HM_"}
        with pytest.raises(ValidationError, match="Duplicate section 'home'"):
            SurveyDefinition(sections=[row, row])


class TestSurveyDefinitionCrossTableRules:
    """The rules that need the survey languages or more than one table."""

    CONDITIONAL_ROW = {
        "conditional_name": "isAdultConditional",
        "path": "person.age",
        "comparison_operator": ">=",
        "value": 18,
    }

    def _choice(self, **extra) -> dict:
        return {
            "choicesName": "yesNo",
            "value": "yes",
            "label::fr": "Oui",
            "label::en": "Yes",
            **extra,
        }

    def _issues(self, **tables) -> list[str]:
        """Build a SurveyDefinition from `tables`, expecting it to fail; return each issue reported."""
        with pytest.raises(ValidationError) as error:
            SurveyDefinition(**tables)
        assert error.value.error_count() == 1
        return str(error.value.errors()[0]["ctx"]["error"]).split("\n")

    def test_accepts_choices_with_a_label_in_every_language(self):
        survey_definition = SurveyDefinition(choices=[self._choice()])
        assert survey_definition.choices[0].label == {"fr": "Oui", "en": "Yes"}

    def test_reports_choice_missing_a_label_language(self):
        assert self._issues(choices=[self._choice(**{"label::en": None})]) == [
            "Error in Choices - Required field is missing in row 2. "
            "Missing fields: ['label::en']"
        ]

    def test_reports_choice_missing_every_label_language(self):
        assert self._issues(
            choices=[self._choice(**{"label::fr": " ", "label::en": ""})]
        ) == [
            "Error in Choices - Required field is missing in row 2. "
            "Missing fields: ['label::fr', 'label::en']"
        ]

    def test_spread_row_needs_no_label(self):
        survey_definition = SurveyDefinition(
            choices=[
                self._choice(choicesName="yes"),
                {"choicesName": "yesNo", "spreadChoicesName": "yes"},
            ]
        )
        assert survey_definition.choices[1].label == {}

    def test_accepts_choice_conditional_of_the_conditionals_table(self):
        SurveyDefinition(
            conditionals=[self.CONDITIONAL_ROW],
            choices=[self._choice(conditional="isAdultConditional")],
        )

    def test_reports_choice_conditional_missing_from_the_conditionals_table(self):
        assert self._issues(
            conditionals=[self.CONDITIONAL_ROW],
            choices=[self._choice(conditional="isKidConditional")],
        ) == [
            "Error in Choices - Invalid conditional in row 2: 'isKidConditional' "
            "does not match any conditional_name of the Conditionals table"
        ]

    def test_accepts_custom_choice_conditional_missing_from_the_conditionals_table(
        self,
    ):
        """A custom conditional is written in customConditionals.tsx, not in the Conditionals table."""
        SurveyDefinition(choices=[self._choice(conditional="isKidCustomConditional")])

    def test_reports_every_cross_table_issue_at_once(self):
        issues = self._issues(
            choices=[
                self._choice(**{"label::fr": None}),
                self._choice(value="no", conditional="isKidConditional"),
            ]
        )
        assert len(issues) == 2
        assert "Missing fields: ['label::fr']" in issues[0]
        assert "'isKidConditional'" in issues[1]
