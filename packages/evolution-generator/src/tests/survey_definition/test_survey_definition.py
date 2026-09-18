# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for survey_definition/survey_definition.py: the SurveyDefinition bundle.

from survey_definition.sections_definition import SectionDefinition
from survey_definition.survey_definition import SurveyDefinition


class TestSurveyDefinition:
    def test_survey_definition_defaults_to_empty_lists(self):
        survey_definition = SurveyDefinition()
        assert survey_definition.sections == []

    def test_survey_definition_holds_parsed_rows(self):
        survey_definition = SurveyDefinition(
            sections=[
                SectionDefinition(section="home", in_nav=False, abbreviation="HM_")
            ],
        )
        assert len(survey_definition.sections) == 1
