# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script generate the survey with multiple scripts.
# These functions are intended to be invoked with the config YAML file.  They
# can be overridden with the --only argument to only run a subset of the
# scripts, which is useful for development and debugging.
import argparse  # For command-line arguments
from dotenv import load_dotenv  # For environment variables
import os  # For file operations
import yaml  # For reading the yaml file
from scripts.excel_to_csv_generator import ExcelToCsvGenerator
from scripts.generate_excel import generate_excel
from scripts.generate_folders import generate_folders
from scripts.generate_section_configs import generate_section_configs
from scripts.generate_sections import generate_sections
from scripts.generate_widgets_configs import generate_widgets_configs
from scripts.generate_widgets import generate_widgets
from scripts.generate_choices import generate_choices
from scripts.generate_input_range import generate_input_range
from scripts.labels_generator import LabelsGenerator
from scripts.generate_UI_tests import generate_UI_tests
from scripts.generate_questionnaire_list import generate_questionnaire_list
from scripts.generate_questionnaire_dictionary import generate_questionnaire_dictionary
from scripts.conditionals_generator import ConditionalsGenerator

# Supported script aliases for the --only argument, mapping to the actual script
# keys in the config file's enabled_scripts section.
SUPPORTED_SCRIPT_ALIASES = {
    "excel": "generate_excel",
    "copy_excel_to_csv": "copy_excel_to_csv",
    "excel_to_csv": "copy_excel_to_csv",
    "section_configs": "generate_section_configs",
    "sections": "generate_sections",
    "widget_configs": "generate_widgets_configs",
    "widgets_configs": "generate_widgets_configs",
    "widgets": "generate_widgets",
    "conditionals": "generate_conditionals",
    "choices": "generate_choices",
    "input_range": "generate_input_range",
    "labels": "generate_labels",
    "ui_tests": "generate_UI_tests",
    "questionnaire_list": "generate_questionnaire_list",
    "questionnaire_dictionary": "generate_questionnaire_dictionary",
}

# List all the supported script keys that can be enabled/disabled in the config
# file and via the --only argument.
SUPPORTED_SCRIPT_KEYS = [
    "generate_excel",
    "copy_excel_to_csv",
    "generate_section_configs",
    "generate_sections",
    "generate_widgets_configs",
    "generate_widgets",
    "generate_conditionals",
    "generate_choices",
    "generate_input_range",
    "generate_labels",
    "generate_UI_tests",
    "generate_questionnaire_list",
    "generate_questionnaire_dictionary",
]


# Parse the --only argument to get the set of scripts to run, validating the
# input and mapping aliases to actual script keys. The script keys are separated
# by commas.
def _parse_only_scripts(only_scripts):
    if only_scripts is None:
        return None

    normalized_scripts = set()
    for script_name in only_scripts.split(","):
        script_key = script_name.strip()
        if not script_key:
            continue
        if script_key not in SUPPORTED_SCRIPT_ALIASES:
            valid_values = ", ".join(sorted(SUPPORTED_SCRIPT_ALIASES.keys()))
            raise ValueError(
                f"Unknown script '{script_key}' in --only argument. "
                f"Supported values are: {valid_values}"
            )
        normalized_scripts.add(SUPPORTED_SCRIPT_ALIASES[script_key])

    # Validate that some values were set
    if len(normalized_scripts) == 0:
        valid_values = ", ".join(sorted(SUPPORTED_SCRIPT_ALIASES.keys()))
        raise ValueError(
            "--only argument was set with no valid scripts. "
            f"Supported values are: {valid_values}"
        )

    return normalized_scripts


def _override_enabled_scripts(only_scripts):
    return {
        script_key: script_key in only_scripts for script_key in SUPPORTED_SCRIPT_KEYS
    }


