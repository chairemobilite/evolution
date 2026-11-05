# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for survey_definition/widgets_definition.py: WidgetDefinition, its parsed
# parameters and appearance, and the Widgets class that holds a checked sheet
# (constructing Widgets runs the per-row rules, then the rules across rows: unique
# question_name, labels only in the survey languages, group and join_with).

import pytest  # pyright: ignore[reportMissingImports]
from pydantic import ValidationError

from survey_definition.widgets_definition import (
    RADIO_NUMBER_MAX_CHOICES,
    WIDGET_INPUT_TYPES,
    WidgetAppearance,
    WidgetDefinition,
    WidgetParameters,
    Widgets,
)
from tests.parametrize_cases import cases

# The validation context SurveyDefinition passes, for a survey in French and English
# with these sections, conditionals, choices and input ranges.
CONTEXT = {
    "languages": ("fr", "en"),
    "section_names": {"home", "household"},
    "conditional_names": {"isAdultConditional"},
    "choice_values_by_name": {
        "yesNo": ["yes", "no"],
        "schoolType": ["school", "97", "other"],
    },
    "input_range_names": {"confidenceSlider"},
}

# What each input type needs besides the columns of _row, to be a valid row.
_EXTRA_BY_INPUT_TYPE: dict[str, dict] = {
    "Radio": {"choices": "yesNo"},
    "Select": {"choices": "yesNo"},
    "Checkbox": {"choices": "yesNo"},
    "Range": {"input_range": "confidenceSlider"},
    "RadioNumber": {"parameters": "min=0\nmax=5"},
    "BuiltIn": {"parameters": "builtInFunction={{getHomeWidget}}"},
}


def _row(input_type: str = "String", **extra) -> dict:
    """One valid Widgets row of `input_type`, keyed by its source (Excel) column names."""
    return {
        "question_name": "homeName",
        "input_type": input_type,
        "active": True,
        "section": "home",
        "path": "home.name",
        "label::fr": "Nom",
        "label::en": "Name",
        **_EXTRA_BY_INPUT_TYPE.get(input_type, {}),
        **extra,
    }


def _widgets(rows, context=CONTEXT) -> Widgets:
    """Build a Widgets table, as SurveyDefinition would."""
    return Widgets.model_validate(rows, context=context)


def _definition(row: dict, context=CONTEXT) -> WidgetDefinition:
    return WidgetDefinition.model_validate(row, context=context)


def _issues(rows: list, context=CONTEXT) -> list[str]:
    """Validate `rows` as a Widgets sheet, expecting it to fail; return each issue reported."""
    with pytest.raises(ValidationError) as error:
        _widgets(rows, context)
    assert error.value.error_count() == 1
    return str(error.value.errors()[0]["ctx"]["error"]).split("\n")


def _row_issue(row: dict, context=CONTEXT) -> str:
    """The single issue reported for a sheet of the one `row`."""
    issues = _issues([row], context)
    assert len(issues) == 1
    return issues[0]


