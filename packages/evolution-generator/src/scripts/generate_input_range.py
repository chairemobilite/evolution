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


def _language_key(language: str) -> str:
    """A language as a key of a TypeScript object, quoted when it isn't an identifier (e.g. 'en-CA')."""
    return language if language.isidentifier() else f"'{language}'"


def generate_label(
    label: dict[str, str], languages: tuple[str, ...], is_last: bool = False
) -> str:
    """Generate one entry of the `labels` array: the label in each survey language, e.g. `{ fr, en }`."""
    insert_comma = "," if not is_last else ""  # Insert comma if not last label
    translations = ",\n".join(
        f"{INDENT}{INDENT}{_language_key(language)}: "
        f"'{replaces_quotes_and_stringify(label[language])}'"
        for language in languages
    )
    return f"{INDENT}{{\n{translations}\n{INDENT}}}{insert_comma}\n"


def generate_format_label(
    input_range: InputRangeDefinition, languages: tuple[str, ...]
) -> str:
    """Generate the `formatLabel` function: the selected value followed by its unit in the current language, if any."""
    if not input_range.unit:
        formatted_value = "`${value}`"
    else:
        # e.g. language === 'fr' ? '%' : language === 'en' ? '%' : ''
        unit_by_language = "".join(
            f"language === '{language}' ? "
            f"'{replaces_quotes_and_stringify(input_range.unit[language])}' : "
            for language in languages
        )
        formatted_value = f"`${{value}} ${{{unit_by_language}''}}`"
    return (
        f"{INDENT}formatLabel: (value, language) => {{\n"
        f"{INDENT}{INDENT}return value < 0 ? '' : {formatted_value};\n"
        f"{INDENT}}},\n"
    )


def generate_input_range_ts_code(
    input_range: InputRangeDefinition, languages: tuple[str, ...]
) -> str:
    """Generate the exported slider configuration of one InputRange row, in the survey `languages`."""
    input_color = input_range.input_color or INPUT_RANGE_DEFAULT_COLOR

    ts_code = f"export const {input_range.input_range_name}: Pick<InputRangeType,'labels' | 'minValue' | 'maxValue' | 'formatLabel' | 'trackClassName'> = {{\n"
    ts_code += f"{INDENT}labels: [\n"
    ts_code += generate_label(input_range.label_min, languages)
    if input_range.label_middle:
        ts_code += generate_label(input_range.label_middle, languages)
    ts_code += generate_label(input_range.label_max, languages, True)
    ts_code += f"{INDENT}],\n"
    ts_code += f"{INDENT}minValue: {input_range.min_value},\n"
    ts_code += f"{INDENT}maxValue: {input_range.max_value},\n"
    ts_code += generate_format_label(input_range, languages)
    ts_code += f"{INDENT}trackClassName: 'input-slider-{input_color}'\n"
    ts_code += "};\n\n"
    return ts_code


# Function to generate inputRange.tsx
def generate_input_range(survey_definition: SurveyDefinition, output_file: str):
    """
    Write inputRange.tsx: one exported slider configuration per row of the InputRange
    table, for the InputRange widgets that use it (Widgets sheet's `inputRange` column).
    Nothing is written when the table is empty: no widget imports the file then.

    Args:
        survey_definition: Already-validated survey definition; its input_ranges table
            is generated, with the labels and units in its languages.
        output_file: TypeScript file to write.
    """
    try:
        is_ts_file(output_file)  # Check if the output file is an TypeScript file

        if not survey_definition.input_ranges:
            return

        # Add Generator comment at the start of the file
        ts_code: str = add_generator_comment()

        # Add imports
        ts_code += "import { type InputRangeType } from 'evolution-common/lib/services/questionnaire/types';\n\n"

        for input_range in survey_definition.input_ranges:
            ts_code += generate_input_range_ts_code(
                input_range, survey_definition.languages
            )

        generate_output_file(ts_code, output_file)

    except Exception as e:
        # Handle any other exceptions that might occur during script execution
        print(f"Error with inputRange.tsx: {e}")
        raise e
