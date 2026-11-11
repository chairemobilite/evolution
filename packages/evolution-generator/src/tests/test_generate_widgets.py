# Copyright 2025, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

import os
import shutil
import tempfile

import pytest
from helpers.generator_helpers import load_survey_definition
from scripts.generate_widgets import (
    ImportFlags,
    generate_choices,
    generate_additional_choices,
    generate_join_with,
    generate_common_properties,
    generate_info_text_widget,
    generate_range_widget,
    generate_text_widget,
    generate_radio_widget,
    generate_radio_number_widget,
    generate_select_widget,
    generate_next_button_widget,
    generate_string_widget,
    generate_widget_name,
    generate_widget_statement,
    generate_suffix_label_code,
    generate_label,
    generate_path,
    generate_import_statements,
    get_widgets_file_import_flags,
    GenderFields,
    generate_widgets,
)
from survey_definition.excel_survey_definition_reader import ExcelSurveyDefinitionReader
from survey_definition.survey_definition import SurveyDefinition
from survey_definition.widgets_definition import WidgetDefinition
from tests.parametrize_cases import cases

# TODO: Test generate_widgets_names_statements

# The columns an input type requires, besides the ones every widget has (see widget)
_REQUIRED_COLUMNS_BY_INPUT_TYPE = {
    "Radio": {"choices": "yesNo"},
    "Select": {"choices": "yesNo"},
    "Checkbox": {"choices": "yesNo"},
    "Range": {"input_range": "satisfactionRange"},
    "RadioNumber": {"parameters": "min=0\nmax=6"},
}


def widget(input_type: str = "String", **columns) -> WidgetDefinition:
    """
    A widget of `input_type`, validated like a row of the Widgets sheet, from these
    columns (e.g. `widget("Radio", choices="yesNo")`, or `**{"label::en": "..."}`).
    A column left out gets a valid value, e.g. the choices of a Radio.
    """
    row = {
        "question_name": "someQuestion",
        "input_type": input_type,
        "active": True,
        "section": "home",
        "path": "home.someQuestion",
        "label::fr": "Une question",
        "label::en": "A question",
        **_REQUIRED_COLUMNS_BY_INPUT_TYPE.get(input_type, {}),
        **columns,
    }
    return WidgetDefinition.model_validate(row, context={"languages": ("fr", "en")})


def widget_code(generate, input_type: str = "String", **columns) -> str:
    """The code `generate` writes for the widget of `input_type` with these columns (see widget)."""
    definition = widget(input_type, **columns)
    return generate(definition, generate_label(definition))


class TestGenerateImportStatements:
    """Tests for generate_import_statements function"""

    def test_generate_import_statements_basic(self):
        """Test generate_import_statements with all flags False (basic case)"""
        import_flags = ImportFlags(
            has_choices_import=False,
            has_custom_choices_import=False,
            has_conditionals_import=False,
            has_input_range_import=False,
            has_custom_widgets_import=False,
            has_validations_import=False,
            has_custom_validations_import=False,
            has_custom_conditionals_import=False,
            has_help_popup_import=False,
            has_helper_import=False,
            has_formatter_import=False,
            has_custom_formatter_import=False,
            has_custom_labels_import=False,
            has_nickname_label=False,
            has_persons_count_label=False,
            has_gendered_suffix_label=False,
        )
        result = generate_import_statements(import_flags)

        # Should always import TFunction, defaultInputBase, defaultConditional, WidgetConfig
        assert "import { TFunction } from 'i18next';" in result
        assert "import * as defaultInputBase" in result
        assert "import { defaultConditional }" in result
        assert "import * as WidgetConfig" in result

        # Should not import optional imports
        assert "import * as choices" not in result
        assert "import * as customChoices" not in result
        assert "import * as conditionals" not in result
        assert "import * as customWidgets" not in result
        assert "import * as customValidations" not in result
        assert "import * as customConditionals" not in result
        assert "import * as customHelpPopup" not in result
        assert "import * as inputRange" not in result
        assert "import * as validations" not in result
        assert "import * as formatters" not in result
        assert "import * as customFormatters" not in result
        assert "import * as customLabels" not in result

        # Should not import odSurveyHelpers, surveyHelper, or genderedSuffixes
        assert "odSurveyHelpers" not in result
        assert "surveyHelper" not in result
        assert "getGenderedSuffixes" not in result

    def test_generate_import_statements_complex(self):
        """Test generate_import_statements with all flags True (complex case)"""
        import_flags = ImportFlags(
            has_choices_import=True,
            has_custom_choices_import=True,
            has_conditionals_import=True,
            has_input_range_import=True,
            has_custom_widgets_import=True,
            has_validations_import=True,
            has_custom_validations_import=True,
            has_custom_conditionals_import=True,
            has_help_popup_import=True,
            has_helper_import=True,
            has_formatter_import=True,
            has_custom_formatter_import=True,
            has_custom_labels_import=True,
            has_nickname_label=True,
            has_persons_count_label=True,
            has_gendered_suffix_label=True,
        )

        result = generate_import_statements(import_flags)

        # Should always import TFunction, defaultInputBase, defaultConditional, WidgetConfig
        assert "import { TFunction } from 'i18next';" in result
        assert "import * as defaultInputBase" in result
        assert "import { defaultConditional }" in result
        assert "import * as WidgetConfig" in result

        # Should import all required imports
        assert "import * as choices" in result
        assert "import * as customChoices" in result
        assert "import * as conditionals" in result
        assert "import * as customWidgets" in result
        assert "import * as customValidations" in result
        assert "import * as customConditionals" in result
        assert "import * as customHelpPopup" in result
        assert "import * as inputRange" in result
        assert "import * as validations" in result
        assert "import * as formatters" in result
        assert "import * as customFormatters" in result
        assert "import * as customLabels from '../../common/customLabels';" in result
        assert "import * as odSurveyHelpers" in result
        assert "import * as surveyHelper" in result
        assert (
            "import { getGenderedSuffixes" in result
            or "import { getGenderedSuffixes }" in result
        )
        assert "import * as validations" in result
        assert "import _escape from 'lodash/escape'" in result


