# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes functions that generate the locales labels files.
# These functions are intended to be invoked from the generate_survey.py script.
import os  # For interacting with the operating system
import ruamel.yaml  # For working with YAML files
from helpers.generator_helpers import get_data_from_excel


# Initialize YAML parser
yaml = ruamel.yaml.YAML()
yaml.indent(sequence=4, offset=4, mapping=4)
yaml.width = 80


# Class for handling various text formatting notations
class LabelFormatter:
    """
    Utility class for formatting label strings with custom notations.

    Supported notations:
    - Bold: **text** → <strong>text</strong>
    - Oblique: __text__ → <span class="_pale _oblique">text</span>
    - Green: _green_text_green_ → <span style="color: green;">text</span>
    - Red: _red_text_red_ → <span style="color: red;">text</span>
    - Newlines: \n → <br />

    Methods:
        replace(string): Applies all supported formatting to the input string.
    """

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
        replacedStr = LabelFormatter.replaceStartEnd(
            replacedStr,
            LabelFormatter.boldNotation,
            LabelFormatter.startBoldHtml,
            LabelFormatter.endBoldHtml,
        )
        replacedStr = LabelFormatter.replaceStartEnd(
            replacedStr,
            LabelFormatter.obliqueNotation,
            LabelFormatter.startOblique,
            LabelFormatter.endOblique,
        )
        replacedStr = LabelFormatter.replaceStartEnd(
            replacedStr,
            LabelFormatter.greenNotation,
            LabelFormatter.startGreen,
            LabelFormatter.endGreen,
        )
        replacedStr = LabelFormatter.replaceStartEnd(
            replacedStr,
            LabelFormatter.redNotation,
            LabelFormatter.startRed,
            LabelFormatter.endRed,
        )
        return replacedStr


def get_labels_file_path(labels_output_folder_path, language, section):
    """
    Returns the file path for the labels YAML file for a given section and language.

    Args:
        labels_output_folder_path (str): The output folder path for the labels.
        language (str): The language of the translation.
        section (str): The section name.

    Returns:
        str: The file path for the labels YAML file.
    """
    return os.path.join(labels_output_folder_path, language, f"{section}.yaml")


# Track which (language, section) files have been deleted globally for this script run
removed_files_global = set()


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
        # Construct the file path depending on the section and language
        file_path = get_labels_file_path(labels_output_folder_path, language, section)
        if os.path.exists(file_path):
            os.remove(file_path)
            print(f"Remove: {file_path} successfully")
    except Exception as e:
        print(f"An error occurred while deleting the file {file_path}: {e}")
        raise e


def delete_all_labels_yaml_files(labels_output_folder_path, languages, sections):
    """
    Deletes all YAML files for the specified languages and sections, only once before processing sheets.
    """
    for language in languages:
        for section in sections:
            file_path = get_labels_file_path(
                labels_output_folder_path, language, section
            )
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    print(f"Remove: {file_path} successfully")
                except Exception as e:
                    print(f"An error occurred while deleting the file {file_path}: {e}")
                    raise e


def addTranslation(language, section, path, value, rowNumber, translations):
    """
    Adds a translation to the locales dictionary.

    Args:
        language (str): The language of the translation.
        section (str): The section name.
        path (str): The path for the translation.
        value (str): The translation value.
        rowNumber (int): The row number in the Excel file.
        translations (dict): The dictionary of translations.

    Note: If the file exists, merges the new translations with the existing ones.
    """
    try:
        value = LabelFormatter.replace(value)
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


def merge_dicts(a, b):
    """
    Recursively merges dict b into dict a and returns the result.
    """
    for k, v in b.items():
        if k in a and isinstance(a[k], dict) and isinstance(v, dict):
            merge_dicts(a[k], v)
        else:
            a[k] = v
    return a


