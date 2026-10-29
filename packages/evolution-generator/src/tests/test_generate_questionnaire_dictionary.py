# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

import csv

import pytest
from helpers.generator_helpers import delete_file_if_exists
from scripts.generate_questionnaire_dictionary import (
    MAX_RADIO_NUMBER_VALUES,
    combine_values_text,
    generate_questionnaire_dictionary,
    get_choices_text,
    process_choices,
    process_radio_number_values,
    process_range,
    rename_input_type,
)
from survey_definition.choices_definition import Choices
from survey_definition.input_range_definition import InputRanges
from survey_definition.survey_definition import SurveyDefinition
from tests.mocked_excel import (
    MOCKED_EXCEL_FILE,
    add_mocked_excel_sheet,
    create_mocked_excel_data,
)


def choices_table(rows: list[dict]) -> Choices:
    """A Choices table in French and English (see choice)."""
    return Choices.model_validate(rows, context={"languages": ("fr", "en")})


def choice(choices_name, value=None, label_en=None, **extra) -> dict:
    """A Choices row; label_en is the only label most tests need, so label::fr mirrors it."""
    labels = {"label::en": label_en, "label::fr": label_en} if label_en else {}
    return {"choicesName": choices_name, "value": value, **labels, **extra}


class TestProcessChoices:
    def test_includes_zero_value_in_dictionary(self):
        choices = choices_table(
            [
                choice("likert5", value=-2, label_en="Strongly disagree"),
                choice("likert5", value=0, label_en="Neutral"),
                choice("likert5", value=2, label_en="Strongly agree"),
            ]
        )

        choices_map = process_choices(choices, "en", {})

        assert choices_map["likert5"] == [
            "-2 : Strongly disagree",
            "0 : Neutral",
            "2 : Strongly agree",
        ]

    def test_includes_false_value_in_dictionary(self):
        choices = choices_table(
            [
                choice("yesNo", value="yes", label_en="Yes"),
                choice("yesNo", value=False, label_en="No"),
            ]
        )

        choices_map = process_choices(choices, "en", {})

        assert choices_map["yesNo"] == ["yes : Yes", "False : No"]

    def test_uses_the_label_of_the_requested_language(self):
        choices = choices_table(
            [
                {
                    "choicesName": "yesNo",
                    "value": "yes",
                    "label::fr": "Oui",
                    "label::en": "Yes",
                }
            ]
        )

        assert process_choices(choices, "fr", {})["yesNo"] == ["yes : Oui"]

    def test_spread_rows_add_the_choices_of_the_spread_list(self):
        choices = choices_table(
            [
                choice("yes", value="yes", label_en="Yes"),
                choice("no", value="no", label_en="No"),
                choice("yesNo", spreadChoicesName="yes"),
                choice("yesNo", spreadChoicesName="no"),
                choice("yesNo", value="dontKnow", label_en="Don't know"),
            ]
        )

        choices_map = process_choices(choices, "en", {})

        assert choices_map["yesNo"] == ["yes : Yes", "no : No", "dontKnow : Don't know"]

    def test_a_spread_row_s_own_value_and_label_are_not_used(self):
        """Like in choices.tsx, a spread row only adds the spread list's choices."""
        choices = choices_table(
            [
                choice("yes", value="yes", label_en="Yes"),
                choice(
                    "yesNo",
                    value="ignored",
                    label_en="Ignored",
                    spreadChoicesName="yes",
                ),
            ]
        )

        assert process_choices(choices, "en", {})["yesNo"] == ["yes : Yes"]

    def test_describes_the_conditional_of_a_choice(self):
        choices = choices_table(
            [
                choice(
                    "age",
                    value="adult",
                    label_en="Adult",
                    conditional="isAdultConditional",
                ),
                choice(
                    "age",
                    value="kid",
                    label_en="Kid",
                    conditional="isKidCustomConditional",
                ),
            ]
        )

        choices_map = process_choices(
            choices, "en", {"isAdultConditional": "age >= 18"}
        )

        assert choices_map["age"] == [
            "adult (age >= 18) : Adult",
            "kid (isKidCustomConditional): Kid",
        ]


