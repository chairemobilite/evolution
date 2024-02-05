# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes functions that generate the choices.tsx file.
# These functions are intended to be invoked from the generate_survey.py script.
from collections import defaultdict
from generator.helpers.generator_helpers import (
    is_excel_file,
    is_ts_file,
    get_workbook,
    sheet_exists,
    get_headers,
)


# Function to replace single quotes and stringify text
def replaces_quotes_and_stringify(text):
    if text is not None:
        return str(text).replace("'", "\\'")  # Replace single quotes
    return None


# Function to generate choices.tsx
def generate_choices(input_file: str, output_file: str):
    try:
        is_excel_file(input_file)  # Check if the input file is an Excel file
        is_ts_file(output_file)  # Check if the output file is an TypeScript file

        # Read data from Excel and group choices by choiceName
        choices_by_name = defaultdict(list)

        workbook = get_workbook(input_file)  # Get workbook from Excel file

        sheet_exists(workbook, "Choices")  # Check if the sheet exists
        sheet = workbook["Choices"]  # Get Choices sheet

        # Get headers from the first row
        headers = get_headers(
            sheet,
            expected_headers=[
                "choicesName",
                "value",
                "fr",
                "en",
                "spreadChoicesName",
                "conditional",
            ],
            sheet_name="Choices",
        )

        # Iterate through each row in the sheet, starting from the second row
        for row in list(sheet.rows)[1:]:
            # Create a dictionary from the row values and headers
            row_dict = dict(zip(headers, (cell.value for cell in row)))

            # Get values from the row dictionary
            choice_name = row_dict["choicesName"]
            value = row_dict["value"]
            label_fr = replaces_quotes_and_stringify(row_dict["fr"])
            label_en = replaces_quotes_and_stringify(row_dict["en"])
            spread_choices_name = row_dict["spreadChoicesName"]
            conditional = row_dict["conditional"]

            # Create choice object with value and language-specific labels
            choice = {
                "value": value,
                "label": {"fr": label_fr, "en": label_en},
                "spread_choices_name": spread_choices_name,
            }

            # Add the 'conditional' field only if it exists
            if "conditional":
                choice["conditional"] = conditional

            # Group choices by choiceName using defaultdict
            choices_by_name[choice_name].append(choice)

        # TODO: Separate the following code into a separate function
        # Generate TypeScript code
        ts_code: str = ""  # TypeScript code to be written to file
        indentation: str = "    "  # 4-space indentation

        # Add imports
        ts_code = f"import {{ Choices }} from 'evolution-common/lib/services/surveyGenerator/types/inputTypes';\n"
        ts_code += f"import * as conditionals from './conditionals';\n\n"

        for choice_name, choices in choices_by_name.items():
            # Create a TypeScript const statement for each choiceName
            ts_code += f"export const {choice_name}: Choices = [\n"
            for index, choice in enumerate(choices):
                if choice["spread_choices_name"] is not None:
                    # Spread choices from another choiceName when spread_choices_name is not None
                    ts_code += f"{indentation}...{choice['spread_choices_name']}"
                else:
                    ts_code += (
                        f"{indentation}{{\n"
                        f"{indentation}{indentation}value: '{choice['value']}',\n"
                        f"{indentation}{indentation}label: {{\n"
                        f"{indentation}{indentation}{indentation}fr: '{choice['label']['fr']}',\n"
                        f"{indentation}{indentation}{indentation}en: '{choice['label']['en']}'\n"
                        f"{indentation}{indentation}}}{',' if choice['conditional'] else ''}\n"
                    )
                    # Add the 'conditional' field only if it exists
                    if "conditional" in choice and choice["conditional"] is not None:
                        ts_code += f"{indentation}{indentation}conditional: conditionals.{choice['conditional']},\n"

                    ts_code += f"{indentation}}}"
                if index < len(choices) - 1:
                    # Add a comma for each choice except the last one
                    ts_code += ","
                ts_code += "\n"
            ts_code += "];\n\n"

        # Write TypeScript code to a file
        with open(output_file, mode="w", encoding="utf-8", newline="\n") as ts_file:
            ts_file.write(ts_code)

        print(f"Generate {output_file} successfully")

    except Exception as e:
        # Handle any other exceptions that might occur during script execution
        print(f"An error occurred: {e}")
        raise e
