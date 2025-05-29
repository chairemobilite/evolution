# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes functions that generate the locales labels files.
# These functions are intended to be invoked from the generate_survey.py script.
import os  # For interacting with the operating system
import ruamel.yaml  # For working with YAML files
from helpers.generator_helpers import get_headers, sheet_exists, get_data_from_excel


# Initialize YAML parser
yaml = ruamel.yaml.YAML()
yaml.indent(sequence=4, offset=4, mapping=4)
yaml.width = 80


# Class for handling various text formatting notations
class ValueReplacer:
    # Various HTML and markdown notations
    startBoldHtml = "<strong>"
    endBoldHtml = "</strong>"
    boldNotation = "**"

    startOblique = '<span class="_pale _oblique">'
    endOblique = "</span>"
    obliqueNotation = "__"

    startGreen = '<span style="color: green;">'
    endGreen = "</span>"
    greenNotation = "_green_"

    startRed = '<span style="color: red;">'
    endRed = "</span>"
    redNotation = "_red_"

    # Static methods for replacing notations with proper HTML tags
    @staticmethod
    def replaceStartEnd(string, notation, startReplaced, endReplaced):
        # Replaces notations with corresponding start/end tags in the string
        replacedStr = string
        if notation in replacedStr and replacedStr.count(notation) % 2 == 0:
            replacedCount = 0
            while notation in replacedStr:
                replaceWith = startReplaced if replacedCount % 2 == 0 else endReplaced
                replacedStr = replacedStr.replace(notation, replaceWith, 1)
                replacedCount += 1
        return replacedStr

    # Main replace function applying all notations
    @staticmethod
    def replace(string):
        # Replaces newlines with <br> tags and applies other notations
        replacedStr = string.replace("\n", "<br />")
        # replaced each bold, oblique, green and red notations by proper tags
        replacedStr = ValueReplacer.replaceStartEnd(
            replacedStr,
            ValueReplacer.boldNotation,
            ValueReplacer.startBoldHtml,
            ValueReplacer.endBoldHtml,
        )
        replacedStr = ValueReplacer.replaceStartEnd(
            replacedStr,
            ValueReplacer.obliqueNotation,
            ValueReplacer.startOblique,
            ValueReplacer.endOblique,
        )
        replacedStr = ValueReplacer.replaceStartEnd(
            replacedStr,
            ValueReplacer.greenNotation,
            ValueReplacer.startGreen,
            ValueReplacer.endGreen,
        )
        replacedStr = ValueReplacer.replaceStartEnd(
            replacedStr,
            ValueReplacer.redNotation,
            ValueReplacer.startRed,
            ValueReplacer.endRed,
        )
        return replacedStr


def deleteYamlFile(language, section, labels_output_folder_path):
    """
    Deletes the YAML file for the specified section and language.

    Args:
        language (str): The language of the translation.
        section (str): The section name.
        labels_output_folder_path (str): The output folder path for the labels.

    Note:
        This function is used to delete the YAML file before adding translations
        because there were some bugs when renaming a path (all the paths would stay)
        and with the order of the questions (there was no order if the file changed).
    """
    try:
        file_path = os.path.join(labels_output_folder_path, language, f"{section}.yaml")
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"Remove: {file_path} successfully")
    except Exception as e:
        print(f"An error occurred while deleting the file {file_path}: {e}")
        raise e


def addTranslation(
    language, section, path, value, labels_output_folder_path, rowNumber, translations
):
    """
    Adds a translation to the locales dictionary.

    Args:
        language (str): The language of the translation.
        section (str): The section name.
        path (str): The path for the translation.
        value (str): The translation value.
        labels_output_folder_path (str): The output folder path for the labels.
        rowNumber (int): The row number in the Excel file.
        translations (dict): The dictionary of translations.
    """
    try:
        value = ValueReplacer.replace(value)
        yaml_value = stringToYaml(value)

        # Ensure section exists in translations
        if section not in translations:
            translations[section] = {}

        # Check for duplicate keys
        if path in translations[section]:
            print(
                f"Duplicate key found at row {rowNumber} with language={language}, section={section}, path={path}, value={value}. Skipping this entry."
            )
        else:
            # Add the translation directly to the dictionary
            translations[section][path] = yaml_value

    except Exception as e:
        print(
            f"An error occurred in addTranslation at row {rowNumber} with language={language}, section={section}, path={path}, value={value}: {e}"
        )
        raise e