class TestWidgetDefinition:
    @pytest.mark.parametrize("input_type", WIDGET_INPUT_TYPES)
    def test_accepts_a_valid_row_of_each_input_type(self, input_type):
        assert _definition(_row(input_type)).input_type == input_type

    def test_reads_the_columns_and_defaults(self):
        widget = _definition(_row())
        assert widget.question_name == "homeName"
        assert widget.label == {"fr": "Nom", "en": "Name"}
        assert widget.label_one == {}
        assert widget.group is None
        assert widget.parameters == WidgetParameters()
        assert widget.appearance == WidgetAppearance()
        assert widget.contains_html is False
        assert widget.two_columns is False
        assert widget.include_not_applicable is False

    def test_treats_blank_cells_as_absent(self):
        widget = _definition(_row(group="  ", conditional="", comments=None))
        assert widget.group is None
        assert widget.conditional is None
        assert widget.comments is None

    def test_reports_the_missing_required_fields(self):
        assert _row_issue({"label::fr": "Nom", "label::en": "Name"}) == (
            "Error in Widgets - Required field is missing in row 2. Missing fields: "
            "['question_name', 'input_type', 'active', 'section']"
        )

    def test_reports_an_unknown_input_type(self):
        assert _row_issue(_row(input_type="Slider")).startswith(
            "Error in Widgets - Invalid input_type in row 2: 'Slider' - Input should be "
            "'Custom', 'BuiltIn', 'Radio'"
        )

    @cases(
        dict(id="active as text", field_name="active", value="yes"),
        dict(id="active as a number other than 0 and 1", field_name="active", value=2),
        dict(id="active as French text", field_name="active", value="VRAI"),
        dict(id="active as the text 1", field_name="active", value="1"),
        dict(id="contains_html as text", field_name="contains_html", value="TRUE"),
        dict(id="question_name as a number", field_name="question_name", value=12),
    )
    def test_reports_a_value_of_the_wrong_type(self, field_name, value):
        assert _row_issue(_row(**{field_name: value})).startswith(
            f"Error in Widgets - Invalid {field_name} in row 2: {value!r} - "
        )

    @cases(
        dict(id="active 1", field_name="active", value=1, expected=True),
        dict(id="active 0", field_name="active", value=0, expected=False),
        dict(id="contains_html 1", field_name="contains_html", value=1, expected=True),
        dict(id="two_columns 0", field_name="two_columns", value=0, expected=False),
        dict(
            id="include_not_applicable 0",
            field_name="include_not_applicable",
            value=0,
            expected=False,
        ),
    )
    def test_reads_1_and_0_as_true_and_false(self, field_name, value, expected):
        # A spreadsheet sometimes turns TRUE/FALSE into 1/0, e.g. LibreOffice.
        assert getattr(_definition(_row(**{field_name: value})), field_name) is expected

    @cases(
        dict(id="Builtin", written="Builtin", expected="BuiltIn"),
        dict(id="radio", written="radio", expected="Radio"),
        dict(id="RADIONUMBER", written="RADIONUMBER", expected="RadioNumber"),
    )
    def test_reads_the_input_type_in_any_case(self, written, expected):
        row = _row(expected)
        row["input_type"] = written
        assert _definition(row).input_type == expected

    @cases(
        dict(
            id="question_name with a space",
            field_name="question_name",
            value="home name",
        ),
        dict(
            id="question_name with a digit first",
            field_name="question_name",
            value="1stName",
        ),
        dict(id="group with a dash", field_name="group", value="household-members"),
        dict(id="choices with a dot", field_name="choices", value="yes.no"),
        dict(id="help_popup with a space", field_name="help_popup", value="help popup"),
        dict(
            id="confirm_popup with a dash",
            field_name="confirm_popup",
            value="confirm-popup",
        ),
        dict(
            id="input_range with a digit first",
            field_name="input_range",
            value="1slider",
        ),
        dict(
            id="conditional with a dash",
            field_name="conditional",
            value="is-adultConditional",
        ),
    )
    def test_reports_a_name_that_is_not_a_typescript_identifier(
        self, field_name, value
    ):
        assert _row_issue(_row(**{field_name: value})).startswith(
            f"Error in Widgets - Invalid {field_name} in row 2: {value!r} - Must be a "
            "valid TypeScript identifier"
        )

    @cases(
        dict(id="one key", path="age"),
        dict(id="placeholder", path="household.persons.{_activePersonId}.age"),
        dict(
            id="two placeholders",
            path="household.persons.{_activePersonId}.journeys.{_activeJourneyId}.personDidTrips",
        ),
        dict(id="placeholder holding a path", path="trips.{_activeTrip.uuid}.mode"),
    )
    def test_accepts_a_response_path(self, path):
        assert _definition(_row(path=path)).path == path

    @cases(
        dict(
            id="empty key",
            input_type="String",
            field_name="path",
            path="home..name",
            extra={},
        ),
        dict(
            id="leading dot",
            input_type="String",
            field_name="path",
            path=".home",
            extra={},
        ),
        dict(
            id="trailing dot",
            input_type="String",
            field_name="path",
            path="home.",
            extra={},
        ),
        dict(
            id="space",
            input_type="String",
            field_name="path",
            path="home name",
            extra={},
        ),
        dict(
            id="empty placeholder",
            input_type="String",
            field_name="path",
            path="home.{}.name",
            extra={},
        ),
        dict(
            id="unclosed placeholder",
            input_type="String",
            field_name="path",
            path="home.{_activeId.name",
            extra={},
        ),
        dict(
            id="conditional expansion token",
            input_type="String",
            field_name="path",
            path="${relativePath}.age",
            extra={},
        ),
        dict(
            id="custom_path with a slash",
            input_type="Radio",
            field_name="custom_path",
            path="home/other",
            extra={"custom_choice": "yes"},
        ),
    )
    def test_reports_an_invalid_response_path(
        self, input_type, field_name, path, extra
    ):
        assert _row_issue(_row(input_type, **{field_name: path}, **extra)).startswith(
            f"Error in Widgets - Invalid {field_name} in row 2: {path!r} - Must be a "
            "response path"
        )

    @cases(
        dict(id="built in", validation="requiredValidation"),
        dict(id="built in for a household", validation="householdSizeValidation"),
        dict(id="re-exported built in", validation="carNumberValidation"),
        dict(id="custom", validation="homeNameCustomValidation"),
    )
    def test_accepts_a_built_in_or_custom_validation(self, validation):
        assert _definition(_row(validation=validation)).validation == validation

    @cases(
        dict(id="neither built in nor custom", validation="homeNameValidation"),
        dict(id="custom with a space", validation="home nameCustomValidation"),
    )
    def test_reports_an_unknown_validation(self, validation):
        assert _row_issue(_row(validation=validation)).startswith(
            f"Error in Widgets - Invalid validation in row 2: {validation!r} - Must be "
            "one of ["
        )

    def test_accepts_a_conditional_without_the_conditional_suffix(self):
        # Whether the suffix is required is still open (chairemobilite/evolution#2157).
        context = {**CONTEXT, "conditional_names": {"householdHasCars"}}
        widget = _definition(_row(conditional="householdHasCars"), context)
        assert widget.conditional == "householdHasCars"


