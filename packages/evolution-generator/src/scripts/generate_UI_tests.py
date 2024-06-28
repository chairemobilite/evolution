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


# Function to generate template-tests-UI.ts
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
                "group",
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

        # Iterate through each row in the sheet, starting from the second row
        for row in list(sheet.rows)[1:]:
            # Create a dictionary from the row values and headers
            row_dict = dict(zip(headers, (cell.value for cell in row)))

            # Get values from the row dictionary
            question_name = row_dict["questionName"]
            input_type = row_dict["inputType"]
            active = row_dict["active"]
            section = row_dict["section"]
            group = row_dict["group"]
            path = row_dict["path"]
            conditional = row_dict["conditional"]
            choices = row_dict["choices"]

            # Check if the row is valid
            if question_name is None or input_type is None or path is None:
                raise Exception("Invalid row data in Widgets sheet")

            # Check if we've moved to a new section
            if section != current_section:
                current_section = section  # Update the current section tracker
                ts_code += f"/********** Tests {current_section} section **********/\n\n"

            # Adjust path for widgets in groups using mappings or '?' for unknown groups
            if group:
                # TODO: Get the group mapping from the Group widget path
                group_path_mapping = {
                    "householdMembers": "household.persons.${personId[0]}"
                }
                group_path_prefix = (
                    group_path_mapping.get(group, '?') if group else ""
                )
                path = f"{group_path_prefix}.{path}" if group_path_prefix else path

            # Generate TypeScript code
            ts_code += f"/* Test {input_type.lower()} widget: {question_name} */\n"

            if conditional and active:
                ts_code += f"// Test conditional {conditional}\n"
                ts_code += f"testHelpers.inputVisibleTest({{ context, path: '{path}', isVisible: undefined }});\n"

            if not active:
                ts_code += f"// Widget not active\n\n"
            elif input_type == "Radio":
                # TODO: Add choices values options and not the choices name
                ts_code += f"// Extract value from {choices} choice\n"
                ts_code += f"testHelpers.inputRadioTest({{ context, path: '{path}', value: '?' }});\n\n"
            elif input_type == "Checkbox":
                # TODO: Add choices values options and not the choices name
                ts_code += f"// Extract value(s) from {choices} choice\n"
                ts_code += f"testHelpers.inputCheckboxTest({{ context, path: '{path}', values: ['?'] }});\n\n"
            elif (
                input_type == "String" or input_type == "Text" or input_type == "Number"
            ):
                ts_code += f"testHelpers.inputStringTest({{ context, path: '{path}', value: '?' }});\n\n"
            elif input_type == "Range":
                ts_code += f"testHelpers.inputRangeTest({{ context, path: '{path}', value: 0, sliderColor: '?' }});\n\n"
            elif input_type == "InfoText":
                ts_code += f"testHelpers.waitTextVisible({{ context, text: '?' }});\n\n"
            elif input_type == "NextButton":
                ts_code += f"testHelpers.inputNextButtonTest({{ context, text: '?', nextPageUrl: '?' }});\n\n"
            elif input_type == "Custom":
                ts_code += f"// Implement custom test\n\n"
            else:
                ts_code += f"\n"

        # Write TypeScript code to a file
        with open(output_file, mode="w", encoding="utf-8", newline="\n") as ts_file:
            ts_file.write(ts_code)

        print(f"Generate {output_file} successfully")

    except Exception as e:
        # Handle any other exceptions that might occur during script execution
        print(f"Error with template-tests-UI.ts: {e}")
        raise e