# TODO: Add some validation for the config file
# Generate the survey from the config file
def generate_survey(config_path, only_scripts=None):
    # Load environment variables from .env file
    load_dotenv()

    # Load the data from the YAML file
    with open(config_path, "r") as file:
        surveyGenerator = yaml.safe_load(file)

        # Get the data from the YAML file
        survey_folder_path = surveyGenerator["survey_folder_path"]
        excel_file_path = surveyGenerator["excel_file_path"]
        enabled_scripts = surveyGenerator.get("enabled_scripts", {})
        # Override enabled_scripts from config file if --only argument is provided
        if only_scripts is not None:
            enabled_scripts = _override_enabled_scripts(only_scripts)
        enabled_generate_excel = enabled_scripts.get("generate_excel", False)
        enabled_copy_excel_to_csv = enabled_scripts.get("copy_excel_to_csv", False)
        enabled_generate_section_configs = enabled_scripts.get(
            "generate_section_configs", False
        )
        enabled_generate_sections = enabled_scripts.get("generate_sections", False)
        enabled_generate_widgets_configs = enabled_scripts.get(
            "generate_widgets_configs", False
        )
        enabled_generate_widgets = enabled_scripts.get("generate_widgets", False)
        enabled_generate_conditionals = enabled_scripts.get(
            "generate_conditionals", False
        )
        enabled_generate_choices = enabled_scripts.get("generate_choices", False)
        enabled_generate_input_range = enabled_scripts.get(
            "generate_input_range", False
        )
        enabled_generate_labels = enabled_scripts.get("generate_labels", False)
        enabled_generate_UI_tests = enabled_scripts.get("generate_UI_tests", False)
        enabled_generate_questionnaire_list = enabled_scripts.get(
            "generate_questionnaire_list", False
        )
        enabled_generate_questionnaire_dictionary = enabled_scripts.get(
            "generate_questionnaire_dictionary", False
        )

    # Find the labels output folder path
    labels_output_folder_path = os.path.join(survey_folder_path, "locales")

    # Call the generate_excel function to generate the Excel file if script enabled
    if enabled_generate_excel:
        generate_excel(
            os.getenv("SHAREPOINT_URL"),
            os.getenv("EXCEL_FILE_PATH"),
            excel_file_path,
            os.getenv("OFFICE365_USERNAME_EMAIL"),
            os.getenv("OFFICE365_PASSWORD"),
        )

    # Check the integrity of the Excel file to avoid generating the survey with invalid data
    integrity_ok = check_excel_integrity(excel_file_path)
    if not integrity_ok:
        raise Exception(
            f"Excel integrity check failed for {excel_file_path}. Aborting generation."
        )

    # Copy every Excel sheet to CSV if script enabled, so changes are easier to review in git diffs.
    if enabled_copy_excel_to_csv:
        ExcelToCsvGenerator.generate_csv_copy(excel_file_path=excel_file_path)

    # Call the generate_folders function to generate the folders for the survey
    generate_folders(excel_file_path, survey_folder_path, enabled_scripts)

    # Call the generate_section_configs function to generate sectionConfigs.ts if script enabled
    if enabled_generate_section_configs:
        section_config_output_folder = os.path.join(
            survey_folder_path, "src", "survey", "sections"
        )
        generate_section_configs(excel_file_path, section_config_output_folder)

    # Call the generate_sections function to generate sections.tsx if script enabled
    if enabled_generate_sections:
        sections_output_file_path = os.path.join(
            survey_folder_path, "src", "survey", "sections.ts"
        )
        generate_sections(excel_file_path, sections_output_file_path)

    # Call the generate_widgets_config function to generate widgetsConfigs.tsx if script enabled
    if enabled_generate_widgets_configs:
        widgets_configs_output_file_path = os.path.join(
            survey_folder_path, "src", "survey", "widgetsConfigs.tsx"
        )
        generate_widgets_configs(excel_file_path, widgets_configs_output_file_path)

    # Call the generate_widgets function to generate widgets.tsx for each section if script enabled
    if enabled_generate_widgets:
        widgets_output_folder = os.path.join(
            survey_folder_path, "src", "survey", "sections"
        )
        generate_widgets(excel_file_path, widgets_output_folder)

    # Call the generate_conditionals function to generate conditionals.tsx if script enabled
    if enabled_generate_conditionals:
        conditionals_output_file_path = os.path.join(
            survey_folder_path, "src", "survey", "common", "conditionals.tsx"
        )
        ConditionalsGenerator.generate_conditionals(
            excel_file_path, conditionals_output_file_path
        )

    # Call the generate_choices function to generate choices.tsx if script enabled
    if enabled_generate_choices:
        choices_output_file_path = os.path.join(
            survey_folder_path, "src", "survey", "common", "choices.tsx"
        )
        generate_choices(
            excel_file_path,
            choices_output_file_path,
            labels_output_folder_path=labels_output_folder_path,
        )

    # Call the generate_input_range function to generate labels.tsx if script enabled
    if enabled_generate_input_range:
        input_range_output_file_path = os.path.join(
            survey_folder_path, "src", "survey", "common", "inputRange.tsx"
        )
        generate_input_range(excel_file_path, input_range_output_file_path)

    # Call the generate_labels function to generate the labels locales folder if script enabled
    if enabled_generate_labels:
        # TODO: At some point, we should consider only read the Excel sheet one time, to avoid reading it multiple times.
        # TODO: We might consider extracting the sheet names from the Excel file or config file instead of hardcoding them.
        # Generate the labels for the specified sheets
        sheets_with_labels = [
            {
                "sheetName": "Widgets",
                "namespaceHeader": "section",
                "keyHeader": "questionName",
            },
            {"sheetName": "Labels", "namespaceHeader": "namespace", "keyHeader": "key"},
        ]
        LabelsGenerator.generate_labels(
            excel_file_path,
            labels_output_folder_path,
            sheets_with_labels=sheets_with_labels,
        )

    # Call the generate_UI_tests function to generate the common-UI-tests-helpers-template.ts.ts if script enabled
    if enabled_generate_UI_tests:
        UI_tests_output_file_path = os.path.join(
            survey_folder_path, "tests", "common-UI-tests-helpers-template.ts"
        )
        generate_UI_tests(excel_file_path, UI_tests_output_file_path)

    # Call the generate_questionnaire_list function to generate the questionnaire_list_en.txt if script enabled
    if enabled_generate_questionnaire_list:
        questionnaire_list_output_folder = os.path.join(
            survey_folder_path, "references"
        )
        generate_questionnaire_list(
            excel_file_path, questionnaire_list_output_folder, language="en"
        )
        generate_questionnaire_list(
            excel_file_path, questionnaire_list_output_folder, language="fr"
        )

    # Call the generate_questionnaire_dictionary function to generate the questionnaire_dictionary_en.txt if script enabled
    if enabled_generate_questionnaire_dictionary:
        questionnaire_dictionary_output_folder = os.path.join(
            survey_folder_path, "references"
        )
        generate_questionnaire_dictionary(
            excel_file_path, questionnaire_dictionary_output_folder, language="en"
        )
        generate_questionnaire_dictionary(
            excel_file_path, questionnaire_dictionary_output_folder, language="fr"
        )