# TODO: Test generate_custom_widget
# TODO: Test generate_comma
# TODO: Test generate_skip_line
# TODO: Test generate_constExport
# TODO: Test generate_defaultInputBase


def test_generate_path_valid():
    """Test generate_path with a valid path"""
    result = generate_path("foo.{baz}.bar_123")
    assert "path: 'foo.{baz}.bar_123'" in result


def test_generate_join_with_with_value():
    """Test that generate_join_with returns the correct string when a questionName value is provided"""
    result = generate_join_with("questionName")
    assert "joinWith: 'questionName',\n" in result


def test_generate_join_with_without_value():
    """Test that generate_join_with returns an empty string when no questionName value is provided"""
    result = generate_join_with("")
    assert result == ""


class TestGenerateLabel:
    """Tests for generate_label function"""

    # Default gender fields for tests - gender is available, sex assigned at birth is not
    GENDER_FIELDS = GenderFields(has_gender=True, has_sex_assigned_at_birth=False)

    def _label(self, gender_fields=GENDER_FIELDS, **columns):
        """The label generate_label writes for the String widget fooBar of sectionA with these columns."""
        return generate_label(
            widget(question_name="fooBar", section="sectionA", **columns),
            gender_fields=gender_fields,
        )

    def test_generate_label_basic(self):
        """Test generate_label returns a simple label function when no special context is needed"""
        result = self._label(
            **{"label::fr": "Quel est votre nom?", "label::en": "What is your name?"}
        )
        assert "label: (t: TFunction) => t('sectionA:fooBar')" in result
        assert "return t('sectionA:fooBar', {" not in result
        assert "const activePerson =" not in result
        assert "const nickname =" not in result
        assert "const countPersons =" not in result
        assert "const personGender =" not in result

    def test_generate_label_custom_labels_success(self):
        """Test generate_label returns customLabels reference when customLabels={{...}} is present in parameters"""
        result = self._label(parameters="customLabels={{personSchoolTypeCustomLabels}}")
        assert "label: customLabels.personSchoolTypeCustomLabels" in result
        assert "t('sectionA:fooBar')" not in result

    @cases(
        dict(
            id="lower case", parameters="customlabels={{personSchoolTypeCustomLabels}}"
        ),
        dict(
            id="capitalized", parameters="CustomLabels={{personSchoolTypeCustomLabels}}"
        ),
    )
    def test_generate_label_custom_labels_name_is_case_insensitive(self, parameters):
        """Test generate_label reads customLabels whatever the case of the parameter name, like the other parameters"""
        result = self._label(parameters=parameters)
        assert "label: customLabels.personSchoolTypeCustomLabels" in result

    def test_generate_label_text_key_name(self):
        """Test generate_label writes the property named key_name, e.g. text for an InfoText"""
        result = generate_label(
            widget("InfoText", question_name="introText"), key_name="text"
        )
        assert result == "    text: (t: TFunction) => t('home:introText')"

    def test_generate_label_with_nickname_label(self):
        """Test generate_label includes nickname context when {{nickname}} is present"""
        result = self._label(
            **{
                "label::fr": "Quel est votre nom, {{nickname}}?",
                "label::en": "What is your name, {{nickname}}?",
            }
        )
        assert "label: (t: TFunction, interview, path) =>" in result
        assert "return t('sectionA:fooBar', {" in result
        assert "const activePerson =" in result
        assert (
            "const nickname = _escape(activePerson?.nickname || t('survey:noNickname'));"
            in result
        )
        assert "const countPersons =" not in result
        assert "const personGender =" not in result
        assert "nickname," in result

    def test_generate_label_with_persons_count_label(self):
        """Test generate_label includes countPersons context when {{count}} is present"""
        result = self._label(
            **{
                "label::fr": "Nombre de personnes: {{count}}",
                "label::en": "Number of persons: {{count}}",
            }
        )
        assert "label: (t: TFunction, interview, path) =>" in result
        assert "return t('sectionA:fooBar', {" in result
        assert "const activePerson =" not in result
        assert "const nickname =" not in result
        assert "const countPersons =" in result
        assert "const personGender =" not in result
        assert "count: countPersons" in result

    def test_generate_label_reads_every_language(self):
        """Test generate_label finds the context in a label of any survey language, not just fr and en"""
        result = generate_label(
            WidgetDefinition.model_validate(
                {
                    "question_name": "fooBar",
                    "input_type": "String",
                    "active": True,
                    "section": "sectionA",
                    "path": "foo.bar",
                    "label::es": "¿Cómo te llamas, {{nickname}}?",
                    "label::en": "What is your name?",
                },
                context={"languages": ("es", "en")},
            )
        )
        assert "const nickname =" in result

    GENDER_LABELS = {
        "label::fr": "{{gender:Il/Elle}} a un permis de conduire?",
        "label::en": "{{gender:He/She}} has a driver's license?",
    }

    def test_generate_label_with_gender_label_only_gender(self):
        """Test generate_label includes gender context when {{gender:...}} is present with only gender as field"""
        result = self._label(
            GenderFields(has_gender=True, has_sex_assigned_at_birth=False),
            **self.GENDER_LABELS,
        )
        assert "label: (t: TFunction, interview, path) =>" in result
        assert "return t('sectionA:fooBar', {" in result
        assert "const activePerson =" in result
        assert "const nickname =" not in result
        assert "const countPersons =" not in result
        assert "context: activePerson?.gender" in result
        assert "activePerson?.sexAssignedAtBirth" not in result

    def test_generate_label_with_gender_label_only_sex_at_birth(self):
        """Test generate_label includes gender context when {{gender:...}} is present with only sexAssignedAtBirth as field"""
        result = self._label(
            GenderFields(has_gender=False, has_sex_assigned_at_birth=True),
            **self.GENDER_LABELS,
        )
        assert "label: (t: TFunction, interview, path) =>" in result
        assert "context: activePerson?.sexAssignedAtBirth" in result
        assert "activePerson?.gender" not in result

    def test_generate_label_with_gender_label_both_gender_fields(self):
        """Test generate_label includes gender context when {{gender:...}} is present with both gender and sexAssignedAtBirth"""
        result = self._label(
            GenderFields(has_gender=True, has_sex_assigned_at_birth=True),
            **self.GENDER_LABELS,
        )
        assert "label: (t: TFunction, interview, path) =>" in result
        assert (
            "context: activePerson?.gender || activePerson?.sexAssignedAtBirth"
            in result
        )

    def test_generate_label_with_gender_label_no_gender_fields(self):
        """Test generate_label includes gender context when {{gender:...}} is present with no label fields"""
        result = self._label(
            GenderFields(has_gender=False, has_sex_assigned_at_birth=False),
            **self.GENDER_LABELS,
        )
        assert "label: (t: TFunction, interview, path) =>" in result
        assert "context: undefined" in result
        assert "activePerson?.gender" not in result
        assert "activePerson?.sexAssignedAtBirth" not in result

    def test_generate_label_with_one_person(self):
        """Test generate_label includes countPersons assignment and count context when only label_one is present"""
        result = self._label(
            **{
                "label::fr": "Quel est l'âge de cette personne?",
                "label::en": "What is this person's age?",
                "label_one::fr": "Votre âge",
                "label_one::en": "Your age",
            }
        )
        assert "label: (t: TFunction, interview, path) =>" in result
        assert "return t('sectionA:fooBar', {" in result
        assert "const activePerson =" not in result
        assert "const nickname =" not in result
        assert "const countPersons =" in result
        assert "const personGender =" not in result
        assert "count: countPersons" in result

    def test_generate_label_with_all_contexts(self):
        """Test generate_label includes all contexts when all contexts and label_one are present"""
        result = self._label(
            **{
                "label::fr": "{{gender:Il/Elle}} s'appelle {{nickname}} et il y a {{count}} personnes.",
                "label::en": "{{gender:He/She}} is named {{nickname}} and there are {{count}} persons.",
                "label_one::fr": "Tu t'appelles {{nickname}}.",
                "label_one::en": "Your name is {{nickname}}.",
            }
        )
        assert "label: (t: TFunction, interview, path) =>" in result
        assert "return t('sectionA:fooBar', {" in result
        assert "const activePerson =" in result
        assert (
            "const nickname = _escape(activePerson?.nickname || t('survey:noNickname'));"
            in result
        )
        assert "const countPersons =" in result
        assert "nickname," in result
        assert "count: countPersons" in result
        assert "context: activePerson?.gender" in result


