# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes functions that generate all the questions labels and choices list for the survey.
# These functions are intended to be invoked from the generate_survey.py script.
import os
import csv
from typing import Literal
from helpers.generator_helpers import get_data_from_excel, clean_text


# Function to generate questionnaire_test for each section
def generate_questionnaire_dictionary(
    excel_file_path: str,
    questionnaire_dictionary_output_folder: str,
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
        widgets_input_type_index = widgets_headers.index("inputType")
        widgets_active_index = widgets_headers.index("active")
        widgets_path_index = widgets_headers.index("path")
        widgets_conditional_index = widgets_headers.index("conditional")
        widgets_choices_index = widgets_headers.index("choices")
        section_name_index = sections_headers.index("section")
        section_title_language_index = sections_headers.index(f"title_{language}")
        choices_name_index = choices_headers.index("choicesName")
        choices_value_index = choices_headers.index("value")
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
            choice_value = row[choices_value_index].value
            choices_spread_choices_name = row[choices_spread_choices_name_index].value

            if choice_text is not None:
                choice_entry = (
                    f"{choice_value} : {choice_text}"  # Format as "value  text"
                )
                if choices_name in choices_map:
                    choices_map[choices_name].append(choice_entry)
                else:
                    choices_map[choices_name] = [choice_entry]

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
            question_path = row[widgets_path_index].value
            conditional = row[widgets_conditional_index].value
            input_type = row[widgets_input_type_index].value

            # Skip questions with input_type equal to 'NextButton' or 'Text'
            if input_type == "NextButton" or input_type == "Text":
                continue

            # Add question to section if it has a section name, question text, and is active
            if section_name and question_text and active:
                if section_name not in sections:
                    sections[section_name] = []
                choices_text = ""
                if choices_name:
                    # Filter out empty choices in choices_map
                    filtered_choices_list = [
                        choice for choice in choices_map.get(choices_name, []) if choice
                    ]
                    choices_text = "\n".join(
                        f"{choice}" for choice in filtered_choices_list
                    )
                sections[section_name].append(
                    (
                        question_text,
                        question_path,
                        conditional,
                        input_type,
                        choices_text,
                    )
                )  # Store this tuple

        # Generate questionnaire data
        questionnaire_data = []
        first_section = True

        # Generate questionnaire data with sections
        for section_name, questions in sections.items():
            section_title = section_titles.get(section_name, section_name)

            # Add triple line break before section information
            if not first_section:
                questionnaire_data.append([""])
                questionnaire_data.append([""])
                questionnaire_data.append([""])
            first_section = False

            # Determine labels based on language
            section_label = "Section"
            field_label = "Field" if language == "en" else "Champ"
            abbreviation_label = "Abbreviation" if language == "en" else "Abréviation"
            question_type_label = (
                "Question type" if language == "en" else "Type de question"
            )
            conditional_label = "Conditional" if language == "en" else "Conditionnel"
            question_label = "Question"
            choices_label = "Choices" if language == "en" else "Choix"

            questionnaire_data.append([section_label, section_title])
            questionnaire_data.append([abbreviation_label, ""])

            # Generate questionnaire data with questions
            for (
                question,
                question_path,
                conditional,
                input_type,
                choices_text,
            ) in questions:  # Unpack tuple here
                questionnaire_data.append([""])  # Add line break before each question
                questionnaire_data.append([field_label, question_path])
                questionnaire_data.append([question_type_label, input_type])

                # Only add conditional if it exists
                if conditional:
                    questionnaire_data.append([conditional_label, conditional])
                questionnaire_data.append([question_label, question])

                # Only add choices if it exists
                if choices_text:
                    questionnaire_data.append([choices_label, choices_text])

        # Save the questionnaire text to questionnaire_dictionary_en.txt
        questionnaire_dictionary_path = os.path.join(
            questionnaire_dictionary_output_folder,
            f"questionnaire_dictionary_{language}.csv",
        )
        with open(
            questionnaire_dictionary_path, mode="w", encoding="utf-8", newline=""
        ) as f:
            writer = csv.writer(f)
            writer.writerows(questionnaire_data)
            print(f"Generate {questionnaire_dictionary_path} successfully")

    except Exception as e:
        print(f"Error with questionnaire list: {e}")
        raise e
