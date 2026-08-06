# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

import pytest

from scripts.generate_questionnaire_dictionary import (
    parse_int_cell_value,
    process_choices,
    process_range,
)

CHOICES_HEADERS = [
    "choicesName",
    "value",
    "label::fr",
    "label::en",
    "label_one::fr",
    "label_one::en",
    "spreadChoicesName",
    "conditional",
]


class MockCell:
    def __init__(self, value):
        self.value = value


def choices_row(**kwargs):
    header_aliases = {
        "label_en": "label::en",
        "label_fr": "label::fr",
    }
    normalized_kwargs = {
        header_aliases.get(key, key): value for key, value in kwargs.items()
    }
    values = {header: None for header in CHOICES_HEADERS}
    values.update(normalized_kwargs)
    return [MockCell(values[header]) for header in CHOICES_HEADERS]


def choices_data_rows(*rows):
    """process_choices skips the first row, like Excel sheet data."""
    return [[MockCell(header) for header in CHOICES_HEADERS], *rows]


class TestProcessChoices:
    def test_includes_zero_value_in_dictionary(self):
        rows = choices_data_rows(
            choices_row(choicesName="likert5", value=-2, label_en="Strongly disagree"),
            choices_row(choicesName="likert5", value=0, label_en="Neutral"),
            choices_row(choicesName="likert5", value=2, label_en="Strongly agree"),
        )

        choices_map = process_choices(rows, CHOICES_HEADERS, "en", {})

        assert choices_map["likert5"] == [
            "-2 : Strongly disagree",
            "0 : Neutral",
            "2 : Strongly agree",
        ]

    def test_skips_rows_without_value(self):
        rows = choices_data_rows(
            choices_row(choicesName="yesNo", value="yes", label_en="Yes"),
            choices_row(choicesName="yesNo", value=None, label_en="Missing value"),
            choices_row(choicesName="yesNo", value=False, label_en="No"),
        )

        choices_map = process_choices(rows, CHOICES_HEADERS, "en", {})

        assert choices_map["yesNo"] == ["yes : Yes", "False : No"]


INPUT_RANGE_HEADERS = [
    "inputRangeName",
    "labelFrMin",
    "labelFrMiddle",
    "labelFrMax",
    "labelEnMin",
    "labelEnMiddle",
    "labelEnMax",
    "minValue",
    "maxValue",
]


def input_range_row(**kwargs):
    values = {header: None for header in INPUT_RANGE_HEADERS}
    values.update(kwargs)
    return [MockCell(values[header]) for header in INPUT_RANGE_HEADERS]


def input_range_data_rows(*rows):
    return [[MockCell(header) for header in INPUT_RANGE_HEADERS], *rows]


class TestParseIntCellValue:
    @pytest.mark.parametrize(
        "value,expected",
        [
            (None, None),
            ("", None),
            (0, 0),
            (42, 42),
            ("-10", -10),
            (10.0, 10),
            (99.9, 99),
        ],
    )
    def test_parses_numeric_values(self, value, expected):
        assert parse_int_cell_value(value) == expected

    @pytest.mark.parametrize("value", [True, False])
    def test_rejects_boolean_values(self, value):
        with pytest.raises(TypeError, match="boolean"):
            parse_int_cell_value(value)


class TestProcessRange:
    def test_parses_string_min_and_max_values(self):
        rows = input_range_data_rows(
            input_range_row(
                inputRangeName="helpPopupTestRange",
                labelEnMin="Very easy",
                labelEnMiddle="Moderately difficult",
                labelEnMax="Very difficult",
                minValue="-10",
                maxValue="100",
            )
        )

        ranges_map = process_range(rows, INPUT_RANGE_HEADERS, "en")

        assert ranges_map["helpPopupTestRange"] == (
            "0 : Very easy\n50 : Moderately difficult\n100 : Very difficult"
        )

    @pytest.mark.parametrize(
        "min_value,max_value",
        [
            (None, "100"),
            ("", "100"),
            ("0", None),
            ("0", ""),
        ],
    )
    def test_skips_incomplete_range_rows(self, min_value, max_value):
        rows = input_range_data_rows(
            input_range_row(
                inputRangeName="incompleteRange",
                labelEnMin="Very easy",
                labelEnMax="Very difficult",
                minValue=min_value,
                maxValue=max_value,
            )
        )

        ranges_map = process_range(rows, INPUT_RANGE_HEADERS, "en")

        assert "incompleteRange" not in ranges_map

    @pytest.mark.parametrize(
        "min_value,max_value,expected_entry",
        [
            (
                2,
                8,
                "2 : Low\n8 : High",
            ),
            (
                2.0,
                8.0,
                "2 : Low\n8 : High",
            ),
            (
                "-5",
                "15",
                "0 : Low\n15 : High",
            ),
        ],
    )
    def test_parses_integer_and_float_bounds(self, min_value, max_value, expected_entry):
        rows = input_range_data_rows(
            input_range_row(
                inputRangeName="boundedRange",
                labelEnMin="Low",
                labelEnMax="High",
                minValue=min_value,
                maxValue=max_value,
            )
        )

        ranges_map = process_range(rows, INPUT_RANGE_HEADERS, "en")

        assert ranges_map["boundedRange"] == expected_entry

    @pytest.mark.parametrize("min_value", [True, False])
    def test_rejects_boolean_min_value(self, min_value):
        rows = input_range_data_rows(
            input_range_row(
                inputRangeName="invalidRange",
                labelEnMin="Low",
                labelEnMax="High",
                minValue=min_value,
                maxValue=10,
            )
        )

        with pytest.raises(TypeError, match="boolean"):
            process_range(rows, INPUT_RANGE_HEADERS, "en")