def saveTranslations(
    language,
    section,
    labels_output_folder_path,
    translations,
    labels_sheet_name="Widgets",
):
    """
    Saves the translations to the appropriate YAML file with a header.

    """
    try:
        # Construct the file path depending on the section, language, and labels_sheet_name
        file_path = get_labels_file_path(labels_output_folder_path, language, section)

        # Only save translations for the current section
        section_translations = translations.get(section, {})

        # Merge with existing file if present
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                try:
                    existing = yaml.load(f) or {}
                except Exception:
                    existing = {}
            merged = merge_dicts(existing, section_translations)
        else:
            merged = section_translations

        with open(file_path, "w", encoding="utf-8") as file:
            # Add an informative header to the file
            file.write(
                "# This file was automatically generated by the Evolution Generator.\n"
            )
            file.write(
                "# The Evolution Generator is used to automate the creation of consistent, reliable code.\n"
            )
            file.write("# Any changes made to this file will be overwritten.\n\n")
            yaml.dump(merged, file)
        print(f"Generate {file_path.replace('\\', '/')} successfully")

    except Exception as e:
        print(f"An error occurred while saving translations to {file_path}: {e}")
        raise e


def addTranslationsFromExcel(
    excel_file_path,
    labels_output_folder_path,
    labels_sheet_name="Widgets",
    sections_to_delete=None,
):
    """
    Reads translations from an Excel file and adds them to the appropriate YAML files.

    Args:
        excel_file_path (str): The path to the Excel file containing translations.
        labels_output_folder_path (str): The output folder path for the labels.
        labels_sheet_name (str): The name of the sheet in the Excel file containing labels.
    """
    try:
        # Read data from Excel and return rows and headers
        widgets_rows, widgets_headers = get_data_from_excel(
            excel_file_path, sheet_name=labels_sheet_name
        )

        # Find the index
        section_index = widgets_headers.index("section")
        path_index = widgets_headers.index("path")
        label_fr_index = widgets_headers.index("label::fr")
        label_en_index = widgets_headers.index("label::en")
        label_fr_one_index = widgets_headers.index("label_one::fr")
        label_en_one_index = widgets_headers.index("label_one::en")

        rowNumber = 2  # Start from the second row
        processed_sections = set()  # Track processed sections
        translations_dict = {"fr": {}, "en": {}}  # Store translations for each language

        # Optionally delete YAML files for all sections/languages before any processing
        if sections_to_delete is not None:
            delete_all_labels_yaml_files(
                labels_output_folder_path,
                ["fr", "en"],
                sections_to_delete,
            )

        # Parse the widget sheet to add the translations
        for row in widgets_rows[1:]:
            # Get the row values
            # question_name = row[question_name_index].value
            section = row[section_index].value
            path = row[path_index].value
            fr_label = row[label_fr_index].value
            en_label = row[label_en_index].value
            fr_label_one = (
                row[label_fr_one_index].value
                if label_fr_one_index is not None
                else None
            )
            en_label_one = (
                row[label_en_one_index].value
                if label_en_one_index is not None
                else None
            )

            # Expand gender context for fr_label and fr_label_one
            gender_fr = expand_gender(fr_label)
            gender_fr_one = expand_gender(fr_label_one)
            gender_en = expand_gender(en_label)
            gender_en_one = expand_gender(en_label_one)

            # Delete the YAML file for the section before adding translations, but only once per (language, section) for the whole script
            if section not in processed_sections:
                if fr_label is not None:
                    key = ("fr", section)
                    if key not in removed_files_global:
                        deleteYamlFile(
                            language="fr",
                            section=section,
                            labels_output_folder_path=labels_output_folder_path,
                        )
                        removed_files_global.add(key)
                if en_label is not None:
                    key = ("en", section)
                    if key not in removed_files_global:
                        deleteYamlFile(
                            language="en",
                            section=section,
                            labels_output_folder_path=labels_output_folder_path,
                        )
                        removed_files_global.add(key)
                processed_sections.add(section)  # Mark section as processed

            # Add French translations
            if gender_fr:
                addTranslation(
                    language="fr",
                    section=section,
                    path=path + "_male",
                    value=gender_fr["male"],
                    rowNumber=rowNumber,
                    translations=translations_dict["fr"],
                )
                addTranslation(
                    language="fr",
                    section=section,
                    path=path + "_female",
                    value=gender_fr["female"],
                    rowNumber=rowNumber,
                    translations=translations_dict["fr"],
                )
                addTranslation(
                    language="fr",
                    section=section,
                    path=path + "_other",
                    value=gender_fr["other"],
                    rowNumber=rowNumber,
                    translations=translations_dict["fr"],
                )
            elif fr_label is not None:
                addTranslation(
                    language="fr",
                    section=section,
                    path=path,
                    value=fr_label,
                    rowNumber=rowNumber,
                    translations=translations_dict["fr"],
                )

            # Add French one person translation for count context if it exists
            if gender_fr_one:
                addTranslation(
                    language="fr",
                    section=section,
                    path=path + "_male_one",
                    value=gender_fr_one["male"],
                    rowNumber=rowNumber,
                    translations=translations_dict["fr"],
                )
                addTranslation(
                    language="fr",
                    section=section,
                    path=path + "_female_one",
                    value=gender_fr_one["female"],
                    rowNumber=rowNumber,
                    translations=translations_dict["fr"],
                )
                addTranslation(
                    language="fr",
                    section=section,
                    path=path + "_other_one",
                    value=gender_fr_one["other"],
                    rowNumber=rowNumber,
                    translations=translations_dict["fr"],
                )
            elif fr_label_one:
                addTranslation(
                    language="fr",
                    section=section,
                    path=path + "_one",
                    value=fr_label_one,
                    rowNumber=rowNumber,
                    translations=translations_dict["fr"],
                )

            # Add English translations
            if gender_en:
                addTranslation(
                    language="en",
                    section=section,
                    path=path + "_male",
                    value=gender_en["male"],
                    rowNumber=rowNumber,
                    translations=translations_dict["en"],
                )
                addTranslation(
                    language="en",
                    section=section,
                    path=path + "_female",
                    value=gender_en["female"],
                    rowNumber=rowNumber,
                    translations=translations_dict["en"],
                )
                addTranslation(
                    language="en",
                    section=section,
                    path=path + "_other",
                    value=gender_en["other"],
                    rowNumber=rowNumber,
                    translations=translations_dict["en"],
                )
            elif en_label is not None:
                addTranslation(
                    language="en",
                    section=section,
                    path=path,
                    value=en_label,
                    rowNumber=rowNumber,
                    translations=translations_dict["en"],
                )

            # Add English one person translation for count context if it exists
            if gender_en_one:
                addTranslation(
                    language="en",
                    section=section,
                    path=path + "_male_one",
                    value=gender_en_one["male"],
                    rowNumber=rowNumber,
                    translations=translations_dict["en"],
                )
                addTranslation(
                    language="en",
                    section=section,
                    path=path + "_female_one",
                    value=gender_en_one["female"],
                    rowNumber=rowNumber,
                    translations=translations_dict["en"],
                )
                addTranslation(
                    language="en",
                    section=section,
                    path=path + "_other_one",
                    value=gender_en_one["other"],
                    rowNumber=rowNumber,
                    translations=translations_dict["en"],
                )
            elif en_label_one:
                addTranslation(
                    language="en",
                    section=section,
                    path=path + "_one",
                    value=en_label_one,
                    rowNumber=rowNumber,
                    translations=translations_dict["en"],
                )
            rowNumber += 1  # Increment row number

        # Save all translations
        for language, translations in translations_dict.items():
            for section in processed_sections:
                saveTranslations(
                    language,
                    section,
                    labels_output_folder_path,
                    translations,
                    labels_sheet_name=labels_sheet_name,
                )

    except Exception as e:
        print(f"Exception occurred in addTranslationsFromExcel: {e}")
        raise e