class TestGetChoicesText:
    def test_formats_each_choice_on_its_own_line(self):
        choices_map = {"yesNo": ["1 : Yes", "2 : No"]}

        assert get_choices_text("yesNo", choices_map) == "1 : Yes\n2 : No"

    def test_filters_out_empty_choice_entries(self):
        choices_map = {"yesNo": ["1 : Yes", "", "2 : No"]}

        assert get_choices_text("yesNo", choices_map) == "1 : Yes\n2 : No"

    @pytest.mark.parametrize("choices_name", [None, ""])
    def test_returns_empty_string_when_choices_name_is_falsy(self, choices_name):
        assert get_choices_text(choices_name, {"yesNo": ["1 : Yes"]}) == ""

    def test_returns_empty_string_when_choices_name_not_in_map(self):
        assert get_choices_text("unknown", {"yesNo": ["1 : Yes"]}) == ""

    @pytest.mark.parametrize("input_type", ["Radio", "Checkbox", "Select"])
    def test_same_choices_name_renders_identically_across_widget_types(
        self, input_type
    ):
        # Radio, Checkbox and Select all resolve their "Values" text through this
        # same choicesName -> choices_map lookup (generate_questionnaire_dictionary
        # doesn't branch on input_type for it), so a question using "yesNo" renders
        # the exact same values no matter which of these widgets it's attached to.
        choices_map = {"yesNo": ["1 : Yes", "2 : No"]}

        assert get_choices_text("yesNo", choices_map) == "1 : Yes\n2 : No"


class TestRenameInputType:
    # Every inputType value that generate_widget_statement in generate_widgets.py
    # knows how to handle, except InfoText which is tested separately below.
    KNOWN_INPUT_TYPES = [
        "BuiltIn",
        "Custom",
        "Checkbox",
        "Radio",
        "RadioNumber",
        "Select",
        "String",
        "Number",
        "Range",
        "Text",
        "NextButton",
    ]

    @pytest.mark.parametrize("input_type", KNOWN_INPUT_TYPES)
    @pytest.mark.parametrize("language", ["en", "fr"])
    def test_translates_known_input_types(self, input_type, language):
        translated = rename_input_type(input_type, language)

        assert translated is not None
        assert translated != input_type

    def test_ignores_info_text_type(self):
        assert rename_input_type("InfoText", "en") is None
        assert rename_input_type("InfoText", "fr") is None

    @pytest.mark.parametrize("language", ["en", "fr"])
    def test_returns_original_value_for_unknown_input_type(self, language):
        assert rename_input_type("SomeUnknownType", language) == "SomeUnknownType"


class TestProcessRadioNumberValues:
    @pytest.mark.parametrize("language", ["en", "fr"])
    def test_lists_every_value_from_min_to_max(self, language):
        assert (
            process_radio_number_values("min=1\nmax=6", language) == "1\n2\n3\n4\n5\n6"
        )

    @pytest.mark.parametrize("language", ["en", "fr"])
    def test_appends_over_max_choice_when_allowed(self, language):
        assert (
            process_radio_number_values("min=1\nmax=6\noverMaxAllowed", language)
            == "1\n2\n3\n4\n5\n6\n7+"
        )

    @pytest.mark.parametrize("language", ["en", "fr"])
    def test_defaults_to_min_0_max_6_when_no_parameters(self, language):
        assert process_radio_number_values("", language) == "0\n1\n2\n3\n4\n5\n6"

    @pytest.mark.parametrize("language", ["en", "fr"])
    def test_shows_raw_bounds_when_min_is_dynamic(self, language):
        # min can reference another response's path instead of a fixed number,
        # in which case the values can't be enumerated ahead of time.
        assert (
            process_radio_number_values("min=someOtherField\nmax=6", language)
            == "Min : someOtherField\nMax : 6"
        )

    @pytest.mark.parametrize("language", ["en", "fr"])
    def test_shows_raw_bounds_when_max_is_dynamic(self, language):
        assert (
            process_radio_number_values("min=1\nmax=someOtherField", language)
            == "Min : 1\nMax : someOtherField"
        )

    def test_omits_over_max_choice_when_max_is_dynamic(self):
        # The over max choice is max + 1, which can't be computed when max is dynamic.
        assert (
            process_radio_number_values(
                "min=1\nmax=someOtherField\noverMaxAllowed", "en"
            )
            == "Min : 1\nMax : someOtherField"
        )

    def test_appends_over_max_choice_when_only_min_is_dynamic(self):
        assert (
            process_radio_number_values(
                "min=someOtherField\nmax=6\noverMaxAllowed", "en"
            )
            == "Min : someOtherField\nMax : 6\n7+"
        )

    def test_still_enumerates_a_range_at_the_limit(self):
        max_value = MAX_RADIO_NUMBER_VALUES - 1
        expected = "\n".join(str(value) for value in range(0, max_value + 1))

        assert process_radio_number_values(f"min=0\nmax={max_value}", "en") == expected

    def test_falls_back_to_bounds_when_range_exceeds_the_limit(self):
        # A typo like max=100000 shouldn't materialize a huge list of values into
        # one CSV cell; show the bounds instead, same as a dynamic min/max.
        max_value = MAX_RADIO_NUMBER_VALUES
        assert (
            process_radio_number_values(f"min=0\nmax={max_value}", "en")
            == f"Min : 0\nMax : {max_value}"
        )

    def test_falls_back_to_bounds_with_over_max_choice_when_range_exceeds_the_limit(
        self,
    ):
        max_value = MAX_RADIO_NUMBER_VALUES
        assert (
            process_radio_number_values(f"min=0\nmax={max_value}\noverMaxAllowed", "en")
            == f"Min : 0\nMax : {max_value}\n{max_value + 1}+"
        )