# TODO: Test generate_help_popup
# TODO: Test generate_confirm_popup
# TODO: Test generate_text


class TestGenerateChoices:
    """Tests for generate_choices function"""

    def test_generate_choices_standard(self):
        """Test generate_choices returns correct string for standard choices"""

        result = generate_choices("yesNo")
        assert "choices: choices.yesNo" in result

    def test_generate_choices_custom_lowercase(self):
        """Test generate_choices returns correct string for customChoices with lowercase"""

        result = generate_choices("myCustomChoicescustomchoices")
        assert "choices: customChoices.myCustomChoicescustomchoices" in result

    def test_generate_choices_custom_uppercase(self):
        """Test generate_choices returns correct string for customChoices (uppercase)"""

        result = generate_choices("MyCustomChoices")
        assert "choices: customChoices.MyCustomChoices" in result

    def test_generate_additional_choices_uses_same_choice_module_resolution(self):
        assert (
            generate_additional_choices("yesNo")
            == "    additionalChoices: choices.yesNo,\n"
        )
        assert (
            generate_additional_choices("MyCustomChoices")
            == "    additionalChoices: customChoices.MyCustomChoices,\n"
        )

    def test_generate_additional_choices_empty(self):
        assert generate_additional_choices("") == ""

    def test_generate_additional_choices_formatting_options(self):
        assert generate_additional_choices("yesNo", comma=False, skip_line=False) == (
            "    additionalChoices: choices.yesNo"
        )


# TODO: Test generate_conditional
# TODO: Test generate_validation
# TODO: Test generate_two_columns
# TODO: Test generate_contains_html
# TODO: Test generate_custom_path
# TODO: Test generate_custom_choice
# TODO: Test generate_default_value


def test_generate_common_properties_all_false():
    """Test generate_common_properties with all options False or missing"""
    result = generate_common_properties(widget())
    assert "twoColumns: false" in result
    assert "containsHtml: false" in result


def test_generate_common_properties_two_columns_true():
    """Test generate_common_properties with twoColumns True"""
    result = generate_common_properties(widget(two_columns=True))
    assert "twoColumns: true" in result


