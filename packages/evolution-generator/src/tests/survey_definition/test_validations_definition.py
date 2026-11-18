# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for survey_definition/validations_definition.py: ValidationDefinition and
# the Validations class that holds a checked sheet (constructing Validations runs the
# per-row rules, then the rules across the rows of a validation_name).

import pytest  # pyright: ignore[reportMissingImports]
from pydantic import ValidationError

from survey_definition.validations_definition import (
    ValidationDefinition,
    Validations,
)
from tests.parametrize_cases import cases

# The validation context SurveyDefinition passes, for a survey in French and English.
CONTEXT = {"languages": ("fr", "en")}


def _row(**columns) -> dict:
    """A valid row of the Validations sheet, keyed by its column names, with these columns changed."""
    return {
        "validation_name": "personAgeValidation",
        "error_name": "tooHigh",
        "path": None,
        "comparison_operator": ">",
        "value": 120,
        "error_message::fr": "Trop élevé",
        "error_message::en": "Too high",
        **columns,
    }


def _validations(rows: list[dict], context=CONTEXT) -> Validations:
    return Validations.model_validate(rows, context=context)


def _issues(rows: list[dict], context=CONTEXT) -> list[str]:
    """Validate `rows` as a Validations sheet, expecting it to fail; return each issue reported."""
    with pytest.raises(ValidationError) as error:
        _validations(rows, context)
    assert error.value.error_count() == 1
    return str(error.value.errors()[0]["ctx"]["error"]).split("\n")


def _row_issue(**columns) -> str:
    """The one issue reported for a sheet of one row with these columns changed."""
    issues = _issues([_row(**columns)])
    assert len(issues) == 1
    return issues[0]


class TestValidationDefinition:
    def test_reads_the_columns_and_defaults(self):
        validation = ValidationDefinition.model_validate(_row(), context=CONTEXT)
        assert validation.validation_name == "personAgeValidation"
        assert validation.error_name == "tooHigh"
        assert validation.path is None
        assert validation.comparison_operator == ">"
        assert validation.value == 120
        assert validation.error_message == {"fr": "Trop élevé", "en": "Too high"}
        assert validation.is_warning is False

    def test_treats_blank_cells_as_absent(self):
        validation = ValidationDefinition.model_validate(
            _row(path="  ", is_warning=""), context=CONTEXT
        )
        assert validation.path is None
        assert validation.is_warning is False

    def test_reads_a_number_in_an_error_message_as_text(self):
        validation = ValidationDefinition.model_validate(
            _row(**{"error_message::fr": 18}), context=CONTEXT
        )
        assert validation.error_message["fr"] == "18"

    @cases(
        dict(id="warning", is_warning=True, expected=True),
        dict(id="not a warning", is_warning=False, expected=False),
        dict(id="TRUE as text", is_warning="TRUE", expected=True),
        dict(id="1", is_warning=1, expected=True),
        dict(id="0 as text", is_warning="0", expected=False),
    )
    def test_reads_is_warning(self, is_warning, expected):
        validation = ValidationDefinition.model_validate(
            _row(is_warning=is_warning), context=CONTEXT
        )
        assert validation.is_warning is expected

    def test_reports_a_text_is_warning(self):
        assert _row_issue(is_warning="yes").startswith(
            "Error in Validations - Invalid is_warning in row 2: 'yes' - "
        )

    @cases(
        dict(id="validation_name", field_name="validation_name"),
        dict(id="error_name", field_name="error_name"),
        dict(id="comparison_operator", field_name="comparison_operator"),
    )
    def test_reports_a_missing_required_field(self, field_name):
        assert _row_issue(**{field_name: None}) == (
            "Error in Validations - Required field is missing in row 2. Missing "
            f"fields: [{field_name!r}]"
        )

    def test_reports_an_unknown_comparison_operator(self):
        """Pydantic checks the Literal itself; its message lists the allowed values."""
        assert _row_issue(comparison_operator="==") == (
            "Error in Validations - Invalid comparison_operator in row 2: '==' - "
            "Input should be '===', '!==', '>', '<', '>=', '<=', 'isBlank' or "
            "'isNotInteger'"
        )


class TestValidationName:
    @cases(
        dict(id="with a space", validation_name="age Validation"),
        dict(id="starting with a digit", validation_name="1ageValidation"),
        dict(id="with a dash", validation_name="age-validation"),
    )
    def test_reports_an_invalid_identifier(self, validation_name):
        assert _row_issue(validation_name=validation_name) == (
            "Error in Validations - Invalid validation_name in row 2: "
            f"{validation_name!r} - Must be a valid TypeScript identifier (letters, "
            "digits, '_' or '$', not starting with a digit)."
        )

    @cases(
        dict(id="requiredValidation", validation_name="requiredValidation"),
        dict(id="ageValidation of Evolution", validation_name="ageValidation"),
        dict(
            id="re-exported carNumberValidation", validation_name="carNumberValidation"
        ),
    )
    def test_reports_the_name_of_a_built_in_validation(self, validation_name):
        assert _row_issue(validation_name=validation_name) == (
            "Error in Validations - Invalid validation_name in row 2: "
            f"{validation_name!r} - Is the name of a validation of Evolution: use it "
            "directly in the widget's validation column, or choose another name"
        )

    def test_reports_a_custom_validation_name(self):
        assert _row_issue(validation_name="ageCustomValidation") == (
            "Error in Validations - Invalid validation_name in row 2: "
            "'ageCustomValidation' - Must not end with 'CustomValidation': that suffix "
            "names a validation written by hand in customValidations.tsx"
        )

    @cases(
        dict(id="ending with Validation", validation_name="childAgeValidation"),
        dict(id="any other identifier", validation_name="between7And18"),
    )
    def test_accepts_another_identifier(self, validation_name):
        validations = _validations([_row(validation_name=validation_name)])
        assert validations[0].validation_name == validation_name


