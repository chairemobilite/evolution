# Copyright 2025, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

from scripts.generate_widgets import (
    ImportFlags,
    generate_choices,
    generate_join_with,
    generate_common_properties,
    generate_info_text_widget,
    generate_radio_widget,
    generate_radio_number_widget,
    generate_string_widget,
    generate_label,
    parse_parameters,
    get_radio_number_parameters,
    get_string_parameters,
    generate_path,
    generate_import_statements,
    get_widgets_file_import_flags,
)


# TODO: Test generate_widgets
# TODO: Test generate_widget_statement
# TODO: Test generate_widget_name
# TODO: Test generate_widgets_names_statements


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
        assert "import * as odSurveyHelpers" in result
        assert "import * as surveyHelper" in result
        assert (
            "import { getGenderedSuffixes" in result
            or "import { getGenderedSuffixes }" in result
        )
        assert "import * as validations" in result


# TODO: Test generate_custom_widget
# TODO: Test generate_comma
# TODO: Test generate_skip_line
# TODO: Test generate_constExport
# TODO: Test generate_defaultInputBase


def test_generate_path_valid():
    """Test generate_path with a valid path"""
    result = generate_path("foo.{baz}.bar_123")
    assert "path: 'foo.{baz}.bar_123'" in result


def test_generate_path_missing(capsys):
    """Test generate_path with missing path prints error and returns empty string"""
    result = generate_path("")
    captured = capsys.readouterr()
    assert "Error: path is missing in Widgets sheet." in captured.out
    assert result == ""


def test_generate_path_invalid_characters(capsys):
    """Test generate_path with invalid characters prints warning"""
    result = generate_path("foo/bar$")
    captured = capsys.readouterr()
    assert (
        "Warning: path 'foo/bar$' contains invalid characters in Widgets sheet."
        in captured.out
    )
    assert "path: 'foo/bar$'" in result


def test_generate_join_with_with_value():
    """Test that generate_join_with returns the correct string when a questionName value is provided"""
    result = generate_join_with("questionName")
    assert "joinWith: 'questionName',\n" in result


def test_generate_join_with_without_value():
    """Test that generate_join_with returns an empty string when no questionName value is provided"""
    result = generate_join_with("")
    assert result == ""


def test_generate_label_basic():
    """Test generate_label returns a simple label function when no special context is needed"""
    row = {
        "label::fr": "Quel est votre nom?",
        "label::en": "What is your name?",
    }
    result = generate_label(section="sectionA", path="foo.bar", row=row)
    assert "label: (t: TFunction) => t('sectionA:foo.bar')" in result
    assert "return t('sectionA:foo.bar', {" not in result
    assert "const activePerson =" not in result
    assert "const nickname =" not in result
    assert "const countPersons =" not in result
    assert "const personGender =" not in result


def test_generate_label_with_nickname_label():
    """Test generate_label includes nickname context when {{nickname}} is present"""
    row = {
        "label::fr": "Quel est votre nom, {{nickname}}?",
        "label::en": "What is your name, {{nickname}}?",
    }
    result = generate_label(section="sectionA", path="foo.bar", row=row)
    assert "label: (t: TFunction, interview, path) =>" in result
    assert "return t('sectionA:foo.bar', {" in result
    assert "const activePerson =" in result
    assert "const nickname =" in result
    assert "const countPersons =" not in result
    assert "const personGender =" not in result
    assert "nickname," in result


def test_generate_label_with_persons_count_label():
    """Test generate_label includes countPersons context when {{count}} is present"""
    row = {
        "label::fr": "Nombre de personnes: {{count}}",
        "label::en": "Number of persons: {{count}}",
    }
    result = generate_label(section="sectionB", path="baz", row=row)
    assert "label: (t: TFunction, interview, path) =>" in result
    assert "return t('sectionB:baz', {" in result
    assert "const activePerson =" not in result
    assert "const nickname =" not in result
    assert "const countPersons =" in result
    assert "const personGender =" not in result
    assert "count: countPersons" in result


