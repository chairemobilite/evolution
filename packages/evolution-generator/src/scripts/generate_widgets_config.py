# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes functions that generate the widgetsConfig.tsx file.
# These functions are intended to be invoked from the generate_survey.py script.

from typing import List
from helpers.generator_helpers import INDENT, add_generator_comment


# Function to generate widgetsConfig.tsx
def generate_widgets_config(output_file: str, sections: List[str]):
    try:
        ts_code: str = ""  # TypeScript code to be written to file

        # Add Generator comment at the start of the file
        ts_code += add_generator_comment()

        # Generate the import statements
        # Loop through each section and generate an import statement
        for section in sections:
            ts_code += (
                f"import * as {section}Widgets from './sections/{section}/widgets';\n"
            )

        # Generate the widgets
        ts_code += "\n// Define all the widgets\n"
        ts_code += "const widgets: { [key: string]: any } = {};\n"
        ts_code += "\n// Define all the sections widgets\n"
        ts_code += "const sectionsWidgets = [\n"
        # Loop through each section and generate a sectionWidgets array
        for section in sections:
            ts_code += f"{INDENT}{section}Widgets,\n"
        ts_code += "];\n"

        # Generate the loop to add all the widgets to the widgets object
        ts_code += (
            "\n// Loop all sections and add their widgets to the widgets object\n"
        )
        ts_code += "sectionsWidgets.forEach((section) => {\n"
        ts_code += f"{INDENT}for (const widget in section) {{\n"
        ts_code += f"{INDENT}{INDENT}widgets[widget] = section[widget];\n"
        ts_code += f"{INDENT}}}\n"
        ts_code += "});\n"

        # // Loop all sections and add their widgets to the widgets object
        # sectionsWidgets.forEach((section) => {
        #     for (const widget in section) {
        #         widgets[widget] = section[widget];
        #     }
        # });

        # Generate the export statement
        ts_code += "\n// Export all the widgets\n"
        ts_code += "export { widgets };\n"

        # Write TypeScript code to a file
        with open(output_file, mode="w", encoding="utf-8", newline="\n") as ts_file:
            ts_file.write(ts_code)

        print(f"Generate {output_file} successfully")

    except Exception as e:
        # Handle any other exceptions that might occur during script execution
        print(f"Error with widgetsConfig.tsx: {e}")
        raise e