def saveTranslations(language, section, labels_output_folder_path, translations):
    """
    Saves the translations to the appropriate YAML file with a header.

    Args:
        language (str): The language of the translation.
        section (str): The section name.
        labels_output_folder_path (str): The output folder path for the labels.
        translations (dict): The dictionary of translations for the language (nested by section).
    """
    try:
        # Construct the file path
        file_path = os.path.join(labels_output_folder_path, language, f"{section}.yaml")

        # Only save translations for the current section
        section_translations = translations.get(section, {})

        # Save the updated translations back to the YAML file
        with open(file_path, "w", encoding="utf-8") as file:
            # Add an informative header to the file
            file.write(
                "# This file was automatically generated by the Evolution Generator.\n"
            )
            file.write(
                "# The Evolution Generator is used to automate the creation of consistent, reliable code.\n"
            )
            file.write("# Any changes made to this file will be overwritten.\n\n")
            yaml.dump(section_translations, file)
        print(f"Generate {file_path.replace('\\', '/')} successfully")

    except Exception as e:
        print(f"An error occurred while saving translations to {file_path}: {e}")
        raise e


# TODO: Add more languages translations. Also, add more context (e.g. phone interview, solo interview, etc.)
# TODO: For example, fr_solo, en_phone.
def addTranslationsFromExcel(excel_file_path, labels_output_folder_path):
    """
    Reads translations from an Excel file and adds them to the appropriate YAML files.

    Args:
        excel_file_path (str): The path to the Excel file containing translations.
        labels_output_folder_path (str): The output folder path for the labels.
    """
    try:
        # Read data from Excel and return rows and headers
        widgets_rows, widgets_headers = get_data_from_excel(
            excel_file_path, sheet_name="Widgets"
        )

        # Find the index
        # question_name_index = widgets_headers.index("questionName")
        section_index = widgets_headers.index("section")
        path_index = widgets_headers.index("path")
        fr_index = widgets_headers.index("fr")
        en_index = widgets_headers.index("en")

        rowNumber = 2  # Start from the second row
        processed_sections = set()  # Track processed sections
        # Nested dict: translations_dict[language][section][path] = value
        translations_dict = {"fr": {}, "en": {}}  # Store translations for each language

        # Parse the widget sheet to add the translations
        for row in widgets_rows[1:]:
            # Get the row values
            # question_name = row[question_name_index].value
            section = row[section_index].value
            path = row[path_index].value
            fr = row[fr_index].value
            en = row[en_index].value

            # Delete the YAML file for the section before adding translations
            if section not in processed_sections:
                if fr is not None:
                    deleteYamlFile(
                        language="fr",
                        section=section,
                        labels_output_folder_path=labels_output_folder_path,
                    )
                if en is not None:
                    deleteYamlFile(
                        language="en",
                        section=section,
                        labels_output_folder_path=labels_output_folder_path,
                    )
                processed_sections.add(section)  # Mark section as processed

            if fr is not None:
                addTranslation(
                    language="fr",
                    section=section,
                    path=path,
                    value=fr,
                    labels_output_folder_path=labels_output_folder_path,
                    rowNumber=rowNumber,
                    translations=translations_dict["fr"],
                )
            if en is not None:
                addTranslation(
                    language="en",
                    section=section,
                    path=path,
                    value=en,
                    labels_output_folder_path=labels_output_folder_path,
                    rowNumber=rowNumber,
                    translations=translations_dict["en"],
                )
            rowNumber += 1  # Increment row number

        # Save all translations
        for language, translations in translations_dict.items():
            for section in processed_sections:
                saveTranslations(
                    language, section, labels_output_folder_path, translations
                )

    except Exception as e:
        print(f"Exception occurred in addTranslationsFromExcel: {e}")
        raise e


def stringToYaml(str):
    """
    Converts a string to a YAML format.

    Args:
        str (str): The string to convert.

    Returns:
        ruamel.yaml.scalarstring.FoldedScalarString or str: The converted YAML string.
    """
    try:
        if "\n" in str:
            return ruamel.yaml.scalarstring.FoldedScalarString(str)
        if len(str) > 76:
            return ruamel.yaml.scalarstring.FoldedScalarString(str)
        return str
    except Exception as e:
        print(f"An error occurred in stringToYaml: {e}")
        raise e


# Function to generate the labels locales files
def generate_labels(excel_file_path, labels_output_folder_path):
    """
    Generates the labels locales files from an Excel file.

    Args:
        excel_file_path (str): The path to the Excel file containing translations.
        labels_output_folder_path (str): The output folder path for the labels.
    """
    try:
        addTranslationsFromExcel(
            excel_file_path=excel_file_path,
            labels_output_folder_path=labels_output_folder_path,
        )
    except Exception as e:
        print(f"An error occurred: {e}")
        raise e
