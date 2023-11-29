import openpyxl # Read data from Excel
from collections import defaultdict

# Function to generate customConditionals.tsx
def generate_conditionals(input_file: str, output_file: str):
    try:
        # Read data from Excel and group choices by choiceName
        conditional_by_name = defaultdict(list)

        # Load Excel file
        workbook = openpyxl.load_workbook(input_file)
        sheet = workbook['Conditionals'] # Get Conditionals sheet

        # Get headers from the first row
        headers = [cell.value for cell in list(sheet.rows)[0]]

        # Iterate through each row in the sheet, starting from the second row
        for row in list(sheet.rows)[1:]:
            # Create a dictionary from the row values and headers
            row_dict = dict(zip(headers, (cell.value for cell in row)))

            # Get values from the row dictionary
            conditional_name = row_dict['conditionalName']
            logical_operator = row_dict['logicalOperator']
            path = row_dict['path']
            comparison_operator = row_dict['comparisonOperator']
            value = row_dict['value']
            parentheses = row_dict['parentheses']

            # Skip iteration if any required field is None
            if None in (conditional_name, path, comparison_operator, value):
                continue

            # Create conditional object
            conditional = {
                'logical_operator' : logical_operator,
                'path': path,
                'comparison_operator': comparison_operator,
                'value': value,
                'parentheses': parentheses
            }

            # Group choices by choiceName using defaultdict
            conditional_by_name[conditional_name].append(conditional)

        # Generate TypeScript code
        ts_code : str = "" # TypeScript code to be written to file
        indentation: str  = "    "  # 4-space indentation

        # Add imports
        ts_code = "import { checkConditionals } from './conditionals';\n"
        ts_code += "import { Conditional } from '../types/inputTypes';\n"

        # Create a TypeScript function for each conditional_name
        for conditional_name, conditionals in conditional_by_name.items():
            conditionals_has_path = any('${relativePath}' in conditional['path'] for conditional in conditionals) # Check if any conditional has a relative path
            declare_relative_path = indentation + "const relativePath = path.substring(0, path.lastIndexOf('.')); // Remove the last key from the path\n"

            ts_code += "\nexport const " + conditional_name + ": Conditional = (interview" + (', path' if conditionals_has_path else '') + ") => {\n"
            ts_code += declare_relative_path if conditionals_has_path else ''
            ts_code += indentation + "return checkConditionals({\n"
            ts_code += indentation + indentation + "interview,\n"
            ts_code += indentation + indentation + "conditionals: [\n"
            for index, conditional in enumerate(conditionals):
                # Process the value in integer if it is a number, otherwise keep it as a string
                new_value = int(conditional['value']) if str(conditional['value']).isdigit() else "'" + conditional['value'] + "'"
                conditional_has_path = '${relativePath}' in conditional['path'] # Check if the conditional has a relative path
                quote = "`" if conditional_has_path else "'" # Use backtick if the conditional has a relative path, otherwise use single quote

                ts_code += indentation + indentation + indentation + "{\n"
                if conditional['logical_operator']:
                    ts_code += indentation + indentation + indentation + indentation + "logicalOperator: '" + conditional['logical_operator'] + "',\n"
                ts_code += indentation + indentation + indentation + indentation + "path: " + quote + conditional['path'] + quote + ",\n"
                ts_code += indentation + indentation + indentation + indentation + "comparisonOperator: '" + conditional['comparison_operator'] + "',\n"
                ts_code += indentation + indentation + indentation + indentation + "value: " + str(new_value) + ",\n"
                if conditional['parentheses']:
                    ts_code += indentation + indentation + indentation + indentation + "parentheses: '" + conditional['parentheses'] + "',\n"
                ts_code += indentation + indentation + indentation + "}"
                if index < len(conditionals) - 1:
                    # Add a comma for each choice except the last one
                    ts_code += ","
                ts_code += "\n"
            ts_code += indentation + indentation + "]\n"
            ts_code += indentation + "});\n"
            ts_code += "};\n"

        # Write TypeScript code to a file
        with open(output_file, mode='w', encoding='utf-8', newline='\n') as ts_file:
            ts_file.write(ts_code)

        print('Generate customConditionals.tsx successfully')

    except Exception as e:
        # Handle any other exceptions that might occur during script execution
        print(f"An error occurred: {e}")
