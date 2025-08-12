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


def delete_all_labels_yaml_files(labels_output_folder_path, languages, sections):
    """
    Deletes all YAML label files for the specified languages and sections.

    This function is typically called once before generating new label files to ensure
    that old or outdated files are removed, preventing duplicate or stale content.

    Args:
        labels_output_folder_path (str): The root directory where label files are stored.
        languages (list of str): List of language codes (e.g., ['fr', 'en']) for which files should be deleted.
        sections (iterable of str): List or set of section names corresponding to survey sections.

    Side Effects:
        Removes files matching the pattern {labels_output_folder_path}/{language}/{section}.yaml
        if they exist. Prints a message for each file successfully removed.

    Raises:
        Exception: If an error occurs during file deletion, the exception is printed and re-raised.
    Deletes all YAML label files for the specified languages and sections.

    This function is typically called once before generating new label files to ensure
    that old or outdated files are removed, preventing duplicate or stale content.

    Args:
        labels_output_folder_path (str): The root directory where label files are stored.
        languages (list of str): List of language codes (e.g., ['fr', 'en']) for which files should be deleted.
        sections (iterable of str): List or set of section names corresponding to survey sections.

    Side Effects:
        Removes files matching the pattern {labels_output_folder_path}/{language}/{section}.yaml
        if they exist. Prints a message for each file successfully removed.

    Raises:
        Exception: If an error occurs during file deletion, the exception is printed and re-raised.
    """
    for language in languages:
        for section in sections:
            file_path = get_labels_file_path(
                labels_output_folder_path, language, section
            )
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    print(f"Removed {file_path} successfully")
                except Exception as e:
                    print(f"An error occurred while deleting the file {file_path}: {e}")
                    raise e


def add_translation(language, section, path, value, rowNumber, translations):
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
        yaml_value = string_to_yaml(value)

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
            f"An error occurred in add_translation at row {rowNumber} with language={language}, section={section}, path={path}, value={value}: {e}"
        )
        raise e


def save_translations(
    language,
    section,
    labels_output_folder_path,
    translations,
):
    """
    Saves the translations to the appropriate YAML file with a header.
    """
    try:
        # Construct the file path depending on the section, language, and labels_sheet_name
        file_path = get_labels_file_path(labels_output_folder_path, language, section)

        # Only save translations for the current section
        section_translations = translations.get(section, {})

        # Prepare the header for the YAML file
        header = (
            "# This file was automatically generated by the Evolution Generator.\n"
            "# The Evolution Generator is used to automate the creation of consistent, reliable code.\n"
            "# Any changes made to this file will be overwritten.\n\n"
        )

        # Merge with existing file if present
        if os.path.exists(file_path):
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
                try:
                    # Note: Use yaml.load instead of .safe_load because .safe_load is deprecated in ruamel.yaml.
                    existing = yaml.load(content) or {}
                except Exception:
                    existing = {}
            merged = merged_section_translations(existing, section_translations)
            # Check if header already exists
            if content.startswith(header):
                header_to_write = ""
                print_msg = f"Updated {file_path.replace('\\', '/') } successfully"
            else:
                header_to_write = header
                print_msg = f"Generated {file_path.replace('\\', '/') } successfully"
        else:
            merged = section_translations
            header_to_write = header
            print_msg = f"Generated {file_path.replace('\\', '/') } successfully"

        with open(file_path, "w", encoding="utf-8") as file:
            # Write the header only if not already present
            if header_to_write:
                file.write(header_to_write)
            yaml.dump(merged, file)
        print(print_msg)

    except Exception as e:
        print(f"An error occurred while saving translations to {file_path}: {e}")
        raise e