class TestErrorName:
    @cases(
        dict(id="with a space", error_name="too high"),
        dict(id="with a dot", error_name="too.high"),
    )
    def test_reports_an_invalid_identifier(self, error_name):
        assert _row_issue(error_name=error_name) == (
            f"Error in Validations - Invalid error_name in row 2: {error_name!r} - "
            "Must be a valid TypeScript identifier (letters, digits, '_' or '$', not "
            "starting with a digit)."
        )


class TestPath:
    @cases(
        dict(id="a response path", path="household.carNumber"),
        dict(id="a placeholder", path="household.persons.{_activePersonId}.age"),
        dict(id="relative path", path="${relativePath}.hasCar"),
        dict(id="current person", path="${currentPerson}.age"),
        dict(id="current journey", path="${currentJourney}.endDate"),
        dict(id="current trip", path="${currentTrip}.mode"),
        dict(id="current segment", path="${currentSegment}.mode"),
        dict(id="current visited place", path="${currentVisitedPlace}.activity"),
    )
    def test_accepts_a_valid_path(self, path):
        assert _validations([_row(path=path)])[0].path == path

    @cases(
        dict(id="with a slash", path="household/carNumber"),
        dict(id="with an empty key", path="household..carNumber"),
        dict(id="after the token", path="${currentPerson}.age/years"),
    )
    def test_reports_an_invalid_response_path(self, path):
        assert _row_issue(path=path).startswith(
            f"Error in Validations - Invalid path in row 2: {path!r} - Must be a "
            "response path"
        )

    def test_reports_two_expansion_tokens(self):
        path = "${currentPerson}.${currentTrip}.mode"
        assert _row_issue(path=path) == (
            f"Error in Validations - Invalid path in row 2: {path!r} - only one "
            "expansion token is allowed in the path; found ${currentPerson}, "
            "${currentTrip}"
        )

    @cases(
        dict(id="in the middle", path="household.${currentPerson}.age"),
        dict(id="without a dot", path="${currentPerson}age"),
        dict(id="alone", path="${currentPerson}"),
    )
    def test_reports_a_token_that_does_not_start_the_path(self, path):
        assert _row_issue(path=path) == (
            f"Error in Validations - Invalid path in row 2: {path!r} - The expansion "
            "token must start the path, followed by a dot, e.g. '${currentPerson}.age'"
        )


class TestValue:
    @cases(
        dict(id="isBlank", comparison_operator="isBlank", value=None),
        dict(id="isNotInteger", comparison_operator="isNotInteger", value=None),
        dict(id="> an int", comparison_operator=">", value=18),
        dict(id="< a float", comparison_operator="<", value=0.5),
        dict(id=">= a negative number", comparison_operator=">=", value=-1),
        dict(id="<= zero", comparison_operator="<=", value=0),
        dict(id="=== a text", comparison_operator="===", value="no"),
        dict(id="=== a number", comparison_operator="===", value=2),
        dict(id="!== a bool", comparison_operator="!==", value=True),
    )
    def test_accepts_a_value_that_suits_the_operator(self, comparison_operator, value):
        validation = _validations(
            [_row(comparison_operator=comparison_operator, value=value)]
        )[0]
        assert validation.value == value

    @cases(
        dict(id="isBlank", comparison_operator="isBlank"),
        dict(id="isNotInteger", comparison_operator="isNotInteger"),
    )
    def test_reports_a_value_for_an_operator_that_takes_none(self, comparison_operator):
        assert _row_issue(comparison_operator=comparison_operator, value=3) == (
            "Error in Validations - Invalid row 2: value must be blank for "
            f"comparison_operator {comparison_operator!r}"
        )

    @cases(
        dict(id=">", comparison_operator=">"),
        dict(id="===", comparison_operator="==="),
        dict(id="!==", comparison_operator="!=="),
    )
    def test_reports_a_missing_value(self, comparison_operator):
        assert _row_issue(comparison_operator=comparison_operator, value=None) == (
            "Error in Validations - Invalid row 2: value is required for "
            f"comparison_operator {comparison_operator!r}"
        )

    @cases(
        dict(id="> a text", comparison_operator=">", value="18"),
        dict(id="< a bool", comparison_operator="<", value=True),
        dict(id=">= a text", comparison_operator=">=", value="many"),
        dict(id="<= a bool", comparison_operator="<=", value=False),
    )
    def test_reports_a_value_that_is_not_a_number(self, comparison_operator, value):
        assert _row_issue(comparison_operator=comparison_operator, value=value) == (
            "Error in Validations - Invalid row 2: value must be a number for "
            f"comparison_operator {comparison_operator!r}, got {value!r}"
        )

    def test_reports_a_value_that_is_not_primitive(self):
        assert _row_issue(comparison_operator="===", value=[1, 2]) == (
            "Error in Validations - Invalid row 2: value must be a bool, int, float, "
            "or str for comparison_operator '===', got [1, 2]"
        )


