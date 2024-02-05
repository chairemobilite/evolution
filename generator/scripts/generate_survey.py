# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script generate the survey with multiple scripts.
# These functions are intended to be invoked with the config YAML file.
import argparse  # For command-line arguments
from dotenv import load_dotenv  # For environment variables
import os  # For environment variables
import yaml  # For reading the yaml file
from .generate_excel import generate_excel
from .generate_widgets import generate_widgets
from .generate_conditionals import generate_conditionals
from .generate_choices import generate_choices
from .generate_input_range import generate_input_range
from .generate_libelles import generate_libelles

# TODO: Add some validation for the config file
# Generate the survey from the config file
def generate_survey(config_path):
    # Load environment variables from .env file
    load_dotenv()

    # Load the data from the YAML file
    with open(config_path, "r") as file:
        surveyGenerator = yaml.safe_load(file)

    # Get the data from the YAML file
    survey = surveyGenerator["survey"]
    excel = surveyGenerator["excel"]
    widgets = surveyGenerator["widgets"]
    conditionals = surveyGenerator["conditionals"]
    choices = surveyGenerator["choices"]
    input_range = surveyGenerator["input_range"]
    libelles = surveyGenerator["libelles"]

    # Call the generate_excel function to generate the Excel file if active script
    if excel["active_script"]:
        generate_excel(
            os.getenv("SHAREPOINT_URL"),
            os.getenv("EXCEL_FILE_PATH"),
            survey["excel_file"],
            os.getenv("OFFICE365_USERNAME_EMAIL"),
            os.getenv("OFFICE365_PASSWORD"),
        )

    # Call the generate_widgets function to generate widgets.tsx for each section
    generate_widgets(survey["excel_file"], widgets["output_info_list"])

    # Call the generate_conditionals function to generate conditionals.tsx
    generate_conditionals(survey["excel_file"], conditionals["output_file"])

    # Call the generate_choices function to generate choices.tsx
    generate_choices(survey["excel_file"], choices["output_file"])

    # Call the generate_input_range function to generate labels.tsx
    generate_input_range(survey["excel_file"], input_range["output_file"])

    # Call the generate_libelles function to generate the libelles locales folder
    generate_libelles(
        survey["excel_file"],
        libelles["output_folder"],
        libelles["overwrite"],
        libelles["section"],
    )


# Call the generate_survey function with the config_path argument
if __name__ == "__main__":
    # Parse command-line arguments
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--config_path", required=True, help="Path to the Generator config file"
    )
    args = parser.parse_args()
    config_path = args.config_path

    # Call the generate_survey function with the config_path argument
    generate_survey(config_path)
