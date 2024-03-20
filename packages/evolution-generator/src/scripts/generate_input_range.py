# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes functions that generate the inputRange.tsx file.
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


# Function to replace single quotes and stringify text
def replaces_quotes_and_stringify(text):
    if text is not None:
        return str(text).replace("'", "\\'")  # Replace single quotes
    return None


# Function to generate inputRange.tsx
def generate_input_range(input_file: str, output_file: str):
    try:
        is_excel_file(input_file)  # Check if the input file is an Excel file
        is_ts_file(output_file)  # Check if the output file is an TypeScript file
        workbook = get_workbook(input_file)  # Get workbook from Excel file
        sheet_exists(workbook, "InputRange")  # Check if the sheet exists
        sheet = workbook["InputRange"]  # Get InputRange sheet

        # Get headers from the first row
        headers = get_headers(
            sheet,
            expected_headers=[
                "inputRangeName",
                "labelFrMin",
                "labelFrMax",
                "labelEnMin",
                "labelEnMax",
                "minValue",
                "maxValue",
                "unitFr",
                "unitEn",
            ],
            sheet_name="InputRange",
        )

        # Generate TypeScript codedict
        ts_code: str = ""  # TypeScript code to be written to file

        # Add Generator comment at the start of the file
        ts_code += add_generator_comment()

        # Add imports
        ts_code += f"import {{ InputRangeConfig }} from 'evolution-generator/lib/types/inputTypes';\n\n"

        # Iterate through each row in the sheet, starting from the second row
        for row in list(sheet.rows)[1:]:
            # Create a dictionary from the row values and headers
            row_dict = dict(zip(headers, (cell.value for cell in row)))

            # Get values from the row dictionary
            input_range_name = row_dict["inputRangeName"]
            label_fr_min = replaces_quotes_and_stringify(row_dict["labelFrMin"])
            label_fr_max = replaces_quotes_and_stringify(row_dict["labelFrMax"])
            label_en_min = replaces_quotes_and_stringify(row_dict["labelEnMin"])
            label_en_max = replaces_quotes_and_stringify(row_dict["labelEnMax"])
            min_value = str(row_dict["minValue"])
            max_value = str(row_dict["maxValue"])
            unit_fr = replaces_quotes_and_stringify(row_dict["unitFr"])
            unit_en = replaces_quotes_and_stringify(row_dict["unitEn"])

            # Check if the row is valid
            if (
                input_range_name is None
                or label_fr_min is None
                or label_fr_max is None
                or label_en_min is None
                or label_en_max is None
                or min_value is None
                or max_value is None
                or unit_fr is None
                or unit_en is None
            ):
                raise Exception("Invalid row data in InputRange sheet")

            # Generate TypeScript code
            ts_code += f"export const {input_range_name}: InputRangeConfig = {{\n"
            ts_code += f"{INDENT}labels: [\n"
            ts_code += f"{INDENT}{INDENT}{{\n"
            ts_code += f"{INDENT}{INDENT}{INDENT}fr: '{label_fr_min}',\n"
            ts_code += f"{INDENT}{INDENT}{INDENT}en: '{label_en_min}'\n"
            ts_code += f"{INDENT}{INDENT}}},\n"
            ts_code += f"{INDENT}{INDENT}{{\n"
            ts_code += f"{INDENT}{INDENT}{INDENT}fr: '{label_fr_max}',\n"
            ts_code += f"{INDENT}{INDENT}{INDENT}en: '{label_en_max}'\n"
            ts_code += f"{INDENT}{INDENT}}}\n"
            ts_code += f"{INDENT}],\n"
            ts_code += f"{INDENT}minValue: {min_value},\n"
            ts_code += f"{INDENT}maxValue: {max_value},\n"
            ts_code += f"{INDENT}formatLabel: (value, language) => {{\n"
            ts_code += f"{INDENT}{INDENT}return value < 0 ? '' : `${{value}} ${{language === 'fr' ? '{unit_fr}' : language === 'en' ? '{unit_en}' : ''}}`;\n"
            # ts_code += f"{INDENT}{INDENT}return value + ' ' + (language === 'fr' ? '{unit_fr}' : '{unit_en}');\n"
            ts_code += f"{INDENT}}}\n"
            ts_code += "};\n\n"

        # Write TypeScript code to a file
        with open(output_file, mode="w", encoding="utf-8", newline="\n") as ts_file:
            ts_file.write(ts_code)

        print(f"Generate {output_file} successfully")

    except Exception as e:
        # Handle any other exceptions that might occur during script execution
        print(f"Error with inputRange.tsx: {e}")
        raise e