class TestErrorMessage:
    @cases(
        dict(id="French", column="error_message::fr"),
        dict(id="English", column="error_message::en"),
    )
    def test_reports_a_missing_language(self, column):
        assert _row_issue(**{column: None}) == (
            f"Error in Validations - Invalid row 2: {column} is required"
        )

    def test_reports_a_message_in_another_language(self):
        assert _issues([_row(**{"error_message::es": "Demasiado alto"})]) == [
            "Error in Validations - Unexpected columns: ['error_message::es']. The "
            "survey languages are ['fr', 'en']."
        ]

    def test_reports_every_problem_of_a_row_at_once(self):
        assert _row_issue(
            comparison_operator="isBlank", **{"error_message::en": None}
        ) == (
            "Error in Validations - Invalid row 2: value must be blank for "
            "comparison_operator 'isBlank'; error_message::en is required"
        )

    def test_needs_the_languages_in_its_context(self):
        with pytest.raises(RuntimeError, match="survey languages are missing"):
            Validations([_row()])


class TestValidations:
    def test_accepts_an_empty_sheet_without_context(self):
        assert len(Validations([])) == 0

    def test_keeps_the_rows_in_source_order(self):
        validations = _validations(
            [
                _row(error_name="required", comparison_operator="isBlank", value=None),
                _row(validation_name="yearValidation", error_name="tooLow"),
                _row(),
            ]
        )
        assert [(v.validation_name, v.error_name) for v in validations] == [
            ("personAgeValidation", "required"),
            ("yearValidation", "tooLow"),
            ("personAgeValidation", "tooHigh"),
        ]

    def test_groups_the_rows_by_validation_name(self):
        validations = _validations(
            [
                _row(error_name="required", comparison_operator="isBlank", value=None),
                _row(validation_name="yearValidation", error_name="tooLow"),
                _row(),
            ]
        )
        assert {
            name: [v.error_name for v in rows]
            for name, rows in validations.by_name().items()
        } == {
            "personAgeValidation": ["required", "tooHigh"],
            "yearValidation": ["tooLow"],
        }

    def test_reports_every_row_problem_at_once(self):
        assert _issues(
            [
                _row(error_name=None),
                _row(comparison_operator="isBlank"),
            ]
        ) == [
            "Error in Validations - Required field is missing in row 2. Missing "
            "fields: ['error_name']",
            "Error in Validations - Invalid row 3: value must be blank for "
            "comparison_operator 'isBlank'",
        ]

    def test_reports_a_duplicate_error_name_in_a_validation(self):
        assert _issues([_row(), _row(value=150)]) == [
            "Error in Validations - Duplicate error_name 'tooHigh' in "
            "validation_name 'personAgeValidation': found in rows [2, 3]"
        ]

    def test_accepts_an_error_name_repeated_in_another_validation(self):
        validations = _validations([_row(), _row(validation_name="yearValidation")])
        assert len(validations) == 2

    @cases(
        dict(
            id="two isBlank",
            columns={"comparison_operator": "isBlank", "value": None},
        ),
        dict(id="the same comparison", columns={}),
        dict(
            id="the same comparison of another path",
            columns={"path": "household.size"},
        ),
    )
    def test_reports_a_duplicate_check_in_a_validation(self, columns):
        assert _issues(
            [_row(error_name="first", **columns), _row(error_name="second", **columns)]
        ) == [
            "Error in Validations - Duplicate check in validation_name "
            "'personAgeValidation': rows [2, 3] have the same path, comparison_operator and "
            "value"
        ]

    @cases(
        dict(id="another path", second={"path": "household.size"}),
        dict(id="another operator", second={"comparison_operator": ">="}),
        dict(id="another value", second={"value": 150}),
        dict(
            id="a number and its text",
            second={"comparison_operator": "===", "value": "120"},
        ),
        dict(id="another validation", second={"validation_name": "yearValidation"}),
    )
    def test_accepts_checks_that_differ(self, second):
        first = {"comparison_operator": "===", "value": 120}
        validations = _validations(
            [_row(error_name="first", **first), _row(error_name="second", **second)]
        )
        assert len(validations) == 2

    def test_checks_the_rows_across_a_validation_only_once_each_row_is_valid(self):
        # The duplicate error_name isn't reported while row 3 has its own problem.
        assert _issues([_row(), _row(**{"error_message::fr": None})]) == [
            "Error in Validations - Invalid row 3: error_message::fr is required"
        ]

    def test_keeps_an_already_built_row_as_is(self):
        row = ValidationDefinition.model_validate(_row(), context=CONTEXT)
        assert _validations([row])[0] is row
