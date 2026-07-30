# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

from scripts.generate_questionnaire_dictionary import process_choices

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
