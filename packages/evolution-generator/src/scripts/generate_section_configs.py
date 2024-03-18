# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes functions that generate the sectionConfigs.ts file.
# These functions are intended to be invoked from the generate_survey.py script.
from helpers.generator_helpers import (
    INDENT,
    add_generator_comment,
    is_excel_file,
    get_workbook,
    sheet_exists,
    get_headers,
    get_data_from_excel,
    get_values_from_row,
)


# Function to generate sectionConfigs.ts for each section
def generate_section_configs(input_file: str):
    try:
        is_excel_file(input_file)  # Check if the input file is an Excel file
        workbook = get_workbook(input_file)  # Get workbook from Excel file
        sheet_exists(workbook, "Sections")  # Check if the sheet exists
        sheet = workbook["Sections"]  # Get Sections sheet
        previousSection = None  # Initialize previousSection as None
        nextSection = None  # Initialize nextSection as None

        # Read data from Excel and return rows and headers
        rows, headers = get_data_from_excel(input_file, sheet_name="Sections")

        # Test headers
        get_headers(
            sheet,
            expected_headers=[
                "section",
                "title_fr",
                "title_en",
                "in_nav",
                "parent_section",
                "groups",
            ],
            sheet_name="Sections",
        )

        # Generate TypeScript code
        ts_code: str = ""  # TypeScript code to be written to file

        # Add Generator comment at the start of the file
        ts_code += add_generator_comment()

        # Add imports
        ts_code += f"import {{ isSectionComplete }} from 'evolution-generator/lib/helpers/configsHelpers';\n"
        ts_code += f"import {{ SectionConfig, SectionName }} from 'evolution-generator/lib/types/sectionsTypes';\n"
        ts_code += f"import {{ widgetsNames }} from './widgetsNames';\n"
        ts_code += f"import {{ preload }} from './preload';\n\n"

        # Iterate through each row in the sheet, starting from the second row
        for row_number, row in enumerate(rows[1:], start=2):
            # Get values from the row
            (
                section,
                title_fr,
                title_en,
                in_nav,
                parent_section,
                groups,
            ) = get_values_from_row(row, headers)

            # Generate code for section
            def generate_section_code(previousSection, nextSection):
                # TODO: Do this with survey_folder_path
                # Get section output file
                section_output_file = (
                    f"../../../survey/src/survey/sections/{section}/sectionConfigs.ts"
                )

                # Generate currentSectionName
                ts_section_code = (
                    f"export const currentSectionName: SectionName = '{section}';\n"
                )

                # Generate previousSectionName
                if previousSection is not None:
                    ts_section_code += f"const previousSectionName: SectionName = '{previousSection}';\n"
                else:
                    ts_section_code += (
                        "const previousSectionName: SectionName = null;\n"
                    )

                # Generate nextSectionName
                # Check if there is a next row
                if row_number < len(rows) - 1:
                    next_row = rows[row_number]  # Get the next row
                    # Get the next section from the next row
                    nextSection = get_values_from_row(next_row, headers)[0]
                    ts_section_code += (
                        f"const nextSectionName: SectionName = '{nextSection}';\n"
                    )
                else:
                    ts_section_code += "const nextSectionName: SectionName = null;\n"

                # Generate parentSectionName
                if parent_section is not None:
                    ts_section_code += (
                        f"const parentSectionName: SectionName = '{parent_section}';\n"
                    )

                # Generate config for the section
                ts_section_code += f"\n// Config for the section\n"
                ts_section_code += f"export const sectionConfig: SectionConfig = {{\n"
                ts_section_code += f"{INDENT}previousSection: previousSectionName,\n"
                ts_section_code += f"{INDENT}nextSection: nextSectionName,\n"
                if parent_section is not None:
                    ts_section_code += f"{INDENT}parentSection: parentSectionName,\n"
                if in_nav == False:
                    ts_section_code += f"{INDENT}hiddenInNav: true,\n"
                if title_en and title_fr is not None and in_nav == True:
                    ts_section_code += f"{INDENT}title: {{\n"
                    ts_section_code += f"{INDENT}{INDENT}fr: '{title_fr}',\n"
                    ts_section_code += f"{INDENT}{INDENT}en: '{title_en}'\n"
                    ts_section_code += f"{INDENT}}},\n"
                    ts_section_code += f"{INDENT}menuName: {{\n"
                    ts_section_code += f"{INDENT}{INDENT}fr: '{title_fr}',\n"
                    ts_section_code += f"{INDENT}{INDENT}en: '{title_en}'\n"
                    ts_section_code += f"{INDENT}}},\n"
                ts_section_code += f"{INDENT}widgets: widgetsNames,\n"
                ts_section_code += (
                    f"{INDENT}// Do some actions before the section is loaded\n"
                )
                ts_section_code += f"{INDENT}preload: preload,\n"

                ts_section_code += f"{INDENT}// Allow to click on the section menu\n"
                if previousSection is None:
                    ts_section_code += f"{INDENT}enableConditional:true,\n"
                else:
                    ts_section_code += (
                        f"{INDENT}enableConditional: function (interview) {{\n"
                    )
                    ts_section_code += f"{INDENT}{INDENT}return isSectionComplete({{ interview, sectionName: previousSectionName }});\n"
                    ts_section_code += f"{INDENT}}},\n"
                ts_section_code += f"{INDENT}// Allow to click on the section menu\n"
                ts_section_code += (
                    f"{INDENT}completionConditional: function (interview) {{\n"
                )
                ts_section_code += f"{INDENT}{INDENT}return isSectionComplete({{ interview, sectionName: currentSectionName }});\n"
                ts_section_code += f"{INDENT}}}\n"
                ts_section_code += f"}};\n\n"
                ts_section_code += f"export default sectionConfig;\n"

                # Write TypeScript code to a file
                with open(
                    section_output_file,
                    mode="w",
                    encoding="utf-8",
                    newline="\n",
                ) as ts_file:
                    ts_file.write(ts_code + ts_section_code)

                print(f"Generate {section_output_file} successfully")

                previousSection = (
                    section  # Update previousSection with the current section
                )

            # Generate section code
            generate_section_code(previousSection, nextSection)

    except Exception as e:
        # Handle any other exceptions that might occur during script execution
        print(f"Error with sectionConfigs.ts: {e}")
        raise e
