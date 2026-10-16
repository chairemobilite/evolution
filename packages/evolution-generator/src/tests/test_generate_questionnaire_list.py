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
    def test_titles_each_section_from_the_survey_definition(self, tmp_path):
        """Each section's questions are listed under that section's title, in the requested language."""
        survey_definition = SurveyDefinition(
            sections=[
                {
                    "section": "home",
                    "in_nav": True,
                    "abbreviation": "HM_",
                    "title_fr": "Domicile",
                    "title_en": "Home",
                }
            ]
        )
        workbook = create_mocked_excel_data(
            "Widgets",
            ["section", "label::fr", "label::en", "active", "choices"],
            [["home", "Combien?", "How many?", True, None]],
        )
        add_mocked_excel_sheet(
            workbook,
            "Choices",
            ["choicesName", "label::fr", "label::en", "spreadChoicesName"],
            [],
        )
        try:
            for language, title, question in (
                ("en", "Home", "How many?"),
                ("fr", "Domicile", "Combien?"),
            ):
                generate_questionnaire_list(
                    MOCKED_EXCEL_FILE, survey_definition, str(tmp_path), language
                )
                text = (tmp_path / f"questionnaire_list_{language}.txt").read_text()
                assert text.startswith(f"Section: {title}\n\n{question}")
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)
