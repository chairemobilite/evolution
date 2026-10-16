# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes functions that generate the sections.ts file.
# These functions are intended to be invoked from the generate_survey.py script.

from helpers.generator_helpers import (
    INDENT,
    add_generator_comment,
)
from survey_definition.survey_definition import SurveyDefinition


# Function to generate sections.ts
def generate_sections(
    survey_definition: SurveyDefinition, sections_output_file_path: str
):
    try:
        # Get the sections names, in source order
        sections_names = [section.section for section in survey_definition.sections]

        ts_code: str = ""  # TypeScript code to be written to file

        # Add Generator comment at the start of the file
        ts_code += add_generator_comment()

        # Generate the import statements
        ts_code += f"import {{ getAndValidateSurveySections, SurveySectionsConfig }} from 'evolution-common/lib/services/questionnaire/types';\n"
        # Loop through each section and generate an import statement
        for section in sections_names:
            ts_code += (
                f"import {section}Configs from './sections/{section}/sectionConfigs';\n"
            )

        # Generate the export statement
        ts_code += "\n// Export all the sections configs\n"
        ts_code += "const sectionsConfigs: SurveySectionsConfig = {\n"
        # Loop through each section and generate an export statement
        for section in sections_names:
            ts_code += f"{INDENT}{section}: {section}Configs,\n"
        ts_code += "};\n"
        ts_code += "export default getAndValidateSurveySections(sectionsConfigs);\n"

        # Write TypeScript code to a file
        with open(
            sections_output_file_path, mode="w", encoding="utf-8", newline="\n"
        ) as ts_file:
            ts_file.write(ts_code)

        print(f"Generated {sections_output_file_path} successfully")

    except Exception as e:
        # Handle any other exceptions that might occur during script execution
        print(f"Error with sections.ts: {e}")
        raise e
