# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script tests the generate_input_range functions.
import os  # File system operations
import pytest  # Testing framework
from typing import List, Union, Optional  # Types for Python

from scripts.generate_input_range import generate_input_range
from helpers.generator_helpers import (
    create_mocked_excel_data,
    delete_file_if_exists,
)


# Define constants
MOCKED_EXCEL_FILE = "src/tests/references/test.xlsx"
GOOD_INPUT_FILE = "src/tests/references/test.xlsx"
BAD_INPUT_FILE = "src/tests/references/test.csv"
GOOD_OUPUT_FILE = "src/tests/survey/common/inputRange.tsx"
BAD_OUTPUT_FILE = "src/tests/survey/common/inputRange.txt"
GOOD_SHEET_NAME = "InputRange"
BAD_SHEET_NAME = "InputRangeBad"
GOOD_HEADERS = [
    "inputRangeName",
    "labelFrMin",
    "labelFrMax",
    "labelEnMin",
    "labelEnMax",
    "minValue",
    "maxValue",
    "unitFr",
    "unitEn",
]
BAD_HEADERS = [
    "inputRangeNameBad",
    "labelFrMin",
    "labelFrMax",
    "labelEnMin",
    "labelEnMax",
    "minValue",
    "maxValue",
    "unitFr",
    "unitEn",
]
GOOD_ROWS_DATA = [
    [
        "confidentInputRange",
        "Pas du tout confiant",
        "Très confiant",
        "Not at all confident",
        "Very confident",
        -10,
        100,
        "%",
        "%",
    ]
]
BAD_ROWS_DATA = [["badRowData"]]


@pytest.mark.parametrize(
    "sheet_name, headers, row_data, input_file, output_file, expected_error",
    [
        # Test that the demo_generator example works great
        (
            None,  # No mocked Excel data
            None,  # No mocked Excel data
            None,  # No mocked Excel data
            "../../example/demo_generator/references/Household_Travel_Generate_Survey.xlsx",
            GOOD_OUPUT_FILE,
            None,  # No error expected
        ),
        # Test that the function works great
        (
            GOOD_SHEET_NAME,
            GOOD_HEADERS,
            GOOD_ROWS_DATA,
            GOOD_INPUT_FILE,
            GOOD_OUPUT_FILE,
            None,  # No error expected
        ),
        # Test that the function catch bad input file type
        (
            GOOD_SHEET_NAME,
            GOOD_HEADERS,
            GOOD_ROWS_DATA,
            BAD_INPUT_FILE,
            GOOD_OUPUT_FILE,
            f"Invalid input file extension for {BAD_INPUT_FILE} : must be an Excel .xlsx file",
        ),
        # Test that the function catch bad output file type
        (
            GOOD_SHEET_NAME,
            GOOD_HEADERS,
            GOOD_ROWS_DATA,
            GOOD_INPUT_FILE,
            BAD_OUTPUT_FILE,
            f"Invalid output file extension for {BAD_OUTPUT_FILE} : must be an TypeScript .ts or .tsx file",
        ),
        # Test that the function catch that the sheet does not exist
        (
            BAD_SHEET_NAME,
            GOOD_HEADERS,
            GOOD_ROWS_DATA,
            GOOD_INPUT_FILE,
            GOOD_OUPUT_FILE,
            f"Sheet with name {GOOD_SHEET_NAME} does not exist",
        ),
        # Test that the function catch bad headers
        (
            GOOD_SHEET_NAME,
            BAD_HEADERS,
            GOOD_ROWS_DATA,
            GOOD_INPUT_FILE,
            GOOD_OUPUT_FILE,
            f"Missing expected header in {GOOD_SHEET_NAME} sheet: inputRangeName",
        ),
        # Test that the function catch bad row data
        (
            GOOD_SHEET_NAME,
            GOOD_HEADERS,
            BAD_ROWS_DATA,
            GOOD_INPUT_FILE,
            GOOD_OUPUT_FILE,
            "Invalid row data in InputRange sheet",
        ),
    ],
)
def test_generate_input_range(
    sheet_name: Optional[str],
    headers: Optional[List[str]],
    row_data: Optional[List[List[Union[str, int, float]]]],
    input_file: str,
    output_file: str,
    expected_error: Optional[str],
) -> None:
    # Create mocked Excel data if needed
    if sheet_name is not None and headers is not None and row_data is not None:
        # Create mocked Excel data
        create_mocked_excel_data(sheet_name, headers, row_data)

    # Generate inputRange.tsx
    if expected_error is not None:
        # Check that the function raises an error
        with pytest.raises(Exception) as e_info:
            generate_input_range(input_file, output_file)

        # Check the error message
        assert str(e_info.value) == expected_error
    else:
        generate_input_range(input_file, output_file)

        # Check that the output file is created
        assert os.path.isfile(output_file)

        # Read the content of the generated TypeScript file
        with open(output_file, mode="r", encoding="utf-8") as ts_file:
            ts_code = ts_file.read()

            # Check that the TypeScript code is correct
            assert (
                "import { type InputRangeType } from 'evolution-common/lib/services/questionnaire/types';"
                in ts_code
            )

    # Delete mocked Excel data if it exists
    delete_file_if_exists(MOCKED_EXCEL_FILE)
