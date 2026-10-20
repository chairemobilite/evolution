# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes functions that generate the inputRange.tsx file.
# These functions are intended to be invoked from the generate_survey.py script.
from helpers.generator_helpers import (
    INDENT,
    add_generator_comment,
    generate_output_file,
    is_ts_file,
)
from survey_definition.input_range_definition import (
    INPUT_RANGE_DEFAULT_COLOR,
    InputRangeDefinition,
)
from survey_definition.survey_definition import SurveyDefinition


# Function to replace single quotes and stringify text
def replaces_quotes_and_stringify(text: str | None) -> str:
    """Escape single quotes so `text` fits in a single-quoted TypeScript string; None becomes ''."""
    if text is not None:
        return str(text).replace("'", "\\'")  # Replace single quotes
    return ""


def generate_label(label_fr: str, label_en: str, is_last: bool = False) -> str:
    """Generate one `{ fr, en }` entry of the `labels` array."""
    insert_comma = "," if not is_last else ""  # Insert comma if not last label
    return (
        f"{INDENT}{{\n"
        f"{INDENT}{INDENT}fr: '{replaces_quotes_and_stringify(label_fr)}',\n"
        f"{INDENT}{INDENT}en: '{replaces_quotes_and_stringify(label_en)}'\n"
        f"{INDENT}}}{insert_comma}\n"
    )


def generate_format_label(input_range: InputRangeDefinition) -> str:
    """Generate the `formatLabel` function: the selected value followed by its unit, if any."""
    if not input_range.has_unit:
        formatted_value = "`${value}`"
    else:
        unit_fr = replaces_quotes_and_stringify(input_range.unit_fr)
        unit_en = replaces_quotes_and_stringify(input_range.unit_en)
        formatted_value = f"`${{value}} ${{language === 'fr' ? '{unit_fr}' : language === 'en' ? '{unit_en}' : ''}}`"
    return (
        f"{INDENT}formatLabel: (value, language) => {{\n"
        f"{INDENT}{INDENT}return value < 0 ? '' : {formatted_value};\n"
        f"{INDENT}}},\n"
    )


def generate_input_range_ts_code(input_range: InputRangeDefinition) -> str:
    """Generate the exported slider configuration of one InputRange row."""
    input_color = input_range.input_color or INPUT_RANGE_DEFAULT_COLOR

    ts_code = f"export const {input_range.input_range_name}: Pick<InputRangeType,'labels' | 'minValue' | 'maxValue' | 'formatLabel' | 'trackClassName'> = {{\n"
    ts_code += f"{INDENT}labels: [\n"
    ts_code += generate_label(input_range.label_min_fr, input_range.label_min_en)
    if input_range.has_middle_label:
        ts_code += generate_label(
            input_range.label_middle_fr, input_range.label_middle_en
        )
    ts_code += generate_label(input_range.label_max_fr, input_range.label_max_en, True)
    ts_code += f"{INDENT}],\n"
    ts_code += f"{INDENT}minValue: {input_range.min_value},\n"
    ts_code += f"{INDENT}maxValue: {input_range.max_value},\n"
    ts_code += generate_format_label(input_range)
    ts_code += f"{INDENT}trackClassName: 'input-slider-{input_color}'\n"
    ts_code += "};\n\n"
    return ts_code


# Function to generate inputRange.tsx
def generate_input_range(survey_definition: SurveyDefinition, output_file: str):
    """
    Write inputRange.tsx: one exported slider configuration per row of the InputRange
    table, for the InputRange widgets that use it (Widgets sheet's `inputRange` column).

    Args:
        survey_definition: Already-validated survey definition; its input_range table
            is generated.
        output_file: TypeScript file to write.
    """
    try:
        is_ts_file(output_file)  # Check if the output file is an TypeScript file

        # Add Generator comment at the start of the file
        ts_code: str = add_generator_comment()

        # Add imports
        ts_code += "import { type InputRangeType } from 'evolution-common/lib/services/questionnaire/types';\n\n"

        for input_range in survey_definition.input_range:
            ts_code += generate_input_range_ts_code(input_range)

        generate_output_file(ts_code, output_file)

    except Exception as e:
        # Handle any other exceptions that might occur during script execution
        print(f"Error with inputRange.tsx: {e}")
        raise e
