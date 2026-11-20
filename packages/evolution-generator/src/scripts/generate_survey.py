# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script generate the survey with multiple scripts.
# These functions are intended to be invoked with the config YAML file.  They
# can be overridden with the --only argument to only run a subset of the
# scripts, which is useful for development and debugging.
import argparse  # For command-line arguments
import sys
from dotenv import load_dotenv  # For environment variables
import os  # For file operations
from pydantic import ValidationError
from helpers.generator_helpers import load_survey_definition
from survey_definition.csv_survey_definition_reader import CsvSurveyDefinitionReader
from survey_definition.excel_survey_definition_reader import (
    EXCEL_FILE_EXTENSIONS,
    ExcelSurveyDefinitionReader,
)
from survey_definition.survey_definition import SurveyDefinition
from survey_definition.survey_definition_reader import SurveyDefinitionReader
from scripts.excel_to_csv_generator import ExcelToCsvGenerator
from scripts.generator_config import (
    SUPPORTED_SCRIPT_KEYS,
    GeneratorConfigError,
    load_generator_config,
)
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


def generate_survey(config_path, only_scripts=None):
    """
    Generate the survey from the Generator config file.

    Checks the config file (see generator_config.py), then reads and validates the
    survey definition once from its source, the Excel file or the folder of CSV files
    (aborting if it is invalid), and runs every script enabled in the config with the
    definition it needs. With source excel and a csv_folder_path, the CSV copy of the
    Excel file is written too.

    Args:
        config_path: Path to the Generator config YAML file.
        only_scripts: Set of script keys to run instead of the config's
            enabled_scripts (see _parse_only_scripts), or None to use the config.

    Raises GeneratorConfigError when the config file can't be used.
    """
    # Load environment variables from .env file
    load_dotenv()

    config = load_generator_config(
        config_path,
        enabled_scripts_override=(
            _override_enabled_scripts(only_scripts)
            if only_scripts is not None
            else None
        ),
    )
    for line in config.summary_lines():
        print(line)

    survey_folder_path = config.survey_folder_path
    enabled_scripts = config.enabled_scripts
    enabled_generate_excel = enabled_scripts.get("generate_excel", False)
    enabled_generate_section_configs = enabled_scripts.get(
        "generate_section_configs", False
    )
    enabled_generate_sections = enabled_scripts.get("generate_sections", False)
    enabled_generate_widgets_configs = enabled_scripts.get(
        "generate_widgets_configs", False
    )
    enabled_generate_widgets = enabled_scripts.get("generate_widgets", False)
    enabled_generate_conditionals = enabled_scripts.get("generate_conditionals", False)
    enabled_generate_choices = enabled_scripts.get("generate_choices", False)
    enabled_generate_input_range = enabled_scripts.get("generate_input_range", False)
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

    # Download the Excel file if script enabled (only with source excel, see
    # generator_config.py)
    if enabled_generate_excel:
        generate_excel(
            os.getenv("SHAREPOINT_URL"),
            os.getenv("EXCEL_FILE_PATH"),
            config.excel_file_path,
            os.getenv("OFFICE365_USERNAME_EMAIL"),
            os.getenv("OFFICE365_PASSWORD"),
        )

    # Check the integrity of the survey definition to avoid generating the survey with invalid data
    reader, survey_definition = _load_survey_or_raise(config.source_path)

    if config.writes_csv_copy:
        # Copy every Excel sheet to CSV, so changes are easier to review in git diffs.
        ExcelToCsvGenerator.generate_csv_copy(
            reader=reader, output_folder_path=config.csv_folder_path
        )

    # Call the generate_folders function to generate the folders for the survey
    generate_folders(survey_definition, survey_folder_path, enabled_scripts)

    # Call the generate_section_configs function to generate sectionConfigs.ts if script enabled
    if enabled_generate_section_configs:
        section_config_output_folder = os.path.join(
            survey_folder_path, "src", "survey", "sections"
        )
        generate_section_configs(
            survey_definition,
            section_config_output_folder,
            labels_output_folder_path=labels_output_folder_path,
        )

    # Call the generate_sections function to generate sections.tsx if script enabled
    if enabled_generate_sections:
        sections_output_file_path = os.path.join(
            survey_folder_path, "src", "survey", "sections.ts"
        )
        generate_sections(survey_definition, sections_output_file_path)

    # Call the generate_widgets_config function to generate widgetsConfigs.tsx if script enabled
    if enabled_generate_widgets_configs:
        widgets_configs_output_file_path = os.path.join(
            survey_folder_path, "src", "survey", "widgetsConfigs.tsx"
        )
        generate_widgets_configs(survey_definition, widgets_configs_output_file_path)

    # Call the generate_widgets function to generate widgets.tsx for each section if script enabled
    if enabled_generate_widgets:
        widgets_output_folder = os.path.join(
            survey_folder_path, "src", "survey", "sections"
        )
        generate_widgets(survey_definition, widgets_output_folder)

    # Call the generate_conditionals function to generate conditionals.tsx if script enabled
    if enabled_generate_conditionals:
        conditionals_output_file_path = os.path.join(
            survey_folder_path, "src", "survey", "common", "conditionals.tsx"
        )
        ConditionalsGenerator.generate_conditionals(
            survey_definition, conditionals_output_file_path
        )

    # Call the generate_choices function to generate choices.tsx if script enabled
    if enabled_generate_choices:
        choices_output_file_path = os.path.join(
            survey_folder_path, "src", "survey", "common", "choices.tsx"
        )
        generate_choices(
            survey_definition,
            choices_output_file_path,
            labels_output_folder_path=labels_output_folder_path,
        )

    # Call the generate_input_range function to generate inputRange.tsx if script enabled
    if enabled_generate_input_range:
        input_range_output_file_path = os.path.join(
            survey_folder_path, "src", "survey", "common", "inputRange.tsx"
        )
        generate_input_range(survey_definition, input_range_output_file_path)

    # Call the generate_labels function to generate the labels locales folder if script enabled
    if enabled_generate_labels:
        LabelsGenerator.generate_labels(survey_definition, labels_output_folder_path)

    # Call the generate_UI_tests function to generate the common-UI-tests-helpers-template.ts.ts if script enabled
    if enabled_generate_UI_tests:
        UI_tests_output_file_path = os.path.join(
            survey_folder_path, "tests", "common-UI-tests-helpers-template.ts"
        )
        generate_UI_tests(survey_definition, UI_tests_output_file_path)

    # TODO: Write questionnaire_list files for survey_definition.languages
    # instead of en/fr once the script supports any language (see #2179).
    # Call the generate_questionnaire_list function to generate the questionnaire_list_en.txt if script enabled
    if enabled_generate_questionnaire_list:
        questionnaire_list_output_folder = os.path.join(
            survey_folder_path, "references"
        )
        generate_questionnaire_list(
            survey_definition,
            questionnaire_list_output_folder,
            language="en",
        )
        generate_questionnaire_list(
            survey_definition,
            questionnaire_list_output_folder,
            language="fr",
        )

    # TODO: Write questionnaire_dictionary files for survey_definition.languages
    # instead of en/fr once the script supports any language (see #2179).
    # Call the generate_questionnaire_dictionary function to generate the questionnaire_dictionary_en.txt if script enabled
    if enabled_generate_questionnaire_dictionary:
        questionnaire_dictionary_output_folder = os.path.join(
            survey_folder_path, "references"
        )
        generate_questionnaire_dictionary(
            survey_definition,
            questionnaire_dictionary_output_folder,
            language="en",
        )
        generate_questionnaire_dictionary(
            survey_definition,
            questionnaire_dictionary_output_folder,
            language="fr",
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
    try:
        generate_survey(config_path, only_scripts=only_scripts)
    except GeneratorConfigError as error:
        # The message says how to fix it: a traceback would only hide it.
        print(error, file=sys.stderr)
        sys.exit(1)


def create_survey_definition_reader(source_path: str) -> SurveyDefinitionReader:
    """
    Create the reader of the survey definition at `source_path`: a folder of CSV files
    or an Excel file. Raises if it is neither.
    """
    if os.path.isdir(source_path):
        return CsvSurveyDefinitionReader(source_path)
    if source_path.lower().endswith(EXCEL_FILE_EXTENSIONS):
        return ExcelSurveyDefinitionReader(source_path)
    raise Exception(
        f"Survey definition not found: {source_path} must be a folder of CSV files or "
        f"an Excel file ({', '.join(EXCEL_FILE_EXTENSIONS)})"
    )


def _load_survey_with_messages(
    source_path: str,
) -> tuple[SurveyDefinitionReader | None, SurveyDefinition | None, list[str]]:
    """
    Read the Excel file or the folder of CSV files and load its SurveyDefinition (see
    load_survey_definition).

    Returns (reader, survey_definition, []) when valid, or
    (reader, None, messages) with human-readable issues; reader is None when the
    file can't be read.
    """
    reader = None
    try:
        reader = create_survey_definition_reader(source_path)
        return reader, load_survey_definition(reader), []
    except ValidationError as exc:
        # SurveyDefinition reports every table's problems in one error, one problem
        # per line; collect every line of every error.
        messages: list[str] = []
        for error in exc.errors():
            reason = error.get("ctx", {}).get("error")
            messages.extend(
                str(reason).split("\n") if reason is not None else [error["msg"]]
            )
        return reader, None, messages
    except Exception as e:
        return reader, None, [str(e)]


def _warnings(
    reader: SurveyDefinitionReader | None,
    survey_definition: SurveyDefinition | None,
) -> list[str]:
    """The warnings about the source (e.g. the Excel file's sheets) and its survey definition (its rows)."""
    return [
        *(reader.warnings if reader is not None else []),
        *(survey_definition.warnings() if survey_definition is not None else []),
    ]


def check_excel_integrity_with_warnings(
    source_path: str,
) -> tuple[bool, list[str], list[str]]:
    """
    Check the integrity of the survey definition at `source_path`, an Excel file or a
    folder of CSV files (see load_survey_definition). Entry point for scripts and UI
    (see check_excel_integrity_cli.py).

    Returns (ok, errors, warnings): ok is True when errors is empty; warnings list
    the problems that don't stop the generation (see ExcelSurveyDefinitionReader and
    SurveyDefinition.warnings).
    """
    reader, survey_definition, messages = _load_survey_with_messages(source_path)
    warnings = _warnings(reader, survey_definition)
    return survey_definition is not None, messages, warnings


def check_excel_integrity_with_messages(source_path: str) -> tuple[bool, list[str]]:
    """
    Check the integrity of the survey definition, like
    check_excel_integrity_with_warnings without the warnings.

    Returns (True, []) when valid, or (False, messages) with human-readable issues.
    """
    ok, messages, _ = check_excel_integrity_with_warnings(source_path)
    return ok, messages


def _print_integrity_result(
    source_path: str, ok: bool, messages: list[str], warnings: list[str]
) -> None:
    for warning in warnings:
        print(f"Warning: {warning}")
    if ok:
        print(f"Survey definition integrity check passed for {source_path}")
    else:
        print(f"Survey definition integrity check FAILED for {source_path}")
        for message in messages:
            print(message)


# Check the integrity of the survey definition to avoid generating the survey with invalid data
def check_excel_integrity(source_path: str) -> bool:
    """Check the integrity of the Excel file or folder of CSV files. Entry point for scripts and UI."""
    ok, messages, warnings = check_excel_integrity_with_warnings(source_path)
    _print_integrity_result(source_path, ok, messages, warnings)
    return ok


def _load_survey_or_raise(
    source_path: str,
) -> tuple[SurveyDefinitionReader, SurveyDefinition]:
    """
    Read the Excel file or folder of CSV files and load its SurveyDefinition, printing
    the same messages as check_excel_integrity, and raise if invalid.

    For a caller (generate_survey) that needs the reader and SurveyDefinition
    themselves, not just a pass/fail bool, so it can check integrity and keep the
    result in one step instead of reading the source again afterwards.
    """
    reader, survey_definition, messages = _load_survey_with_messages(source_path)
    ok = survey_definition is not None
    warnings = _warnings(reader, survey_definition)
    _print_integrity_result(source_path, ok, messages, warnings)
    if not ok:
        raise Exception(
            f"Survey definition integrity check failed for {source_path}. "
            "Aborting generation."
        )
    return reader, survey_definition


def verify_excel_cli_main() -> int:
    """
    Console entry for ``verifyExcel`` (see pyproject ``[tool.poetry.scripts]``).

    Usage: ``verifyExcel <path-to-file.xlsx or CSV folder>``, or
    ``verifyExcel --config_path <generatorConfigs.yaml>`` to check the survey
    definition source of a Generator config.
    """
    parser = argparse.ArgumentParser(
        prog="verifyExcel",
        description="Check a survey definition: an Excel file or a folder of CSV files.",
    )
    parser.add_argument(
        "source_path",
        nargs="?",
        help="The Excel file or the folder of CSV files to check",
    )
    parser.add_argument(
        "--config_path",
        help="Check the survey definition source of this Generator config file",
    )
    args = parser.parse_args()
    if (args.source_path is None) == (args.config_path is None):
        parser.print_usage(sys.stderr)
        print(
            "verifyExcel: give either the Excel file or CSV folder, or --config_path",
            file=sys.stderr,
        )
        return 2

    source_path = args.source_path
    if args.config_path is not None:
        try:
            config = load_generator_config(args.config_path)
        except GeneratorConfigError as error:
            print(error, file=sys.stderr)
            return 1
        for line in config.summary_lines():
            print(line)
        source_path = config.source_path
    return 0 if check_excel_integrity(source_path) else 1
