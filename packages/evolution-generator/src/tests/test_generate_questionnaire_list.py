# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

from helpers.generator_helpers import delete_file_if_exists, get_workbook
from scripts.generate_questionnaire_list import generate_questionnaire_list
from survey_definition.survey_definition import SurveyDefinition
from tests.mocked_excel import (
    MOCKED_EXCEL_FILE,
    create_mocked_excel_data,
)


class TestGenerateQuestionnaireList:
    def test_lists_each_section_questions_under_its_title(self, tmp_path):
        """Each section's questions are listed, in source order, under that section's title in the requested language, even when the Widgets rows of different sections are interleaved."""
        survey_definition = SurveyDefinition(
            languages=("fr", "en"),
            sections=[
                {
                    "section": "home",
                    "in_nav": True,
                    "abbreviation": "HM_",
                    "title_fr": "Domicile",
                    "title_en": "Home",
                },
                {
                    "section": "household",
                    "in_nav": True,
                    "abbreviation": "HH_",
                    "title_fr": "Ménage",
                    "title_en": "Household",
                },
            ],
        )
        workbook = create_mocked_excel_data(
            "Widgets",
            ["section", "label::fr", "label::en", "active", "choices"],
            [
                ["home", "Adresse?", "Address?", True, None],
                ["household", "Taille?", "Size?", True, None],
                ["home", "Type de logement?", "Dwelling type?", True, None],
            ],
        )
        try:
            for language, expected_text in (
                (
                    "en",
                    "Section: Home\n\nAddress?\n\nDwelling type?\n\n\n\n"
                    "Section: Household\n\nSize?\n\n\n\n",
                ),
                (
                    "fr",
                    "Section: Domicile\n\nAdresse?\n\nType de logement?\n\n\n\n"
                    "Section: Ménage\n\nTaille?\n\n\n\n",
                ),
            ):
                generate_questionnaire_list(
                    get_workbook(MOCKED_EXCEL_FILE),
                    survey_definition,
                    str(tmp_path),
                    language,
                )
                text = (tmp_path / f"questionnaire_list_{language}.txt").read_text(
                    encoding="utf-8"
                )
                assert text == expected_text, language
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_lists_the_choices_of_each_question_from_the_survey_definition(
        self, tmp_path
    ):
        """A question's choices are listed under it, a spread row adding the choices of the list it names."""
        survey_definition = SurveyDefinition(
            languages=("fr", "en"),
            sections=[
                {
                    "section": "home",
                    "in_nav": True,
                    "abbreviation": "HM_",
                    "title_fr": "Domicile",
                    "title_en": "Home",
                }
            ],
            choices=[
                {
                    "choicesName": "yes",
                    "value": "yes",
                    "label::fr": "Oui",
                    "label::en": "Yes",
                },
                {"choicesName": "yesNo", "spreadChoicesName": "yes"},
                {
                    "choicesName": "yesNo",
                    "value": "no",
                    "label::fr": "Non",
                    "label::en": "No",
                },
            ],
        )
        create_mocked_excel_data(
            "Widgets",
            ["section", "label::fr", "label::en", "active", "choices"],
            [["home", "Voiture?", "Car?", True, "yesNo"]],
        )
        try:
            for language, question, choices in (
                ("en", "Car?", "- Yes\n- No"),
                ("fr", "Voiture?", "- Oui\n- Non"),
            ):
                generate_questionnaire_list(
                    get_workbook(MOCKED_EXCEL_FILE),
                    survey_definition,
                    str(tmp_path),
                    language,
                )
                text = (tmp_path / f"questionnaire_list_{language}.txt").read_text()
                assert f"{question}\n{choices}" in text
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)