def test_generate_label_with_gender_label():
    """Test generate_label includes gender context when {{gender:...}} is present"""
    row = {
        "label::fr": "{{gender:Il/Elle}} a un permis de conduire?",
        "label::en": "{{gender:He/She}} has a driver's license?",
    }
    result = generate_label(section="sectionC", path="qux", row=row)
    assert "label: (t: TFunction, interview, path) =>" in result
    assert "return t('sectionC:qux', {" in result
    assert "const activePerson =" in result
    assert "const nickname =" not in result
    assert "const countPersons =" not in result
    assert "context: activePerson?.gender" in result


def test_generate_label_with_one_person():
    """Test generate_label includes countPersons assignment and count context when only label_one is present"""
    row = {
        "label::fr": "Quel est l'âge de cette personne?",
        "label::en": "What is this person's age?",
        "label_one::fr": "Votre âge",
        "label_one::en": "Your age",
    }
    result = generate_label(section="sectionE", path="foo.age", row=row)
    assert "label: (t: TFunction, interview, path) =>" in result
    assert "return t('sectionE:foo.age', {" in result
    assert "const activePerson =" not in result
    assert "const nickname =" not in result
    assert "const countPersons =" in result
    assert "const personGender =" not in result
    assert "count: countPersons" in result


def test_generate_label_with_all_contexts():
    """Test generate_label includes all contexts when all contexts and label_one are present"""
    row = {
        "label::fr": "{{gender:Il/Elle}} s'appelle {{nickname}} et il y a {{count}} personnes.",
        "label::en": "{{gender:He/She}} is named {{nickname}} and there are {{count}} persons.",
        "label_one::fr": "Tu t'appelles {{nickname}}.",
        "label_one::en": "Your name is {{nickname}}.",
    }
    result = generate_label(section="sectionD", path="bar.baz", row=row)
    assert "label: (t: TFunction, interview, path) =>" in result
    assert "return t('sectionD:bar.baz', {" in result
    assert "const activePerson =" in result
    assert "const nickname =" in result
    assert "const countPersons =" in result
    assert "nickname," in result
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


# TODO: Test generate_conditional
# TODO: Test generate_validation
# TODO: Test generate_two_columns
# TODO: Test generate_contains_html
# TODO: Test generate_custom_path
# TODO: Test generate_custom_choice
# TODO: Test generate_default_value


def test_generate_common_properties_all_false():
    """Test generate_common_properties with all options False or missing"""
    row = {}
    result = generate_common_properties(row)
    assert "twoColumns: false" in result
    assert "containsHtml: false" in result


def test_generate_common_properties_two_columns_true():
    """Test generate_common_properties with twoColumns True"""
    row = {"twoColumns": True}
    result = generate_common_properties(row)
    assert "twoColumns: true" in result


def test_generate_common_properties_contains_html_true():
    """Test generate_common_properties with containsHtml True"""
    row = {"containsHtml": True}
    result = generate_common_properties(row)
    assert "containsHtml: true" in result


def test_generate_common_properties_join_with():
    """Test generate_common_properties with joinWith set"""
    row = {"appearance": "join_with=${foo}"}
    result = generate_common_properties(row)
    assert "joinWith: 'foo'" in result


def test_generate_common_properties_no_join_with_when_not_allowed():
    """Test generate_common_properties does not include joinWith when allow_join_with is False"""
    row = {"appearance": "join_with=${foo}"}
    result = generate_common_properties(row, allow_join_with=False)
    assert "joinWith: 'foo'" not in result


def test_generate_info_text_widget_no_join_with():
    """Test generate_info_text_widget never includes joinWith even if appearance has join_with"""
    row = {"appearance": "join_with=${foo}"}
    widget_code = generate_info_text_widget("Q1", "section", "path", "", row)
    assert "joinWith:" not in widget_code


def test_generate_common_properties_all_true():
    """Test generate_common_properties with all options True/set"""
    row = {"twoColumns": True, "containsHtml": True, "appearance": "join_with=${bar}"}
    result = generate_common_properties(row)
    assert "twoColumns: true" in result
    assert "containsHtml: true" in result
    assert "joinWith: 'bar'" in result


