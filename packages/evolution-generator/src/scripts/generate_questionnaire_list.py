# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes functions that generate all the questions labels and choices list for the survey.
# These functions are intended to be invoked from the generate_survey.py script.
import os
from typing import Literal
from helpers.excel_workbook import ExcelWorkbook
from helpers.generator_helpers import get_data_from_excel, get_data_rows, clean_text
from survey_definition.survey_definition import SurveyDefinition


# Function to generate questionnaire_test for each section
def generate_questionnaire_list(
    # TODO: Remove workbook once every sheet read here is migrated to the survey definition.
    workbook: ExcelWorkbook,
    survey_definition: SurveyDefinition,
    questionnaire_list_output_folder: str,
    language: Literal["en", "fr"],
):
    """
    Write questionnaire_list_<language>.txt: every active question, by section, with
    its choices.

    Args:
        workbook: Excel workbook to read the sheets not yet migrated to the
            survey definition from.
        survey_definition: Already-validated survey definition to describe.
        questionnaire_list_output_folder: Folder to write the text file to.
        language: Language of the labels, 'en' or 'fr'.
    """
    try:
        # Read data from Excel and return rows and headers
        widgets_rows, widgets_headers = get_data_from_excel(
            workbook, sheet_name="Widgets"
        )

        # Find the index
        widgets_language_index = widgets_headers.index("label::" + language)
        widgets_section_index = widgets_headers.index("section")
        widgets_active_index = widgets_headers.index("active")
        widgets_choices_index = widgets_headers.index("choices")

        # Map section names to their titles
        section_titles = {
            section.section: section.title.get(language)
            for section in survey_definition.sections
        }

        # Group the choice labels by choicesName, a spread row adding the labels of
        # the list it names (always an earlier one, see Choices)
        choices_map: dict[str, list[str]] = {}
        for choice in survey_definition.choices:
            choice_texts = choices_map.setdefault(choice.choices_name, [])
            if choice.spread_choices_name is not None:
                choice_texts.extend(choices_map[choice.spread_choices_name])
            else:
                choice_texts.append(clean_text(choice.label.get(language)))

        # Group questions by section
        sections = {}
        for row in get_data_rows(widgets_rows):
            section_name = row[widgets_section_index].value
            question_text = clean_text(row[widgets_language_index].value)
            active = row[widgets_active_index].value
            choices_name = row[widgets_choices_index].value

            # Add question to section if it has a section name, question text, and is active
            if section_name and question_text and active:
                if section_name not in sections:
                    sections[section_name] = []
                if choices_name:
                    # Filter out empty choices in choices_map
                    filtered_choices_list = [
                        choice for choice in choices_map.get(choices_name, []) if choice
                    ]
                    formatted_choices = "\n".join(
                        f"- {choice}" for choice in filtered_choices_list
                    )
                    question_text += f"\n{formatted_choices}"
                sections[section_name].append(question_text)

        # Generate questionnaire text with sections
        questionnaire_text = ""
        for section_name, questions in sections.items():
            section_title = section_titles.get(section_name, section_name)
            questionnaire_text += f"Section: {section_title}\n\n"
            questionnaire_text += "\n\n".join(questions)
            questionnaire_text += "\n\n\n\n"

        # Save the questionnaire text to questionnaire_list_en.txt
        questionnaire_list_path = os.path.join(
            questionnaire_list_output_folder, f"questionnaire_list_{language}.txt"
        )
        with open(
            questionnaire_list_path, mode="w", encoding="utf-8", newline="\n"
        ) as f:
            f.write(questionnaire_text)
            print(f"Generated {questionnaire_list_path} successfully")

    except Exception as e:
        print(f"Error with questionnaire list: {e}")
        raise e