def test_generate_common_properties_contains_html_true():
    """Test generate_common_properties with containsHtml True"""
    result = generate_common_properties(widget(contains_html=True))
    assert "containsHtml: true" in result


def test_generate_common_properties_join_with():
    """Test generate_common_properties with joinWith set"""
    result = generate_common_properties(widget(appearance="join_with=${foo}"))
    assert "joinWith: 'foo'" in result


def test_generate_common_properties_no_join_with_when_not_allowed():
    """Test generate_common_properties does not include joinWith when allow_join_with is False"""
    result = generate_common_properties(
        widget(appearance="join_with=${foo}"), allow_join_with=False
    )
    assert "joinWith: 'foo'" not in result


def test_generate_common_properties_all_true():
    """Test generate_common_properties with all options True/set"""
    result = generate_common_properties(
        widget(two_columns=True, contains_html=True, appearance="join_with=${bar}")
    )
    assert "twoColumns: true" in result
    assert "containsHtml: true" in result
    assert "joinWith: 'bar'" in result


ACCEPT_TO_BE_CONTACTED = {
    "question_name": "acceptToBeContactedForHelp",
    "path": "acceptToBeContactedForHelp",
    "label::fr": "Acceptez-vous d'être contacté pour de l'aide?",
    "label::en": "Do you agree to be contacted for help?",
}


def test_generate_radio_widget_basic():
    """Test generate_radio_widget with minimal required fields"""
    code = widget_code(
        generate_radio_widget, "Radio", choices="yesNo", **ACCEPT_TO_BE_CONTACTED
    )
    # Check for all expected lines in the generated widget code
    assert (
        "export const acceptToBeContactedForHelp: WidgetConfig.InputRadioType = {"
        in code
    )
    assert "...defaultInputBase.inputRadioBase," in code
    assert "path: 'acceptToBeContactedForHelp'," in code
    assert "twoColumns: false" in code
    assert "containsHtml: false" in code  # default is false unless set
    assert "label: (t: TFunction) => t('home:acceptToBeContactedForHelp')" in code
    assert "choices: choices.yesNo" in code
    assert "conditional: defaultConditional" in code
    assert "validations: validations.requiredValidation" in code
    assert code.strip().endswith("};")


def test_generate_radio_widget_complex():
    """Test generate_radio_widget with all fields set"""
    code = widget_code(
        generate_radio_widget,
        "Radio",
        conditional="someConditional",
        validation="ageValidation",
        help_popup="someHelpPopup",
        choices="yesNo",
        two_columns=True,
        contains_html=True,
        custom_path="custom.path",
        custom_choice="customChoiceValue",
        **ACCEPT_TO_BE_CONTACTED,
    )
    assert (
        "export const acceptToBeContactedForHelp: WidgetConfig.InputRadioType = {"
        in code
    )
    assert "...defaultInputBase.inputRadioBase," in code
    assert "path: 'acceptToBeContactedForHelp'," in code
    assert "twoColumns: true" in code
    assert "containsHtml: true" in code
    assert "customPath: 'custom.path'" in code
    assert "customChoice: 'customChoiceValue'" in code
    assert "label: (t: TFunction) => t('home:acceptToBeContactedForHelp')" in code
    assert "helpPopup: customHelpPopup.someHelpPopup" in code
    assert "choices: choices.yesNo" in code
    assert "conditional: conditionals.someConditional" in code
    assert "validations: validations.ageValidation" in code
    assert code.strip().endswith("};")


HOME_SAVE = {
    "question_name": "home_save",
    "path": "home.save",
    "label::fr": "Continuer",
    "label::en": "Continue",
}


def test_generate_next_button_widget_default_conditional():
    """Test generate_next_button_widget includes default conditional when missing"""
    code = widget_code(generate_next_button_widget, "NextButton", **HOME_SAVE)

    assert "export const home_save: WidgetConfig.ButtonWidgetConfig = {" in code
    assert "...defaultInputBase.buttonNextBase," in code
    assert "path: 'home.save'," in code
    assert "label: (t: TFunction) => t('home:home_save')," in code
    assert "conditional: defaultConditional" in code
    assert code.strip().endswith("};")


def test_generate_next_button_widget_custom_conditional():
    """Test generate_next_button_widget includes customConditionals when suffix matches"""
    code = widget_code(
        generate_next_button_widget,
        "NextButton",
        conditional="hiddenWithCanadaAsDefaultValueCustomConditional",
        **HOME_SAVE,
    )

    assert (
        "conditional: customConditionals.hiddenWithCanadaAsDefaultValueCustomConditional"
        in code
    )
    assert code.strip().endswith("};")


def test_generate_next_button_widget_normal_conditional():
    """Test generate_next_button_widget includes conditionals for non-custom conditional"""
    code = widget_code(
        generate_next_button_widget,
        "NextButton",
        conditional="someConditional",
        **HOME_SAVE,
    )

    assert "conditional: conditionals.someConditional" in code
    assert code.strip().endswith("};")


def test_generate_next_button_widget_confirm_popup():
    """Test generate_next_button_widget includes the confirmPopup when set"""
    code = widget_code(
        generate_next_button_widget,
        "NextButton",
        confirm_popup="someConfirmPopup",
        **HOME_SAVE,
    )

    assert "confirmPopup: customHelpPopup.someConfirmPopup," in code


HOUSEHOLD_SIZE = {
    "question_name": "household_size",
    "path": "household.size",
    "label::fr": "Combien de personnes dans le ménage?",
    "label::en": "How many people in the household?",
}


