# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes functions that generate the conditionals.tsx file.
# These functions are intended to be invoked from the generate_survey.py script.
# We use importation without "/" to avoid problems when using the package.json script.
from collections import defaultdict  # Group data by name
from helpers.generator_helpers import (
    INDENT, # 4-space indentation
    add_generator_comment,  # Add Generator comment at the start of the file
    get_data_from_excel,  # Read data from Excel
    get_values_from_row,  # Get values from the row
    error_when_missing_required_fields,  # Error when any required fields are None
    generate_output_file,  # Generate output file
)


# Extract conditionals and group them by name
def extract_conditionals_from_data(rows, headers) -> defaultdict:
    conditional_by_name = defaultdict(list)  # Group conditionals by name

    try:
        # Iterate through each row in the sheet, starting from the second row
        for row_number, row in enumerate(rows[1:], start=2):
            # Get values from the row
            (
                conditional_name,
                logical_operator,
                path,
                comparison_operator,
                value,
                parentheses,
            ) = get_values_from_row(row, headers)

            # Error when any required fields are None
            error_when_missing_required_fields(
                required_fields_names=[
                    "conditional_name",
                    "path",
                    "comparison_operator",
                    "value",
                ],
                required_fields_values=[
                    conditional_name,
                    path,
                    comparison_operator,
                    value,
                ],
                row_number=row_number,
            )

            # Create conditional object
            conditional = {
                "logical_operator": logical_operator,
                "path": path,
                "comparison_operator": comparison_operator,
                "value": value,
                "parentheses": parentheses,
            }

            # Group conditionals by name using defaultdict
            conditional_by_name[conditional_name].append(conditional)

    except Exception as e:
        print(f"Error extracting conditionals from Excel data: {e}")
        raise e

    return conditional_by_name


# Generate TypeScript code based on conditionals grouped by name
def generate_typescript_code(conditional_by_name: defaultdict) -> str:
    try:
        NEWLINE = "\n"
        ts_code = ""

        # Add Generator comment at the start of the file
        ts_code += add_generator_comment()

        # Add imports
        ts_code += f"import {{ createConditionals }} from 'evolution-generator/lib/helpers/createConditionals';{NEWLINE}"
        ts_code += f"import {{ Conditional }} from 'evolution-generator/lib/types/inputTypes';{NEWLINE}"

        # Create a TypeScript function for each conditional_name
        for conditional_name, conditionals in conditional_by_name.items():
            # Check if any conditional has a path that contains "${relativePath}"
            conditionals_has_path = any(
                "${relativePath}" in conditional["path"] for conditional in conditionals
            )
            declare_relative_path = f"{INDENT}const relativePath = path.substring(0, path.lastIndexOf('.')); // Remove the last key from the path{NEWLINE}"

            ts_code += f"\nexport const {conditional_name}: Conditional = (interview{', path' if conditionals_has_path else ''}) => {{{NEWLINE}"
            ts_code += declare_relative_path if conditionals_has_path else ""
            ts_code += INDENT + "return createConditionals({" + NEWLINE
            ts_code += INDENT + INDENT + "interview," + NEWLINE
            ts_code += INDENT + INDENT + "conditionals: [" + NEWLINE

            # Add conditionals
            for index, conditional in enumerate(conditionals):
                new_value = (
                    int(conditional["value"])
                    if str(conditional["value"]).isdigit()
                    else f"'{conditional['value']}'"
                )
                conditional_has_path = "${relativePath}" in conditional["path"]
                quote = "`" if conditional_has_path else "'"

                ts_code += f"{INDENT}{INDENT}{INDENT}{{{NEWLINE}"
                if conditional["logical_operator"]:
                    ts_code += f"{INDENT}{INDENT}{INDENT}{INDENT}logicalOperator: '{conditional['logical_operator']}',{NEWLINE}"
                ts_code += f"{INDENT}{INDENT}{INDENT}{INDENT}path: {quote}{conditional['path']}{quote},{NEWLINE}"
                ts_code += f"{INDENT}{INDENT}{INDENT}{INDENT}comparisonOperator: '{conditional['comparison_operator']}',{NEWLINE}"
                ts_code += (
                    f"{INDENT}{INDENT}{INDENT}{INDENT}value: {new_value},{NEWLINE}"
                )
                if conditional["parentheses"]:
                    ts_code += f"{INDENT}{INDENT}{INDENT}{INDENT}parentheses: '{conditional['parentheses']}',{NEWLINE}"
                ts_code += f"{INDENT}{INDENT}{INDENT}}}"
                ts_code += "," if index < len(conditionals) - 1 else ""
                ts_code += f"{NEWLINE}"

            ts_code += f"{INDENT}{INDENT}]{NEWLINE}"
            ts_code += f"{INDENT}}});{NEWLINE}"
            ts_code += f"}};{NEWLINE}"

    except Exception as e:
        print(f"Error generating conditionals TypeScript code: {e}")
        raise e

    return ts_code


# Generate conditionals.tsx file based on input Excel file
def generate_conditionals(input_file: str, output_file: str):
    # Read data from Excel and return rows and headers
    rows, headers = get_data_from_excel(input_file, sheet_name="Conditionals")

    # Extract conditionals and group them by name
    conditional_by_name = extract_conditionals_from_data(rows, headers)

    # Generate TypeScript code based on conditionals grouped by name
    ts_code = generate_typescript_code(conditional_by_name)

    # Generate conditionals.tsx file
    generate_output_file(ts_code, output_file)
