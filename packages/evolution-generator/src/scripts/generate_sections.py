# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes functions that generate the sections.ts file.
# These functions are intended to be invoked from the generate_survey.py script.

from typing import List
from helpers.generator_helpers import INDENT, add_generator_comment


# Function to generate sections.ts
def generate_sections(output_file: str, sections: List[str]):
    try:
        ts_code: str = ""  # TypeScript code to be written to file

        # Add Generator comment at the start of the file
        ts_code += add_generator_comment()

        # Generate the import statements
        ts_code += "import { SectionsConfigs } from 'evolution-generator/lib/types/sectionsTypes';\n"
        # Loop through each section and generate an import statement
        for section in sections:
            ts_code += f"import {section}Configs from './sections/{section}/sectionConfigs';\n"

        # Generate the export statement
        ts_code += "\n// Export all the sections configs\n"
        ts_code += "const sectionsConfigs: SectionsConfigs = {\n"
        # Loop through each section and generate an export statement
        for section in sections:
            ts_code += f"{INDENT}{section}: {section}Configs,\n"
        ts_code += "};\n"
        ts_code += "export default sectionsConfigs;\n"

        # Write TypeScript code to a file
        with open(output_file, mode="w", encoding="utf-8", newline="\n") as ts_file:
            ts_file.write(ts_code)

        print(f"Generate {output_file} successfully")

    except Exception as e:
        # Handle any other exceptions that might occur during script execution
        print(f"Error with sections.ts: {e}")
        raise e
