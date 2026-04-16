# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes functions that generate the choices.tsx file.
# These functions are intended to be invoked from the generate_survey.py script.
from collections import defaultdict
import os
from helpers.generator_helpers import (
    INDENT,
    add_generator_comment,
    add_generator_yaml_header,
    is_excel_file,
    is_ts_file,
    get_workbook,
    sheet_exists,
    get_headers,
)
from scripts.labels_generator import LabelFormatter, LabelsGenerator


def _process_label_yaml(text) -> str | None:
    """
    Apply the same label formatting rules as labels generation.
    """
    if text is not None:
        return LabelFormatter.replace(str(text))
    return None


def generate_choices_yaml_locales(choices_by_name, labels_output_folder_path: str):
    """
    Generate locales choices YAML files containing the labels for each choice.

    Output:
      <surveyRoot>/locales/en/choices.yaml
      <surveyRoot>/locales/fr/choices.yaml

    Schema (per language file):
      <choicesName>:
        <value>: <label>
    """
    header = add_generator_yaml_header()

    yaml_data_by_lang = {"fr": {}, "en": {}}

    # Preserve Excel order: choices_by_name is filled by iterating Excel rows top-down.
    for choice_name, choices in choices_by_name.items():
        fr_values = {}
        en_values = {}
        for choice in choices:
            # Skip spread rows: their labels come from the spread source
            if choice.get("spread_choices_name", None) is not None:
                continue
            value = choice.get("value", None)
            if value is None:
                continue
            value_key = str(value)
            label_fr = choice.get("label_yaml", {}).get("fr")
            if label_fr not in (None, ""):
                fr_values[value_key] = LabelsGenerator.string_to_yaml(label_fr)
            label_en = choice.get("label_yaml", {}).get("en")
            if label_en not in (None, ""):
                en_values[value_key] = LabelsGenerator.string_to_yaml(label_en)

        # Do not generate empty groups (typically spread-only choice groups)
        if fr_values or en_values:
            if fr_values:
                yaml_data_by_lang["fr"][choice_name] = fr_values
            if en_values:
                yaml_data_by_lang["en"][choice_name] = en_values

    # Delete existing files first to avoid stale keys if some choices are removed
    LabelsGenerator.delete_all_labels_yaml_files(
        labels_output_folder_path=labels_output_folder_path,
        languages=["fr", "en"],
        sections=["choices"],
    )

    # Generate choices.yaml files for each language (only if non-empty).
    for lang in ["fr", "en"]:
        if not yaml_data_by_lang[lang]:
            continue
        lang_dir = os.path.join(labels_output_folder_path, lang)
        os.makedirs(lang_dir, exist_ok=True)
        yaml_path = os.path.join(lang_dir, "choices.yaml")
        with open(yaml_path, mode="w", encoding="utf-8") as yaml_file:
            yaml_file.write(header)
            LabelsGenerator.yaml.dump(yaml_data_by_lang[lang], yaml_file)
        print(f"Generated {yaml_path.replace('\\', '/') } successfully")


