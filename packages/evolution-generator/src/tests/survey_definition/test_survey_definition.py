# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for survey_definition/survey_definition.py: the SurveyDefinition bundle.

import pytest  # pyright: ignore[reportMissingImports]
from pydantic import ValidationError

from survey_definition.sections_definition import SectionDefinition, Sections
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


class TestSurveyDefinitionLanguages:
    def _section(self, **extra) -> dict:
        return {
            "section": "home",
            "in_nav": True,
            "abbreviation": "HM_",
            "title_fr": "Accueil",
            "title_en": "Home",
            **extra,
        }

    def _issues(self, **fields) -> list[str]:
        """Build a SurveyDefinition from `fields`, expecting it to fail; return each issue reported, field by field."""
        with pytest.raises(ValidationError) as error:
            SurveyDefinition(**fields)
        return [
            issue
            for field_error in error.value.errors()
            for issue in str(field_error["ctx"]["error"]).split("\n")
        ]

    def test_defaults_to_french_and_english(self):
        assert SurveyDefinition().languages == ("fr", "en")

    def test_accepts_other_languages_and_regions(self):
        survey_definition = SurveyDefinition(languages=["es", "en-CA"])
        assert survey_definition.languages == ("es", "en-CA")

    def test_reports_no_language(self):
        assert self._issues(languages=[]) == [
            "At least one survey language is required."
        ]

    def test_reports_invalid_language_codes(self):
        assert self._issues(languages=["fr", "English", "EN"]) == [
            "Invalid survey languages ['English', 'EN']: each must be a language "
            "code like 'fr' or 'en-CA'."
        ]

    def test_reports_a_language_code_with_a_trailing_newline(self):
        assert self._issues(languages=["fr\n"]) == [
            "Invalid survey languages ['fr\\n']: each must be a language "
            "code like 'fr' or 'en-CA'."
        ]

    def test_reports_repeated_languages(self):
        assert self._issues(languages=["fr", "en", "fr"]) == [
            "Repeated survey languages: ['fr']"
        ]

    def test_passes_the_survey_languages_to_the_sections(self):
        """The Sections rule (a title in every language) checks the survey's languages."""
        assert self._issues(languages=["fr", "es"], sections=[self._section()]) == [
            "Error in Sections - Invalid row 2: title_es is required when in_nav is true"
        ]

    def test_accepts_titles_in_the_survey_languages_only(self):
        survey_definition = SurveyDefinition(
            languages=["fr"], sections=[self._section(title_en=None)]
        )
        assert survey_definition.sections[0].title == {"fr": "Accueil"}

    def test_reports_a_title_in_a_language_that_is_not_a_survey_language(self):
        assert self._issues(languages=["fr"], sections=[self._section()]) == [
            "Error in Sections - Unexpected columns: ['title_en']. "
            "The survey languages are ['fr']."
        ]

    def test_reports_invalid_languages_with_the_other_sections_problems(self):
        """Invalid languages don't hide the sections' other problems, nor add a title error per language."""
        assert self._issues(
            languages=["French"], sections=[self._section(abbreviation="HM")]
        ) == [
            "Invalid survey languages ['French']: each must be a language code "
            "like 'fr' or 'en-CA'.",
            "Error in Sections - Invalid abbreviation in row 2: 'HM' - Must end with "
            "an underscore ('_'), e.g. 'h_'.",
        ]

    def test_reports_every_table_s_problems_together(self):
        """A missing title (a rule needing the languages) comes with the other tables' errors."""
        issues = self._issues(
            sections=[self._section(title_en=None)],
            conditionals=[{"conditional_name": "cond1"}],
        )
        assert len(issues) == 2
        assert issues[0].startswith(
            "Error in Conditionals - Required field is missing in row 2."
        )
        assert issues[1] == (
            "Error in Sections - Invalid row 2: title_en is required when in_nav is true"
        )

    def test_keeps_an_already_built_table_as_is(self):
        """Its rows were checked when it was built, with the context it was built with."""
        sections = Sections([self._section()])
        survey_definition = SurveyDefinition(languages=["fr"], sections=sections)
        assert survey_definition.sections is sections
