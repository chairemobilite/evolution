# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes functions that generate all the questions labels and choices list for the survey.
# These functions are intended to be invoked from the generate_survey.py script.
import os
from typing import Literal
from helpers.generator_helpers import get_data_from_excel


# Function to clean text of markdown characters
def clean_text(text):
    if text is None:
        return ""
    return (
        text.replace("**", "")
        .replace("__green", "")
        .replace("__red", "")
        .replace("__", "")
    )


# Function to generate questionnaire_test for each section
def generate_questionnaire_list(
    excel_file_path: str,
    questionnaire_list_output_folder: str,
    language: Literal["en", "fr"],
):
    try:
        # Read data from Excel and return rows and headers
        widgets_rows, widgets_headers = get_data_from_excel(
            excel_file_path, sheet_name="Widgets"
        )
        sections_rows, sections_headers = get_data_from_excel(
            excel_file_path, sheet_name="Sections"
        )
        choices_rows, choices_headers = get_data_from_excel(
            excel_file_path, sheet_name="Choices"
        )

        # Find the index
        widgets_language_index = widgets_headers.index(language)
        widgets_section_index = widgets_headers.index("section")
        widgets_active_index = widgets_headers.index("active")
        widgets_choices_index = widgets_headers.index("choices")
        section_name_index = sections_headers.index("section")
        section_title_language_index = sections_headers.index(f"title_{language}")
        choices_name_index = choices_headers.index("choicesName")
        choices_language_index = choices_headers.index(language)
        choices_spread_choices_name_index = choices_headers.index("spreadChoicesName")

        # Map section names to their titles
        section_titles = {
            row[section_name_index].value: row[section_title_language_index].value
            for row in sections_rows[1:]
        }

        # Group choices by choicesName and concatenate their 'en' values
        choices_map = {}
        for row in choices_rows[1:]:
            choices_name = row[choices_name_index].value
            choice_text = clean_text(row[choices_language_index].value)
            choices_spread_choices_name = row[choices_spread_choices_name_index].value

            if choice_text is not None:
                if choices_name in choices_map:
                    choices_map[choices_name].append(choice_text)
                else:
                    choices_map[choices_name] = [choice_text]

            # If choices_spread_choices_name is not null, append its choices to the current choices_name
            if choices_spread_choices_name:
                if choices_spread_choices_name in choices_map:
                    choices_map[choices_name].extend(
                        choices_map[choices_spread_choices_name]
                    )
                else:
                    print(
                        f"Warning: {choices_spread_choices_name} not found in choices_map"
                    )

        # Group questions by section
        sections = {}
        for row in widgets_rows[1:]:
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
            print(f"Generate {questionnaire_list_path} successfully")

    except Exception as e:
        print(f"Error with questionnaire list: {e}")
        raise e
