# Copyright 2025, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

from scripts.generate_widgets import (
    generate_join_with,
    generate_common_properties,
    generate_info_text_widget,
    generate_radio_widget,
    generate_radio_number_widget,
    generate_label,
    get_parameters_values,
    generate_path,
)


# TODO: Test generate_widgets
# TODO: Test generate_widget_statement
# TODO: Test generate_widget_name
# TODO: Test generate_widgets_names_statements
# TODO: Test generate_import_statements
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
    assert "const personGender =" in result
    assert "context: personGender =" in result


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
    assert "const personGender =" in result
    assert "nickname," in result
    assert "nickname," in result
    assert "count: countPersons" in result
    assert "context: personGender =" in result


# TODO: Test generate_help_popup
# TODO: Test generate_confirm_popup
# TODO: Test generate_text
# TODO: Test generate_choices
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
    assert result["needsHelperImport"] is False


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
    assert result["needsHelperImport"] is False


def test_generate_radio_number_widget_min_max_field_values(capsys):
    """Test generate_radio_number_widget prints error when min/max are not integers"""
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
    captured = capsys.readouterr()
    code = result["statement"]
    assert (
        "Warning: Cannot compare min (abc) and max (xyz) as they are not both numbers."
        in captured.out
    )
    assert (
        "min: (interview) => surveyHelper.getResponse(interview, 'abc', 0) as any"
        in code
    )  # default min is 0
    assert (
        "max: (interview) => surveyHelper.getResponse(interview, 'xyz', 0) as any"
        in code
    )  # default max is 6
    assert result["needsHelperImport"] is True


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
    assert result["needsHelperImport"] is False


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
        "Warning: Unrecognized line in parameters in Widgets sheet: 'foo=bar'. Expected format: min=0\\nmax=6\\noverMaxAllowed."
        in captured.out
    )
    assert "min: 2" in code
    assert "max: 5" in code
    assert result["needsHelperImport"] is False


# TODO: Test generate_select_widget
# TODO: Test generate_string_widget
# TODO: Test generate_number_widget
# TODO: Test generate_info_text_widget
# TODO: Test generate_range_widget
# TODO: Test generate_checkbox_widget
# TODO: Test generate_next_button_widget
# TODO: Test generate_text_widget


def test_get_parameters_values_defaults():
    """Test get_parameters_values returns defaults when parameters is empty"""
    row = {}
    params = get_parameters_values(row)
    assert params["min_value"] == 0
    assert params["max_value"] == 6
    assert params["over_max_allowed"] is False


def test_get_parameters_values_valid_min_max():
    """Test get_parameters_values parses valid min and max"""
    row = {"parameters": "min=2\nmax=10"}
    params = get_parameters_values(row)
    assert params["min_value"] == 2
    assert params["max_value"] == 10
    assert params["over_max_allowed"] is False


def test_get_parameters_values_over_max_allowed():
    """Test get_parameters_values parses overMaxAllowed"""
    row = {"parameters": "min=1\nmax=5\noverMaxAllowed"}
    params = get_parameters_values(row)
    assert params["min_value"] == 1
    assert params["max_value"] == 5
    assert params["over_max_allowed"] is True


def test_get_parameters_values_invalid_min_max(capsys):
    """Test get_parameters_values prints error for invalid min/max"""
    row = {"parameters": "min=abc\nmax=xyz"}
    params = get_parameters_values(row)
    captured = capsys.readouterr()
    assert (
        "Warning: Cannot compare min (abc) and max (xyz) as they are not both numbers."
        in captured.out
    )
    assert params["min_value"] == "abc"
    assert params["max_value"] == "xyz"


def test_get_parameters_values_unrecognized_line(capsys):
    """Test get_parameters_values prints warning for unrecognized line"""
    row = {"parameters": "min=1\nmax=2\nfoo=bar"}
    params = get_parameters_values(row)
    captured = capsys.readouterr()
    assert (
        "Warning: Unrecognized line in parameters in Widgets sheet: 'foo=bar'. Expected format: min=0\\nmax=6\\noverMaxAllowed."
        in captured.out
    )
    assert params["min_value"] == 1
    assert params["max_value"] == 2


def test_get_parameters_values_min_gte_max(capsys):
    """Test get_parameters_values prints error when min >= max"""
    row = {"parameters": "min=5\nmax=5"}
    params = get_parameters_values(row)
    captured = capsys.readouterr()
    assert (
        "ValueError: min (5) must be less than max (5) in parameters in Widgets sheet."
        in captured.out
    )
    assert params["min_value"] == 5
    assert params["max_value"] == 5


def test_get_parameters_values_semicolon_split():
    """Test get_parameters_values splits parameters on semicolon as well as newline"""
    row = {"parameters": "min=3;max=8;overMaxAllowed"}
    params = get_parameters_values(row)
    assert params["min_value"] == 3
    assert params["max_value"] == 8
    assert params["over_max_allowed"] is True


def test_get_parameters_values_space_split():
    """Test get_parameters_values splits parameters on space as well as newline and semicolon"""
    row = {"parameters": "min=4 max=9 overMaxAllowed"}
    params = get_parameters_values(row)
    assert params["min_value"] == 4
    assert params["max_value"] == 9
    assert params["over_max_allowed"] is True


def test_get_parameters_values_mixed_all_split():
    """Test get_parameters_values splits parameters on newline, semicolon, and space"""
    row = {"parameters": "min=2\nmax=7;overMaxAllowed min=3"}
    params = get_parameters_values(row)
    # The last min=3 should override min=2
    assert params["min_value"] == 3
    assert params["max_value"] == 7
    assert params["over_max_allowed"] is True
