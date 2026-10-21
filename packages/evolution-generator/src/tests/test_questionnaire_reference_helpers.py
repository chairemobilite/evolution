# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for helpers/questionnaire_reference_helpers.py: path and conditional
# descriptions shared by the questionnaire reference documents scripts.

from helpers.questionnaire_reference_helpers import (
    describe_conditional,
    describe_conditionals,
    get_abbreviation_by_section,
    transform_path,
)
from survey_definition.conditionals_definition import ConditionalDefinition
from survey_definition.survey_definition import SurveyDefinition

SECTIONS_ROWS = [
    {"section": "household", "in_nav": False, "abbreviation": "HH_"},
    {"section": "home", "in_nav": False, "abbreviation": "HM_"},
]


class TestGetAbbreviationBySection:
    def test_maps_each_section_to_its_abbreviation(self):
        """Every section of the Sections table maps to its abbreviation."""
        survey_definition = SurveyDefinition(
            languages=("fr", "en"), sections=SECTIONS_ROWS
        )
        assert get_abbreviation_by_section(survey_definition.sections) == {
            "household": "HH_",
            "home": "HM_",
        }


class TestTransformPath:
    ABBREVIATIONS = {"household": "HH_"}

    def test_replaces_section_with_its_abbreviation(self):
        """A path starting with a known section is shortened with its abbreviation."""
        assert transform_path("household.size", self.ABBREVIATIONS) == "HH_size"

    def test_keeps_path_whose_prefix_is_not_a_section_as_is(self):
        """A path whose first part is not a section is not shortened."""
        assert transform_path("unknown.size", self.ABBREVIATIONS) == "unknown.size"

    def test_keeps_paths_with_same_field_under_unknown_prefixes_distinct(self):
        """The same field under different non-section prefixes stays distinct instead of collapsing to the field name."""
        assert transform_path("usualWorkPlace.name", self.ABBREVIATIONS) == (
            "usualWorkPlace.name"
        )
        assert transform_path("usualSchoolPlace.name", self.ABBREVIATIONS) == (
            "usualSchoolPlace.name"
        )

    def test_keeps_current_context_token_path_as_is(self):
        """A ${currentPerson} path keeps its token, so the description shows which object it is about."""
        assert (
            transform_path("${currentPerson}.age", self.ABBREVIATIONS)
            == "${currentPerson}.age"
        )

    def test_warns_about_multiple_dots_only_for_a_known_section(self, capsys):
        """The multiple-dots warning is only printed for a path that is shortened."""
        assert transform_path("household.car.make", self.ABBREVIATIONS) == (
            "HH_car.make"
        )
        assert "contains multiple dots" in capsys.readouterr().out

        assert transform_path("unknown.car.make", self.ABBREVIATIONS) == (
            "unknown.car.make"
        )
        assert capsys.readouterr().out == ""

    def test_keeps_relative_path_as_is(self):
        """A ${relativePath} path is not shortened."""
        assert (
            transform_path("${relativePath}.age", self.ABBREVIATIONS)
            == "${relativePath}.age"
        )

    def test_keeps_path_without_dot_as_is(self):
        """A path without a dot is not shortened."""
        assert transform_path("acceptToBeContacted", self.ABBREVIATIONS) == (
            "acceptToBeContacted"
        )


class TestDescribeConditional:
    ABBREVIATIONS = {"household": "HH_"}

    def test_single_row(self):
        """A one-row conditional is described as its name followed by its comparison."""
        conditionals = [
            ConditionalDefinition(
                conditional_name="cond1",
                path="household.size",
                comparison_operator=">=",
                value=2,
            )
        ]
        assert (
            describe_conditional("cond1", conditionals, self.ABBREVIATIONS)
            == "cond1 : HH_size >= 2"
        )

    def test_rows_joined_with_logical_operators_and_parentheses(self):
        """Rows are joined by their logical operators, with their parentheses kept."""
        conditionals = [
            ConditionalDefinition(
                conditional_name="cond1",
                path="household.size",
                comparison_operator=">",
                value=1,
                parentheses="(",
            ),
            ConditionalDefinition(
                conditional_name="cond1",
                logical_operator="||",
                path="household.carNumber",
                comparison_operator="!==",
                value=True,
                parentheses=")",
            ),
            ConditionalDefinition(
                conditional_name="cond1",
                logical_operator="&&",
                path="acceptToBeContacted",
                comparison_operator="===",
                value="yes",
            ),
        ]
        assert describe_conditional("cond1", conditionals, self.ABBREVIATIONS) == (
            "cond1 : (HH_size > 1 || HH_carNumber !== True) "
            "&& acceptToBeContacted === yes"
        )


class TestDescribeConditionals:
    def test_describes_each_conditional_on_one_line(self):
        """Each conditional_name gets one description, with rows from anywhere in the table grouped together."""
        survey_definition = SurveyDefinition(
            languages=("fr", "en"),
            sections=SECTIONS_ROWS,
            conditionals=[
                {
                    "conditional_name": "cond1",
                    "path": "household.size",
                    "comparison_operator": ">",
                    "value": 1,
                },
                {
                    "conditional_name": "cond2",
                    "path": "acceptToBeContacted",
                    "comparison_operator": "===",
                    "value": "yes",
                },
                {
                    "conditional_name": "cond1",
                    "logical_operator": "&&",
                    "path": "household.carNumber",
                    "comparison_operator": "===",
                    "value": 0,
                    "parentheses": "(",
                },
                {
                    "conditional_name": "cond1",
                    "logical_operator": "||",
                    "path": "${relativePath}.age",
                    "comparison_operator": "<",
                    "value": 18,
                    "parentheses": ")",
                },
            ],
        )

        assert describe_conditionals(survey_definition) == {
            "cond1": (
                "cond1 : HH_size > 1 && (HH_carNumber === 0 "
                "|| ${relativePath}.age < 18)"
            ),
            "cond2": "cond2 : acceptToBeContacted === yes",
        }

    def test_no_conditionals_gives_empty_map(self):
        """A survey definition without conditionals gives no descriptions."""
        assert (
            describe_conditionals(
                SurveyDefinition(languages=("fr", "en"), sections=SECTIONS_ROWS)
            )
            == {}
        )
