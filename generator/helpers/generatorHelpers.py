# Note: This file includes helper functions for Generator scripts.
import openpyxl  # Read data from Excel


# Read data from Excel and return rows and headers
def get_data_from_excel(input_file: str, sheet_name: str) -> tuple:
    try:
        workbook = openpyxl.load_workbook(input_file, data_only=True)  # Load Excel file
        sheet = workbook[sheet_name]  # Get InputRange sheet
        rows = list(sheet.rows)  # Get all rows in the sheet
        headers = [cell.value for cell in rows[0]]  # Get headers from the first row

        # Error when header has spaces
        if any(" " in header for header in headers):
            raise Exception("Header has spaces")

        # Error when header is None
        if None in headers:
            raise Exception("Header is None")

        return rows, headers

    except Exception as e:
        print(f"Error reading Excel in {sheet_name} sheet: {e}")


# Get values from the row
def get_values_from_row(row, headers) -> tuple:
    try:
        # Create a dictionary from the row values and headers
        row_dict = dict(zip(headers, (cell.value for cell in row)))
        values = []  # List of values from the row

        # Get values from the row dictionary
        for header in headers:
            header = row_dict[header]
            values.append(header)

        return values

    except Exception as e:
        print(f"Error getting values from row: {e}")


# Error when any required fields are None
def error_when_missing_required_fields(required_fields, row_number: int):
    if any(field is None for field in required_fields):
        raise Exception(f"Required field is None in row #{row_number}")


# Generate output file
def generate_output_file(ts_code: str, output_file: str):
    try:
        with open(output_file, mode="w", encoding="utf-8", newline="\n") as ts_file:
            ts_file.write(ts_code)

        print(f"Generated {output_file} successfully")

    except Exception as e:
        print(f"Error generating {output_file}: {e}")


# 4-space indentation
def indent(level: int) -> str:
    return " " * 4 * level