def test_generate_radio_number_widget_basic():
    """Test generate_radio_number_widget with minimal required fields"""
    result = widget_code(
        generate_radio_number_widget,
        "RadioNumber",
        parameters="min=0\nmax=6",
        **HOUSEHOLD_SIZE,
    )
    code = result["statement"]
    assert "export const household_size: WidgetConfig.InputRadioNumberType = {" in code
    assert "...defaultInputBase.inputRadioNumberBase," in code
    assert "path: 'household.size'," in code
    assert "valueRange: {" in code
    assert "min: 0" in code
    assert "max: 6" in code
    assert "overMaxAllowed: true" not in code  # default is not present
    assert "conditional: defaultConditional" in code
    assert "validations: validations.requiredValidation" in code
    assert code.strip().endswith("};")
    assert "additionalChoices" not in code
    assert result["has_helper_import"] is False


def test_generate_radio_number_widget_complex():
    """Test generate_radio_number_widget with all fields set"""
    result = widget_code(
        generate_radio_number_widget,
        "RadioNumber",
        help_popup="householdSizeHelpPopup",
        conditional="someConditional",
        validation="householdSizeValidation",
        parameters="min=1\nmax=17\noverMaxAllowed",
        choices="householdSizeAdditionalChoices",
        **HOUSEHOLD_SIZE,
    )
    code = result["statement"]
    assert "export const household_size: WidgetConfig.InputRadioNumberType = {" in code
    assert "...defaultInputBase.inputRadioNumberBase," in code
    assert "path: 'household.size'," in code
    assert "valueRange: {" in code
    assert "min: 1" in code
    assert "max: 17" in code
    assert "overMaxAllowed: true" in code
    assert "additionalChoices: choices.householdSizeAdditionalChoices" in code
    assert "helpPopup: customHelpPopup.householdSizeHelpPopup" in code
    assert "conditional: conditionals.someConditional" in code
    assert "validations: validations.householdSizeValidation" in code
    assert code.strip().endswith("};")
    assert result["has_helper_import"] is False


def test_generate_radio_number_widget_min_max_field_values():
    """Test generate_radio_number_widget when min/max are response paths, not integers"""
    result = widget_code(
        generate_radio_number_widget,
        "RadioNumber",
        parameters="min=abc\nmax=xyz",
        **HOUSEHOLD_SIZE,
    )
    code = result["statement"]
    assert (
        "min: (interview) => surveyHelper.getResponse(interview, 'abc', 0) as any"
        in code
    )
    assert (
        "max: (interview) => surveyHelper.getResponse(interview, 'xyz', 0) as any"
        in code
    )
    assert "additionalChoices" not in code
    assert result["has_helper_import"] is True


class TestGenerateStringWidget:
    """Tests for generate_string_widget function"""

    ACCESS_CODE = {
        "question_name": "accessCode",
        "path": "accessCode",
        "label::fr": "Code d'accès",
        "label::en": "Access code",
    }

    def _result(self, **columns):
        return widget_code(
            generate_string_widget, "String", **self.ACCESS_CODE, **columns
        )

    def test_generate_string_widget_basic(self):
        """Test generate_string_widget with minimal required fields"""
        result = self._result()
        code = result["statement"]
        assert "export const accessCode: WidgetConfig.InputStringType = {" in code
        assert "...defaultInputBase.inputStringBase," in code
        assert "path: 'accessCode'," in code
        assert "conditional: defaultConditional" in code
        assert "validations: validations.requiredValidation" in code
        assert "inputFilter" not in code
        assert "suffixLabel" not in code
        assert code.strip().endswith("};")
        assert result["has_helper_import"] is False
        assert result["has_formatter_import"] is False
        assert result["has_custom_formatter_import"] is False

    def test_generate_string_widget_complex(self):
        """Test generate_string_widget with all parameters set"""
        result = self._result(
            help_popup="accessCodeHelpPopup",
            conditional="accessCodeVisibleConditional",
            validation="accessCodeValidation",
            appearance="join_with=${phoneNumber}",
            two_columns=True,
            contains_html=True,
            default_value="12345678",
        )
        code = result["statement"]
        assert "export const accessCode: WidgetConfig.InputStringType = {" in code
        assert "...defaultInputBase.inputStringBase," in code
        assert "path: 'accessCode'," in code
        assert "conditional: conditionals.accessCodeVisibleConditional" in code
        assert "validations: validations.accessCodeValidation" in code
        assert "defaultValue: '12345678'" in code
        assert "containsHtml: true" in code
        assert "twoColumns: true" in code
        assert "helpPopup: customHelpPopup.accessCodeHelpPopup" in code
        assert "label: (t: TFunction) => t('home:accessCode')" in code
        assert "joinWith: 'phoneNumber'" in code
        assert "inputFilter" not in code
        assert code.strip().endswith("};")
        assert result["has_helper_import"] is False
        assert result["has_formatter_import"] is False
        assert result["has_custom_formatter_import"] is False

    def test_generate_string_widget_with_formatter(self):
        """Test generate_string_widget with formatter"""
        result = self._result(parameters="formatter=eightDigitsAccessCodeFormatter")
        code = result["statement"]
        assert "export const accessCode: WidgetConfig.InputStringType = {" in code
        assert "inputFilter: formatters.eightDigitsAccessCodeFormatter" in code
        assert result["has_helper_import"] is False
        assert result["has_formatter_import"] is True
        assert result["has_custom_formatter_import"] is False

    def test_generate_string_widget_with_custom_formatter(self):
        """Test generate_string_widget with custom formatter"""
        result = self._result(parameters="formatter=myBrandNewCustomFormatter")
        code = result["statement"]
        assert "inputFilter: customFormatters.myBrandNewCustomFormatter" in code
        assert result["has_helper_import"] is False
        assert result["has_formatter_import"] is False
        assert result["has_custom_formatter_import"] is True

    def test_generate_string_widget_with_suffix_label(self):
        """Test generate_string_widget with the suffixLabel parameter"""
        result = self._result(parameters="suffixLabel=home:valueSuffix")
        assert (
            "suffixLabel: (t: TFunction) => t('home:valueSuffix')"
            in result["statement"]
        )


