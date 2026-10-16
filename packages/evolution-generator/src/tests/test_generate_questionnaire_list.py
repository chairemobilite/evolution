# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

from helpers.generator_helpers import delete_file_if_exists
from scripts.generate_questionnaire_list import generate_questionnaire_list
from survey_definition.survey_definition import SurveyDefinition
from tests.mocked_excel import (
    MOCKED_EXCEL_FILE,
    add_mocked_excel_sheet,
    create_mocked_excel_data,
)


class TestGenerateQuestionnaireList:
    def test_lists_each_section_questions_under_its_title(self, tmp_path):
        """Each section's questions are listed, in source order, under that section's title in the requested language, even when the Widgets rows of different sections are interleaved."""
        survey_definition = SurveyDefinition(
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
            ]
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
        add_mocked_excel_sheet(
            workbook,
            "Choices",
            ["choicesName", "label::fr", "label::en", "spreadChoicesName"],
            [],
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
                    MOCKED_EXCEL_FILE, survey_definition, str(tmp_path), language
                )
                text = (tmp_path / f"questionnaire_list_{language}.txt").read_text(
                    encoding="utf-8"
                )
                assert text == expected_text, language
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)
