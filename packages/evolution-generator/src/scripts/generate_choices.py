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
    get_label_context_flags,
    is_excel_file,
    is_ts_file,
    get_workbook,
    sheet_exists,
    get_headers,
)
from scripts.labels_generator import LabelFormatter, LabelsGenerator


def _process_label(text) -> str | None:
    """
    Apply the same label formatting rules as labels generation.
    """
    if text is not None:
        return LabelFormatter.replace(str(text))
    return None


def _generate_choice_label_typescript(
    choice_name: str, value_key: str, choice: dict
) -> str:
    """
    Generate the `label` field for a ChoiceType element.

    If the choice translations don't require any dynamic context, this returns a
    simple `(t) => t('choices:...')`.

    Otherwise, it returns a full TranslatableStringFunction `(t, interview, path) => {...}`
    compatible with evolution-common's I18nData type.
    """
    translation_key = f"choices:{choice_name}.{value_key}"
    has_nickname, has_count, has_gender_context, has_label_one = (
        get_label_context_flags(
            label_fr=(choice.get("label_yaml", {}) or {}).get("fr"),
            label_en=(choice.get("label_yaml", {}) or {}).get("en"),
            label_one_fr=(choice.get("label_one_yaml", {}) or {}).get("fr"),
            label_one_en=(choice.get("label_one_yaml", {}) or {}).get("en"),
        )
    )

    if not (has_nickname or has_count or has_gender_context or has_label_one):
        return f"{INDENT}{INDENT}label: (t) => t('{translation_key}')"

    initial_assignations = ""
    additional_t_context = ""

    if has_nickname or has_gender_context:
        initial_assignations += f"{INDENT}{INDENT}{INDENT}const activePerson = odSurveyHelpers.getPerson({{ interview, path }});\n"

    if has_nickname:
        initial_assignations += f"{INDENT}{INDENT}{INDENT}const nickname = _escape(activePerson?.nickname || t('survey:noNickname'));\n"
        additional_t_context += f"{INDENT}{INDENT}{INDENT}{INDENT}nickname,\n"

    if has_label_one or has_count:
        initial_assignations += f"{INDENT}{INDENT}{INDENT}const countPersons = odSurveyHelpers.countPersons({{ interview }});\n"
        additional_t_context += (
            f"{INDENT}{INDENT}{INDENT}{INDENT}count: countPersons,\n"
        )

    if has_gender_context:
        additional_t_context += f"{INDENT}{INDENT}{INDENT}{INDENT}context: activePerson?.gender || activePerson?.sexAssignedAtBirth,\n"

    return (
        f"{INDENT}{INDENT}label: (t, interview, path) => {{\n"
        f"{initial_assignations}"
        f"{INDENT}{INDENT}{INDENT}return t('{translation_key}', {{\n"
        f"{additional_t_context}"
        f"{INDENT}{INDENT}{INDENT}}});\n"
        f"{INDENT}{INDENT}}}"
    )


def _generate_typescript_code(
    choices_by_name,
    has_conditionals_import: bool,
    has_custom_conditionals_import: bool,
) -> str:
    """
    Generate the full TypeScript source for the `choices.tsx` output file.
    """
    # Determine whether we need extra imports for dynamic label contexts.
    needs_escape_import = False
    needs_od_survey_helpers_import = False
    for _choice_name, choices in choices_by_name.items():
        for choice in choices:
            # Skip spread rows: they don't add translations
            if choice.get("spread_choices_name", None) is not None:
                continue
            has_nickname, has_count, has_gender_context, has_label_one = (
                get_label_context_flags(
                    label_fr=(choice.get("label_yaml", {}) or {}).get("fr"),
                    label_en=(choice.get("label_yaml", {}) or {}).get("en"),
                    label_one_fr=(choice.get("label_one_yaml", {}) or {}).get("fr"),
                    label_one_en=(choice.get("label_one_yaml", {}) or {}).get("en"),
                )
            )
            if has_nickname:
                needs_escape_import = True
            if has_nickname or has_count or has_gender_context or has_label_one:
                needs_od_survey_helpers_import = True

    ts_code: str = ""
    ts_code += add_generator_comment()
    ts_code += _generate_import_statements(
        has_conditionals_import=has_conditionals_import,
        has_custom_conditionals_import=has_custom_conditionals_import,
        needs_escape_import=needs_escape_import,
        needs_od_survey_helpers_import=needs_od_survey_helpers_import,
    )

    for choice_name, choices in choices_by_name.items():
        ts_code += f"export const {choice_name}: ChoiceType[] = [\n"
        for index, choice in enumerate(choices):
            if choice.get("spread_choices_name", None) is not None:
                ts_code += f"{INDENT}...{choice['spread_choices_name']}"
            else:
                value_str = str(choice["value"])
                value_key = value_str.replace("'", "\\'")
                hidden_suffix = (
                    f",\n{INDENT}{INDENT}hidden: true" if choice["hidden"] else ""
                )
                conditional_comma = (
                    "," if choice.get("conditional", None) is not None else ""
                )
                label_ts = _generate_choice_label_typescript(
                    choice_name=choice_name, value_key=value_key, choice=choice
                )
                ts_code += (
                    f"{INDENT}{{\n"
                    f"{INDENT}{INDENT}value: '{value_key}',\n"
                    f"{label_ts}{hidden_suffix}"
                    f"{conditional_comma}\n"
                )
                if choice.get("conditional", None) is not None:
                    ts_code += (
                        f"{INDENT}{INDENT}conditional: {choice['conditional']},\n"
                    )

                ts_code += f"{INDENT}}}"
            if index < len(choices) - 1:
                ts_code += ","
            ts_code += "\n"
        ts_code += "];\n\n"

    return ts_code