class TestCombineValuesText:
    def test_joins_non_empty_parts_with_newlines_in_order(self):
        # This is what merges a RadioNumber's enumerated values (e.g.
        # vehicleOccupancy: 1..6, 7+) with its additionalChoices (e.g. "I don't
        # know") into a single Values row instead of two separate ones.
        assert (
            combine_values_text("1\n2\n3", "dontKnow : I don't know")
            == "1\n2\n3\ndontKnow : I don't know"
        )

    def test_skips_empty_parts(self):
        assert combine_values_text("1\n2\n3", "", "") == "1\n2\n3"
        assert combine_values_text("", "yes : Yes", "") == "yes : Yes"

    def test_returns_empty_string_when_all_parts_are_empty(self):
        assert combine_values_text("", "", "") == ""
        assert combine_values_text() == ""


def _input_range_row(input_range_name: str = "slider", **extra) -> dict:
    """One valid InputRange row, keyed by its source (Excel) column names."""
    return {
        "input_range_name": input_range_name,
        "label_min::fr": "Facile",
        "label_max::fr": "Difficile",
        "label_min::en": "Easy",
        "label_max::en": "Difficult",
        "min_value": -10,
        "max_value": 100,
        **extra,
    }


def _input_ranges(rows: list[dict]) -> InputRanges:
    """Build an InputRange table in French and English, as SurveyDefinition would."""
    return InputRanges.model_validate(rows, context={"languages": ("fr", "en")})


class TestProcessRange:
    @pytest.mark.parametrize(
        "language, label_min, label_max",
        [("en", "Easy", "Difficult"), ("fr", "Facile", "Difficile")],
    )
    def test_describes_min_and_max_in_the_requested_language(
        self, language, label_min, label_max
    ):
        ranges_map = process_range(_input_ranges([_input_range_row()]), language)
        assert ranges_map == {"slider": f"0 : {label_min}\n100 : {label_max}"}

    def test_includes_middle_value_when_there_is_a_middle_label(self):
        input_ranges = _input_ranges(
            [
                _input_range_row(
                    min_value=0,
                    max_value=10,
                    **{"label_middle::fr": "Moyen", "label_middle::en": "Medium"},
                )
            ]
        )
        assert process_range(input_ranges, "en") == {
            "slider": "0 : Easy\n5 : Medium\n10 : Difficult"
        }

    def test_removes_markdown_from_labels(self):
        input_ranges = _input_ranges(
            [_input_range_row(**{"label_min::en": "**Easy**"})]
        )
        assert process_range(input_ranges, "en")["slider"].startswith("0 : Easy\n")

    def test_maps_every_input_range_by_name(self):
        input_ranges = _input_ranges(
            [_input_range_row("first"), _input_range_row("second")]
        )
        assert list(process_range(input_ranges, "en")) == ["first", "second"]


class TestGenerateQuestionnaireDictionary:
    def test_describes_each_section_with_its_title_and_abbreviation(self, tmp_path):
        """Each section is introduced by its title, in the requested language, and its abbreviation, from the survey definition."""
        survey_definition = SurveyDefinition(
            languages=("fr", "en"),
            sections=[
                {
                    "section": "household",
                    "in_nav": True,
                    "abbreviation": "HH_",
                    "title_fr": "Ménage",
                    "title_en": "Household",
                }
            ],
        )
        create_mocked_excel_data(
            "Widgets",
            [
                "section",
                "label::fr",
                "label::en",
                "inputType",
                "active",
                "path",
                "conditional",
                "choices",
                "inputRange",
            ],
            [
                [
                    "household",
                    "Taille?",
                    "Size?",
                    "String",
                    True,
                    "household.size",
                    None,
                    None,
                    None,
                ]
            ],
        )
        try:
            for language, title, abbreviation_label in (
                ("en", "Household", "Abbreviation"),
                ("fr", "Ménage", "Abréviation"),
            ):
                generate_questionnaire_dictionary(
                    MOCKED_EXCEL_FILE, survey_definition, str(tmp_path), language
                )
                with open(
                    tmp_path / f"questionnaire_dictionary_{language}.csv",
                    encoding="utf-8",
                ) as csv_file:
                    rows = list(csv.reader(csv_file))
                assert ["Section", title] in rows
                assert [abbreviation_label, "HH_"] in rows
                assert any("HH_size" in row for row in rows)
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)