class TestGenerateWidgetStatementComments:
    def test_single_line_comment_is_preserved(self):
        result = generate_widget_statement(
            widget(
                "Radio",
                comments="This is a single line comment",
                **ACCEPT_TO_BE_CONTACTED,
            ),
            GenderFields(),
        )
        assert result["statement"].startswith("// This is a single line comment\n")
        assert (
            "export const acceptToBeContactedForHelp: WidgetConfig.InputRadioType"
            in result["statement"]
        )

    def test_multi_line_comment_is_preserved(self):
        result = generate_widget_statement(
            widget(
                "Radio", comments="First line\nSecond line", **ACCEPT_TO_BE_CONTACTED
            ),
            GenderFields(),
        )
        assert result["statement"].startswith("// First line\n// Second line\n")
        assert (
            "export const acceptToBeContactedForHelp: WidgetConfig.InputRadioType"
            in result["statement"]
        )

    def test_no_comments_column_does_not_add_comment(self):
        result = generate_widget_statement(
            widget("Radio", **ACCEPT_TO_BE_CONTACTED), GenderFields()
        )
        assert not result["statement"].startswith("//")
        assert (
            "export const acceptToBeContactedForHelp: WidgetConfig.InputRadioType"
            in result["statement"]
        )


class TestGenerateWidgetStatementActiveFlag:
    NOT_ACTIVE_COMMENT = "// Note: acceptToBeContactedForHelp widget is not active. This widget will not be displayed in the survey."

    @cases(
        dict(id="false", active=False),
        dict(id="0 from Excel", active=0),
    )
    def test_inactive_widget_generates_not_active_comment_only(self, active):
        result = generate_widget_statement(
            widget("Radio", active=active, **ACCEPT_TO_BE_CONTACTED), GenderFields()
        )
        assert result["statement"] == self.NOT_ACTIVE_COMMENT
        assert "export const acceptToBeContactedForHelp" not in result["statement"]

    @cases(
        dict(id="true", active=True),
        dict(id="1 from Excel", active=1),
    )
    def test_active_widget_generates_widget_statement(self, active):
        result = generate_widget_statement(
            widget("Radio", active=active, **ACCEPT_TO_BE_CONTACTED), GenderFields()
        )
        assert (
            "export const acceptToBeContactedForHelp: WidgetConfig.InputRadioType = {"
            in result["statement"]
        )
        assert "path: 'acceptToBeContactedForHelp'," in result["statement"]
        assert "choices: choices.yesNo" in result["statement"]
        assert "widget is not active" not in result["statement"]
        assert result["statement"].strip().endswith("};")


class TestGenerateWidgetStatementInputType:
    @cases(
        dict(id="canonical", input_type="Radio"),
        dict(id="lower case", input_type="radio"),
    )
    def test_generates_the_input_type_written_in_any_case(self, input_type):
        """The Widgets sheet may write an input type in any case (see WidgetDefinition)."""
        result = generate_widget_statement(
            widget(input_type, choices="yesNo", **ACCEPT_TO_BE_CONTACTED)
        )
        assert (
            "export const acceptToBeContactedForHelp: WidgetConfig.InputRadioType = {"
            in result["statement"]
        )

    def test_info_text_writes_its_label_as_text(self):
        result = generate_widget_statement(widget("InfoText", question_name="intro"))
        assert "export const intro: WidgetConfig.TextWidgetConfig = {" in (
            result["statement"]
        )
        assert "text: (t: TFunction) => t('home:intro')" in result["statement"]

    def test_built_in_widget_without_built_in_function_writes_a_placeholder(self):
        """The generator doesn't write BuiltIn widgets yet: a comment marks where it goes."""
        result = generate_widget_statement(
            widget("BuiltIn", question_name="activePersonTitle")
        )
        assert (
            result["statement"]
            == "// Built-in widget placeholder for 'activePersonTitle'"
        )

    def test_built_in_widget_with_built_in_function_writes_a_placeholder(self):
        result = generate_widget_statement(
            widget(
                "BuiltIn",
                question_name="activePersonTitle",
                parameters="builtInFunction={{getActivePersonTitleWidgetConfig}}",
            )
        )
        assert result["statement"] == (
            "// Built-in widget placeholder for 'activePersonTitle' (builtInFunction: getActivePersonTitleWidgetConfig).\n"
            "// export const activePersonTitle = getActivePersonTitleWidgetConfig();"
        )

    def test_custom_widget_is_exported_from_custom_widgets(self):
        result = generate_widget_statement(widget("Custom", question_name="homeMap"))
        assert result["statement"] == "export const homeMap = customWidgets.homeMap;"


