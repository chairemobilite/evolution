# Copyright 2026, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for scripts/conditionals_generator.py (ConditionalsGenerator). This
# module no longer validates the Conditionals sheet (see conditionals_generator.py's
# header note); these tests only cover TypeScript generation.
#
# TODO: Remove this file (and conditionals_generator.py) once Conditionals TypeScript
# generation reads from SurveyDefinition's Conditionals (survey_definition/conditionals_definition.py)
# instead of re-parsing the Excel sheet itself (see #1273/#2095's later migration steps,
# e.g. #2048 Generator: migrate Conditionals-reading scripts to SurveyDefinition).
# Its tests should move to wherever that generation logic ends up living.

from collections import defaultdict
import pytest  # pyright: ignore[reportMissingImports]

from scripts.conditionals_generator import ConditionalsGenerator
from helpers.generator_helpers import create_mocked_excel_data, delete_file_if_exists

# TODO: Add tests for the remaining ConditionalsGenerator class methods:
# - ConditionalsGenerator.extract_conditionals_from_data (grouping logic for raw rows/headers).
# - ConditionalsGenerator.generate_typescript_code (shape and content of generated TS code).
# - ConditionalsGenerator.generate_conditionals (end-to-end generation from Excel to file).

# Path where create_mocked_excel_data writes the workbook; we delete it after each test.
MOCKED_EXCEL_FILE = "src/tests/references/test.xlsx"


class TestConditionalCellToPrimitive:
    """Excel Conditionals cell values must become JSON-safe primitives for generated TS (see generate_typescript_code)."""

    @pytest.mark.parametrize(
        "case",
        [
            {"value": True, "expected": True},
            {"value": "true", "expected": True},
            {"value": "TRUE", "expected": True},
            {"value": False, "expected": False},
            {"value": "false", "expected": False},
            {"value": "FALSE", "expected": False},
            {"value": 0, "expected": 0},
            {"value": "0", "expected": 0},
            {"value": 42, "expected": 42},
            {"value": -3, "expected": -3},
            {"value": 3.14, "expected": 3.14},
            {"value": "42", "expected": 42},
            {"value": "0", "expected": 0},
            {"value": "null", "expected": None},
            {"value": "value", "expected": "value"},
            {"value": "", "expected": ""},
            {"value": "-5", "expected": -5},
            {"value": "-5.5", "expected": -5.5},
            {"value": -5, "expected": -5},
            {"value": None, "expected": None},
        ],
    )
    def test_conditional_cell_to_primitive(self, case):
        assert (
            ConditionalsGenerator._conditional_cell_to_primitive(case["value"])
            == case["expected"]
        )