def test_generate_common_properties_bad_join_with_pattern(capsys):
    """Test generate_common_properties with appearance join_with missing ${questionName} pattern"""
    row = {"appearance": "join_with=false_pattern"}
    result = generate_common_properties(row)
    assert "joinWith: " not in result
    captured = capsys.readouterr()
    assert (
        "appearance join_with pattern not recognized inside Widgets sheet"
        in captured.out
    )


def test_generate_radio_widget_basic():
    """Test generate_radio_widget with minimal required fields"""
    row = {
        "questionName": "acceptToBeContactedForHelp",
        "inputType": "Radio",
        "section": "home",
        "path": "acceptToBeContactedForHelp",
        "conditional": "",
        "validation": "",
        "inputRange": "",
        "help_popup": "",
        "choices": "yesNo",
        "label::fr": "Acceptez-vous d'être contacté pour de l'aide?",
        "label::en": "Do you agree to be contacted for help?",
    }
    widget_label = generate_label(section=row["section"], path=row["path"], row=row)
    code = generate_radio_widget(
        row["questionName"],
        row["path"],
        row["choices"],
        row["help_popup"],
        row["conditional"],
        row["validation"],
        widget_label,
        row,
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
    row = {
        "questionName": "acceptToBeContactedForHelp",
        "inputType": "Radio",
        "section": "home",
        "path": "acceptToBeContactedForHelp",
        "conditional": "someConditional",
        "validation": "someValidation",
        "inputRange": "",
        "help_popup": "someHelpPopup",
        "choices": "yesNo",
        "twoColumns": True,
        "containsHtml": True,
        "customPath": "custom.path",
        "customChoice": "customChoiceValue",
        "label::fr": "Acceptez-vous d'être contacté pour de l'aide?",
        "label::en": "Do you agree to be contacted for help?",
    }
    widget_label = generate_label(section=row["section"], path=row["path"], row=row)
    code = generate_radio_widget(
        row["questionName"],
        row["path"],
        row["choices"],
        row["help_popup"],
        row["conditional"],
        row["validation"],
        widget_label,
        row,
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
    assert "validations: validations.someValidation" in code
    assert code.strip().endswith("};")


def test_generate_radio_number_widget_basic():
    """Test generate_radio_number_widget with minimal required fields"""
    row = {
        "questionName": "household_size",
        "inputType": "RadioNumber",
        "section": "home",
        "path": "household.size",
        "help_popup": "",
        "conditional": "",
        "validation": "",
        "parameters": "",
        "appearance": "",
        "label::fr": "Combien de personnes dans le ménage?",
        "label::en": "How many people in the household?",
    }
    widget_label = generate_label(section=row["section"], path=row["path"], row=row)
    result = generate_radio_number_widget(
        row["questionName"],
        row["path"],
        row["help_popup"],
        row["conditional"],
        row["validation"],
        widget_label,
        row,
    )
    code = result["statement"]
    assert "export const household_size: WidgetConfig.InputRadioNumberType = {" in code
    assert "...defaultInputBase.inputRadioNumberBase," in code
    assert "path: 'household.size'," in code
    assert "valueRange: {" in code
    assert "min: 0" in code  # default min is 0
    assert "max: 6" in code  # default max is 6
    assert "overMaxAllowed: true" not in code  # default is not present
    assert "conditional: defaultConditional" in code
    assert "validations: validations.requiredValidation" in code
    assert code.strip().endswith("};")
    assert result["has_helper_import"] is False


def test_generate_radio_number_widget_complex():
    """Test generate_radio_number_widget with all fields set"""
    row = {
        "questionName": "household_size",
        "inputType": "RadioNumber",
        "section": "home",
        "path": "household.size",
        "help_popup": "householdSizeHelpPopup",
        "conditional": "someConditional",
        "validation": "householdSizeValidation",
        "parameters": "min=1\nmax=17\noverMaxAllowed",
        "appearance": "",
        "label::fr": "Combien de personnes dans le ménage?",
        "label::en": "How many people in the household?",
    }
    widget_label = generate_label(section=row["section"], path=row["path"], row=row)
    result = generate_radio_number_widget(
        row["questionName"],
        row["path"],
        row["help_popup"],
        row["conditional"],
        row["validation"],
        widget_label,
        row,
    )
    code = result["statement"]
    assert "export const household_size: WidgetConfig.InputRadioNumberType = {" in code
    assert "...defaultInputBase.inputRadioNumberBase," in code
    assert "path: 'household.size'," in code
    assert "valueRange: {" in code
    assert "min: 1" in code
    assert "max: 17" in code
    assert "overMaxAllowed: true" in code
    assert "helpPopup: customHelpPopup.householdSizeHelpPopup" in code
    assert "conditional: conditionals.someConditional" in code
    assert "validations: validations.householdSizeValidation" in code
    assert code.strip().endswith("};")
    assert result["has_helper_import"] is False


def test_generate_radio_number_widget_min_max_field_values():
    """Test generate_radio_number_widget when min/max are not integers"""
    row = {
        "questionName": "household_size",
        "inputType": "RadioNumber",
        "section": "home",
        "path": "household.size",
        "help_popup": "",
        "conditional": "",
        "validation": "",
        "parameters": "min=abc\nmax=xyz",
        "appearance": "",
        "label::fr": "Combien de personnes dans le ménage?",
        "label::en": "How many people in the household?",
    }
    widget_label = generate_label(section=row["section"], path=row["path"], row=row)
    result = generate_radio_number_widget(
        row["questionName"],
        row["path"],
        row["help_popup"],
        row["conditional"],
        row["validation"],
        widget_label,
        row,
    )
    code = result["statement"]
    assert (
        "min: (interview) => surveyHelper.getResponse(interview, 'abc', 0) as any"
        in code
    )  # default min is 0
    assert (
        "max: (interview) => surveyHelper.getResponse(interview, 'xyz', 0) as any"
        in code
    )  # default max is 6
    assert result["has_helper_import"] is True


def test_generate_radio_number_widget_min_gte_max(capsys):
    """Test generate_radio_number_widget prints error when min >= max"""
    row = {
        "questionName": "household_size",
        "inputType": "RadioNumber",
        "section": "home",
        "path": "household.size",
        "help_popup": "",
        "conditional": "",
        "validation": "",
        "parameters": "min=5\nmax=5",
        "appearance": "",
        "label::fr": "Combien de personnes dans le ménage?",
        "label::en": "How many people in the household?",
    }
    widget_label = generate_label(section=row["section"], path=row["path"], row=row)
    result = generate_radio_number_widget(
        row["questionName"],
        row["path"],
        row["help_popup"],
        row["conditional"],
        row["validation"],
        widget_label,
        row,
    )
    captured = capsys.readouterr()
    code = result["statement"]
    assert (
        "ValueError: min (5) must be less than max (5) in parameters in Widgets sheet."
        in captured.out
    )
    assert "min: 5" in code
    assert "max: 5" in code
    assert result["has_helper_import"] is False


def test_generate_radio_number_widget_unrecognized_parameter_line(capsys):
    """Test generate_radio_number_widget prints warning for unrecognized parameter line"""
    row = {
        "questionName": "household_size",
        "inputType": "RadioNumber",
        "section": "home",
        "path": "household.size",
        "help_popup": "",
        "conditional": "",
        "validation": "",
        "parameters": "min=2\nmax=5\nfoo=bar",
        "appearance": "",
        "label::fr": "Combien de personnes dans le ménage?",
        "label::en": "How many people in the household?",
    }
    widget_label = generate_label(section=row["section"], path=row["path"], row=row)
    result = generate_radio_number_widget(
        row["questionName"],
        row["path"],
        row["help_popup"],
        row["conditional"],
        row["validation"],
        widget_label,
        row,
    )
    captured = capsys.readouterr()
    code = result["statement"]
    assert (
        "Warning: Unrecognized parameter 'foo' for radio_number in Widgets sheet. Expected 'min', 'max' or 'overMaxAllowed'."
        in captured.out
    )
    assert "min: 2" in code
    assert "max: 5" in code
    assert result["has_helper_import"] is False


class TestGenerateStringWidget:
    """Tests for generate_string_widget function"""

    def test_generate_string_widget_basic(self):
        """Test generate_string_widget with minimal required fields"""
        row = {
            "questionName": "accessCode",
            "inputType": "String",
            "section": "home",
            "path": "accessCode",
            "help_popup": "",
            "conditional": "",
            "validation": "",
            "parameters": "",
            "appearance": "",
            "label::fr": "Code d'accès",
            "label::en": "Access code",
        }
        widget_label = generate_label(section=row["section"], path=row["path"], row=row)
        result = generate_string_widget(
            row["questionName"],
            row["path"],
            row["help_popup"],
            row["conditional"],
            row["validation"],
            widget_label,
            row,
        )
        code = result["statement"]
        assert "export const accessCode: WidgetConfig.InputStringType = {" in code
        assert "...defaultInputBase.inputStringBase," in code
        assert "path: 'accessCode'," in code
        assert "conditional: defaultConditional" in code
        assert "validations: validations.requiredValidation" in code
        assert "inputFilter" not in code
        assert code.strip().endswith("};")
        assert result["has_helper_import"] is False
        assert result["has_formatter_import"] is False
        assert result["has_custom_formatter_import"] is False

    def test_generate_string_widget_complex(self):
        """Test generate_string_widget with all parameters set"""
        row = {
            "questionName": "accessCode",
            "inputType": "String",
            "section": "home",
            "path": "accessCode",
            "help_popup": "accessCodeHelpPopup",
            "conditional": "accessCodeVisibleConditional",
            "validation": "accessCodeValidation",
            "parameters": "",
            "appearance": "join_with=${phoneNumber}",
            "twoColumns": True,
            "containsHtml": True,
            "defaultValue": "12345678",
            "label::fr": "Code d'accès",
            "label::en": "Access code",
        }
        widget_label = generate_label(section=row["section"], path=row["path"], row=row)
        result = generate_string_widget(
            row["questionName"],
            row["path"],
            row["help_popup"],
            row["conditional"],
            row["validation"],
            widget_label,
            row,
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
        row = {
            "questionName": "accessCode",
            "inputType": "String",
            "section": "home",
            "path": "accessCode",
            "help_popup": "",
            "conditional": "",
            "validation": "",
            "parameters": "formatter=eightDigitsAccessCodeFormatter",
            "appearance": "",
            "label::fr": "Code d'accès",
            "label::en": "Access code",
        }
        widget_label = generate_label(section=row["section"], path=row["path"], row=row)
        result = generate_string_widget(
            row["questionName"],
            row["path"],
            row["help_popup"],
            row["conditional"],
            row["validation"],
            widget_label,
            row,
        )
        code = result["statement"]
        assert "export const accessCode: WidgetConfig.InputStringType = {" in code
        assert "inputFilter: formatters.eightDigitsAccessCodeFormatter" in code
        assert result["has_helper_import"] is False
        assert result["has_formatter_import"] is True
        assert result["has_custom_formatter_import"] is False

    def test_generate_string_widget_with_custom_formatter(self):
        """Test generate_string_widget with custom formatter"""
        row = {
            "questionName": "accessCode",
            "inputType": "String",
            "section": "home",
            "path": "accessCode",
            "help_popup": "",
            "conditional": "",
            "validation": "",
            "parameters": "formatter=myBrandNewCustomFormatter",
            "appearance": "",
            "label::fr": "Code d'accès",
            "label::en": "Access code",
        }
        widget_label = generate_label(section=row["section"], path=row["path"], row=row)
        result = generate_string_widget(
            row["questionName"],
            row["path"],
            row["help_popup"],
            row["conditional"],
            row["validation"],
            widget_label,
            row,
        )
        code = result["statement"]
        assert "inputFilter: customFormatters.myBrandNewCustomFormatter" in code
        assert result["has_helper_import"] is False
        assert result["has_formatter_import"] is False
        assert result["has_custom_formatter_import"] is True


# TODO: Test generate_select_widget
# TODO: Test generate_number_widget
# TODO: Test generate_info_text_widget
# TODO: Test generate_range_widget
# TODO: Test generate_checkbox_widget
# TODO: Test generate_next_button_widget
# TODO: Test generate_text_widget
# TODO: Test get_widgets_file_import_flags


class TestRadioNumberParameters:
    """Tests for get_radio_number_parameters function"""

    def test_get_radio_number_parameters_defaults(self):
        """Test get_radio_number_parameters returns defaults when parameters is empty"""
        row = {}
        params = get_radio_number_parameters(row)
        assert params["min_value"] == 0
        assert params["max_value"] == 6
        assert params["over_max_allowed"] is False

    def test_get_radio_number_parameters_valid_min_max(self):
        """Test get_radio_number_parameters parses valid min and max"""
        row = {"parameters": "min=2\nmax=10"}
        params = get_radio_number_parameters(row)
        assert params["min_value"] == 2
        assert params["max_value"] == 10
        assert params["over_max_allowed"] is False

    def test_get_radio_number_parameters_over_max_allowed(self):
        """Test get_radio_number_parameters parses overMaxAllowed"""
        row = {"parameters": "min=1\nmax=5\noverMaxAllowed"}
        params = get_radio_number_parameters(row)
        assert params["min_value"] == 1
        assert params["max_value"] == 5
        assert params["over_max_allowed"] is True

    def test_get_radio_number_parameters_non_numeric_min_max(self):
        """Test get_radio_number_parameters with non-numeric min/max"""
        row = {"parameters": "min=abc\nmax=xyz"}
        params = get_radio_number_parameters(row)
        assert params["min_value"] == "abc"
        assert params["max_value"] == "xyz"

    def test_get_radio_number_parameters_unrecognized_line(self, capsys):
        """Test get_radio_number_parameters prints warning for unrecognized line"""
        row = {"parameters": "min=1\nmax=2\nfoo=bar"}
        params = get_radio_number_parameters(row)
        captured = capsys.readouterr()
        assert (
            "Warning: Unrecognized parameter 'foo' for radio_number in Widgets sheet. Expected 'min', 'max' or 'overMaxAllowed'."
            in captured.out
        )
        assert params["min_value"] == 1
        assert params["max_value"] == 2

    def test_get_radio_number_parameters_min_gte_max(self, capsys):
        """Test get_radio_number_parameters prints error when min >= max"""
        row = {"parameters": "min=5\nmax=5"}
        params = get_radio_number_parameters(row)
        captured = capsys.readouterr()
        assert (
            "ValueError: min (5) must be less than max (5) in parameters in Widgets sheet."
            in captured.out
        )
        assert params["min_value"] == 5
        assert params["max_value"] == 5


class TestGetStringParameters:
    """Tests for get_string_parameters function"""

    def test_get_string_parameters_defaults(self):
        """Test get_string_parameters returns defaults when parameters is empty"""
        row = {}
        params = get_string_parameters(row)
        assert params["formatter"] == None

    def test_get_string_parameters_valid_parameters(self):
        """Test get_string_parameters parses valid min and max"""
        row = {"parameters": "formatter=somethingCustomFormatter"}
        params = get_string_parameters(row)
        assert params["formatter"] == "somethingCustomFormatter"

    def test_get_string_parameters_unrecognized_parameter(self, capsys):
        """Test get_string_parameters prints warning for unrecognized parameter"""
        row = {"parameters": "formatter=somethingCustomFormatter\nfoo=bar"}
        params = get_string_parameters(row)
        captured = capsys.readouterr()
        assert (
            "Warning: Unrecognized parameter 'foo' for string in Widgets sheet. Expected 'formatter'."
            in captured.out
        )
        assert params["formatter"] == "somethingCustomFormatter"


class TestParseParameters:
    """Tests for parse_parameters function"""

    def test_parse_parameters_case_insensitivity(self):
        """Test parse_parameters parses overMaxAllowed"""
        row = "Min=1\nMax=5\nOverMaxAllowed"
        params = parse_parameters(row)
        assert params["min"] == "1"
        assert params["max"] == "5"
        assert params["overmaxallowed"] is True

    def test_parse_parameters_semicolon_split(self):
        """Test parse_parameters splits parameters on semicolon as well as newline"""
        row = "min=3;max=8;overMaxAllowed"
        params = parse_parameters(row)
        assert params["min"] == "3"
        assert params["max"] == "8"
        assert params["overmaxallowed"] is True

    def test_parse_parameters_space_split(self):
        """Test parse_parameters splits parameters on space as well as newline and semicolon"""
        row = "min=4 max=9 overMaxAllowed"
        params = parse_parameters(row)
        assert params["min"] == "4"
        assert params["max"] == "9"
        assert params["overmaxallowed"] is True

    def test_parse_parameters_mixed_all_split(self):
        """Test parse_parameters splits parameters on newline, semicolon, and space"""
        row = "min=2\nmax=7;overMaxAllowed min=3"
        params = parse_parameters(row)
        # The last min=3 should override min=2
        assert params["min"] == "3"
        assert params["max"] == "7"
        assert params["overmaxallowed"] is True

    def test_parse_parameters_multiple_line_breaks(self):
        """Test parse_parameters splits parameters on newline, semicolon, and space"""
        row = "min=2\n\nmax=7\n  \noverMaxAllowed\n  \n\n"
        params = parse_parameters(row)
        assert params["min"] == "2"
        assert params["max"] == "7"
        assert params["overmaxallowed"] is True
        assert len(params) == 3  # make sure no empty or extra keys are created


class TestGetWidgetsFileImportFlags:
    """Tests for get_widgets_file_import_flags function"""

    def test_empty_section_rows(self):
        """Test that empty section_rows returns default ImportFlags"""
        section_rows = []
        import_flags = get_widgets_file_import_flags(section_rows)

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
        section_rows = [
            {
                "choices": "yesNo",
                "inputType": "Radio",
                "validation": "",
                "conditional": "",
            }
        ]
        import_flags = get_widgets_file_import_flags(section_rows)
        assert import_flags.has_choices_import is True
        assert import_flags.has_custom_choices_import is False

        # Custom choices
        section_rows = [
            {
                "choices": "myCustomChoices",
                "inputType": "Radio",
                "validation": "",
                "conditional": "",
            }
        ]
        import_flags = get_widgets_file_import_flags(section_rows)
        assert import_flags.has_choices_import is False
        assert import_flags.has_custom_choices_import is True

        # Explicitly custom choices with CustomChoices suffix
        section_rows = [
            {
                "choices": "myCustomChoices_customChoices",
                "inputType": "Radio",
                "validation": "",
                "conditional": "",
            }
        ]
        import_flags = get_widgets_file_import_flags(section_rows)
        assert import_flags.has_choices_import is False
        assert import_flags.has_custom_choices_import is True

    def test_validation_imports(self):
        """Test that validation columns are correctly detected"""
        # Default validations
        section_rows = [
            {"inputType": "Radio", "choices": "", "validation": "", "conditional": ""}
        ]
        import_flags = get_widgets_file_import_flags(section_rows)
        assert import_flags.has_validations_import is True
        assert import_flags.has_custom_validations_import is False

        # Standard validation
        section_rows = [
            {
                "inputType": "Radio",
                "choices": "",
                "validation": "phoneNumberValidation",
                "conditional": "",
            }
        ]
        import_flags = get_widgets_file_import_flags(section_rows)
        assert import_flags.has_validations_import is True
        assert import_flags.has_custom_validations_import is False

        # Explicitly custom validation with CustomValidation suffix
        section_rows = [
            {
                "inputType": "Radio",
                "choices": "",
                "validation": "specialCustomValidation",
                "conditional": "",
            }
        ]
        import_flags = get_widgets_file_import_flags(section_rows)
        print(import_flags)
        # has_validation_import is always true because of default validations, should it be?
        assert import_flags.has_validations_import is True
        assert import_flags.has_custom_validations_import is True

    def test_conditional_imports(self):
        """Test that conditional columns are correctly detected"""
        # Default conditionals
        section_rows = [
            {"inputType": "Radio", "choices": "", "validation": "", "conditional": ""}
        ]
        import_flags = get_widgets_file_import_flags(section_rows)
        assert import_flags.has_conditionals_import is False
        assert import_flags.has_custom_conditionals_import is False

        # Standard conditional
        section_rows = [
            {
                "inputType": "Radio",
                "choices": "",
                "validation": "",
                "conditional": "someConditional",
            }
        ]
        import_flags = get_widgets_file_import_flags(section_rows)
        assert import_flags.has_conditionals_import is True
        assert import_flags.has_custom_conditionals_import is False

        # Custom conditional with CustomConditional suffix
        section_rows = [
            {
                "inputType": "Radio",
                "choices": "",
                "validation": "",
                "conditional": "myCustomConditional",
            }
        ]
        import_flags = get_widgets_file_import_flags(section_rows)
        assert import_flags.has_conditionals_import is False
        assert import_flags.has_custom_conditionals_import is True

    def test_input_range_imports(self):
        """Test that inputRange columns are correctly detected"""
        section_rows = [
            {
                "inputType": "Radio",
                "choices": "",
                "validation": "",
                "conditional": "",
                "inputRange": "satisfaction",
            }
        ]
        import_flags = get_widgets_file_import_flags(section_rows)
        assert import_flags.has_input_range_import is True

    def test_custom_widgets_imports(self):
        """Test that Custom inputType is correctly detected"""
        section_rows = [
            {"inputType": "Custom", "choices": "", "validation": "", "conditional": ""}
        ]
        import_flags = get_widgets_file_import_flags(section_rows)
        assert import_flags.has_custom_widgets_import is True

    def test_help_popup_imports(self):
        """Test that help_popup columns are correctly detected"""
        # Help popup
        section_rows = [
            {
                "inputType": "Radio",
                "choices": "",
                "validation": "",
                "conditional": "",
                "help_popup": "someHelpPopup",
            }
        ]
        import_flags = get_widgets_file_import_flags(section_rows)
        assert import_flags.has_help_popup_import is True

        # Confirm popup
        section_rows = [
            {
                "inputType": "Radio",
                "choices": "",
                "validation": "",
                "conditional": "",
                "confirm_popup": "someConfirmPopup",
            }
        ]
        import_flags = get_widgets_file_import_flags(section_rows)
        assert import_flags.has_help_popup_import is True

    def test_label_context_imports(self):
        """Test that label context imports are correctly detected"""
        # Nickname label
        section_rows = [
            {
                "inputType": "Radio",
                "choices": "",
                "validation": "",
                "conditional": "",
                "label::en": "Hello {{nickname}}!",
            }
        ]
        import_flags = get_widgets_file_import_flags(section_rows)
        assert import_flags.has_nickname_label is True

        # Persons count via count in label
        section_rows = [
            {
                "inputType": "Radio",
                "choices": "",
                "validation": "",
                "conditional": "",
                "label::en": "There are {{count}} people",
            }
        ]
        import_flags = get_widgets_file_import_flags(section_rows)
        assert import_flags.has_persons_count_label is True

        # Persons count via label_one
        section_rows = [
            {
                "inputType": "Radio",
                "choices": "",
                "validation": "",
                "conditional": "",
                "label::en": "Regular label",
                "label_one::en": "Single person label",
            }
        ]
        import_flags = get_widgets_file_import_flags(section_rows)
        assert import_flags.has_persons_count_label is True

        # Gendered suffix
        section_rows = [
            {
                "inputType": "Radio",
                "choices": "",
                "validation": "",
                "conditional": "",
                "label::en": "{{genderedSuffix:he/she}} is happy",
            }
        ]
        import_flags = get_widgets_file_import_flags(section_rows)
        assert import_flags.has_gendered_suffix_label is True