# Function to generate choices.tsx
def generate_choices(
    input_file: str, output_file: str, labels_output_folder_path: str | None = None
):
    try:
        is_excel_file(input_file)  # Check if the input file is an Excel file
        is_ts_file(output_file)  # Check if the output file is an TypeScript file

        # Read data from Excel and group choices by choiceName
        choices_by_name = defaultdict(list)

        workbook = get_workbook(input_file)  # Get workbook from Excel file

        sheet_exists(workbook, "Choices")  # Check if the sheet exists
        sheet = workbook["Choices"]  # Get Choices sheet

        # Get headers from the first row
        headers = get_headers(
            sheet,
            expected_headers=[
                "choicesName",
                "value",
                "label::fr",
                "label::en",
                "spreadChoicesName",
                "conditional",
            ],
            sheet_name="Choices",
        )

        # Check if the sheet has custom conditionals import and conditionals import
        has_conditionals_import = False
        has_custom_conditionals_import = False

        # Iterate through each row in the sheet, starting from the second row
        for row in list(sheet.rows)[1:]:
            # Create a dictionary from the row values and headers
            row_dict = dict(zip(headers, (cell.value for cell in row)))

            # Get values from the row dictionary
            choice_name = row_dict["choicesName"]
            value = row_dict["value"]
            label_fr_yaml = _process_label_yaml(row_dict["label::fr"])
            label_en_yaml = _process_label_yaml(row_dict["label::en"])
            spread_choices_name = row_dict["spreadChoicesName"]
            conditional = row_dict["conditional"]
            hidden = row_dict.get("hidden", False)

            # Check if the row is valid
            if choice_name is None or (value is None and spread_choices_name is None):
                raise Exception("Invalid row data in Choices sheet")

            # Create choice object with value and language-specific labels
            choice = {
                "value": value,
                "label_yaml": {"fr": label_fr_yaml, "en": label_en_yaml},
                "spread_choices_name": spread_choices_name,
                "hidden": hidden,
            }

            # Add conditional field to choice object if it exists
            if conditional is not None and conditional.endswith("CustomConditional"):
                # Check to see if the conditional finish with 'CustomConditional'
                has_custom_conditionals_import = True
                choice["conditional"] = f"customConditionals.{conditional}"
            if conditional is not None and not conditional.endswith(
                "CustomConditional"
            ):
                # Check to see if the conditional does not finish with 'CustomConditional'
                has_conditionals_import = True
                choice["conditional"] = f"conditionals.{conditional}"

            # Group choices by choiceName using defaultdict
            choices_by_name[choice_name].append(choice)

        # TODO: Separate the following code into a separate function
        # Generate TypeScript code
        ts_code: str = ""  # TypeScript code to be written to file

        # Add Generator comment at the start of the file
        ts_code += add_generator_comment()

        # Add imports
        ts_code += generate_import_statements(
            has_conditionals_import, has_custom_conditionals_import
        )

        for choice_name, choices in choices_by_name.items():
            # Create a TypeScript const statement for each choiceName
            ts_code += f"export const {choice_name}: ChoiceType[] = [\n"
            for index, choice in enumerate(choices):
                if choice.get("spread_choices_name", None) is not None:
                    # Spread choices from another choiceName when spread_choices_name is not None
                    ts_code += f"{INDENT}...{choice['spread_choices_name']}"
                else:
                    # Use i18n-generated translations from locales/<lang>/choices.yaml
                    value_str = str(choice["value"])
                    value_key = value_str.replace("'", "\\'")
                    translation_key = f"choices:{choice_name}.{value_key}"
                    hidden_suffix = (
                        f",\n{INDENT}{INDENT}hidden: true" if choice["hidden"] else ""
                    )
                    conditional_comma = (
                        "," if choice.get("conditional", None) is not None else ""
                    )
                    ts_code += (
                        f"{INDENT}{{\n"
                        f"{INDENT}{INDENT}value: '{value_key}',\n"
                        f"{INDENT}{INDENT}label: (t) => t('{translation_key}'){hidden_suffix}"
                        f"{conditional_comma}\n"
                    )
                    # Add the 'conditional' field only if it exists
                    if choice.get("conditional", None) is not None:
                        ts_code += (
                            f"{INDENT}{INDENT}conditional: {choice['conditional']},\n"
                        )

                    ts_code += f"{INDENT}}}"
                if index < len(choices) - 1:
                    # Add a comma for each choice except the last one
                    ts_code += ","
                ts_code += "\n"
            ts_code += "];\n\n"

        # Write TypeScript code to a file
        with open(output_file, mode="w", encoding="utf-8", newline="\n") as ts_file:
            ts_file.write(ts_code)

        print(f"Generated {output_file} successfully")

        # Generate locales/<lang>/choices.yaml files
        if labels_output_folder_path is not None:
            generate_choices_yaml_locales(
                choices_by_name,
                labels_output_folder_path=labels_output_folder_path,
            )

    except Exception as e:
        # Handle any other exceptions that might occur during script execution
        print(f"An error occurred: {e}")
        raise e


# Generate import statement if needed
def generate_import_statements(
    has_conditionals_import,
    has_custom_conditionals_import,
):
    conditionals_import = (
        "// " if not has_conditionals_import else ""
    ) + "import * as conditionals from './conditionals';\n"
    custom_conditionals_import = (
        "// " if not has_custom_conditionals_import else ""
    ) + "import * as customConditionals from './customConditionals';\n"
    return (
        f"import {{ type ChoiceType }} from 'evolution-common/lib/services/questionnaire/types';\n"
        f"{conditionals_import}"
        f"{custom_conditionals_import}\n"
    )