# Call the generate_survey function with the config_path argument
def main():
    # Parse command-line arguments
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--config_path", required=True, help="Path to the Generator config file"
    )
    parser.add_argument(
        "--only",
        required=False,
        help=(
            "Comma-separated scripts to run and override enabled_scripts from config. "
            "Example: --only section_configs,widget_configs"
        ),
    )
    args = parser.parse_args()
    config_path = args.config_path
    only_scripts = _parse_only_scripts(args.only)

    # Call the generate_survey function with the config_path argument
    generate_survey(config_path, only_scripts=only_scripts)


# Check the integrity of the Excel file to avoid generating the survey with invalid data
def check_excel_integrity(excel_file_path: str) -> bool:
    """Check the integrity of the Excel file. Entry point for scripts and UI."""
    ok, messages = ConditionalsGenerator().check_with_messages(excel_file_path)
    if ok:
        print(f"Excel integrity check passed for {excel_file_path}")
    else:
        print(f"Excel integrity check FAILED for {excel_file_path}")
        for message in messages:
            print(message)
    return ok


def verify_excel_cli_main() -> int:
    """
    Console entry for ``verifyExcel`` (see pyproject ``[tool.poetry.scripts]``).

    Usage: ``verifyExcel <path-to-file.xlsx>``
    """
    import sys

    if len(sys.argv) < 2:
        print("Usage: verifyExcel <path-to-file.xlsx>", file=sys.stderr)
        return 2
    return 0 if check_excel_integrity(sys.argv[1]) else 1