class TestInputTypeRules:
    @cases(
        dict(id="Custom", input_type="Custom"),
        dict(id="BuiltIn", input_type="BuiltIn"),
    )
    def test_accepts_a_hand_written_widget_without_path_or_label(self, input_type):
        row = _row(input_type)
        for column in ("path", "label::fr", "label::en"):
            row.pop(column)
        widget = _definition(row)
        assert widget.path is None
        assert widget.label == {}

    @cases(
        dict(id="String without path", input_type="String", missing_field="path"),
        dict(
            id="NextButton without path", input_type="NextButton", missing_field="path"
        ),
        dict(id="Radio without choices", input_type="Radio", missing_field="choices"),
        dict(id="Select without choices", input_type="Select", missing_field="choices"),
        dict(
            id="Checkbox without choices",
            input_type="Checkbox",
            missing_field="choices",
        ),
        dict(
            id="Range without input_range",
            input_type="Range",
            missing_field="input_range",
        ),
    )
    def test_reports_a_field_the_input_type_requires(self, input_type, missing_field):
        row = _row(input_type)
        row.pop(missing_field)
        assert _row_issue(row) == (
            f"Error in Widgets - Invalid row 2: {missing_field} is required for "
            f"input_type {input_type!r}"
        )

    @cases(
        dict(
            id="choices on InfoText",
            input_type="InfoText",
            field_name="choices",
            value="yesNo",
        ),
        dict(
            id="choices on String",
            input_type="String",
            field_name="choices",
            value="yesNo",
        ),
        dict(
            id="input_range on Radio",
            input_type="Radio",
            field_name="input_range",
            value="confidenceSlider",
        ),
        dict(
            id="confirm_popup on Radio",
            input_type="Radio",
            field_name="confirm_popup",
            value="confirmPopup",
        ),
        dict(
            id="help_popup on NextButton",
            input_type="NextButton",
            field_name="help_popup",
            value="helpPopup",
        ),
        dict(
            id="help_popup on InfoText",
            input_type="InfoText",
            field_name="help_popup",
            value="helpPopup",
        ),
        dict(
            id="validation on Custom",
            input_type="Custom",
            field_name="validation",
            value="emailValidation",
        ),
        dict(
            id="validation on NextButton",
            input_type="NextButton",
            field_name="validation",
            value="emailValidation",
        ),
        dict(
            id="default_value on Number",
            input_type="Number",
            field_name="default_value",
            value="5",
        ),
        dict(
            id="include_not_applicable on Radio",
            input_type="Radio",
            field_name="include_not_applicable",
            value=True,
        ),
        dict(
            id="two_columns on InfoText",
            input_type="InfoText",
            field_name="two_columns",
            value=True,
        ),
        dict(
            id="appearance on InfoText",
            input_type="InfoText",
            field_name="appearance",
            value="join_with=${homeCity}",
        ),
    )
    def test_reports_a_field_the_input_type_does_not_use(
        self, input_type, field_name, value
    ):
        assert _row_issue(_row(input_type, **{field_name: value})).startswith(
            f"Error in Widgets - Invalid row 2: {field_name} is not used by input_type "
            f"{input_type!r}, only by ["
        )

    @cases(
        dict(
            id="documented Custom",
            input_type="Custom",
            fields={"choices": "yesNo", "conditional": "isAdultConditional"},
        ),
        dict(
            id="RadioNumber additional choices",
            input_type="RadioNumber",
            fields={"choices": "yesNo"},
        ),
        dict(
            id="String default value",
            input_type="String",
            fields={"default_value": "Canada", "help_popup": "helpPopup"},
        ),
        dict(
            id="Range not applicable",
            input_type="Range",
            fields={"include_not_applicable": True},
        ),
        dict(
            id="NextButton confirm popup",
            input_type="NextButton",
            fields={"confirm_popup": "confirmPopup"},
        ),
        dict(
            id="Radio custom choice",
            input_type="Radio",
            fields={"custom_path": "otherName", "custom_choice": "yes"},
        ),
    )
    def test_accepts_the_fields_the_input_type_uses(self, input_type, fields):
        _definition(_row(input_type, **fields))

    def test_does_not_count_a_false_flag_as_set(self):
        widget = _definition(
            _row("InfoText", two_columns=False, include_not_applicable=False)
        )
        assert widget.two_columns is False

    @cases(
        dict(id="custom_path alone", fields={"custom_path": "otherName"}),
        dict(id="custom_choice alone", fields={"custom_choice": "yes"}),
    )
    def test_reports_custom_path_and_custom_choice_set_apart(self, fields):
        assert _row_issue(_row("Radio", **fields)) == (
            "Error in Widgets - Invalid row 2: custom_path and custom_choice must be "
            "set together"
        )

    @cases(
        dict(
            id="custom_choice",
            input_type="Radio",
            field_name="custom_choice",
            extra={
                "choices": "schoolType",
                "custom_path": "otherSchool",
                "custom_choice": 97,
            },
        ),
        dict(
            id="default_value",
            input_type="String",
            field_name="default_value",
            extra={"default_value": 1.5},
        ),
    )
    def test_reads_a_number_as_text(self, input_type, field_name, extra):
        value = getattr(_definition(_row(input_type, **extra)), field_name)
        assert value == str(extra[field_name])


