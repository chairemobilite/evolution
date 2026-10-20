# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for survey_definition/input_range_definition.py: InputRangeDefinition and
# the InputRange class that holds a checked sheet (constructing InputRange runs the
# per-row rules, then the rule across rows: unique input_range_name).

import pytest  # pyright: ignore[reportMissingImports]
from pydantic import ValidationError

from survey_definition.input_range_definition import (
    InputRange,
    InputRangeDefinition,
)


def _row(input_range_name: str = "confidentSlider", **extra) -> dict:
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


def _issues(rows: list) -> list[str]:
    """Validate `rows` as an InputRange sheet, expecting it to fail; return each issue reported."""
    with pytest.raises(ValidationError) as error:
        InputRange(rows)
    assert error.value.error_count() == 1
    return str(error.value.errors()[0]["ctx"]["error"]).split("\n")


class TestInputRangeDefinition:
    def test_required_fields_and_defaults(self):
        input_range = InputRangeDefinition(**_row())
        assert input_range.label_min_fr == "Pas du tout confiant"
        assert input_range.label_max_en == "Very confident"
        assert input_range.label_middle_fr is None
        assert input_range.label_middle_en is None
        assert input_range.unit_fr is None
        assert input_range.unit_en is None
        assert input_range.input_color is None
        assert not input_range.has_middle_label
        assert not input_range.has_unit

    def test_accepts_python_attribute_names(self):
        input_range = InputRangeDefinition(
            input_range_name="slider",
            label_min_fr="Min",
            label_max_fr="Max",
            label_min_en="Min",
            label_max_en="Max",
            min_value=0,
            max_value=10,
            unit_fr="%",
            unit_en="%",
        )
        assert input_range.unit_fr == "%"

    def test_optional_fields(self):
        input_range = InputRangeDefinition(
            **_row(
                **{
                    "label_middle::fr": "Moyen",
                    "label_middle::en": "Medium",
                    "unit::fr": "%",
                    "unit::en": "%",
                    "input_color": "green-yellow-red",
                }
            )
        )
        assert input_range.has_middle_label
        assert input_range.has_unit
        assert input_range.label_middle_en == "Medium"
        assert input_range.unit_en == "%"
        assert input_range.input_color == "green-yellow-red"

    def test_blank_optional_cells_are_absent(self):
        input_range = InputRangeDefinition(
            **_row(**{"unit::fr": "  ", "unit::en": None, "input_color": ""})
        )
        assert input_range.unit_fr is None
        assert input_range.unit_en is None
        assert input_range.input_color is None


class TestInputRange:
    def test_no_issues_for_a_valid_table(self):
        input_ranges = InputRange([_row("slider1"), _row("slider2")])
        assert len(input_ranges) == 2
        assert [r.input_range_name for r in input_ranges] == ["slider1", "slider2"]
        assert input_ranges[1].input_range_name == "slider2"

    def test_empty_table_is_valid(self):
        assert len(InputRange([])) == 0

    def test_reports_missing_required_fields_by_column_name(self):
        row = _row()
        del row["label_min::fr"]
        assert _issues([{**row, "max_value": None}]) == [
            "Error in InputRange - Required field is missing in row 2. "
            "Missing fields: ['label_min::fr', 'max_value']"
        ]

    def test_reports_duplicate_input_range_name(self):
        assert _issues([_row("slider"), _row("other"), _row("slider")]) == [
            "Error in InputRange - Duplicate input_range_name 'slider': found in rows [2, 4]"
        ]

    def test_reports_input_range_name_that_is_not_a_ts_identifier(self):
        assert _issues([_row("my-slider")]) == [
            "Error in InputRange - Invalid input_range_name in row 2: 'my-slider' - "
            "Must be a valid TypeScript identifier (letters, digits, '_' or '$', not starting with a digit)."
        ]

    @pytest.mark.parametrize(
        "column", ["label_min::fr", "label_max::en", "label_middle::fr", "unit::en"]
    )
    def test_reports_label_or_unit_that_is_not_a_string(self, column):
        extra = {"label_middle::en": "Moyen"} if column == "label_middle::fr" else {}
        assert _issues([_row(**{column: 5, **extra})]) == [
            f"Error in InputRange - Invalid {column} in row 2: 5 - "
            "Input should be a valid string"
        ]

    @pytest.mark.parametrize("value", [10.5, 10.0, "10", True])
    def test_reports_min_value_that_is_not_a_whole_number(self, value):
        assert _issues([_row(min_value=value)]) == [
            f"Error in InputRange - Invalid min_value in row 2: {value!r} - "
            "Input should be a valid integer"
        ]

    @pytest.mark.parametrize("max_value", [-10, -20])
    def test_reports_min_value_not_less_than_max_value(self, max_value):
        assert _issues([_row(min_value=-10, max_value=max_value)]) == [
            "Error in InputRange - Invalid row 2: "
            f"min_value (-10) must be less than max_value ({max_value})"
        ]

    @pytest.mark.parametrize("column", ["label_middle::fr", "label_middle::en"])
    def test_reports_middle_label_in_only_one_language(self, column):
        assert _issues([_row(**{column: "Moyen"})]) == [
            "Error in InputRange - Invalid row 2: "
            "label_middle::fr and label_middle::en must both be set, or both blank"
        ]

    @pytest.mark.parametrize("column", ["unit::fr", "unit::en"])
    def test_reports_unit_in_only_one_language(self, column):
        assert _issues([_row(**{column: "%"})]) == [
            "Error in InputRange - Invalid row 2: "
            "unit::fr and unit::en must both be set, or both blank"
        ]

    def test_reports_middle_label_and_unit_in_only_one_language_together(self):
        assert _issues([_row(**{"label_middle::fr": "Moyen", "unit::en": "%"})]) == [
            "Error in InputRange - Invalid row 2: "
            "label_middle::fr and label_middle::en must both be set, or both blank; "
            "unit::fr and unit::en must both be set, or both blank"
        ]

    def test_reports_invalid_input_color(self):
        """Pydantic checks the Literal itself; its message lists the allowed values."""
        assert _issues([_row(input_color="purple")]) == [
            "Error in InputRange - Invalid input_color in row 2: 'purple' - "
            "Input should be 'blue', 'red-yellow-green', 'red-white-green', "
            "'green-yellow-red' or 'green-white-red'"
        ]

    def test_reports_every_row_issue_at_once(self):
        issues = _issues(
            [_row("slider1", input_color="purple"), _row("slider2", max_value=1.5)]
        )
        assert len(issues) == 2
        assert any("input_color in row 2" in issue for issue in issues)
        assert any("max_value in row 3" in issue for issue in issues)