class TestGenerateTypescriptCode:
    def test_emits_valueWhenHidden_when_any_row_has_value_when_hidden(self):
        conditional_by_name = {
            "condWithDefault": [
                {
                    "logical_operator": "",
                    "path": "household.size",
                    "comparison_operator": "===",
                    "value": "1",
                    "parentheses": "",
                    "value_when_hidden": "myDefault",
                },
                {
                    "logical_operator": "&&",
                    "path": "household.size",
                    "comparison_operator": "===",
                    "value": "2",
                    "parentheses": "",
                },
            ]
        }

        ts_code = ConditionalsGenerator.generate_typescript_code(conditional_by_name)

        assert "return checkConditionals({" in ts_code
        assert 'valueWhenHidden: "myDefault",' in ts_code

    def test_emits_numeric_valueWhenHidden_without_string_quotes(self):
        """Numeric value_when_hidden must emit as TS number literal, not a quoted string."""
        conditional_by_name = {
            "condNumericHidden": [
                {
                    "logical_operator": "",
                    "path": "household.size",
                    "comparison_operator": "===",
                    "value": "1",
                    "parentheses": "",
                    "value_when_hidden": 123,
                },
            ]
        }

        ts_code = ConditionalsGenerator.generate_typescript_code(conditional_by_name)

        assert "return checkConditionals({" in ts_code
        assert "valueWhenHidden: 123," in ts_code
        assert "'123'" not in ts_code

    def test_emits_valueWhenHidden_once_when_multiple_rows_have_same_value_when_hidden(
        self,
    ):
        conditional_by_name = {
            "condWithRepeatedDefault": [
                {
                    "logical_operator": "",
                    "path": "household.size",
                    "comparison_operator": "===",
                    "value": "1",
                    "parentheses": "",
                    "value_when_hidden": "myDefault",
                },
                {
                    "logical_operator": "&&",
                    "path": "household.size",
                    "comparison_operator": "===",
                    "value": "2",
                    "parentheses": "",
                    "value_when_hidden": "myDefault",
                },
            ]
        }

        ts_code = ConditionalsGenerator.generate_typescript_code(conditional_by_name)

        assert "return checkConditionals({" in ts_code
        assert ts_code.count('valueWhenHidden: "myDefault",') == 1

    def test_does_not_emit_valueWhenHidden_when_no_row_has_value_when_hidden(
        self,
    ):
        conditional_by_name = {
            "condNoDefault": [
                {
                    "logical_operator": "",
                    "path": "household.size",
                    "comparison_operator": "===",
                    "value": "1",
                    "parentheses": "",
                }
            ]
        }

        ts_code = ConditionalsGenerator.generate_typescript_code(conditional_by_name)

        assert "return checkConditionals({" in ts_code
        assert "valueWhenHidden:" not in ts_code

    @pytest.mark.parametrize("raw_value", [None, "null"])
    def test_emits_conditional_value_as_ts_null_not_string(self, raw_value):
        """Null comparison value must emit as TS null, not a quoted \"null\" string."""
        conditional_by_name = {
            "condNullCompare": [
                {
                    "logical_operator": "",
                    "path": "household.size",
                    "comparison_operator": "===",
                    "value": raw_value,
                    "parentheses": "",
                },
            ]
        }

        ts_code = ConditionalsGenerator.generate_typescript_code(conditional_by_name)

        assert "value: null," in ts_code
        assert 'value: "null"' not in ts_code

    @pytest.mark.parametrize(
        "case",
        [
            pytest.param(
                {
                    "token_key": "currentPerson",
                    "conditional_path": "${currentPerson}.age",
                    "expected_helper_line": "const currentPersonId = odSurveyHelpers.getCurrentPersonId({ interview, path });",
                    "expected_path_snippet": "`household.persons.${currentPersonId}.age`",
                },
            ),
            pytest.param(
                {
                    "token_key": "currentJourney",
                    "conditional_path": "${currentJourney}.personDidTrips",
                    "expected_helper_line": "const currentJourneyId = odSurveyHelpers.getCurrentJourneyId({ interview, path });",
                    "expected_path_snippet": ".journeys.${currentJourneyId}.",
                },
            ),
            pytest.param(
                {
                    "token_key": "currentTrip",
                    "conditional_path": "${currentTrip}.segments.0.mode",
                    "expected_helper_line": "const currentTripId = odSurveyHelpers.getCurrentTripId({ interview, path });",
                    "expected_path_snippet": ".trips.${currentTripId}.",
                },
            ),
            pytest.param(
                {
                    "token_key": "currentSegment",
                    "conditional_path": "${currentSegment}.mode",
                    "expected_helper_line": "const currentSegmentId = odSurveyHelpers.getCurrentSegmentId({ interview, path });",
                    "expected_path_snippet": ".segments.${currentSegmentId}.",
                },
            ),
            pytest.param(
                {
                    "token_key": "currentVisitedPlace",
                    "conditional_path": "${currentVisitedPlace}.activity",
                    "expected_helper_line": "const currentVisitedPlaceId = odSurveyHelpers.getCurrentVisitedPlaceId({ interview, path });",
                    "expected_path_snippet": ".visitedPlaces.${currentVisitedPlaceId}.",
                },
            ),
        ],
    )
    def test_expands_current_context_tokens_in_paths(self, case):
        """
        When a conditional path contains a `${current...}` token, the generator should:
        - emit the corresponding `odSurveyHelpers.getCurrent*Id({ interview, path })` helper call
        - expand the conditional path to include the computed id in a template string
        """

        conditional_by_name = defaultdict(list)
        conditional_by_name[f"cond_{case['token_key']}"].append(
            {
                "logical_operator": "",
                "path": case["conditional_path"],
                "comparison_operator": "===",
                "value": "test",
                "parentheses": "",
            }
        )

        ts_code = ConditionalsGenerator.generate_typescript_code(conditional_by_name)
        assert case["expected_helper_line"] in ts_code
        assert case["expected_path_snippet"] in ts_code


