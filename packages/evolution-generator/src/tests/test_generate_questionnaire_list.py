# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

from scripts.generate_questionnaire_list import generate_questionnaire_list
from survey_definition.survey_definition import SurveyDefinition


def widget(section, question_name, label_fr, label_en, **extra) -> dict:
    """An active String widget row, or another input type with `extra`."""
    return {
        "question_name": question_name,
        "input_type": "String",
        "active": True,
        "section": section,
        "path": f"{section}.{question_name}",
        "label::fr": label_fr,
        "label::en": label_en,
        **extra,
    }


class TestGenerateQuestionnaireList:
    def test_lists_each_section_questions_under_its_title(self, tmp_path):
        """Each section's questions are listed, in source order, under that section's title in the requested language, even when the widgets of different sections are interleaved."""
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
            widgets=[
                widget("home", "address", "Adresse?", "Address?"),
                widget("household", "size", "Taille?", "Size?"),
                widget("home", "dwellingType", "Type de logement?", "Dwelling type?"),
            ],
        )
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
            generate_questionnaire_list(survey_definition, str(tmp_path), language)
            text = (tmp_path / f"questionnaire_list_{language}.txt").read_text(
                encoding="utf-8"
            )
            assert text == expected_text, language

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
            widgets=[
                widget(
                    "home",
                    "hasCar",
                    "Voiture?",
                    "Car?",
                    input_type="Radio",
                    choices="yesNo",
                )
            ],
        )
        for language, question, choices in (
            ("en", "Car?", "- Yes\n- No"),
            ("fr", "Voiture?", "- Oui\n- Non"),
        ):
            generate_questionnaire_list(survey_definition, str(tmp_path), language)
            text = (tmp_path / f"questionnaire_list_{language}.txt").read_text()
            assert f"{question}\n{choices}" in text
