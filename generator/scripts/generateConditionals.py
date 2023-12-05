# Note: This script includes functions that generate the customConditionals.tsx file.
# These functions are intended to be invoked from the generateSurvey.py script.

from collections import defaultdict  # Group data by name
from helpers.generatorHelpers import get_data_from_excel  # Read data from Excel
from helpers.generatorHelpers import get_values_from_row  # Get values from the row
from helpers.generatorHelpers import (
    error_when_missing_required_fields,
)  # Error when any required fields are None
from helpers.generatorHelpers import generate_output_file  # Generate output file
from helpers.generatorHelpers import indent  # 4-space indentation


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
                required_fields=[conditional_name, path, comparison_operator, value],
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

    return conditional_by_name


# Generate TypeScript code based on conditionals grouped by name
def generate_typescript_code(conditional_by_name: defaultdict) -> str:
    try:
        NEWLINE = "\n"
        ts_code = ""

        # Add imports
        ts_code += f"import {{ checkConditionals }} from './conditionals';{NEWLINE}"
        ts_code += f"import {{ Conditional }} from '../types/inputTypes';{NEWLINE}"

        # Create a TypeScript function for each conditional_name
        for conditional_name, conditionals in conditional_by_name.items():
            # Check if any conditional has a path that contains "${relativePath}"
            conditionals_has_path = any(
                "${relativePath}" in conditional["path"] for conditional in conditionals
            )
            declare_relative_path = f"{indent(1)}const relativePath = path.substring(0, path.lastIndexOf('.')); // Remove the last key from the path{NEWLINE}"

            ts_code += f"\nexport const {conditional_name}: Conditional = (interview{', path' if conditionals_has_path else ''}) => {{{NEWLINE}"
            ts_code += declare_relative_path if conditionals_has_path else ""
            ts_code += indent(1) + "return checkConditionals({" + NEWLINE
            ts_code += indent(2) + "interview," + NEWLINE
            ts_code += indent(2) + "conditionals: [" + NEWLINE

            # Add conditionals
            for index, conditional in enumerate(conditionals):
                new_value = (
                    int(conditional["value"])
                    if str(conditional["value"]).isdigit()
                    else f"'{conditional['value']}'"
                )
                conditional_has_path = "${relativePath}" in conditional["path"]
                quote = "`" if conditional_has_path else "'"

                ts_code += f"{indent(3)}{{{NEWLINE}"
                if conditional["logical_operator"]:
                    ts_code += f"{indent(4)}logicalOperator: '{conditional['logical_operator']}',{NEWLINE}"
                ts_code += (
                    f"{indent(4)}path: {quote}{conditional['path']}{quote},{NEWLINE}"
                )
                ts_code += f"{indent(4)}comparisonOperator: '{conditional['comparison_operator']}',{NEWLINE}"
                ts_code += f"{indent(4)}value: {new_value},{NEWLINE}"
                if conditional["parentheses"]:
                    ts_code += f"{indent(4)}parentheses: '{conditional['parentheses']}',{NEWLINE}"
                ts_code += f"{indent(3)}}}"
                ts_code += "," if index < len(conditionals) - 1 else ""
                ts_code += f"{NEWLINE}"

            ts_code += f"{indent(2)}]{NEWLINE}"
            ts_code += f"{indent(1)}}});{NEWLINE}"
            ts_code += f"}};{NEWLINE}"

    except Exception as e:
        print(f"Error generating conditionals TypeScript code: {e}")

    return ts_code


# Generate customConditionals.tsx file based on input Excel file
def generate_conditionals(input_file: str, output_file: str):
    # Read data from Excel and return rows and headers
    rows, headers = get_data_from_excel(input_file, sheet_name="Conditionals")

    # Extract conditionals and group them by name
    conditional_by_name = extract_conditionals_from_data(rows, headers)

    # Generate TypeScript code based on conditionals grouped by name
    ts_code = generate_typescript_code(conditional_by_name)

    # Generate customConditionals.tsx file
    generate_output_file(ts_code, output_file)
