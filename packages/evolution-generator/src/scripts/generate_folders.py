# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes functions that generate the folders for Generator in the survey.
# These functions are intended to be invoked from the generate_survey.py script.

import os  # For file operations
from survey_definition.survey_definition import SurveyDefinition


# Function to generate the folders for the survey
def generate_folders(
    survey_definition: SurveyDefinition, survey_folder_path: str, enabled_scripts: dict
):
    try:
        enabled_generate_questionnaire_list = enabled_scripts.get(
            "generate_questionnaire_list", False
        )

        # Get the sections names, in source order
        sections_names = [section.section for section in survey_definition.sections]

        def generate_folder(folder_path: str):
            if not os.path.exists(folder_path):
                print(f"Generated {folder_path} folder successfully")
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
        if enabled_generate_questionnaire_list:
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
