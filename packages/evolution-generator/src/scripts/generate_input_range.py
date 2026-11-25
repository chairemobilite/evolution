# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes functions that generate the inputRange.tsx file and the
# translations of the labels and units it translates with t().
# These functions are intended to be invoked from the generate_survey.py script.
from helpers.generator_helpers import (
    INDENT,
    add_generator_comment,
    generate_output_file,
    is_ts_file,
)
from scripts.labels_generator import LabelsGenerator
from survey_definition.input_range_definition import (
    INPUT_RANGE_DEFAULT_COLOR,
    INPUT_RANGE_LOCALES_NAMESPACE,
    InputRangeDefinition,
)
from survey_definition.survey_definition import SurveyDefinition

# The translated fields of a row, in the order of the generated labels, then the unit.
# Each one's key in the namespace is `<input_range_name>.<field>`, e.g.
# 'confidentInputRange.label_min', named like its column in the InputRange sheet.
INPUT_RANGE_TRANSLATED_FIELDS: tuple[str, ...] = (
    "label_min",
    "label_middle",
    "label_max",
    "unit",
)


def _translation_key(input_range: InputRangeDefinition, field_name: str) -> str:
    """The key of one of the row's labels or its unit in the inputRange namespace, e.g. 'confidentInputRange.unit'."""
    return f"{input_range.input_range_name}.{field_name}"


def _t_call(input_range: InputRangeDefinition, field_name: str) -> str:
    """The TypeScript call translating one of the row's labels or its unit, e.g. t('inputRange:confidentInputRange.unit')."""
    return f"t('{INPUT_RANGE_LOCALES_NAMESPACE}:{_translation_key(input_range, field_name)}')"


def generate_label(
    input_range: InputRangeDefinition, field_name: str, is_last: bool = False
) -> str:
    """Generate one entry of the `labels` array: a function translating the label."""
    insert_comma = "," if not is_last else ""  # Insert comma if not last label
    return f"{INDENT}{INDENT}(t: TFunction) => {_t_call(input_range, field_name)}{insert_comma}\n"


def generate_format_label(input_range: InputRangeDefinition) -> str:
    """Generate the `formatLabel` function: the selected value followed by its translated unit, if any."""
    if not input_range.unit:
        return (
            f"{INDENT}formatLabel: (value) => {{\n"
            f"{INDENT}{INDENT}return value < 0 ? '' : `${{value}}`;\n"
            f"{INDENT}}},\n"
        )
    return (
        f"{INDENT}formatLabel: (value, t) => {{\n"
        f"{INDENT}{INDENT}return value < 0 ? '' : `${{value}} ${{{_t_call(input_range, 'unit')}}}`;\n"
        f"{INDENT}}},\n"
    )


def generate_input_range_ts_code(input_range: InputRangeDefinition) -> str:
    """Generate the exported slider configuration of one InputRange row, its labels and unit translated with t()."""
    input_color = input_range.input_color or INPUT_RANGE_DEFAULT_COLOR
    label_fields = [
        field_name
        for field_name in ("label_min", "label_middle", "label_max")
        if getattr(input_range, field_name)
    ]

    ts_code = f"export const {input_range.input_range_name}: Pick<InputRangeType,'labels' | 'minValue' | 'maxValue' | 'formatLabel' | 'trackClassName'> = {{\n"
    ts_code += f"{INDENT}labels: [\n"
    for index, field_name in enumerate(label_fields):
        ts_code += generate_label(
            input_range, field_name, is_last=index == len(label_fields) - 1
        )
    ts_code += f"{INDENT}],\n"
    ts_code += f"{INDENT}minValue: {input_range.min_value},\n"
    ts_code += f"{INDENT}maxValue: {input_range.max_value},\n"
    ts_code += generate_format_label(input_range)
    ts_code += f"{INDENT}trackClassName: 'input-slider-{input_color}'\n"
    ts_code += "};\n\n"
    return ts_code


def input_range_translations(survey_definition: SurveyDefinition) -> dict[str, dict]:
    """
    The labels and units of the InputRange table, for locales/<language>/inputRange.yaml:
    for each survey language, the YAML values by their dot-separated key in the
    inputRange namespace.

    Schema (per language file):
      <input_range_name>:
        label_min: <label>
        label_middle: <label>  (only when set)
        label_max: <label>
        unit: <unit>  (only when set)

    The labels and units are shown as plain text by the slider, so unlike the widget
    labels, they get no HTML formatting (e.g. **bold**) nor gender context.
    """
    languages = survey_definition.languages
    translations_by_language: dict[str, dict] = {language: {} for language in languages}
    for input_range in survey_definition.input_ranges:
        for field_name in INPUT_RANGE_TRANSLATED_FIELDS:
            translations = getattr(input_range, field_name)
            for language in languages:
                if language in translations:
                    translations_by_language[language][
                        _translation_key(input_range, field_name)
                    ] = LabelsGenerator.string_to_yaml(translations[language])
    return translations_by_language


# Function to generate inputRange.tsx
def generate_input_range(
    survey_definition: SurveyDefinition,
    output_file: str,
):
    """
    Write inputRange.tsx: one exported slider configuration per row of the InputRange
    table, for the InputRange widgets that use it (Widgets sheet's `inputRange` column).
    inputRange.tsx isn't written when the table is empty: no widget imports it then.
    Its labels and units are written in locales/<language>/inputRange.yaml by
    generate_locales.py (see input_range_translations).

    Args:
        survey_definition: Already-validated survey definition, read for its
            InputRange table.
        output_file: TypeScript file to write.
    """
    try:
        is_ts_file(output_file)  # Check if the output file is an TypeScript file

        if survey_definition.input_ranges:
            # Add Generator comment at the start of the file
            ts_code: str = add_generator_comment()

            # Add imports
            ts_code += "import { TFunction } from 'i18next';\n"
            ts_code += "import { type InputRangeType } from 'evolution-common/lib/services/questionnaire/types';\n\n"

            for input_range in survey_definition.input_ranges:
                ts_code += generate_input_range_ts_code(input_range)

            generate_output_file(ts_code, output_file)

    except Exception as e:
        # Handle any other exceptions that might occur during script execution
        print(f"Error with inputRange.tsx: {e}")
        raise e
