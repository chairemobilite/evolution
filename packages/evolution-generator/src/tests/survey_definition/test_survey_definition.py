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
