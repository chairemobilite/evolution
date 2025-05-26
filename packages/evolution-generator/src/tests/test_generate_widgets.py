# Copyright 2025, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

from scripts.generate_widgets import (
    generate_join_with,
    generate_common_properties,
    generate_info_text_widget,
    generate_radio_widget,
    generate_label,
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
# TODO: Test generate_path


def test_generate_join_with_with_value():
    """Test that generate_join_with returns the correct string when a questionName value is provided"""
    result = generate_join_with("questionName")
    assert result == "    joinWith: 'questionName',\n"


def test_generate_join_with_without_value():
    """Test that generate_join_with returns an empty string when no questionName value is provided"""
    result = generate_join_with("")
    assert result == ""


# TODO: Test generate_label
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
    }
    widget_label = generate_label(
        row["section"],
        row["path"],
        False,
        False,
    )
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
    print(code)


# TODO: Test generate_select_widget
# TODO: Test generate_string_widget
# TODO: Test generate_number_widget
# TODO: Test generate_info_text_widget
# TODO: Test generate_range_widget
# TODO: Test generate_checkbox_widget
# TODO: Test generate_next_button_widget
# TODO: Test generate_text_widget
