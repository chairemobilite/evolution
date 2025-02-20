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
        section_title_abbreviation_index = sections_headers.index("abbreviation")

        # Map section names to their titles and abbreviations
        sections = {
            row[section_name_index].value: {
                "title": row[section_title_language_index].value,
                "abbreviation": (
                    row[section_title_abbreviation_index].value
                    if row[section_title_abbreviation_index].value
                    else ""
                ),
            }
            for row in sections_rows[1:]
        }

        # Process choices and get the choices_map
        choices_map = process_choices(choices_rows, choices_headers, language)

        # Group questions by section
        sections_questions = {}
        for row in widgets_rows[1:]:
            section_name = row[widgets_section_index].value
            question_text = clean_text(row[widgets_language_index].value)
            active = row[widgets_active_index].value
            choices_name = row[widgets_choices_index].value
            question_path = row[widgets_path_index].value
            conditional = row[widgets_conditional_index].value
            input_type = row[widgets_input_type_index].value

            # Skip questions with input_type equal to 'NextButton' or 'InfoText'
            # Because they are not questions with values
            if input_type == "NextButton" or input_type == "InfoText":
                continue

            # Add question to section if it has a section name, question text, and is active
            if section_name and question_text and active:
                if section_name not in sections_questions:
                    sections_questions[section_name] = []
                choices_text = ""
                if choices_name:
                    # Filter out empty choices in choices_map
                    filtered_choices_list = [
                        choice for choice in choices_map.get(choices_name, []) if choice
                    ]
                    choices_text = "\n".join(
                        f"{choice}" for choice in filtered_choices_list
                    )
                transformed_path = transform_path(question_path, sections)
                sections_questions[section_name].append(
                    (
                        question_text,
                        transformed_path,
                        conditional,
                        input_type,
                        choices_text,
                    )
                )  # Store this tuple

        # Generate questionnaire data
        questionnaire_data = []
        first_section = True

        # Generate questionnaire data with sections
        for section_name, questions in sections_questions.items():
            section_title = sections[section_name]["title"]
            section_abbreviation = sections[section_name]["abbreviation"]

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
            questionnaire_data.append([abbreviation_label, section_abbreviation])

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

                # Rename input type
                renamed_input_type = rename_input_type(input_type, language)
                questionnaire_data.append([question_type_label, renamed_input_type])

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


def process_choices(choices_rows, choices_headers, language):
    """
    Process the choices from the Excel sheet and group them by choicesName.
    Concatenate their values and handle spreadChoicesName.

    Args:
        choices_rows (list): Rows from the Choices sheet.
        choices_headers (list): Headers from the Choices sheet.
        language (str): Language code ('en' or 'fr').

    Returns:
        dict: A dictionary mapping choicesName to their concatenated values.
    """
    choices_name_index = choices_headers.index("choicesName")
    choices_value_index = choices_headers.index("value")
    choices_language_index = choices_headers.index(language)
    choices_spread_choices_name_index = choices_headers.index("spreadChoicesName")

    choices_map = {}
    for row in choices_rows[1:]:
        choices_name = row[choices_name_index].value
        choice_text = clean_text(row[choices_language_index].value)
        choice_value = row[choices_value_index].value
        choices_spread_choices_name = row[choices_spread_choices_name_index].value

        # Add choice to choices_map if it has a value and text
        if choice_text and choice_value:
            choice_entry = f"{choice_value} : {choice_text}"  # Format as "value : text"
            if choices_name in choices_map:
                choices_map[choices_name].append(choice_entry)
            else:
                choices_map[choices_name] = [choice_entry]

        # If choices_spread_choices_name is not null, append its choices to the current choices_name
        if (
            choices_spread_choices_name is not None
            and choices_spread_choices_name != ""
        ):
            if choices_spread_choices_name in choices_map:

                # Only add choices if they are not already in the choices_map
                if choices_name not in choices_map:
                    choices_map[choices_name] = []
                    choices_map[choices_name].extend(
                        choices_map[choices_spread_choices_name]
                    )

    return choices_map


# Function to transform the path to the format of the questionnaire.
# We change '.' to '_' because it's simpler for Python or R to read the file.
def transform_path(path: str, sections: dict) -> str:
    section_name, field_name = path.split(".")
    abbreviation = sections.get(section_name, {}).get("abbreviation", "")
    return f"{abbreviation}{field_name}"


def rename_input_type(input_type: str, language: Literal["en", "fr"]) -> str:
    """
    Rename the input type based on the specified language.

    Args:
        input_type (str): The original input type.
        language (str): Language code ('en' or 'fr').

    Returns:
        translated_input_type (str): The renamed input type.
    """
    translations = {
        "Custom": {"en": "Unknown input", "fr": "Entrée inconnue"},
        "Radio": {"en": "Radio input", "fr": "Bouton radio"},
        "Select": {"en": "Select input", "fr": "Liste déroulante"},
        "String": {"en": "Text input", "fr": "Champ de texte"},
        "Number": {"en": "Number input", "fr": "Champ numérique"},
        "Range": {"en": "Range input", "fr": "Curseur de plage"},
        "Checkbox": {"en": "Checkbox input", "fr": "Case à cocher"},
        "Text": {"en": "Text area input", "fr": "Zone de texte"},
    }

    # Ignore InfoText type because it is not a question
    if input_type == "InfoText":
        return None

    # Return the translated input type or the original if not found
    return translations.get(input_type, {}).get(language, input_type)