class TestGenerateWidgetName:
    """Tests for generate_widget_name function"""

    INDENT = "    "

    def test_active_one_emits_uncommented_name(self):
        """active=1 (e.g. from Excel) should be treated as active"""
        result = generate_widget_name(
            widget(question_name="homeAddress", active=1), group="", is_last=False
        )
        assert result == f"{self.INDENT}'homeAddress',"

    def test_active_zero_emits_commented_name(self):
        """active=0 (e.g. from Excel) should be treated as inactive"""
        result = generate_widget_name(
            widget(question_name="homeAddress", active=0), group="", is_last=False
        )
        assert result == f"{self.INDENT}// 'homeAddress',"

    def test_last_row_omits_trailing_comma(self):
        result = generate_widget_name(
            widget(question_name="homeAddress"), group="", is_last=True
        )
        assert result == f"{self.INDENT}'homeAddress'"

    def test_returns_none_when_group_does_not_match_row_group(self):
        result = generate_widget_name(
            widget(question_name="homeAddress", group="personGroup"),
            group="",
            is_last=False,
        )
        assert result is None


@pytest.mark.parametrize(
    ("generator", "input_type"),
    [
        (generate_select_widget, "Select"),
        (generate_range_widget, "Range"),
        (generate_text_widget, "Text"),
    ],
)
def test_widget_generators_include_help_popup(generator, input_type):
    """Test widget generators emit helpPopup when help_popup is set"""
    code = widget_code(generator, input_type, help_popup="someHelpPopup")
    assert "helpPopup: customHelpPopup.someHelpPopup" in code


@pytest.mark.parametrize(
    ("generator", "input_type"),
    [
        (generate_select_widget, "Select"),
        (generate_range_widget, "Range"),
        (generate_text_widget, "Text"),
        (generate_info_text_widget, "InfoText"),
        (generate_next_button_widget, "NextButton"),
    ],
)
def test_widget_generators_omit_help_popup_when_empty(generator, input_type):
    """Test widget generators omit helpPopup when help_popup is empty"""
    code = widget_code(generator, input_type)
    assert "helpPopup" not in code


class TestGenerateSuffixLabelCode:
    """Tests for generate_suffix_label_code helper"""

    def test_generate_suffix_label_code_empty(self):
        assert generate_suffix_label_code(None) == ""
        assert generate_suffix_label_code("") == ""

    def test_generate_suffix_label_code_valid(self):
        result = generate_suffix_label_code("home:valueSuffix")
        assert "suffixLabel: (t: TFunction) => t('home:valueSuffix')" in result

    def test_generate_suffix_label_code_valid_with_dots(self):
        result = generate_suffix_label_code("home:home.size.valueSuffix")
        assert (
            "suffixLabel: (t: TFunction) => t('home:home.size.valueSuffix')" in result
        )


class TestGetWidgetsFileImportFlags:
    """Tests for get_widgets_file_import_flags function"""

    def test_empty_section_rows(self):
        """Test that empty section_rows returns default ImportFlags"""
        import_flags = get_widgets_file_import_flags([])

        # Only validations should be True by default
        assert import_flags.has_validations_import is True

        # All other flags should be False
        assert import_flags.has_choices_import is False
        assert import_flags.has_custom_choices_import is False
        assert import_flags.has_conditionals_import is False
        assert import_flags.has_input_range_import is False
        assert import_flags.has_custom_widgets_import is False
        assert import_flags.has_custom_validations_import is False
        assert import_flags.has_custom_conditionals_import is False
        assert import_flags.has_help_popup_import is False
        assert import_flags.has_helper_import is False
        assert import_flags.has_formatter_import is False
        assert import_flags.has_custom_formatter_import is False
        assert import_flags.has_nickname_label is False
        assert import_flags.has_persons_count_label is False
        assert import_flags.has_gendered_suffix_label is False

    def test_choices_imports(self):
        """Test that choices columns are correctly detected"""
        # Standard choices
        import_flags = get_widgets_file_import_flags([widget("Radio", choices="yesNo")])
        assert import_flags.has_choices_import is True
        assert import_flags.has_custom_choices_import is False

        # Custom choices
        import_flags = get_widgets_file_import_flags(
            [widget("Radio", choices="myCustomChoices")]
        )
        assert import_flags.has_choices_import is False
        assert import_flags.has_custom_choices_import is True

        # Explicitly custom choices with CustomChoices suffix
        import_flags = get_widgets_file_import_flags(
            [widget("Radio", choices="myCustomChoices_customChoices")]
        )
        assert import_flags.has_choices_import is False
        assert import_flags.has_custom_choices_import is True

    def test_validation_imports(self):
        """Test that validation columns are correctly detected"""
        # Default validations
        import_flags = get_widgets_file_import_flags([widget()])
        assert import_flags.has_validations_import is True
        assert import_flags.has_custom_validations_import is False

        # Standard validation
        import_flags = get_widgets_file_import_flags(
            [widget(validation="phoneValidation")]
        )
        assert import_flags.has_validations_import is True
        assert import_flags.has_custom_validations_import is False

        # Explicitly custom validation with CustomValidation suffix
        import_flags = get_widgets_file_import_flags(
            [widget(validation="specialCustomValidation")]
        )
        # has_validation_import is always true because of default validations, should it be?
        assert import_flags.has_validations_import is True
        assert import_flags.has_custom_validations_import is True

    def test_conditional_imports(self):
        """Test that conditional columns are correctly detected"""
        # Default conditionals
        import_flags = get_widgets_file_import_flags([widget()])
        assert import_flags.has_conditionals_import is False
        assert import_flags.has_custom_conditionals_import is False

        # Standard conditional
        import_flags = get_widgets_file_import_flags(
            [widget(conditional="someConditional")]
        )
        assert import_flags.has_conditionals_import is True
        assert import_flags.has_custom_conditionals_import is False

        # Custom conditional with CustomConditional suffix
        import_flags = get_widgets_file_import_flags(
            [widget(conditional="myCustomConditional")]
        )
        assert import_flags.has_conditionals_import is False
        assert import_flags.has_custom_conditionals_import is True

    def test_input_range_imports(self):
        """Test that inputRange columns are correctly detected"""
        import_flags = get_widgets_file_import_flags(
            [widget("Range", input_range="satisfaction")]
        )
        assert import_flags.has_input_range_import is True

    def test_custom_widgets_imports(self):
        """Test that Custom inputType is correctly detected"""
        import_flags = get_widgets_file_import_flags([widget("Custom")])
        assert import_flags.has_custom_widgets_import is True

    def test_help_popup_imports(self):
        """Test that help_popup columns are correctly detected"""
        # Help popup
        import_flags = get_widgets_file_import_flags(
            [widget(help_popup="someHelpPopup")]
        )
        assert import_flags.has_help_popup_import is True

        # Confirm popup on NextButton
        import_flags = get_widgets_file_import_flags(
            [widget("NextButton", confirm_popup="someConfirmPopup")]
        )
        assert import_flags.has_help_popup_import is True

    def test_label_context_imports(self):
        """Test that label context imports are correctly detected"""
        # Nickname label
        import_flags = get_widgets_file_import_flags(
            [widget(**{"label::en": "Hello {{nickname}}!"})]
        )
        assert import_flags.has_nickname_label is True

        # Persons count via count in label
        import_flags = get_widgets_file_import_flags(
            [widget(**{"label::en": "There are {{count}} people"})]
        )
        assert import_flags.has_persons_count_label is True

        # Persons count via label_one
        import_flags = get_widgets_file_import_flags(
            [
                widget(
                    **{
                        "label::en": "Regular label",
                        "label_one::fr": "Étiquette pour une personne",
                        "label_one::en": "Single person label",
                    }
                )
            ]
        )
        assert import_flags.has_persons_count_label is True

        # Gendered suffix
        import_flags = get_widgets_file_import_flags(
            [widget(**{"label::en": "{{genderedSuffix:he/she}} is happy"})]
        )
        assert import_flags.has_gendered_suffix_label is True

    @cases(
        dict(
            id="camel case", parameters="customLabels={{personSchoolTypeCustomLabels}}"
        ),
        dict(
            id="lower case", parameters="customlabels={{personSchoolTypeCustomLabels}}"
        ),
    )
    def test_custom_labels_imports(self, parameters):
        """Test that customLabels usage in parameters is correctly detected, whatever the case of its name"""
        import_flags = get_widgets_file_import_flags(
            [widget(parameters=parameters, **{"label::en": "Some label"})]
        )
        assert import_flags.has_custom_labels_import is True


