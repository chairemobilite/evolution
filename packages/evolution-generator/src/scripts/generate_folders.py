# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes functions that generate the folders for Generator in the survey.
# These functions are intended to be invoked from the generate_survey.py script.

import os  # For file operations
from helpers.generator_helpers import (
    get_data_from_excel,
    get_sections_names,
)


# Function to generate the folders for the survey
def generate_folders(excel_file_path: str, survey_folder_path: str):
    try:
        # Read data from Excel and return rows and headers
        rows, headers = get_data_from_excel(excel_file_path, sheet_name="Sections")

        # Get sections names of Sections sheet
        sections_names = get_sections_names(rows, headers)

        def generate_folder(folder_path: str):
            if not os.path.exists(folder_path):
                print(f"Generate {folder_path} folder successfully")
                os.makedirs(folder_path)

        # Create the common folder
        common_folder_path = os.path.join(survey_folder_path, "src", "survey", "common")
        generate_folder(common_folder_path)

        # Create the tests folder
        tests_folder_path = os.path.join(survey_folder_path, "tests")
        generate_folder(tests_folder_path)

        # Create the locales folder
        # TODO Find the supported locales from the excel file
        generate_folder(os.path.join(survey_folder_path, "locales", "fr"))
        generate_folder(os.path.join(survey_folder_path, "locales", "en"))

        # Create the references folder
        references_folder_path = os.path.join(survey_folder_path, "references")
        generate_folder(references_folder_path)

        for section in sections_names:
            # Create the section folder
            section_folder_path = os.path.join(
                survey_folder_path, "src", "survey", "sections", section
            )
            generate_folder(section_folder_path)

    except Exception as e:
        # Handle any other exceptions that might occur during script execution
        print(f"Error with function generate_folders: {e}")
        raise e
