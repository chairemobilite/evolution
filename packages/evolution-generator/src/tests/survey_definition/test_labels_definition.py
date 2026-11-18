# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for survey_definition/labels_definition.py: LabelDefinition and the
# Labels class that holds a checked sheet.

from dataclasses import dataclass

import pytest  # pyright: ignore[reportMissingImports]
from pydantic import ValidationError

from survey_definition.labels_definition import LabelDefinition, Labels


def _labels(rows) -> Labels:
    """Build a Labels table in French and English, as SurveyDefinition would."""
    return Labels.model_validate(rows, context=CONTEXT)


# The validation context SurveyDefinition passes, for a survey in French and English.
CONTEXT = {"languages": ("fr", "en")}


def _row(**extra) -> dict:
    return {
        "namespace": "home",
        "key": "welcome",
        "label::fr": "Bienvenue",
        "label::en": "Welcome",
        **extra,
    }


def _issues(rows: list) -> list[str]:
    """Validate `rows` as a Labels sheet, expecting it to fail; return each issue reported."""
    with pytest.raises(ValidationError) as error:
        _labels(rows)
    assert error.value.error_count() == 1
    return str(error.value.errors()[0]["ctx"]["error"]).split("\n")


@dataclass(frozen=True)
class PartialLabelOneCase:
    """A Labels row with label_one in only some languages, and the label_one read."""

    description: str
    label_one_columns: dict
    expected_label_one: dict[str, str]


@dataclass(frozen=True)
class LabelOneWarningCase:
    """A Labels row's label_one columns, and the warnings expected about them."""

    description: str
    label_one_columns: dict
    expected_warnings: list[str]


class TestLabelDefinition:
    def test_gathers_the_label_columns_by_language(self):
        label = LabelDefinition.model_validate(
            _row(**{"label_one::fr": "Un", "label_one::en": "One"}), context=CONTEXT
        )
        assert label.namespace == "home"
        assert label.key == "welcome"
        assert label.label == {"fr": "Bienvenue", "en": "Welcome"}
        assert label.label_one == {"fr": "Un", "en": "One"}

    def test_label_one_defaults_to_empty(self):
        label = LabelDefinition.model_validate(_row(), context=CONTEXT)
        assert label.label_one == {}

    def test_blank_label_one_columns_are_absent(self):
        label = LabelDefinition.model_validate(
            _row(**{"label_one::fr": None, "label_one::en": "  "}), context=CONTEXT
        )
        assert label.label_one == {}

    def test_a_number_label_is_read_as_text(self):
        label = LabelDefinition.model_validate(
            _row(**{"label::en": 1}), context=CONTEXT
        )
        assert label.label["en"] == "1"


class TestLabels:
    def test_no_issues_for_a_valid_table(self):
        labels = _labels([_row(), _row(key="goodbye")])
        assert [label.key for label in labels] == ["welcome", "goodbye"]

    def test_namespace_key_and_label_are_required(self):
        assert _issues([{"namespace": " ", "key": None}]) == [
            "Error in Labels - Required field is missing in row 2. "
            "Missing fields: ['namespace', 'key', 'label']"
        ]

    def test_namespace_and_key_must_be_text(self):
        assert _issues([_row(namespace=1, key=2)]) == [
            "Error in Labels - Invalid namespace in row 2: 1 - Input should be a valid string",
            "Error in Labels - Invalid key in row 2: 2 - Input should be a valid string",
        ]

    def test_label_is_required_in_every_survey_language(self):
        assert _issues([_row(**{"label::en": None})]) == [
            "Error in Labels - Invalid row 2: label::en is required"
        ]

    @pytest.mark.parametrize(
        "case",
        [
            PartialLabelOneCase(
                description="label_one missing in French",
                label_one_columns={"label_one::fr": None, "label_one::en": "One"},
                expected_label_one={"en": "One"},
            ),
            PartialLabelOneCase(
                description="label_one missing in English",
                label_one_columns={"label_one::fr": "Un", "label_one::en": "  "},
                expected_label_one={"fr": "Un"},
            ),
        ],
        ids=lambda case: case.description,
    )
    def test_label_one_can_be_set_in_only_some_survey_languages(
        self, case: PartialLabelOneCase
    ):
        """E.g. the French text is the same for one or many: label is used instead."""
        labels = _labels([_row(**case.label_one_columns)])
        assert labels[0].label_one == case.expected_label_one

    def test_reads_the_survey_languages_from_the_context(self):
        row = {"namespace": "home", "key": "welcome", "label::es": "Bienvenido"}
        labels = Labels.model_validate([row], context={"languages": ("es",)})
        assert labels[0].label == {"es": "Bienvenido"}

    def test_needs_the_survey_languages_in_its_context(self):
        """Without them, a label can't be checked: an error in the calling code."""
        with pytest.raises(RuntimeError, match="survey languages are missing"):
            Labels([_row()])

    def test_is_built_empty_without_the_survey_languages(self):
        """No row needs them, e.g. SurveyDefinition's default empty table."""
        assert len(Labels([])) == 0

    def test_reports_labels_in_another_language_once(self):
        rows = [
            _row(**{"label::fe": "Typo"}),
            _row(
                key="goodbye",
                **{
                    "label_one::fr": "Un",
                    "label_one::en": "One",
                    "label_one::es": "Uno",
                },
            ),
        ]
        assert _issues(rows) == [
            "Error in Labels - Unexpected columns: ['label::fe', 'label_one::es']. "
            "The survey languages are ['fr', 'en']."
        ]

    @pytest.mark.parametrize(
        "case",
        [
            LabelOneWarningCase(
                description="label_one not set",
                label_one_columns={},
                expected_warnings=[],
            ),
            LabelOneWarningCase(
                description="label_one in every survey language",
                label_one_columns={"label_one::fr": "Un", "label_one::en": "One"},
                expected_warnings=[],
            ),
            LabelOneWarningCase(
                description="label_one missing in a survey language",
                label_one_columns={"label_one::en": "One"},
                expected_warnings=[
                    "Labels row 2 (home.welcome): label_one is not set in "
                    "['label_one::fr'], so label is used instead for one."
                ],
            ),
        ],
        ids=lambda case: case.description,
    )
    def test_warns_about_label_one_missing_in_some_survey_languages(
        self, case: LabelOneWarningCase
    ):
        labels = _labels([_row(**case.label_one_columns)])
        assert labels.warnings(CONTEXT["languages"]) == case.expected_warnings

    def test_reports_the_issues_of_every_row(self):
        assert _issues([_row(), _row(key=None), _row(namespace=None)]) == [
            "Error in Labels - Required field is missing in row 3. Missing fields: ['key']",
            "Error in Labels - Required field is missing in row 4. Missing fields: ['namespace']",
        ]