class TestExtractConditionalsFromData:
    """
    Regression test: extract_conditionals_from_data must not depend on column order.
    """

    def test_extract_conditionals_works_with_reordered_headers(self):
        """
        When the Conditionals sheet columns are reordered, extraction still picks values by header name.
        """
        # Reorder columns compared to the default spec order.
        headers = [
            "path",
            "conditional_name",
            "value",
            "comparison_operator",
            "parentheses",
            "logical_operator",
        ]
        rows = [
            ["some.path", "cond1", "42", "===", "", ""],
            ["some.path", "cond1", "40", "!==", "(", "&&"],
        ]
        try:
            workbook = create_mocked_excel_data("Conditionals", headers, rows)
            sheet = workbook["Conditionals"]
            extracted = ConditionalsGenerator.extract_conditionals_from_data(
                list(sheet.rows), headers
            )
            assert extracted["cond1"] == [
                {
                    "logical_operator": "",
                    "path": "some.path",
                    "comparison_operator": "===",
                    "value": "42",
                    "parentheses": "",
                },
                {
                    "logical_operator": "&&",
                    "path": "some.path",
                    "comparison_operator": "!==",
                    "value": "40",
                    "parentheses": "(",
                },
            ]
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)


class TestEmptyToNone:
    """Tests for the _empty_to_none helper."""

    def test_empty_string_returns_none(self):
        """
        Empty string should be converted to None.
        """
        assert ConditionalsGenerator._empty_to_none("") is None

    def test_none_stays_none(self):
        """
        None should remain None.
        """
        assert ConditionalsGenerator._empty_to_none(None) is None

    def test_non_empty_string_unchanged(self):
        """
        Non-empty strings should be returned unchanged.
        """
        assert ConditionalsGenerator._empty_to_none("foo") == "foo"
        assert ConditionalsGenerator._empty_to_none(" ") == " "


class TestExpandTokenizedPath:
    def test_expands_relative_path_and_current_person(self):
        specs = (
            {
                "token": "${currentPerson}",
                "prefix": "household.persons.${currentPersonId}.",
            },
        )

        assert (
            ConditionalsGenerator._expand_tokenized_path(
                "${relativePath}.age", current_context_specs=specs
            )
            == "`${relativePath}.age`"
        )
        assert (
            ConditionalsGenerator._expand_tokenized_path(
                "${currentPerson}.age", current_context_specs=specs
            )
            == "`household.persons.${currentPersonId}.age`"
        )


class TestCurrentContextVarsNeeded:
    @pytest.mark.parametrize(
        "case",
        [
            pytest.param(
                {
                    "name": "currentPerson",
                    "path": "${currentPerson}.age",
                    "expected_needed": {"currentPersonId"},
                }
            ),
            pytest.param(
                {
                    "name": "currentJourney",
                    "path": "${currentJourney}.personDidTrips",
                    "expected_needed": {"currentJourneyId", "currentPersonId"},
                }
            ),
            pytest.param(
                {
                    "name": "currentTrip",
                    "path": "${currentTrip}.segments.0.mode",
                    "expected_needed": {
                        "currentTripId",
                        "currentJourneyId",
                        "currentPersonId",
                    },
                }
            ),
            pytest.param(
                {
                    "name": "currentSegment",
                    "path": "${currentSegment}.mode",
                    "expected_needed": {
                        "currentSegmentId",
                        "currentTripId",
                        "currentJourneyId",
                        "currentPersonId",
                    },
                }
            ),
            pytest.param(
                {
                    "name": "currentVisitedPlace",
                    "path": "${currentVisitedPlace}.activity",
                    "expected_needed": {
                        "currentVisitedPlaceId",
                        "currentPersonId",
                        "currentJourneyId",
                    },
                }
            ),
        ],
    )
    def test_returns_deps_for_each_token(self, case):
        specs = (
            {
                "token": "${currentPerson}",
                "id_var": "currentPersonId",
                "deps": (),
            },
            {
                "token": "${currentJourney}",
                "id_var": "currentJourneyId",
                "deps": ("currentPersonId",),
            },
            {
                "token": "${currentTrip}",
                "id_var": "currentTripId",
                "deps": ("currentPersonId", "currentJourneyId"),
            },
            {
                "token": "${currentSegment}",
                "id_var": "currentSegmentId",
                "deps": ("currentPersonId", "currentJourneyId", "currentTripId"),
            },
            {
                "token": "${currentVisitedPlace}",
                "id_var": "currentVisitedPlaceId",
                "deps": ("currentPersonId", "currentJourneyId"),
            },
        )

        conditionals = [{"path": case["path"]}]
        needed = ConditionalsGenerator._current_context_vars_needed(
            conditionals, current_context_specs=specs
        )

        # Check if the needed variables are the ones that are needed for the conditional path
        assert needed == case["expected_needed"], case["name"]
