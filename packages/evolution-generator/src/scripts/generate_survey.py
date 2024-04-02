# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script generate the survey with multiple scripts.
# These functions are intended to be invoked with the config YAML file.
import argparse  # For command-line arguments
from dotenv import load_dotenv  # For environment variables
import os  # For environment variables
import yaml  # For reading the yaml file
from scripts.generate_excel import generate_excel
from scripts.generate_section_configs import generate_section_configs
from scripts.generate_sections import generate_sections
from scripts.generate_widgets_configs import generate_widgets_configs
from scripts.generate_widgets import generate_widgets
from scripts.generate_conditionals import generate_conditionals
from scripts.generate_choices import generate_choices
from scripts.generate_input_range import generate_input_range
from scripts.generate_libelles import generate_libelles


# TODO: Add some validation for the config file
# Generate the survey from the config file
def generate_survey(config_path):
    # Load environment variables from .env file
    load_dotenv()

    # Load the data from the YAML file
    with open(config_path, "r") as file:
        surveyGenerator = yaml.safe_load(file)

        # Get the data from the YAML file
        survey_folder_path = surveyGenerator["survey_folder_path"]
        excel_file_path = surveyGenerator["excel_file_path"]
        enabled_scripts = surveyGenerator["enabled_scripts"]

    # Call the generate_excel function to generate the Excel file if script enabled
    if enabled_scripts["generate_excel"]:
        generate_excel(
            os.getenv("SHAREPOINT_URL"),
            os.getenv("EXCEL_FILE_PATH"),
            excel_file_path,
            os.getenv("OFFICE365_USERNAME_EMAIL"),
            os.getenv("OFFICE365_PASSWORD"),
        )

    # Call the generate_section_configs function to generate sectionConfigs.ts if script enabled
    if enabled_scripts["generate_section_configs"]:
        generate_section_configs(excel_file_path)

    # Call the generate_sections function to generate sections.tsx if script enabled
    if enabled_scripts["generate_sections"]:
        sections_output_file_path = os.path.join(
            survey_folder_path, "src", "survey", "sections.ts"
        )
        generate_sections(excel_file_path, sections_output_file_path)

    # Call the generate_widgets_config function to generate widgetsConfigs.tsx if script enabled
    if enabled_scripts["generate_widgets_configs"]:
        widgets_configs_output_file_path = os.path.join(
            survey_folder_path, "src", "survey", "widgetsConfigs.tsx"
        )
        generate_widgets_configs(excel_file_path, widgets_configs_output_file_path)

    # Call the generate_widgets function to generate widgets.tsx for each section if script enabled
    if enabled_scripts["generate_widgets"]:
        widgets_output_folder = os.path.join(
            survey_folder_path, "src", "survey", "sections"
        )
        generate_widgets(excel_file_path, widgets_output_folder)

    # Call the generate_conditionals function to generate conditionals.tsx if script enabled
    if enabled_scripts["generate_conditionals"]:
        conditionals_output_file_path = os.path.join(
            survey_folder_path, "src", "survey", "common", "conditionals.tsx"
        )
        generate_conditionals(excel_file_path, conditionals_output_file_path)

    # Call the generate_choices function to generate choices.tsx if script enabled
    if enabled_scripts["generate_choices"]:
        choices_output_file_path = os.path.join(
            survey_folder_path, "src", "survey", "common", "choices.tsx"
        )
        generate_choices(excel_file_path, choices_output_file_path)

    # Call the generate_input_range function to generate labels.tsx if script enabled
    if enabled_scripts["generate_input_range"]:
        input_range_output_file_path = os.path.join(
            survey_folder_path, "src", "survey", "common", "inputRange.tsx"
        )
        generate_input_range(excel_file_path, input_range_output_file_path)

    # Call the generate_libelles function to generate the libelles locales folder if script enabled
    if enabled_scripts["generate_libelles"]:
        libelles_output_folder_path = os.path.join(survey_folder_path, "locales")
        generate_libelles(
            excel_file_path, libelles_output_folder_path, overwrite=True, section=None
        )


# Call the generate_survey function with the config_path argument
def main():
    # Parse command-line arguments
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--config_path", required=True, help="Path to the Generator config file"
    )
    args = parser.parse_args()
    config_path = args.config_path

    # Call the generate_survey function with the config_path argument
    generate_survey(config_path)