def expand_gender(label):
    """
    Replace all occurrences of {{gender:...}} or {{gender : ...}} (spaces before or after the colon) with the male, female, and other forms.
    Example: "Étudian{{gender:t/te/t·e}}" -> {"male": "Étudiant", "female": "Étudiante", "other": "Étudiant·e"}
    If only one part, 'female' is the part, 'male' and 'other' are ''.
    If only two parts, 'male' is first part, 'female' is second part, 'other' is ''.
    If three or more parts, only the first three are used: male, female, other.

    Note: We accept both {{gender:...}}, {{gender :...}}, {{gender: ...}}, and {{gender : ...}}
    (with spaces before and/or after the colon) because LibreOffice (in French) automatically inserts a space after the colon.
    """
    if label is None:
        return None
    import re

    # Find all gender patterns in the label (with or without spaces before and after the colon).
    # E.g. "{{gender:t/te}}", "{{gender :t/te}}", "{{gender: t/te}}", "{{gender : t/te}}"
    pattern = r"\{\{gender\s*:\s*([^}]+)\}\}"
    matches = re.findall(pattern, label)
    if not matches:
        return None
    male_label = label
    female_label = label
    other_label = label
    for match in matches:
        parts = match.split("/")
        if len(parts) >= 3:
            male, female, other = parts[0], parts[1], parts[2]
        elif len(parts) == 2:
            male, female, other = parts[0], parts[1], ""
        elif len(parts) == 1:
            male, female, other = "", parts[0], ""
        else:
            male, female, other = "", "", ""
        # Replace all variants of the gender pattern (with or without spaces before and after colon) with the correct gendered string
        # Note: We use re.escape to escape any special characters in the match.
        # This ensures that the pattern is treated as a literal string.
        pattern_exact = r"\{\{gender\s*:\s*" + re.escape(match) + r"\}\}"
        male_label = re.sub(pattern_exact, male, male_label)
        female_label = re.sub(pattern_exact, female, female_label)
        other_label = re.sub(pattern_exact, other, other_label)
    return {"male": male_label, "female": female_label, "other": other_label}


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
def generate_labels(
    excel_file_path, labels_output_folder_path, labels_sheet_names=["Widgets"]
):
    """
    Generates the labels locales files from an Excel file for multiple sheets.

    This function:
    1. Collects all unique section names from all specified sheets.
    2. Deletes all YAML files for all sections/languages once before any processing.
    3. Processes each sheet, merging translations into the same YAML files per section/language.

    Args:
        excel_file_path (str): The path to the Excel file containing translations.
        labels_output_folder_path (str): The output folder path for the labels.
        labels_sheet_names (list): List of sheet names in the Excel file containing labels.
    """
    try:
        if not labels_sheet_names:
            print("Error: No labels_sheet_names provided.")
            return

        # Step 1: Collect all unique section names from all sheets
        all_sections = set()
        for sheet in labels_sheet_names:
            widgets_rows, widgets_headers = get_data_from_excel(
                excel_file_path, sheet_name=sheet
            )
            section_index = widgets_headers.index("section")
            for row in widgets_rows[1:]:
                section = row[section_index].value
                if section:
                    all_sections.add(section)

        # Step 2: Delete all YAML files for all sections/languages ONCE before any processing
        delete_all_labels_yaml_files(
            labels_output_folder_path,
            ["fr", "en"],
            all_sections,
        )

        # Step 3: Process each sheet and merge translations into the same files
        for sheet in labels_sheet_names:
            addTranslationsFromExcel(
                excel_file_path=excel_file_path,
                labels_output_folder_path=labels_output_folder_path,
                labels_sheet_name=sheet,
                sections_to_delete=None,  # Already deleted above
            )
    except Exception as e:
        print(f"An error occurred: {e}")
        raise e