DEMO_GENERATOR_EXCEL = os.path.normpath(
    os.path.join(
        os.path.dirname(__file__),
        "../../../../example/demo_generator/references/Household_Travel_Generate_Survey.xlsx",
    )
)

DEMO_HELP_POPUP_WIDGETS = [
    ("home", "home_city", "cityHelpPopup"),
    ("home", "household_size", "householdSizeHelpPopup"),
    ("home", "household_carNumber", "householdCarNumberHelpPopup"),
]


@pytest.fixture(scope="module")
def demo_generator_widgets_output():
    if not os.path.isfile(DEMO_GENERATOR_EXCEL):
        pytest.skip(f"Demo generator excel not found: {DEMO_GENERATOR_EXCEL}")
    temp_dir = tempfile.mkdtemp()
    for section in ("home", "household", "completed"):
        os.makedirs(os.path.join(temp_dir, section), exist_ok=True)
    try:
        generate_widgets(
            load_survey_definition(ExcelSurveyDefinitionReader(DEMO_GENERATOR_EXCEL)),
            temp_dir,
        )
        yield temp_dir
    finally:
        shutil.rmtree(temp_dir)


@pytest.mark.parametrize(
    ("section", "widget_name", "help_popup_name"), DEMO_HELP_POPUP_WIDGETS
)
def test_demo_generator_help_popup_from_excel(
    demo_generator_widgets_output, section, widget_name, help_popup_name
):
    """Test demo_generator Excel rows emit helpPopup for every supported input type."""
    widgets_path = os.path.join(demo_generator_widgets_output, section, "widgets.tsx")
    with open(widgets_path, encoding="utf-8") as widgets_file:
        content = widgets_file.read()

    widget_export = f"export const {widget_name}"
    assert widget_export in content
    start = content.index(widget_export)
    next_export = content.find("\nexport const ", start + 1)
    widget_block = content[start:] if next_export == -1 else content[start:next_export]
    assert f"helpPopup: customHelpPopup.{help_popup_name}" in widget_block


def test_generate_widgets_leaves_out_an_inactive_widget_of_an_unknown_section(tmp_path):
    """An inactive widget isn't checked: its section may not be in the Sections sheet, and has no folder."""
    os.makedirs(tmp_path / "home")
    survey_definition = SurveyDefinition(
        languages=["fr", "en"],
        sections=[{"section": "home", "in_nav": False, "abbreviation": "HM_"}],
        widgets=[
            {
                "question_name": "homeName",
                "input_type": "String",
                "active": True,
                "section": "home",
                "path": "home.name",
                "label::fr": "Nom",
                "label::en": "Name",
            },
            {
                "question_name": "oldWorkName",
                "input_type": "String",
                "active": False,
                "section": "work",
            },
        ],
    )
    generate_widgets(survey_definition, str(tmp_path))
    assert sorted(os.listdir(tmp_path)) == ["home"]
    assert "homeName" in (tmp_path / "home" / "widgets.tsx").read_text(encoding="utf-8")