def _generate_choices_yaml_locales(choices_by_name, labels_output_folder_path: str):
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

    # Reuse the exact same translation-key generation behavior as labels generation.
    # We build a flat translations dict first (like LabelsGenerator does), then convert to
    # the nested choices.yaml schema expected by the frontend.
    translations_dict = {"fr": {}, "en": {}}

    # Preserve Excel order: choices_by_name is filled by iterating Excel rows top-down.
    rowNumber = 2
    for choice_name, choices in choices_by_name.items():
        for choice in choices:
            # Skip spread rows: their labels come from the spread source
            if choice.get("spread_choices_name", None) is not None:
                continue
            value = choice.get("value", None)
            if value is None:
                continue
            value_key = str(value)
            path = f"{choice_name}.{value_key}"

            # Add translations for the choice with gender and count suffixes
            label_fr = choice.get("label_yaml", {}).get("fr")
            LabelsGenerator.add_gender_or_base_translations(
                language="fr",
                section="choices",
                path=path,
                gender_dict=LabelsGenerator.expand_gender(label_fr),
                label=label_fr,
                extraSuffix="",
                rowNumber=rowNumber,
                translations_dict=translations_dict,
            )
            label_fr_one = choice.get("label_one_yaml", {}).get("fr")
            LabelsGenerator.add_gender_or_base_translations(
                language="fr",
                section="choices",
                path=path,
                gender_dict=LabelsGenerator.expand_gender(label_fr_one),
                label=label_fr_one,
                extraSuffix="_one",
                rowNumber=rowNumber,
                translations_dict=translations_dict,
            )
            label_en = choice.get("label_yaml", {}).get("en")
            LabelsGenerator.add_gender_or_base_translations(
                language="en",
                section="choices",
                path=path,
                gender_dict=LabelsGenerator.expand_gender(label_en),
                label=label_en,
                extraSuffix="",
                rowNumber=rowNumber,
                translations_dict=translations_dict,
            )
            label_en_one = choice.get("label_one_yaml", {}).get("en")
            LabelsGenerator.add_gender_or_base_translations(
                language="en",
                section="choices",
                path=path,
                gender_dict=LabelsGenerator.expand_gender(label_en_one),
                label=label_en_one,
                extraSuffix="_one",
                rowNumber=rowNumber,
                translations_dict=translations_dict,
            )

            rowNumber += 1  # Increment row number

    # Convert translations to nested YAML data
    # Convert flat "choices" translations (choiceName.value[_gender]) to nested YAML data.
    yaml_data_by_lang = {"fr": {}, "en": {}}
    for lang in ["fr", "en"]:
        flat = translations_dict.get(lang, {}).get("choices", {})
        for flat_key, yaml_value in flat.items():
            if "." not in flat_key:
                # Unexpected, but keep it at root to avoid losing data
                yaml_data_by_lang[lang][flat_key] = yaml_value
                continue
            group, value = flat_key.split(".", 1)
            if group not in yaml_data_by_lang[lang]:
                yaml_data_by_lang[lang][group] = {}
            yaml_data_by_lang[lang][group][value] = yaml_value

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
                "label_one::fr",
                "label_one::en",
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
            label_fr_yaml = _process_label(row_dict["label::fr"])
            label_en_yaml = _process_label(row_dict["label::en"])
            label_fr_one_yaml = _process_label(row_dict.get("label_one::fr"))
            label_en_one_yaml = _process_label(row_dict.get("label_one::en"))
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
                "label_one_yaml": {"fr": label_fr_one_yaml, "en": label_en_one_yaml},
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

        # Generate TypeScript code
        ts_code = _generate_typescript_code(
            choices_by_name=choices_by_name,
            has_conditionals_import=has_conditionals_import,
            has_custom_conditionals_import=has_custom_conditionals_import,
        )

        # Write TypeScript code to a file
        with open(output_file, mode="w", encoding="utf-8", newline="\n") as ts_file:
            ts_file.write(ts_code)

        print(f"Generated {output_file} successfully")

        # Generate locales/<lang>/choices.yaml files
        if labels_output_folder_path is not None:
            _generate_choices_yaml_locales(
                choices_by_name,
                labels_output_folder_path=labels_output_folder_path,
            )

    except Exception as e:
        # Handle any other exceptions that might occur during script execution
        print(f"An error occurred: {e}")
        raise e


# Generate import statement if needed
def _generate_import_statements(
    has_conditionals_import,
    has_custom_conditionals_import,
    needs_escape_import: bool = False,
    needs_od_survey_helpers_import: bool = False,
):
    escape_import = (
        "import _escape from 'lodash/escape';\n" if needs_escape_import else ""
    )
    od_survey_helpers_import = (
        "import * as odSurveyHelpers from 'evolution-common/lib/services/odSurvey/helpers';\n"
        if needs_od_survey_helpers_import
        else ""
    )
    conditionals_import = (
        "// " if not has_conditionals_import else ""
    ) + "import * as conditionals from './conditionals';\n"
    custom_conditionals_import = (
        "// " if not has_custom_conditionals_import else ""
    ) + "import * as customConditionals from './customConditionals';\n"
    return (
        f"import {{ type ChoiceType }} from 'evolution-common/lib/services/questionnaire/types';\n"
        f"{escape_import}"
        f"{od_survey_helpers_import}"
        f"{conditionals_import}"
        f"{custom_conditionals_import}\n"
    )