class TestLabels:
    @cases(
        dict(id="String label", input_type="String"),
        dict(id="InfoText text", input_type="InfoText"),
        dict(id="NextButton label", input_type="NextButton"),
    )
    def test_reports_a_missing_label(self, input_type):
        row = _row(input_type)
        row.pop("label::en")
        assert (
            _row_issue(row) == "Error in Widgets - Invalid row 2: label::en is required"
        )

    def test_does_not_require_a_label_with_custom_labels(self):
        row = _row(parameters="customLabels={{homeNameCustomLabels}}")
        row.pop("label::fr")
        row.pop("label::en")
        assert _definition(row).parameters.custom_labels == "homeNameCustomLabels"

    def test_reports_a_custom_widget_label_missing_a_language(self):
        row = _row("Custom")
        row.pop("label::en")
        assert _row_issue(row) == (
            "Error in Widgets - Invalid row 2: label::en is required when label is set "
            "in another language"
        )

    def test_reports_a_label_one_missing_a_language(self):
        assert _row_issue(_row(**{"label_one::fr": "Ton nom"})) == (
            "Error in Widgets - Invalid row 2: label_one::en is required when "
            "label_one is set in another language"
        )

    def test_reads_label_one_in_every_language(self):
        widget = _definition(
            _row(**{"label_one::fr": "Ton nom", "label_one::en": "Your name"})
        )
        assert widget.label_one == {"fr": "Ton nom", "en": "Your name"}

    def test_reports_a_label_in_another_language(self):
        assert _issues([_row(**{"label::es": "Nombre"})]) == [
            "Error in Widgets - Unexpected columns: ['label::es']. The survey "
            "languages are ['fr', 'en']."
        ]

    def test_needs_the_survey_languages_in_its_context(self):
        with pytest.raises(RuntimeError, match="survey languages are missing"):
            Widgets([_row()])

    def test_needs_no_language_for_a_widget_without_label(self):
        row = _row("Custom")
        row.pop("label::fr")
        row.pop("label::en")
        assert len(Widgets([row])) == 1


