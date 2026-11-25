# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script tests the generate_input_range functions.
import pytest  # Testing framework
import ruamel.yaml

from helpers.generator_helpers import INDENT, load_survey_definition
from scripts.generate_input_range import generate_input_range
from scripts.generate_locales import generate_locales
from survey_definition.input_range_definition import INPUT_RANGE_LOCALES_NAMESPACE
from survey_definition.excel_survey_definition_reader import ExcelSurveyDefinitionReader
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


def _generate(tmp_path, rows: list[dict], languages=("fr", "en")) -> str:
    """Generate inputRange.tsx and its locales from `rows`, in the survey `languages`, and return the TypeScript."""
    output_file = tmp_path / "inputRange.tsx"
    survey_definition = SurveyDefinition(languages=languages, input_ranges=rows)
    generate_input_range(survey_definition, str(output_file))
    generate_locales(
        survey_definition, str(tmp_path / "locales"), [INPUT_RANGE_LOCALES_NAMESPACE]
    )
    return output_file.read_text(encoding="utf-8")


def _read_locales(tmp_path, language: str) -> dict:
    """The generated locales/<language>/inputRange.yaml, without its header."""
    yaml_path = tmp_path / "locales" / language / "inputRange.yaml"
    return ruamel.yaml.YAML(typ="safe").load(yaml_path.read_text(encoding="utf-8"))


def test_demo_generator_excel_file_generates(tmp_path):
    output_file = tmp_path / "inputRange.tsx"
    generate_input_range(
        load_survey_definition(ExcelSurveyDefinitionReader(DEMO_EXCEL_FILE)),
        str(output_file),
    )
    # The demo survey has no InputRange rows
    assert not output_file.exists()


def test_bad_output_file_extension_raises(tmp_path):
    output_file = str(tmp_path / "inputRange.txt")
    with pytest.raises(Exception) as e_info:
        generate_input_range(
            SurveyDefinition(languages=("fr", "en"), input_ranges=[_row()]),
            output_file,
        )
    assert (
        str(e_info.value)
        == f"Invalid output file extension for {output_file} : must be an TypeScript .ts or .tsx file"
    )


def test_empty_table_writes_no_file_and_deletes_previous_locales(tmp_path):
    """No widget imports inputRange.tsx then, and no stale labels are left behind."""
    output_file = tmp_path / "inputRange.tsx"
    for language in ("fr", "en"):
        yaml_path = tmp_path / "locales" / language / "inputRange.yaml"
        yaml_path.parent.mkdir(parents=True)
        yaml_path.write_text("oldSlider:\n    unit: '%'\n", encoding="utf-8")

    survey_definition = SurveyDefinition(languages=("fr", "en"))
    generate_input_range(survey_definition, str(output_file))
    generate_locales(
        survey_definition, str(tmp_path / "locales"), [INPUT_RANGE_LOCALES_NAMESPACE]
    )

    assert not output_file.exists()
    assert not (tmp_path / "locales" / "fr" / "inputRange.yaml").exists()
    assert not (tmp_path / "locales" / "en" / "inputRange.yaml").exists()


def test_writes_only_the_typescript(tmp_path):
    """The locales are written by generate_locales."""
    output_file = tmp_path / "inputRange.tsx"
    generate_input_range(
        SurveyDefinition(languages=("fr", "en"), input_ranges=[_row()]),
        str(output_file),
    )
    assert output_file.exists()
    assert not (tmp_path / "locales").exists()


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
    assert "import { TFunction } from 'i18next';\n" in ts_code
    assert (
        "export const confidentInputRange: Pick<InputRangeType,'labels' | 'minValue' | 'maxValue' | 'formatLabel' | 'trackClassName'> = {\n"
        f"{INDENT}labels: [\n"
        f"{INDENT}{INDENT}(t: TFunction) => t('inputRange:confidentInputRange.label_min'),\n"
        f"{INDENT}{INDENT}(t: TFunction) => t('inputRange:confidentInputRange.label_max')\n"
        f"{INDENT}],\n"
        f"{INDENT}minValue: -10,\n"
        f"{INDENT}maxValue: 100,\n"
        f"{INDENT}formatLabel: (value, t) => {{\n"
        f"{INDENT}{INDENT}return value < 0 ? '' : `${{value}} ${{t('inputRange:confidentInputRange.unit')}}`;\n"
        f"{INDENT}}},\n"
        f"{INDENT}trackClassName: 'input-slider-green-yellow-red'\n"
        "};\n"
    ) in ts_code


