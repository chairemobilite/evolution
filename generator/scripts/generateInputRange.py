import openpyxl  # Read data from Excel


# Function to replace single quotes and stringify text
def replaces_quotes_and_stringify(text):
    if text is not None:
        return str(text).replace("'", "\\'")  # Replace single quotes
    return None


# Function to generate inputRange.tsx
def generate_input_range(input_file: str, output_file: str):
    try:
        # Load Excel file
        workbook = openpyxl.load_workbook(input_file, data_only=True)
        sheet = workbook["InputRange"]  # Get InputRange sheet

        # Get headers from the first row
        headers = [cell.value for cell in list(sheet.rows)[0]]

        # Generate TypeScript code
        ts_code: str = ""  # TypeScript code to be written to file
        indentation: str = "    "  # 4-space indentation

        # Add imports
        # ts_code += "import { Labels } from '../types/inputTypes';\n\n"

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

            # Generate TypeScript code
            ts_code += "export const " + input_range_name + " = {\n"
            ts_code += indentation + "labels: [\n"
            ts_code += indentation + indentation + "{\n"
            ts_code += (
                indentation
                + indentation
                + indentation
                + "fr: '"
                + label_fr_min
                + "',\n"
            )
            ts_code += (
                indentation + indentation + indentation + "en: '" + label_en_min + "'\n"
            )
            ts_code += indentation + indentation + "},\n"
            ts_code += indentation + indentation + "{\n"
            ts_code += (
                indentation
                + indentation
                + indentation
                + "fr: '"
                + label_fr_max
                + "',\n"
            )
            ts_code += (
                indentation + indentation + indentation + "en: '" + label_en_max + "'\n"
            )
            ts_code += indentation + indentation + "}\n"
            ts_code += indentation + "],\n"
            ts_code += indentation + "minValue: " + min_value + ",\n"
            ts_code += indentation + "maxValue: " + max_value + ",\n"
            ts_code += indentation + "formatLabel: (value, language) => {\n"
            ts_code += (
                indentation
                + indentation
                + "return value + ' ' + (language === 'fr' ? '"
                + unit_fr
                + "' : '"
                + unit_en
                + "');\n"
            )
            ts_code += indentation + "}\n"
            ts_code += "};\n\n"

        # Write TypeScript code to a file
        with open(output_file, mode="w", encoding="utf-8", newline="\n") as ts_file:
            ts_file.write(ts_code)

        print("Generate inputRange.tsx successfully")

    except Exception as e:
        # Handle any other exceptions that might occur during script execution
        print(f"Error with inputRange.tsx: {e}")
