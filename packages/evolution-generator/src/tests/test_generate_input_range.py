# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script tests the generate_input_range functions.
import pytest  # Testing framework

from helpers.generator_helpers import INDENT, load_survey_definition
from scripts.generate_input_range import generate_input_range
from survey_definition.survey_definition import SurveyDefinition

DEMO_EXCEL_FILE = (
    "../../example/demo_generator/references/Household_Travel_Generate_Survey.xlsx"
)


def _row(input_range_name: str = "confidentInputRange", **extra) -> dict:
    """One valid InputRange row, keyed by its source (Excel) column names."""
    return {
        "input_range_name": input_range_name,
        "label_min::fr": "Pas du tout confiant",
        "label_max::fr": "Très confiant",
        "label_min::en": "Not at all confident",
        "label_max::en": "Very confident",
        "min_value": -10,
        "max_value": 100,
        **extra,
    }


def _generate(tmp_path, rows: list[dict]) -> str:
    """Generate inputRange.tsx from `rows` and return its content."""
    output_file = tmp_path / "inputRange.tsx"
    generate_input_range(SurveyDefinition(input_range=rows), str(output_file))
    return output_file.read_text(encoding="utf-8")


def test_demo_generator_excel_file_generates(tmp_path):
    output_file = tmp_path / "inputRange.tsx"
    generate_input_range(load_survey_definition(DEMO_EXCEL_FILE), str(output_file))
    assert output_file.is_file()


def test_bad_output_file_extension_raises(tmp_path):
    output_file = str(tmp_path / "inputRange.txt")
    with pytest.raises(Exception) as e_info:
        generate_input_range(SurveyDefinition(input_range=[_row()]), output_file)
    assert (
        str(e_info.value)
        == f"Invalid output file extension for {output_file} : must be an TypeScript .ts or .tsx file"
    )


def test_empty_table_only_writes_the_import(tmp_path):
    ts_code = _generate(tmp_path, [])
    assert ts_code.endswith(
        "import { type InputRangeType } from 'evolution-common/lib/services/questionnaire/types';\n\n"
    )
    assert "export const" not in ts_code


def test_generates_min_and_max_labels_with_units_and_color(tmp_path):
    ts_code = _generate(
        tmp_path,
        [
            _row(
                **{
                    "unit::fr": "%",
                    "unit::en": "%",
                    "input_color": "green-yellow-red",
                }
            )
        ],
    )
    assert (
        "export const confidentInputRange: Pick<InputRangeType,'labels' | 'minValue' | 'maxValue' | 'formatLabel' | 'trackClassName'> = {\n"
        f"{INDENT}labels: [\n"
        f"{INDENT}{{\n"
        f"{INDENT}{INDENT}fr: 'Pas du tout confiant',\n"
        f"{INDENT}{INDENT}en: 'Not at all confident'\n"
        f"{INDENT}}},\n"
        f"{INDENT}{{\n"
        f"{INDENT}{INDENT}fr: 'Très confiant',\n"
        f"{INDENT}{INDENT}en: 'Very confident'\n"
        f"{INDENT}}}\n"
        f"{INDENT}],\n"
        f"{INDENT}minValue: -10,\n"
        f"{INDENT}maxValue: 100,\n"
        f"{INDENT}formatLabel: (value, language) => {{\n"
        f"{INDENT}{INDENT}return value < 0 ? '' : `${{value}} ${{language === 'fr' ? '%' : language === 'en' ? '%' : ''}}`;\n"
        f"{INDENT}}},\n"
        f"{INDENT}trackClassName: 'input-slider-green-yellow-red'\n"
        "};\n"
    ) in ts_code


def test_generates_middle_label_between_min_and_max(tmp_path):
    ts_code = _generate(
        tmp_path,
        [_row(**{"label_middle::fr": "Moyen", "label_middle::en": "Medium"})],
    )
    min_index = ts_code.index("fr: 'Pas du tout confiant'")
    middle_index = ts_code.index(
        f"fr: 'Moyen',\n{INDENT}{INDENT}en: 'Medium'\n{INDENT}}},"
    )
    max_index = ts_code.index("fr: 'Très confiant'")
    assert min_index < middle_index < max_index


def test_blank_units_show_the_value_alone(tmp_path):
    ts_code = _generate(tmp_path, [_row()])
    assert "return value < 0 ? '' : `${value}`;" in ts_code


def test_blank_input_color_defaults_to_blue(tmp_path):
    ts_code = _generate(tmp_path, [_row()])
    assert "trackClassName: 'input-slider-blue'" in ts_code


def test_escapes_single_quotes(tmp_path):
    ts_code = _generate(
        tmp_path,
        [
            _row(
                **{
                    "label_min::fr": "Pas d'accord",
                    "unit::fr": "l'unité",
                    "unit::en": "unit",
                }
            )
        ],
    )
    assert "fr: 'Pas d\\'accord'" in ts_code
    assert "'l\\'unité'" in ts_code


def test_generates_every_row_in_order(tmp_path):
    ts_code = _generate(tmp_path, [_row("firstSlider"), _row("secondSlider")])
    assert ts_code.index("export const firstSlider") < ts_code.index(
        "export const secondSlider"
    )
