# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for survey_definition/input_range_definition.py: InputRangeDefinition and
# the InputRanges class that holds a checked sheet (constructing InputRanges runs the
# per-row rules, then the rules across rows: unique input_range_name, labels and units
# only in the survey languages).

import pytest  # pyright: ignore[reportMissingImports]
from pydantic import ValidationError

from survey_definition.input_range_definition import (
    InputRanges,
    InputRangeDefinition,
)

# The validation context SurveyDefinition passes, for a survey in French and English.
CONTEXT = {"languages": ("fr", "en")}


def _input_ranges(rows, context=CONTEXT) -> InputRanges:
    """Build an InputRange table in French and English, as SurveyDefinition would."""
    return InputRanges.model_validate(rows, context=context)


def _definition(row: dict) -> InputRangeDefinition:
    return InputRangeDefinition.model_validate(row, context=CONTEXT)


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


def _issues(rows: list, context=CONTEXT) -> list[str]:
    """Validate `rows` as an InputRange sheet, expecting it to fail; return each issue reported."""
    with pytest.raises(ValidationError) as error:
        _input_ranges(rows, context)
    assert error.value.error_count() == 1
    return str(error.value.errors()[0]["ctx"]["error"]).split("\n")


class TestInputRangeDefinition:
    def test_required_fields_and_defaults(self):
        input_range = _definition(_row())
        assert input_range.label_min == {
            "fr": "Pas du tout confiant",
            "en": "Not at all confident",
        }
        assert input_range.label_max == {"fr": "Très confiant", "en": "Very confident"}
        assert input_range.label_middle == {}
        assert input_range.unit == {}
        assert input_range.input_color is None

    def test_optional_fields(self):
        input_range = _definition(
            _row(
                **{
                    "label_middle::fr": "Moyen",
                    "label_middle::en": "Medium",
                    "unit::fr": "%",
                    "unit::en": "%",
                    "input_color": "green-yellow-red",
                }
            )
        )
        assert input_range.label_middle == {"fr": "Moyen", "en": "Medium"}
        assert input_range.unit == {"fr": "%", "en": "%"}
        assert input_range.input_color == "green-yellow-red"

    def test_blank_optional_cells_are_absent(self):
        input_range = _definition(
            _row(**{"unit::fr": "  ", "unit::en": None, "input_color": ""})
        )
        assert input_range.unit == {}
        assert input_range.input_color is None

    def test_a_number_in_a_label_or_unit_column_is_read_as_text(self):
        """A spreadsheet stores a text like "1" as a number."""
        input_range = _definition(_row(**{"unit::fr": 1, "unit::en": 1}))
        assert input_range.unit == {"fr": "1", "en": "1"}

    def test_reads_the_columns_of_the_survey_languages(self):
        input_range = InputRangeDefinition.model_validate(
            {
                "input_range_name": "slider",
                "label_min::es": "Nada",
                "label_max::es": "Mucho",
                "unit::es": "%",
                "min_value": 0,
                "max_value": 10,
            },
            context={"languages": ("es",)},
        )
        assert input_range.label_min == {"es": "Nada"}
        assert input_range.unit == {"es": "%"}


class TestInputRange:
    def test_no_issues_for_a_valid_table(self):
        input_ranges = _input_ranges([_row("slider1"), _row("slider2")])
        assert len(input_ranges) == 2
        assert [r.input_range_name for r in input_ranges] == ["slider1", "slider2"]
        assert input_ranges[1].input_range_name == "slider2"

    def test_empty_table_is_valid_without_languages(self):
        assert len(InputRanges([])) == 0

    def test_reports_missing_required_fields(self):
        assert _issues([{**_row(), "max_value": None}]) == [
            "Error in InputRange - Required field is missing in row 2. "
            "Missing fields: ['max_value']"
        ]

    @pytest.mark.parametrize("column", ["label_min::fr", "label_max::en"])
    def test_reports_missing_min_or_max_label(self, column):
        row = _row()
        del row[column]
        assert _issues([row]) == [
            f"Error in InputRange - Invalid row 2: {column} is required"
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

    @pytest.mark.parametrize(
        "column, missing_column",
        [("label_middle::fr", "label_middle::en"), ("unit::en", "unit::fr")],
    )
    def test_reports_middle_label_or_unit_in_only_some_languages(
        self, column, missing_column
    ):
        field_name = column.split("::")[0]
        assert _issues([_row(**{column: "x"})]) == [
            f"Error in InputRange - Invalid row 2: {missing_column} is required when "
            f"{field_name} is set in another language"
        ]

    def test_reports_every_problem_of_a_row_together(self):
        row = _row(max_value=-10, **{"label_middle::fr": "Moyen", "unit::en": "%"})
        del row["label_max::en"]
        assert _issues([row]) == [
            "Error in InputRange - Invalid row 2: "
            "min_value (-10) must be less than max_value (-10); "
            "label_max::en is required; "
            "label_middle::en is required when label_middle is set in another language; "
            "unit::fr is required when unit is set in another language"
        ]

    def test_reports_a_label_or_unit_in_another_language(self):
        assert _issues([_row(**{"label_min::fe": "Min", "label_max::es": "Max"})]) == [
            "Error in InputRange - Unexpected columns: ['label_max::es', 'label_min::fe']. "
            "The survey languages are ['fr', 'en']."
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

    def test_a_row_without_languages_in_the_context_raises(self):
        with pytest.raises(RuntimeError, match="survey languages are missing"):
            InputRanges([_row()])