def test_writes_the_labels_and_units_in_each_language_file(tmp_path):
    _generate(tmp_path, [_row(**{"unit::fr": "%", "unit::en": "pts"})])
    assert _read_locales(tmp_path, "fr") == {
        "confidentInputRange": {
            "label_min": "Pas du tout confiant",
            "label_max": "Très confiant",
            "unit": "%",
        }
    }
    assert _read_locales(tmp_path, "en") == {
        "confidentInputRange": {
            "label_min": "Not at all confident",
            "label_max": "Very confident",
            "unit": "pts",
        }
    }


def test_generates_middle_label_between_min_and_max(tmp_path):
    ts_code = _generate(
        tmp_path,
        [_row(**{"label_middle::fr": "Moyen", "label_middle::en": "Medium"})],
    )
    assert (
        f"{INDENT}{INDENT}(t: TFunction) => t('inputRange:confidentInputRange.label_min'),\n"
        f"{INDENT}{INDENT}(t: TFunction) => t('inputRange:confidentInputRange.label_middle'),\n"
        f"{INDENT}{INDENT}(t: TFunction) => t('inputRange:confidentInputRange.label_max')\n"
    ) in ts_code
    assert _read_locales(tmp_path, "en")["confidentInputRange"]["label_middle"] == (
        "Medium"
    )


def test_blank_units_show_the_value_alone(tmp_path):
    ts_code = _generate(tmp_path, [_row()])
    assert (
        f"{INDENT}formatLabel: (value) => {{\n"
        f"{INDENT}{INDENT}return value < 0 ? '' : `${{value}}`;\n"
    ) in ts_code
    assert "unit" not in _read_locales(tmp_path, "fr")["confidentInputRange"]


def test_blank_input_color_defaults_to_blue(tmp_path):
    ts_code = _generate(tmp_path, [_row()])
    assert "trackClassName: 'input-slider-blue'" in ts_code


def test_labels_are_written_as_plain_text(tmp_path):
    """The slider shows them as text: no HTML formatting, and quotes kept as is."""
    _generate(
        tmp_path,
        [
            _row(
                **{
                    "label_min::fr": "Pas d'accord **du tout**",
                    "unit::fr": "l'unité",
                    "unit::en": "unit",
                }
            )
        ],
    )
    fr_labels = _read_locales(tmp_path, "fr")["confidentInputRange"]
    assert fr_labels["label_min"] == "Pas d'accord **du tout**"
    assert fr_labels["unit"] == "l'unité"


def test_generates_every_row_in_order(tmp_path):
    ts_code = _generate(tmp_path, [_row("firstSlider"), _row("secondSlider")])
    assert ts_code.index("export const firstSlider") < ts_code.index(
        "export const secondSlider"
    )
    assert list(_read_locales(tmp_path, "fr")) == ["firstSlider", "secondSlider"]


def test_writes_one_locales_file_per_survey_language(tmp_path):
    """No survey language is hard-coded in the generated TypeScript."""
    ts_code = _generate(
        tmp_path,
        [
            {
                "input_range_name": "slider",
                "label_min::es": "Nada",
                "label_max::es": "Mucho",
                "label_min::en-CA": "None",
                "label_max::en-CA": "A lot",
                "unit::es": "pts",
                "unit::en-CA": "points",
                "min_value": 0,
                "max_value": 10,
            }
        ],
        languages=("es", "en-CA"),
    )
    assert "'es'" not in ts_code and "en-CA" not in ts_code
    assert _read_locales(tmp_path, "es") == {
        "slider": {"label_min": "Nada", "label_max": "Mucho", "unit": "pts"}
    }
    assert _read_locales(tmp_path, "en-CA") == {
        "slider": {"label_min": "None", "label_max": "A lot", "unit": "points"}
    }