def add_translations_from_excel(
    excel_file_path,
    labels_output_folder_path,
    labels_sheet_name="Widgets",
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

            # Expand gender context for labels, by language
            gender_fr = expand_gender(fr_label)
            gender_fr_one = expand_gender(fr_label_one)
            gender_en = expand_gender(en_label)
            gender_en_one = expand_gender(en_label_one)

            # Add section to processed section set if not already processed
            if section not in processed_sections:
                processed_sections.add(section)  # Mark section as processed

            # Add French translations
            if gender_fr:
                add_translation(
                    language="fr",
                    section=section,
                    path=path + "_male",
                    value=gender_fr["male"],
                    rowNumber=rowNumber,
                    translations=translations_dict["fr"],
                )
                add_translation(
                    language="fr",
                    section=section,
                    path=path + "_female",
                    value=gender_fr["female"],
                    rowNumber=rowNumber,
                    translations=translations_dict["fr"],
                )
                add_translation(
                    language="fr",
                    section=section,
                    path=path + "_custom",
                    value=gender_fr["other"],
                    rowNumber=rowNumber,
                    translations=translations_dict["fr"],
                )
                add_translation(
                    language="fr",
                    section=section,
                    path=path + "_preferNotToAnswer",
                    value=gender_fr["preferNotToAnswer"],
                    rowNumber=rowNumber,
                    translations=translations_dict["fr"],
                )
                # The "other" translation will be the default one
                add_translation(
                    language="fr",
                    section=section,
                    path=path,
                    value=gender_fr["other"],
                    rowNumber=rowNumber,
                    translations=translations_dict["fr"],
                )
            elif fr_label is not None:
                add_translation(
                    language="fr",
                    section=section,
                    path=path,
                    value=fr_label,
                    rowNumber=rowNumber,
                    translations=translations_dict["fr"],
                )

            # Add French one person translation for count context if it exists
            if gender_fr_one:
                add_translation(
                    language="fr",
                    section=section,
                    path=path + "_male_one",
                    value=gender_fr_one["male"],
                    rowNumber=rowNumber,
                    translations=translations_dict["fr"],
                )
                add_translation(
                    language="fr",
                    section=section,
                    path=path + "_female_one",
                    value=gender_fr_one["female"],
                    rowNumber=rowNumber,
                    translations=translations_dict["fr"],
                )
                add_translation(
                    language="fr",
                    section=section,
                    path=path + "_custom_one",
                    value=gender_fr_one["other"],
                    rowNumber=rowNumber,
                    translations=translations_dict["fr"],
                )
                add_translation(
                    language="fr",
                    section=section,
                    path=path + "_preferNotToAnswer_one",
                    value=gender_fr_one["preferNotToAnswer"],
                    rowNumber=rowNumber,
                    translations=translations_dict["fr"],
                )
                add_translation(
                    language="fr",
                    section=section,
                    path=path + "_one",
                    value=gender_fr_one["other"],
                    rowNumber=rowNumber,
                    translations=translations_dict["fr"],
                )
            elif fr_label_one:
                add_translation(
                    language="fr",
                    section=section,
                    path=path + "_one",
                    value=fr_label_one,
                    rowNumber=rowNumber,
                    translations=translations_dict["fr"],
                )

            # Add English translations
            if gender_en:
                add_translation(
                    language="en",
                    section=section,
                    path=path + "_male",
                    value=gender_en["male"],
                    rowNumber=rowNumber,
                    translations=translations_dict["en"],
                )
                add_translation(
                    language="en",
                    section=section,
                    path=path + "_female",
                    value=gender_en["female"],
                    rowNumber=rowNumber,
                    translations=translations_dict["en"],
                )
                add_translation(
                    language="en",
                    section=section,
                    path=path + "_custom",
                    value=gender_en["other"],
                    rowNumber=rowNumber,
                    translations=translations_dict["en"],
                )
                add_translation(
                    language="en",
                    section=section,
                    path=path + "_preferNotToAnswer",
                    value=gender_en["preferNotToAnswer"],
                    rowNumber=rowNumber,
                    translations=translations_dict["en"],
                )
                add_translation(
                    language="en",
                    section=section,
                    path=path,
                    value=gender_en["other"],
                    rowNumber=rowNumber,
                    translations=translations_dict["en"],
                )
            elif en_label is not None:
                add_translation(
                    language="en",
                    section=section,
                    path=path,
                    value=en_label,
                    rowNumber=rowNumber,
                    translations=translations_dict["en"],
                )

            # Add English one person translation for count context if it exists
            if gender_en_one:
                add_translation(
                    language="en",
                    section=section,
                    path=path + "_male_one",
                    value=gender_en_one["male"],
                    rowNumber=rowNumber,
                    translations=translations_dict["en"],
                )
                add_translation(
                    language="en",
                    section=section,
                    path=path + "_female_one",
                    value=gender_en_one["female"],
                    rowNumber=rowNumber,
                    translations=translations_dict["en"],
                )
                add_translation(
                    language="en",
                    section=section,
                    path=path + "_custom_one",
                    value=gender_en_one["other"],
                    rowNumber=rowNumber,
                    translations=translations_dict["en"],
                )
                add_translation(
                    language="en",
                    section=section,
                    path=path + "_preferNotToAnswer_one",
                    value=gender_en_one["preferNotToAnswer"],
                    rowNumber=rowNumber,
                    translations=translations_dict["en"],
                )
                add_translation(
                    language="en",
                    section=section,
                    path=path + "_one",
                    value=gender_en_one["other"],
                    rowNumber=rowNumber,
                    translations=translations_dict["en"],
                )
            elif en_label_one:
                add_translation(
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
                save_translations(
                    language,
                    section,
                    labels_output_folder_path,
                    translations,
                )

    except Exception as e:
        print(f"Exception occurred in add_translations_from_excel: {e}")
        raise e


def expand_gender(label):
    """
    Replace all occurrences of {{gender:...}} or {{gender : ...}} (spaces before or after the colon) with the male, female, other, and preferNotToAnswer forms.
    Example: "Étudian{{gender:t/te/t·e/t·e}}" -> {"male": "Étudiant", "female": "Étudiante", "other": "Étudiant·e", "preferNotToAnswer": "Étudiant·e"}
    If only one part, 'female' is the part, others are ''.
    If only two parts, 'male' is first part, 'female' is second part, others are ''.
    If three parts, 'male' is first part, 'female' is second part, 'other' is third part, 'preferNotToAnswer' is ''.
    If four or more parts, only the first four are used: male, female, other, preferNotToAnswer.

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
    prefer_not_to_answer_label = label
    for match in matches:
        parts = match.split("/")
        if len(parts) >= 4:
            male, female, other, prefer_not_to_answer = parts[0], parts[1], parts[2], parts[3]
        elif len(parts) == 3:
            male, female, other, prefer_not_to_answer = parts[0], parts[1], parts[2], ""
        elif len(parts) == 2:
            male, female, other, prefer_not_to_answer = parts[0], parts[1], "", ""
        elif len(parts) == 1:
            male, female, other, prefer_not_to_answer = "", parts[0], "", ""
        else:
            male, female, other, prefer_not_to_answer = "", "", "", ""
        # Replace all variants of the gender pattern (with or without spaces before and after colon) with the correct gendered string
        # Note: We use re.escape to escape any special characters in the match.
        # This ensures that the pattern is treated as a literal string.
        pattern_exact = r"\{\{gender\s*:\s*" + re.escape(match) + r"\}\}"
        male_label = re.sub(pattern_exact, male, male_label)
        female_label = re.sub(pattern_exact, female, female_label)
        other_label = re.sub(pattern_exact, other, other_label)
        prefer_not_to_answer_label = re.sub(pattern_exact, prefer_not_to_answer, prefer_not_to_answer_label)
    return {"male": male_label, "female": female_label, "other": other_label, "preferNotToAnswer": prefer_not_to_answer_label}


def string_to_yaml(str):
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
        print(f"An error occurred in string_to_yaml: {e}")
        raise e


def merged_section_translations(a, b):
    """
    Recursively merges dict b into dict a and returns the result.
    If a key exists in both, prints a warning with the key and both values.
    The previous value is kept (no overwrite).
    """
    for k, v in b.items():
        if k in a and isinstance(a[k], dict) and isinstance(v, dict):
            merged_section_translations(a[k], v)
        elif k in a:
            print(
                f"WARNING: Duplicate key during merge of generate labels: key='{k}'. First value: {a[k]}, Second value: {v}. Keeping first value."
            )
            # Do NOT overwrite: keep a[k] as is
        else:
            a[k] = v
    return a


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
            add_translations_from_excel(
                excel_file_path=excel_file_path,
                labels_output_folder_path=labels_output_folder_path,
                labels_sheet_name=sheet,
            )
    except Exception as e:
        print(f"An error occurred: {e}")
        raise e
