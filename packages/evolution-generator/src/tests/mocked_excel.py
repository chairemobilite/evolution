# Helpers to build mocked Excel workbooks for the generator tests
import openpyxl  # Read data from Excel
from openpyxl import Workbook
from typing import List, Union

MOCKED_EXCEL_FILE = "src/tests/references/test.xlsx"


def _escape_formula_looking_values(workbook: Workbook) -> None:
    """Force string type for cell values that start with "=" (e.g. "===", "!=="), so they
    are stored as text, not formulas, and are read back correctly with data_only=True.
    """
    for sheet in workbook.worksheets:
        for row in sheet.iter_rows(min_row=1, max_row=sheet.max_row):
            for cell in row:
                if isinstance(cell.value, str) and cell.value.startswith("="):
                    cell.data_type = "s"


# Create mocked Excel data for testing
def create_mocked_excel_data(
    sheet_name: str, headers: List[str], rows_data: List[List[Union[str, int, float]]]
) -> Workbook:
    """
    Build an in-memory workbook with one sheet and save it to the test references path.

    Args:
        sheet_name: Name of the single sheet (e.g. "Conditionals", "Choices").
        headers: Column headers for the first row.
        rows_data: One list per data row; each list has one value per column, in header order.

    Returns:
        The openpyxl Workbook (after save). The file is written to MOCKED_EXCEL_FILE.
        Add another sheet to it with add_mocked_excel_sheet.
    """
    workbook: Workbook = openpyxl.Workbook()  # Create a workbook
    sheet = workbook.active  # Get the active sheet
    sheet.title = sheet_name  # Change sheet title

    # Add headers
    sheet.append(headers)

    # Iterate through each row data
    for row_data in rows_data:
        sheet.append(row_data)  # Add row data

    _escape_formula_looking_values(workbook)

    # Create the excel file
    workbook.save(MOCKED_EXCEL_FILE)

    # Return the workbook
    return workbook


def add_mocked_excel_sheet(
    workbook: Workbook,
    sheet_name: str,
    headers: List[str],
    rows_data: List[List[Union[str, int, float]]],
) -> Workbook:
    """
    Add another sheet to a workbook built by create_mocked_excel_data and re-save it
    (e.g. a valid "Sections" sheet alongside "Conditionals", for a check that reads
    more than one sheet).

    Returns: the same Workbook, for chaining.
    """
    sheet = workbook.create_sheet(sheet_name)
    sheet.append(headers)
    for row_data in rows_data:
        sheet.append(row_data)

    _escape_formula_looking_values(workbook)
    workbook.save(MOCKED_EXCEL_FILE)

    return workbook