class TestWidgetParameters:
    @cases(
        dict(id="new lines", text="min=1\nmax=6\noverMaxAllowed"),
        dict(id="semicolons", text="min=1;max=6;overMaxAllowed"),
        dict(id="spaces", text="min=1 max=6 overMaxAllowed"),
        dict(id="mixed and padded", text="  min=1;\n max=6 ;overMaxAllowed\n"),
    )
    def test_parses_parameters_with_any_separator(self, text):
        assert WidgetParameters.parse(text) == WidgetParameters(
            min=1, max=6, over_max_allowed=True
        )

    @cases(
        dict(
            id="customLabels",
            text="customLabels={{personCustomLabels}}",
            expected=WidgetParameters(custom_labels="personCustomLabels"),
        ),
        dict(
            id="builtInFunction",
            text="builtInFunction={{getWidget}}",
            expected=WidgetParameters(built_in_function="getWidget"),
        ),
        dict(
            id="min as a path",
            text="min=household.size max=-1",
            expected=WidgetParameters(min="household.size", max=-1),
        ),
        dict(
            id="built in formatter",
            text="formatter=canadianPostalCodeFormatter",
            expected=WidgetParameters(formatter="canadianPostalCodeFormatter"),
        ),
        dict(
            id="custom formatter",
            text="formatter=codeCustomFormatter",
            expected=WidgetParameters(formatter="codeCustomFormatter"),
        ),
        dict(
            id="suffixLabel",
            text="suffixLabel=home:home.size.valueSuffix",
            expected=WidgetParameters(suffix_label="home:home.size.valueSuffix"),
        ),
    )
    def test_parses_each_parameter(self, text, expected):
        assert WidgetParameters.parse(text) == expected

    def test_parses_parameter_names_in_any_case(self):
        parameters = WidgetParameters.parse(
            "Min=0\nMAX=4\nOverMaxAllowed\ncustomlabels={{householdSizeCustomLabels}}"
        )
        assert parameters == WidgetParameters(
            min=0,
            max=4,
            over_max_allowed=True,
            custom_labels="householdSizeCustomLabels",
        )
        assert parameters.names_set() == [
            "customLabels",
            "min",
            "max",
            "overMaxAllowed",
        ]

    @cases(
        dict(
            id="unknown",
            text="minimum=1",
            expected_issue="unknown parameter 'minimum', expected one of [",
        ),
        dict(
            id="repeated in another case",
            text="min=1 MIN=2",
            expected_issue="parameter 'min' is set more than once",
        ),
        dict(
            id="repeated",
            text="min=1 min=2",
            expected_issue="parameter 'min' is set more than once",
        ),
        dict(
            id="no value",
            text="min",
            expected_issue="parameter 'min' needs a value, e.g. min=...",
        ),
        dict(
            id="empty value",
            text="min=",
            expected_issue="parameter 'min' needs a value",
        ),
        dict(
            id="flag with a value",
            text="overMaxAllowed=true",
            expected_issue="overMaxAllowed takes no value",
        ),
        dict(
            id="customLabels without braces",
            text="customLabels=someLabels",
            expected_issue="customLabels must be written customLabels={{someName}}",
        ),
        dict(
            id="builtInFunction with a space",
            text="builtInFunction={{get widget}}",
            expected_issue="builtInFunction must be written",
        ),
        dict(
            id="max as a decimal",
            text="max=1.5",
            expected_issue="max must be a whole number or a response path without placeholders, "
            "e.g. household.size, got '1.5'",
        ),
        dict(
            id="max with a conditional token",
            text="max=${currentPerson}.travelToWorkDays",
            expected_issue="max must be a whole number or a response path without placeholders",
        ),
        dict(
            id="max with a placeholder",
            text="max=household.persons.{_activePersonId}.travelToWorkDays",
            expected_issue="max must be a whole number or a response path without placeholders",
        ),
        dict(
            id="unknown formatter",
            text="formatter=upperCase",
            expected_issue="formatter 'upperCase' must be one of [",
        ),
        dict(
            id="suffixLabel without namespace",
            text="suffixLabel=valueSuffix",
            expected_issue="suffixLabel must be written suffixLabel=namespace:key",
        ),
    )
    def test_reports_an_invalid_parameter(self, text, expected_issue):
        with pytest.raises(ValueError) as error:
            WidgetParameters.parse(text)
        assert expected_issue in str(error.value)

    def test_reports_every_invalid_parameter_at_once(self):
        with pytest.raises(ValueError) as error:
            WidgetParameters.parse("minimum=1 max=a.")
        assert str(error.value).count(";") == 1

    def test_reports_invalid_parameters_on_the_row(self):
        assert _row_issue(_row(parameters="formatter=upperCase")).startswith(
            "Error in Widgets - Invalid parameters in row 2: 'formatter=upperCase' - "
            "formatter 'upperCase' must be one of"
        )

    def test_lists_the_parameters_set_by_their_sheet_names(self):
        parameters = WidgetParameters.parse("min=0 max=5 overMaxAllowed")
        assert parameters.names_set() == ["min", "max", "overMaxAllowed"]

    @cases(
        dict(id="min on String", input_type="String", parameters="min=0", name="min"),
        dict(
            id="formatter on Number",
            input_type="Number",
            parameters="formatter=canadianPostalCodeFormatter",
            name="formatter",
        ),
        dict(
            id="suffixLabel on Radio",
            input_type="Radio",
            parameters="suffixLabel=home:suffix",
            name="suffixLabel",
        ),
        dict(
            id="customLabels on Custom",
            input_type="Custom",
            parameters="customLabels={{someLabels}}",
            name="customLabels",
        ),
        dict(
            id="builtInFunction on String",
            input_type="String",
            parameters="builtInFunction={{getWidget}}",
            name="builtInFunction",
        ),
    )
    def test_reports_a_parameter_the_input_type_does_not_use(
        self, input_type, parameters, name
    ):
        assert _row_issue(_row(input_type, parameters=parameters)).startswith(
            f"Error in Widgets - Invalid row 2: parameter {name!r} is not used by "
            f"input_type {input_type!r}, only by ["
        )

    @cases(
        dict(
            id="RadioNumber without min",
            input_type="RadioNumber",
            parameters="max=5",
            missing=["min"],
        ),
        dict(
            id="RadioNumber without min and max",
            input_type="RadioNumber",
            parameters=None,
            missing=["min", "max"],
        ),
    )
    def test_reports_a_parameter_the_input_type_requires(
        self, input_type, parameters, missing
    ):
        assert _row_issue(_row(input_type, parameters=parameters)) == (
            "Error in Widgets - Invalid row 2: "
            + "; ".join(
                f"parameter {name!r} is required for input_type {input_type!r}"
                for name in missing
            )
        )

    @cases(
        dict(id="from zero", parameters="min=0 max=5"),
        dict(
            id="as many choices as allowed",
            parameters=f"min=1 max={RADIO_NUMBER_MAX_CHOICES}",
        ),
        dict(id="max as a path", parameters="min=1 max=household.size"),
        dict(id="min as a path is not compared", parameters="min=household.size max=1"),
    )
    def test_accepts_a_radio_number_range(self, parameters):
        _definition(_row("RadioNumber", parameters=parameters))

    @cases(
        dict(
            id="min equal to max",
            parameters="min=5 max=5",
            expected_issue="parameter min (5) must be less than max (5)",
        ),
        dict(
            id="min above max",
            parameters="min=6 max=1",
            expected_issue="parameter min (6) must be less than max (1)",
        ),
        dict(
            id="too many choices",
            parameters=f"min=0 max={RADIO_NUMBER_MAX_CHOICES}",
            expected_issue=f"parameters min (0) and max ({RADIO_NUMBER_MAX_CHOICES}) give "
            f"{RADIO_NUMBER_MAX_CHOICES + 1} choices, more than the "
            f"{RADIO_NUMBER_MAX_CHOICES} a RadioNumber may show",
        ),
    )
    def test_reports_an_invalid_radio_number_range(self, parameters, expected_issue):
        assert _row_issue(_row("RadioNumber", parameters=parameters)) == (
            f"Error in Widgets - Invalid row 2: {expected_issue}"
        )

    def test_accepts_a_built_in_widget_without_built_in_function(self):
        # The generator doesn't write BuiltIn widgets yet, only a placeholder comment.
        widget = _definition(_row("BuiltIn", parameters=None))
        assert widget.parameters.built_in_function is None


