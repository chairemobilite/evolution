# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes functions that generate a template for UI tests.
# These functions are intended to be invoked from the generate_survey.py script.
from helpers.generator_helpers import (
    INDENT,
    add_generator_comment,
    is_excel_file,
    is_ts_file,
    get_workbook,
    sheet_exists,
    get_headers,
)


# Function to generate common-UI-tests-helpers-template.ts.ts
def generate_UI_tests(input_file: str, output_file: str):
    try:
        is_excel_file(input_file)  # Check if the input file is an Excel file
        is_ts_file(output_file)  # Check if the output file is an TypeScript file
        workbook = get_workbook(input_file)  # Get workbook from Excel file
        sheet_exists(workbook, "Widgets")  # Check if the sheet exists
        sheet = workbook["Widgets"]  # Get Widgets sheet
        current_section = None

        # Get headers from the first row
        headers = get_headers(
            sheet,
            expected_headers=[
                "questionName",
                "inputType",
                "active",
                "section",
                # "group",
                "path",
                # "fr",
                # "en",
                "conditional",
                # "validation",
            ],
            sheet_name="Widgets",
        )

        # Generate TypeScript codedict
        ts_code: str = ""  # TypeScript code to be written to file

        # Add Generator comment at the start of the file
        ts_code += add_generator_comment()

        # Add imports
        ts_code += f"import {{ test }} from '@playwright/test';\n"
        ts_code += f"import * as testHelpers from 'evolution-frontend/tests/ui-testing/testHelpers';\n"
        ts_code += f"import * as surveyTestHelpers from 'evolution-frontend/tests/ui-testing/surveyTestHelpers';\n"
        ts_code += f"import {{ SurveyObjectDetector }} from 'evolution-frontend/tests/ui-testing/SurveyObjectDetectors';\n\n"

        # Add context
        ts_code += f"const context = {{\n"
        ts_code += f"{INDENT}page: null as any,\n"
        ts_code += f"{INDENT}objectDetector: new SurveyObjectDetector(),\n"
        ts_code += f"{INDENT}title: '',\n"
        ts_code += f"{INDENT}widgetTestCounters: {{}}\n"
        ts_code += f"}};\n\n"

        # Add CommonTestParameters type
        # TODO: Should we add more parameters to the CommonTestParametersModify type (hasTrips) ?
        ts_code += f"// Modify the CommonTestParameters type with survey parameters\n"
        ts_code += f"export type CommonTestParametersModify = testHelpers.CommonTestParameters & {{\n"
        ts_code += f"{INDENT}householdSize: number;\n"
        ts_code += f"}};\n\n"

        # Configure the tests
        ts_code += (
            f"// Configure the tests to run in serial mode (one after the other)\n"
        )
        ts_code += f"test.describe.configure({{ mode: 'serial' }});\n\n"

        # Initialize the test
        ts_code += f"// Initialize the test page and add it to the context\n"
        ts_code += f"test.beforeAll(async ({{ browser }}) => {{\n"
        ts_code += f"{INDENT}context.page = await testHelpers.initializeTestPage(browser, context.objectDetector);\n"
        ts_code += f"}});\n\n"

        # TODO: Only add the good auth method test depending on the survey
        # Start the survey
        ts_code += f"/********** Start the survey **********/\n\n"
        ts_code += f"// Start the survey with email\n"
        ts_code += f"surveyTestHelpers.startAndLoginWithEmail({{\n"
        ts_code += f"{INDENT}context,\n"
        ts_code += f"{INDENT}title: '?',\n"
        ts_code += f"{INDENT}email: `test${{Math.random().toString(36).substring(2, 15)}}@test.com`,\n"
        ts_code += f"{INDENT}nextPageUrl: '?'\n"
        ts_code += f"}});\n"
        ts_code += f"// Start the survey without email\n"
        ts_code += f"surveyTestHelpers.startAndLoginAnonymously({{ context, title: '?', hasUser: false }});\n\n"

        # Iterate through each row in the sheet, starting from the second row
        for row in list(sheet.rows)[1:]:
            # Create a dictionary from the row values and headers
            row_dict = dict(zip(headers, (cell.value for cell in row)))

            # Get values from the row dictionary
            question_name = row_dict["questionName"]
            input_type = row_dict["inputType"]
            active = row_dict["active"]
            section = row_dict["section"]
            group = row_dict.get("group") if row_dict.get("group") else None
            path = row_dict["path"]
            conditional = row_dict["conditional"]
            choices = row_dict["choices"]

            # Check if we've moved to a new section
            if section != current_section:
                # If we are not in the first section, close the previous section tests
                if current_section is not None:
                    # Remove the last newline before closing the section
                    if ts_code.endswith("\n"):
                        ts_code = ts_code[:-1]
                    ts_code += f"}};\n\n"

                current_section = section  # Update the current section tracker
                ts_code += f"/********** Tests {current_section} section **********/\n"

                # Add an export for the section tests
                ts_code += f"export const fill{current_section.capitalize()}SectionTests = ({{ context, householdSize }}: CommonTestParametersModify) => {{\n"

                # Add verifyNavBarButtonStatus at the start of the section
                ts_code += generate_verifyNavBarButtonStatus_test(
                    current_section=current_section, buttonStatus="active"
                )

                # Add a section progress bar test for the section
                ts_code += (
                    f"{INDENT}// Progress bar test for {current_section} section\n"
                )
                ts_code += f"{INDENT}testHelpers.sectionProgressBarTest({{ context, sectionName: '{current_section}', completionPercentage: 0 }});\n\n"

            # Adjust path for widgets in groups using mappings or '?' for unknown groups
            if group:
                # TODO: Get the group mapping from the Group widget path
                group_path_mapping = {
                    "householdMembers": "household.persons.${personId[0]}"
                }
                group_path_prefix = group_path_mapping.get(group, "?") if group else ""
                path = f"{group_path_prefix}.{path}" if group_path_prefix else path

            # Generate TypeScript code

            # Generate widget message
            conditional_message = f""
            conditional_link_message = f""
            choices_message = f""
            choices_link_message = f""
            if conditional:
                # Add link to conditional if conditional exists
                conditional_link_message = f"\n{INDENT}/* @link file://./../src/survey/common/conditionals.tsx */"
                conditional_message = f" with conditional {conditional}"
            if choices:
                # Add link to choices file if choices exist
                choices_link_message = (
                    f"\n{INDENT}/* @link file://./../src/survey/common/choices.tsx */"
                )
                choices_message = f" with choices {choices}"
            ts_code += f"{INDENT}// Test {input_type.lower() if input_type is not None else 'unknown'} widget {question_name}{conditional_message}{choices_message}{conditional_link_message}{choices_link_message}\n"
            # Generate input visible test
            if conditional and active:
                ts_code += f"{INDENT}testHelpers.inputVisibleTest({{ context, path: '{path}', isVisible: true }});\n"
            # Generate input tests
            if not active:
                ts_code += f"{INDENT}// Widget not active\n\n"
            elif input_type == "Radio":
                # TODO: Add choices values options and not the choices name
                ts_code += f"{INDENT}testHelpers.inputRadioTest({{ context, path: '{path}', value: '?' }});\n\n"
            elif input_type == "Checkbox":
                # TODO: Add choices values options and not the choices name
                ts_code += f"{INDENT}testHelpers.inputCheckboxTest({{ context, path: '{path}', values: ['?'] }});\n\n"
            elif (
                input_type == "String" or input_type == "Text" or input_type == "Number"
            ):
                ts_code += f"{INDENT}testHelpers.inputStringTest({{ context, path: '{path}', value: '?' }});\n\n"
            elif input_type == "Range":
                ts_code += f"{INDENT}testHelpers.inputRangeTest({{ context, path: '{path}', value: 0, sliderColor: '?' }});\n\n"
            elif input_type == "InfoText":
                ts_code += f"{INDENT}testHelpers.waitTextVisible({{ context, text: '?' }});\n\n"
            elif input_type == "NextButton":
                ts_code += f"{INDENT}testHelpers.inputNextButtonTest({{ context, text: '?', nextPageUrl: '?' }});\n\n"
                ts_code += generate_verifyNavBarButtonStatus_test(
                    current_section=current_section, buttonStatus="completed"
                )
            elif input_type == "Custom":
                ts_code += f"{INDENT}// Implement custom test\n\n"
            else:
                ts_code += f"\n"

        # Close the last section if any rows were processed
        if current_section is not None:
            # Remove the last newline before closing the section
            if ts_code.endswith("\n"):
                ts_code = ts_code[:-1]
            ts_code += f"}};\n"

        # Write TypeScript code to a file
        with open(output_file, mode="w", encoding="utf-8", newline="\n") as ts_file:
            ts_file.write(ts_code)

        print(f"Generated {output_file} successfully")

    except Exception as e:
        # Handle any other exceptions that might occur during script execution
        print(f"Error with common-UI-tests-helpers-template.ts: {e}")
        raise e


def generate_verifyNavBarButtonStatus_test(
    current_section: str, buttonStatus: str
) -> str:
    # TODO: Verify if the section menu is disabled or not with Sections sheet
    return (
        f"{INDENT}// Verify the {current_section} navigation is {buttonStatus}\n"
        f"{INDENT}testHelpers.verifyNavBarButtonStatus({{ context, buttonText: '{current_section}', buttonStatus: '{buttonStatus}', isDisabled: false }});\n\n"
    )
