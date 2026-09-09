# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

import pytest
from scripts.generate_questionnaire_dictionary import (
    get_choices_text,
    process_choices,
    process_radio_number_values,
    rename_input_type,
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