class TestWidgetAppearance:
    def test_parses_join_with(self):
        assert WidgetAppearance.parse("join_with=${contactEmail}") == WidgetAppearance(
            join_with="contactEmail"
        )

    @cases(
        dict(
            id="unknown",
            text="joinWith=${contactEmail}",
            expected_issue="unknown appearance 'joinWith', expected 'join_with'",
        ),
        dict(
            id="without ${}",
            text="join_with=contactEmail",
            expected_issue="join_with must be written join_with=${questionName}, got 'contactEmail'",
        ),
        dict(
            id="not a valid question name",
            text="join_with=${contact-email}",
            expected_issue="join_with must be written join_with=${questionName}, got '${contact-email}'",
        ),
        dict(
            id="no value",
            text="join_with",
            expected_issue="join_with must be written join_with=${questionName}, got None",
        ),
        dict(
            id="repeated",
            text="join_with=${a} join_with=${b}",
            expected_issue="join_with is set more than once",
        ),
    )
    def test_reports_an_invalid_appearance(self, text, expected_issue):
        with pytest.raises(ValueError) as error:
            WidgetAppearance.parse(text)
        assert str(error.value) == expected_issue


class TestNamesOfOtherTables:
    @cases(
        dict(id="conditional", fields={"conditional": "isAdultConditional"}),
        dict(id="custom conditional", fields={"conditional": "isKidCustomConditional"}),
        dict(id="custom choices", fields={"choices": "homeCustomChoices"}),
        # The generator reads the suffix in any case (see generate_widgets.py).
        dict(
            id="custom choices in another case", fields={"choices": "homeCustomchoices"}
        ),
        dict(
            id="custom_choice of the list",
            fields={
                "choices": "schoolType",
                "custom_path": "otherSchool",
                "custom_choice": "other",
            },
        ),
        dict(
            id="custom_choice of custom choices",
            fields={
                "choices": "homeCustomChoices",
                "custom_path": "otherSchool",
                "custom_choice": "other",
            },
        ),
    )
    def test_accepts_names_of_the_other_tables(self, fields):
        _definition(_row("Radio", **fields))

    @cases(
        dict(
            id="section",
            input_type="String",
            fields={"section": "work"},
            expected_issue="section 'work' does not match any section of the Sections table",
        ),
        dict(
            id="conditional",
            input_type="String",
            fields={"conditional": "isKidConditional"},
            expected_issue="conditional 'isKidConditional' does not match any conditional_name of the Conditionals table",
        ),
        dict(
            id="choices",
            input_type="Radio",
            fields={"choices": "noYes"},
            expected_issue="choices 'noYes' does not match any choicesName of the Choices table",
        ),
        dict(
            id="custom_choice",
            input_type="Radio",
            fields={
                "choices": "schoolType",
                "custom_path": "otherSchool",
                "custom_choice": "others",
            },
            expected_issue="custom_choice 'others' does not match any value of the 'schoolType' choices",
        ),
        dict(
            id="input_range",
            input_type="Range",
            fields={"input_range": "ageSlider"},
            expected_issue="input_range 'ageSlider' does not match any input_range_name of the InputRange table",
        ),
    )
    def test_reports_a_name_missing_from_its_table(
        self, input_type, fields, expected_issue
    ):
        assert _row_issue(_row(input_type, **fields)) == (
            f"Error in Widgets - Invalid row 2: {expected_issue}"
        )

    def test_does_not_check_the_names_missing_from_the_context(self):
        row = _row(
            "Radio",
            section="work",
            conditional="isKidConditional",
            choices="noYes",
            custom_path="otherName",
            custom_choice="others",
        )
        assert _definition(row, context={"languages": ("fr", "en")}).section == "work"

    def test_reports_every_problem_of_a_row_at_once(self):
        row = _row("InfoText", section="work", choices="yesNo")
        row.pop("label::en")
        assert _row_issue(row) == (
            "Error in Widgets - Invalid row 2: choices is not used by input_type "
            "'InfoText', only by ['BuiltIn', 'Checkbox', 'Custom', 'Radio', "
            "'RadioNumber', 'Select']; label::en is required; section 'work' does not "
            "match any section of the Sections table"
        )


