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
import os
import shutil


# Function to generate sectionConfigs.ts for each section
def generate_section_configs(excel_file_path: str, section_config_output_folder: str):
    try:
        is_excel_file(excel_file_path)  # Check if the input file path is an Excel file
        workbook = get_workbook(excel_file_path)  # Get workbook from Excel file
        sheet_exists(workbook, "Sections")  # Check if the sheet exists
        sheet = workbook["Sections"]  # Get Sections sheet
        previousSection = None  # Initialize previousSection as None
        nextSection = None  # Initialize nextSection as None

        # Read data from Excel and return rows and headers
        rows, headers = get_data_from_excel(excel_file_path, sheet_name="Sections")

        # Test headers
        get_headers(
            sheet,
            expected_headers=[
                "section",
                "title_fr",
                "title_en",
                "in_nav",
                "template",
                "parent_section",
            ],
            sheet_name="Sections",
        )

        # Generate TypeScript code
        ts_code: str = ""  # TypeScript code to be written to file

        # Add Generator comment at the start of the file
        ts_code += add_generator_comment()

        # Add imports
        ts_code += f"import {{ isSectionCompleted }} from 'evolution-common/lib/services/questionnaire/sections/navigationHelpers';\n"
        ts_code += f"import {{ SectionConfig }} from 'evolution-common/lib/services/questionnaire/types';\n"
        ts_code += f"import {{ widgetsNames }} from './widgetsNames';\n"

        # Iterate through each row in the sheet, starting from the second row
        for row_number, row in enumerate(rows[1:], start=2):
            # Get values from the row
            row_dict = dict(zip(headers, (cell.value for cell in row)))
            section = row_dict.get("section")
            title_fr = row_dict.get("title_fr")
            title_en = row_dict.get("title_en")
            in_nav = row_dict.get("in_nav")
            template = row_dict.get("template")
            parent_section = row_dict.get("parent_section")
            section_has_preload = row_dict.get("has_preload")
            has_preload = section_has_preload is None or section_has_preload == True

            # Generate code for section
            def generate_section_code(previousSection, nextSection):
                ts_section_code = ""  # TypeScript code for the section
                # Add the custom preload import if the section has a preload function
                # FIXME Should the generator provide a default preload function? Currently there are none
                if has_preload:
                    ts_section_code += (
                        f"import {{ customPreload }} from './customPreload';\n"
                    )

                section_output_file = (
                    f"{section_config_output_folder}/{section}/sectionConfigs.ts"
                )

                # Check if the sections has template
                has_custom_template = template is not None and template == True
                has_builtin_template = isinstance(template, str)

                # Add imports for template if the section has custom template and add it to the templateMapping in the configuration. For builtin templates, it should be already set
                if has_custom_template:
                    ts_section_code += f"import SectionTemplate from './template';\n"
                    ts_section_code += f"import appConfig from 'evolution-frontend/lib/config/application.config';\n\n"
                    ts_section_code += f"appConfig.templateMapping['{section}Section'] = SectionTemplate;\n"

                    # Copy the skeleton template file if the section has a custom template and it does not exist
                    # Define the destination path for the template file
                    destination_template_file = os.path.join(
                        section_config_output_folder, section, "template.tsx"
                    )

                    # Check if the template file exists in the destination folder
                    if not os.path.exists(destination_template_file):
                        # Define the source path for the template file
                        source_template_file = os.path.abspath(
                            os.path.join(
                                os.path.dirname(__file__), "../skeleton/template.tsx"
                            )
                        )
                        if not os.path.exists(source_template_file):
                            raise FileNotFoundError(
                                f"Template file not found: {source_template_file}"
                            )
                        # Ensure the destination directory exists
                        os.makedirs(
                            os.path.dirname(destination_template_file), exist_ok=True
                        )
                        # If the template file does not exist, copy it from the source
                        shutil.copyfile(source_template_file, destination_template_file)
                        print(f"Copied template.tsx to {destination_template_file}")

                # Generate currentSectionName
                ts_section_code += (
                    f"\nexport const currentSectionName: string = '{section}';\n"
                )

                # Generate previousSectionName
                if previousSection is not None:
                    ts_section_code += f"const previousSectionName: SectionConfig['previousSection'] = '{previousSection}';\n"
                else:
                    ts_section_code += "const previousSectionName: SectionConfig['previousSection'] = null;\n"

                # Generate nextSectionName
                # Check if there is a next row
                if row_number <= len(rows) - 1:
                    next_row = rows[row_number]  # Get the next row
                    # Get the next section from the next row
                    nextSection = get_values_from_row(next_row, headers)[0]
                    ts_section_code += f"const nextSectionName: SectionConfig['nextSection'] = '{nextSection}';\n"
                else:
                    ts_section_code += (
                        "const nextSectionName: SectionConfig['nextSection'] = null;\n"
                    )

                # FIXME Add an official warning if both in_nav and parent_section are set
                if in_nav and parent_section is not None:
                    print(
                        f"Warning: both in_nav and parent_section are set for section '{section}'. in_nav will have precedence."
                    )

                # Generate config for the section
                ts_section_code += f"\n// Config for the section\n"
                ts_section_code += f"export const sectionConfig: SectionConfig = {{\n"
                ts_section_code += f"{INDENT}previousSection: previousSectionName,\n"
                ts_section_code += f"{INDENT}nextSection: nextSectionName,\n"
                if title_en and title_fr is not None:
                    ts_section_code += f"{INDENT}title: {{\n"
                    ts_section_code += f"{INDENT}{INDENT}fr: '{title_fr}',\n"
                    ts_section_code += f"{INDENT}{INDENT}en: '{title_en}'\n"
                    ts_section_code += f"{INDENT}}},\n"
                # Generate the navigation menu item, either in nav with title or hidden with parent
                if title_en and title_fr is not None and in_nav == True:
                    ts_section_code += f"{INDENT}navMenu: {{\n"
                    ts_section_code += f"{INDENT}{INDENT}type: 'inNav',\n"
                    ts_section_code += f"{INDENT}{INDENT}menuName: {{\n"
                    ts_section_code += f"{INDENT}{INDENT}{INDENT}fr: '{title_fr}',\n"
                    ts_section_code += f"{INDENT}{INDENT}{INDENT}en: '{title_en}'\n"
                    ts_section_code += f"{INDENT}{INDENT}}}\n"
                    ts_section_code += f"{INDENT}}},\n"
                elif parent_section is not None:
                    ts_section_code += f"{INDENT}navMenu: {{\n"
                    ts_section_code += f"{INDENT}{INDENT}type: 'hidden',\n"
                    ts_section_code += (
                        f"{INDENT}{INDENT}parentSection: '{parent_section}'\n"
                    )
                    ts_section_code += f"{INDENT}}},\n"
                if has_custom_template:
                    ts_section_code += f"{INDENT}// The template to fill is in the 'template.tsx' file of this section\n"
                    ts_section_code += f"{INDENT}template: '{section}Section',\n"
                elif has_builtin_template:
                    ts_section_code += f"{INDENT}template: '{template}',\n"
                ts_section_code += f"{INDENT}widgets: widgetsNames,\n"
                ts_section_code += (
                    f"{INDENT}// Do some actions before the section is loaded\n"
                )
                if has_preload:
                    ts_section_code += f"{INDENT}preload: customPreload,\n"
                ts_section_code += f"{INDENT}// Allow to click on the section menu\n"
                if previousSection is None:
                    ts_section_code += f"{INDENT}enableConditional:true,\n"
                else:
                    ts_section_code += (
                        f"{INDENT}enableConditional: function (interview) {{\n"
                    )
                    ts_section_code += f"{INDENT}{INDENT}return isSectionCompleted({{ interview, sectionName: previousSectionName }});\n"
                    ts_section_code += f"{INDENT}}},\n"
                ts_section_code += f"{INDENT}// Allow to click on the section menu\n"
                ts_section_code += (
                    f"{INDENT}completionConditional: function (interview) {{\n"
                )
                ts_section_code += f"{INDENT}{INDENT}return isSectionCompleted({{ interview, sectionName: currentSectionName }});\n"
                ts_section_code += f"{INDENT}}}"
                ts_section_code += f"\n}};\n\n"
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

            # Generate section code
            generate_section_code(previousSection, nextSection)

            # Update previousSection with the current section
            previousSection = section

    except Exception as e:
        # Handle any other exceptions that might occur during script execution
        print(f"Error with sectionConfigs.ts: {e}")
        raise e