def _person_row(question_name: str, input_type: str = "String", **extra) -> dict:
    """A widget of the householdMembers group, in the household section."""
    return _row(
        input_type,
        question_name=question_name,
        section="household",
        group="householdMembers",
        path=question_name,
        **extra,
    )


_GROUP_ROW = _row("Custom", question_name="householdMembers", section="household")


class TestWidgets:
    def test_holds_the_rows_in_source_order(self):
        widgets = _widgets([_row(), _row(question_name="homeCity")])
        assert [widget.question_name for widget in widgets] == ["homeName", "homeCity"]
        assert len(widgets) == 2
        assert widgets[1].question_name == "homeCity"

    def test_keeps_an_already_built_row(self):
        widget = _definition(_row())
        assert _widgets([widget])[0] is widget

    @cases(
        dict(
            id="generated widget in two sections",
            rows=[_row(), _row(section="household")],
            expected_row_numbers=[2, 3],
        ),
        dict(
            id="Custom widget twice in a section",
            rows=[_row("Custom"), _row("Custom")],
            expected_row_numbers=[2, 3],
        ),
        dict(
            id="different input types",
            rows=[_row("BuiltIn"), _row("Custom", section="household")],
            expected_row_numbers=[2, 3],
        ),
    )
    def test_reports_a_repeated_question_name(self, rows, expected_row_numbers):
        # widgetsConfigs.tsx gathers the widgets of every section in one object.
        assert _issues(rows) == [
            "Error in Widgets - Duplicate question_name 'homeName': found in rows "
            f"{expected_row_numbers}. Only a Custom or BuiltIn widget may be repeated, "
            "once per section, with the same input_type."
        ]

    @cases(
        dict(id="Custom", input_type="Custom"),
        dict(id="BuiltIn", input_type="BuiltIn"),
    )
    def test_accepts_a_hand_written_widget_repeated_in_other_sections(self, input_type):
        widgets = _widgets([_row(input_type), _row(input_type, section="household")])
        assert [widget.section for widget in widgets] == ["home", "household"]

    def test_reports_the_problems_of_every_row_at_once(self):
        assert _issues(
            [_row(active="yes"), _row("Radio", question_name="homeCity", choices=None)]
        ) == [
            "Error in Widgets - Invalid active in row 2: 'yes' - Input should be a valid boolean",
            "Error in Widgets - Invalid row 3: choices is required for input_type 'Radio'",
        ]

    def test_accepts_a_widget_in_a_built_in_group(self):
        # Evolution provides group widgets too, e.g. groupPersonTrips.
        group = _row("BuiltIn", question_name="householdMembers", section="household")
        widgets = _widgets([group, _person_row("personAge", "Number")])
        assert widgets[1].group == "householdMembers"

    def test_accepts_a_widget_in_a_group(self):
        widgets = _widgets([_GROUP_ROW, _person_row("personAge", "Number")])
        assert widgets[1].group == "householdMembers"

    @cases(
        dict(
            id="no such widget",
            rows=[_person_row("personAge")],
            expected_issue="'householdMembers' - Does not match any question_name.",
        ),
        dict(
            id="its own group",
            rows=[
                _row(
                    "Custom",
                    question_name="householdMembers",
                    section="household",
                    group="householdMembers",
                )
            ],
            expected_issue="'householdMembers' - A widget cannot be its own group.",
        ),
        dict(
            id="not a Custom or BuiltIn widget",
            rows=[
                _row(
                    "InfoText",
                    question_name="householdMembers",
                    section="household",
                ),
                _person_row("personAge"),
            ],
            expected_issue="'householdMembers' - Must name a Custom or BuiltIn widget (the group), but it is a InfoText widget.",
        ),
        dict(
            id="another section",
            rows=[
                _row("Custom", question_name="householdMembers", section="home"),
                _person_row("personAge"),
            ],
            expected_issue="'householdMembers' - The group is in section 'home', not in 'household'.",
        ),
    )
    def test_reports_an_invalid_group(self, rows, expected_issue):
        row_number = len(rows) + 1
        assert _issues(rows) == [
            f"Error in Widgets - Invalid group in row {row_number}: {expected_issue}"
        ]

    def test_accepts_join_with_the_next_or_previous_widget(self):
        _widgets(
            [
                _row(question_name="contactEmail"),
                _row(
                    question_name="phoneNumber", appearance="join_with=${contactEmail}"
                ),
                _row(question_name="homeCity", appearance="join_with=${phoneNumber}"),
            ]
        )

    def test_skips_inactive_widgets_between_joined_widgets(self):
        _widgets(
            [
                _row(question_name="contactEmail"),
                _row(question_name="contactFax", active=False),
                _row(
                    question_name="phoneNumber", appearance="join_with=${contactEmail}"
                ),
            ]
        )

    def test_does_not_check_join_with_of_an_inactive_widget(self):
        _widgets([_row(active=False, appearance="join_with=${nowhere}")])

    @cases(
        dict(
            id="itself",
            rows=[_row(appearance="join_with=${homeName}")],
            expected_issue="'homeName' - A widget cannot join with itself.",
        ),
        dict(
            id="no such widget",
            rows=[_row(appearance="join_with=${homeCity}")],
            expected_issue="'homeCity' - Does not match any question_name.",
        ),
        dict(
            id="another section",
            rows=[
                _row(question_name="homeCity", section="household"),
                _row(appearance="join_with=${homeCity}"),
            ],
            expected_issue="'homeCity' - Must name a widget of the same section and group.",
        ),
        dict(
            id="inactive widget",
            rows=[
                _row(question_name="homeCity", active=False),
                _row(appearance="join_with=${homeCity}"),
            ],
            expected_issue="'homeCity' - Must name an active widget.",
        ),
        dict(
            id="not a neighbour",
            rows=[
                _row(question_name="homeCity"),
                _row(question_name="homeRegion"),
                _row(appearance="join_with=${homeCity}"),
            ],
            expected_issue="'homeCity' - Must name the widget just before or after this one.",
        ),
    )
    def test_reports_an_invalid_join_with(self, rows, expected_issue):
        row_number = len(rows) + 1
        assert _issues(rows) == [
            f"Error in Widgets - Invalid join_with in row {row_number}: {expected_issue}"
        ]

    def test_checks_groups_only_once_the_rows_are_valid(self):
        assert _issues([_person_row("personAge", active="yes")]) == [
            "Error in Widgets - Invalid active in row 2: 'yes' - Input should be a valid boolean"
        ]
