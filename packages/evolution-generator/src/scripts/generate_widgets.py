# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes functions that generate the widgets.tsx and widgetsNames.ts files.
# These functions are intended to be invoked from the generate_survey.py script.
from helpers.generator_helpers import (
    INDENT,
    add_generator_comment,
    generate_label_typescript_with_context,
    get_label_context_flags,
)
from survey_definition.survey_definition import SurveyDefinition
from survey_definition.widgets_definition import WidgetDefinition
from typing import TypedDict
from dataclasses import dataclass


@dataclass
class ImportFlags:
    """
    Dataclass to hold the import flags for widget generation.
    This will make the code more maintainable and less error-prone when adding new flags.
    """

    # Flags for imports
    has_choices_import: bool = False
    has_custom_choices_import: bool = False
    has_conditionals_import: bool = False
    has_input_range_import: bool = False
    has_custom_widgets_import: bool = False
    has_built_in_widgets_import: bool = False
    has_validations_import: bool = (
        True  # Default to True for validations.requiredValidation
    )
    has_custom_validations_import: bool = False
    has_custom_conditionals_import: bool = False
    has_help_popup_import: bool = False
    has_helper_import: bool = False
    has_formatter_import: bool = False
    has_custom_formatter_import: bool = False
    has_custom_labels_import: bool = False

    # Flags for specific labels
    has_nickname_label: bool = False
    has_persons_count_label: bool = False
    has_gendered_suffix_label: bool = False


@dataclass
class GenderFields:
    """
    Dataclass to track which gender-related fields are available in the survey.
    This will be used to determine which field to use for gender context in labels.
    """

    has_gender: bool = False
    has_sex_assigned_at_birth: bool = False


class WidgetResult(TypedDict):
    """
    TypedDict to hold the result of widget statement generation.
    It contains:
    - statement: str, the TypeScript code for the widget
    - has_helper_import: bool, whether the widget needs survey helper imports
    - has_formatter_import: bool, whether the widget needs formatter imports
    - has_custom_formatter_import: bool, whether the widget needs custom formatter imports
    """

    statement: str
    has_helper_import: bool
    has_formatter_import: bool
    has_custom_formatter_import: bool


# Function to generate widgets.tsx for each section
def generate_widgets(survey_definition: SurveyDefinition, widgets_output_folder: str):
    try:
        widgets = survey_definition.widgets

        # Get all unique section names, in the order of the Widgets table
        section_names = list(dict.fromkeys(widget.section for widget in widgets))

        # Track gender-related fields. It will be done one section at a time, so
        # it's not possible to use gender field in a section before it is
        # defined, but subsequent sections can use it.
        gender_fields = GenderFields()

        # Transform the section's widgets into TypeScript code
        def convert_widgets_to_typescript(section):
            section_widgets = [
                widget for widget in widgets if widget.section == section
            ]

            # See if the section contains a gender field and store it
            for widget in section_widgets:
                if widget.path == "gender":
                    gender_fields.has_gender = True
                elif widget.path == "sexAssignedAtBirth":
                    gender_fields.has_sex_assigned_at_birth = True

            # Get the widgets file import flags
            import_flags = get_widgets_file_import_flags(section_widgets)

            # Generate widgets statements with gender fields info
            widget_results = [
                generate_widget_statement(widget, gender_fields)
                for widget in section_widgets
            ]

            # Check if any widget has specific import flags and update import_flags accordingly
            import_flags.has_helper_import = any(
                result["has_helper_import"] for result in widget_results
            )
            import_flags.has_formatter_import = any(
                result.get("has_formatter_import") for result in widget_results
            )
            import_flags.has_custom_formatter_import = any(
                result.get("has_custom_formatter_import") for result in widget_results
            )

            # Generate import statements
            import_statements = generate_import_statements(import_flags=import_flags)

            # Generate the widgets statements
            widgets_statements = [result["statement"] for result in widget_results]
            widgets_statements = (
                f"{import_statements}\n{'\n\n'.join(widgets_statements)}\n"
            )

            # Generate widgets names
            widgets_names_statements = generate_widgets_names_statements(
                section_widgets
            )

            return {
                "widgetsStatements": widgets_statements,
                "widgetsNamesStatements": widgets_names_statements,
            }

        # Process the output files based on sections
        for section in section_names:
            transformed_content = convert_widgets_to_typescript(section)
            widgets_output_path = widgets_output_folder + "/" + section

            # Add Generator comment at the start of the file
            ts_code = add_generator_comment()

            # Write the transformed content to the widgets output file
            with open(
                widgets_output_path + "/widgets.tsx",
                mode="w",
                encoding="utf-8",
                newline="\n",
            ) as f:
                f.write(ts_code)
                f.write(transformed_content["widgetsStatements"])
                print(f"Generated {widgets_output_path}/widgets.tsx successfully")

            # Write the transformed content to the widgetsNames output file
            with open(
                widgets_output_path + "/widgetsNames.ts",
                mode="w",
                encoding="utf-8",
                newline="\n",
            ) as f:
                f.write(ts_code)
                f.write(transformed_content["widgetsNamesStatements"])
                print(f"Generated {widgets_output_path}/widgetsNames.ts successfully")

    except Exception as e:
        print(f"Error with widgets: {e}")
        raise e


# Generate widget statement for a widget
def generate_widget_statement(
    widget: WidgetDefinition, gender_fields: GenderFields = None
) -> WidgetResult:
    # Initialize gender_fields to a default class if none is provided
    gender_fields = gender_fields or GenderFields()
    question_name = widget.question_name
    input_type = widget.input_type
    widget_label = generate_label(widget, gender_fields, key_name="label")

    # Initialize result with default values
    result: WidgetResult = {"statement": "", "has_helper_import": False}

    # If the widget is not active, generate a comment and return
    if not widget.active:
        result["statement"] = (
            f"// Note: {question_name} widget is not active. This widget will not be displayed in the survey."
        )
        return result

    # Generate the widgets statement based on the input type
    if input_type == "Custom":
        result["statement"] = generate_custom_widget(question_name)
    elif input_type == "BuiltIn":
        result["statement"] = generate_built_in_widget(
            question_name=question_name,
            built_in_function=widget.parameters.built_in_function,
        )
    elif input_type == "Radio":
        result["statement"] = generate_radio_widget(widget, widget_label)
    elif input_type == "RadioNumber":
        result = generate_radio_number_widget(widget, widget_label)
    elif input_type == "Select":
        result["statement"] = generate_select_widget(widget, widget_label)
    elif input_type == "String":
        result = generate_string_widget(widget, widget_label)
    elif input_type == "Number":
        result["statement"] = generate_number_widget(widget, widget_label)
    elif input_type == "InfoText":
        # Widget label have a different key for InfoText
        widget_label = generate_label(widget, gender_fields, key_name="text")
        result["statement"] = generate_info_text_widget(widget, widget_label)
    elif input_type == "Range":
        result["statement"] = generate_range_widget(widget, widget_label)
    elif input_type == "Checkbox":
        result["statement"] = generate_checkbox_widget(widget, widget_label)
    elif input_type == "NextButton":
        result["statement"] = generate_next_button_widget(widget, widget_label)
    elif input_type == "Text":
        result["statement"] = generate_text_widget(widget, widget_label)

    # Add the comment line to the statement if it is present
    if widget.comments:
        # Support multi-line comments by emitting one `// ...` per line.
        comment_block = "".join(
            [f"// {line}\n" for line in widget.comments.splitlines()]
        )
        result["statement"] = f"{comment_block}{result['statement']}"

    return result


# Define a function to generate the widget name for a given widget and group
def generate_widget_name(widget: WidgetDefinition, group, is_last):
    question_name = widget.question_name
    widget_group = widget.group or ""

    # Return the question_name commented if not active
    if group == widget_group:
        if widget.active:
            return f"{INDENT}'{question_name}'" + ("," if not is_last else "")
        else:
            return f"{INDENT}// '{question_name}'" + ("," if not is_last else "")


# Define a function to generate the widgets names statements
def generate_widgets_names_statements(section_widgets: list[WidgetDefinition]):
    # Generate the widget name for each widget in the group and add it to the widgets names statements
    group_question_dict = {}

    # Populate the dictionary with groups and their corresponding widgets
    for widget in section_widgets:
        group = widget.group or ""
        if group not in group_question_dict:
            group_question_dict[group] = []
        group_question_dict[group].append(widget)

    # Start the widgets names statements with the import statement
    widgets_names_statements = "import { SectionConfig } from 'evolution-common/lib/services/questionnaire/types';\n"

    # For each group in the dictionary, generate the widgets names
    for group, group_widgets in group_question_dict.items():
        # If the group is an empty string, use 'widgetsNames' as the variable name
        # Otherwise, append 'WidgetsNames' to the group name to create the variable name
        if group == "":
            widgets_names_statements += (
                "\nexport const widgetsNames: SectionConfig['widgets'] = [\n"
            )
        else:
            widgets_names_statements += (
                f"\nexport const {group}WidgetsNames: SectionConfig['widgets'] = [\n"
            )

        # For each widget in the group, generate the widget name and add it to the widgets names statements
        for i, widget in enumerate(group_widgets):
            is_last = (
                i == len(group_widgets) - 1
            )  # Check if this is the last widget in the group
            widgets_names = "\n".join([generate_widget_name(widget, group, is_last)])
            widgets_names_statements += f"{widgets_names}\n"

        widgets_names_statements += "];\n"

    return widgets_names_statements


# Generate import statement if needed
def generate_import_statements(import_flags: ImportFlags) -> str:
    escape_import = (
        "import _escape from 'lodash/escape';\n"
        if import_flags.has_nickname_label
        else ""
    )
    od_survey_helpers_import = (
        "import * as odSurveyHelpers from 'evolution-common/lib/services/odSurvey/helpers';\n"
        if (
            import_flags.has_nickname_label
            or import_flags.has_gendered_suffix_label
            or import_flags.has_persons_count_label
        )
        else ""
    )
    choices_import = (
        "import * as choices from '../../common/choices';\n"
        if import_flags.has_choices_import
        else ""
    )
    custom_choices_import = (
        "import * as customChoices from './customChoices';\n"
        if import_flags.has_custom_choices_import
        else ""
    )
    conditionals_import = (
        "import * as conditionals from '../../common/conditionals';\n"
        if import_flags.has_conditionals_import
        else ""
    )
    custom_widgets_import = (
        "import * as customWidgets from './customWidgets';\n"
        if import_flags.has_custom_widgets_import
        else ""
    )
    validations_import = (
        "import * as validations from 'evolution-common/lib/services/widgets/validations/validations';\n"
        if import_flags.has_validations_import
        else ""
    )
    custom_validations_import = (
        "import * as customValidations from '../../common/customValidations';\n"
        if import_flags.has_custom_validations_import
        else ""
    )
    custom_conditionals_import = (
        "import * as customConditionals from '../../common/customConditionals';\n"
        if import_flags.has_custom_conditionals_import
        else ""
    )
    custom_help_popup_import = (
        "import * as customHelpPopup from '../../common/customHelpPopup';\n"
        if import_flags.has_help_popup_import
        else ""
    )
    input_range_import = (
        "import * as inputRange from '../../common/inputRange';\n"
        if import_flags.has_input_range_import
        else ""
    )
    gendered_suffix_import = (
        "import { getGenderedSuffixes } from '../../helperFunctions/frontendHelper';\n"
        if import_flags.has_gendered_suffix_label
        else ""
    )
    survey_helper_import = (
        "import * as surveyHelper from 'evolution-common/lib/utils/helpers';\n"
        if import_flags.has_helper_import
        else ""
    )
    formatter_import = (
        "import * as formatters from 'evolution-common/lib/utils/formatters';\n"
        if import_flags.has_formatter_import
        else ""
    )
    custom_formatter_import = (
        "import * as customFormatters from '../../common/customFormatters';\n"
        if import_flags.has_custom_formatter_import
        else ""
    )
    custom_labels_import = (
        "import * as customLabels from '../../common/customLabels';\n"
        if import_flags.has_custom_labels_import
        else ""
    )
    return (
        f"import {{ TFunction }} from 'i18next';\n"
        f"{escape_import}"
        f"import * as defaultInputBase from 'evolution-frontend/lib/components/inputs/defaultInputBase';\n"
        f"import {{ defaultConditional }} from 'evolution-common/lib/services/widgets/conditionals/defaultConditional';\n"
        f"import * as WidgetConfig from 'evolution-common/lib/services/questionnaire/types';\n"
        f"{validations_import}"
        # TODO: Add built-in widgets import when we are ready to support them
        f"{od_survey_helpers_import}"
        f"{survey_helper_import}"
        f"{choices_import}"
        f"{conditionals_import}"
        f"{formatter_import}"
        f"{input_range_import}"
        f"{gendered_suffix_import}"
        f"{custom_conditionals_import}"
        f"{custom_widgets_import}"
        f"{custom_choices_import}"
        f"{custom_help_popup_import}"
        f"{custom_validations_import}"
        f"{custom_formatter_import}"
        f"{custom_labels_import}"
    )


# Generate Custom widget
def generate_custom_widget(question_name):
    return f"export const {question_name} = customWidgets.{question_name};"


# TODO: Change this when we are ready to support built-in widgets, right now we are just emitting a comment placeholder.
# Generate built-in widget
def generate_built_in_widget(question_name: str, built_in_function: str | None) -> str:
    if built_in_function:
        return (
            f"// Built-in widget placeholder for '{question_name}' (builtInFunction: {built_in_function}).\n"
            f"// export const {question_name} = {built_in_function}();"
        )
    else:
        # TODO: Require builtInFunction once we are ready to support built-in widgets
        # (see WIDGET_REQUIRED_PARAMETERS_BY_INPUT_TYPE). Until then, the comment marks
        # where the widget goes.
        return f"// Built-in widget placeholder for '{question_name}'"


# Generate comma and skip line
def generate_comma(comma):
    return f"{',' if comma else ''}"


def generate_skip_line(skip_line):
    return f"{'\n' if skip_line else ''}"


def generate_suffix_label_code(suffix_label: str | None) -> str:
    """
    Generates the TypeScript 'suffixLabel' property code, from the suffixLabel
    parameter (suffixLabel=sectionName:valueSuffix, see WidgetParameters).
    """
    if not suffix_label:
        return ""
    return f"{INDENT}suffixLabel: (t: TFunction) => t('{suffix_label}'),\n"


# Generate all the widget parts
def generate_constExport(question_name, input_type):
    return f"export const {question_name}: WidgetConfig.{input_type} = {{"


def generate_defaultInputBase(defaultInputBase):
    return f"{INDENT}...defaultInputBase.{defaultInputBase}"


def generate_path(path):
    """Generates the TypeScript path property for a widget."""
    return f"{INDENT}path: '{path}'"


def generate_join_with(join_with):
    """Generate joinWith property"""
    if join_with:
        return f"{INDENT}joinWith: '{join_with}',\n"
    else:
        return ""


def generate_label(
    widget: WidgetDefinition, gender_fields: GenderFields = None, key_name="label"
):
    """
    Generates the TypeScript label or text property for a widget.
    The property name is controlled by key_name ('label' or 'text').
    If the widget has the customLabels={{SomeCustomLabels}} parameter, returns `{key_name}: customLabels.SomeCustomLabels`.
    Otherwise, inspects the widget's labels, in every language, to determine if nickname, count, or gender context is needed.
    - If no special flags are detected, returns a simple label function.
    - If {{nickname}} is present, adds nickname context.
    - If {{count}} is present, adds countPersons context.
    - If {{gender:...}} is present, adds gender or sexAssignedAtBirth context.
    - If label_one is present, adds countPersons assignment and count: countPersons to the translation context.
    """
    section = widget.section
    label_key = widget.question_name

    # If customLabels is set, return the customLabels function
    custom_labels = widget.parameters.custom_labels
    if custom_labels:
        return f"{INDENT}{key_name}: customLabels.{custom_labels}"

    # Initialize gender_fields to a default class if none is provided
    gender_fields = gender_fields or GenderFields()
    has_nickname, has_count, has_gender_context, has_label_one = (
        get_label_context_flags(
            labels=widget.label.values(),
            labels_one=widget.label_one.values(),
        )
    )

    gender_context_expression: str | None = None
    if has_gender_context:
        if gender_fields.has_gender and gender_fields.has_sex_assigned_at_birth:
            gender_context_expression = (
                "activePerson?.gender || activePerson?.sexAssignedAtBirth"
            )
        elif gender_fields.has_gender:
            gender_context_expression = "activePerson?.gender"
        elif gender_fields.has_sex_assigned_at_birth:
            gender_context_expression = "activePerson?.sexAssignedAtBirth"
        else:
            print(
                f"Warning: Gender context used in label for '{section}:{label_key}' but neither 'gender' nor 'sexAssignedAtBirth' fields are available in this section."
            )
            gender_context_expression = "undefined"

    # Generate the TypeScript code for the label property with optional runtime context.
    return generate_label_typescript_with_context(
        property_name=key_name,
        translation_key=f"{section}:{label_key}",
        base_indent=INDENT,
        has_nickname=has_nickname,
        has_count=has_count,
        has_gender_context=has_gender_context,
        has_label_one=has_label_one,
        gender_context_expression=gender_context_expression,
    )


def generate_help_popup(help_popup, comma=True, skip_line=True):
    if help_popup:
        return f"{INDENT}helpPopup: customHelpPopup.{help_popup}{generate_comma(comma)}{generate_skip_line(skip_line)}"
    else:
        return ""


def generate_confirm_popup(confirm_popup, comma=True, skip_line=True):
    if confirm_popup:
        return f"{INDENT}confirmPopup: customHelpPopup.{confirm_popup}{generate_comma(comma)}{generate_skip_line(skip_line)}"
    else:
        return ""


def generate_choices(choices):
    """
    Generates the TypeScript 'choices' property for a widget.

    If the choices string ends with 'CustomChoices' (case-insensitive), returns 'choices: customChoices.{choices}'.
    Otherwise, returns 'choices: choices.{choices}'.

    Args:
        choices (str): The widget's choices name.

    Returns:
        str: The TypeScript code for the choices property.
    """
    if choices.lower().endswith("customchoices"):
        return f"{INDENT}choices: customChoices.{choices}"
    return f"{INDENT}choices: choices.{choices}"


def generate_additional_choices(choices, comma=True, skip_line=True):
    """
    Generates the TypeScript 'additionalChoices' property for a widget.

    Uses the same choices module resolution as the regular 'choices' property.
    """
    if not choices:
        return ""
    additional_choices = generate_choices(choices).replace(
        f"{INDENT}choices:", f"{INDENT}additionalChoices:", 1
    )
    return f"{additional_choices}{generate_comma(comma)}{generate_skip_line(skip_line)}"


def generate_conditional(conditional):
    if not conditional:
        return f"{INDENT}conditional: defaultConditional"
    elif conditional.endswith("CustomConditional"):
        return f"{INDENT}conditional: customConditionals.{conditional}"
    return f"{INDENT}conditional: conditionals.{conditional}"


def generate_validation(validation):
    if not validation:
        # If validation is empty, use 'requiredValidation'
        return f"{INDENT}validations: validations.requiredValidation"
    elif validation.endswith("CustomValidation"):
        # If validation ends with 'CustomValidation', use 'customValidation'
        return f"{INDENT}validations: customValidations.{validation}"
    else:
        # Otherwise, use the provided validation
        return f"{INDENT}validations: validations.{validation}"


def generate_two_columns(twoColumns, shouldAddTwoColumns):
    if shouldAddTwoColumns:
        return f"{INDENT}twoColumns: {'true' if twoColumns else 'false'},\n"
    else:
        return ""


def generate_contains_html(containsHtml, shouldAddContainsHtml):
    if shouldAddContainsHtml:
        return f"{INDENT}containsHtml: {'true' if containsHtml else 'false'},\n"
    else:
        return ""


def generate_custom_path(custom_path):
    if custom_path:
        return f"{INDENT}customPath: '{custom_path}',\n"
    else:
        return ""


def generate_custom_choice(custom_choice):
    if custom_choice:
        return f"{INDENT}customChoice: '{custom_choice}',\n"
    else:
        return ""


def generate_default_value(default_value):
    if default_value:
        return f"{INDENT}defaultValue: '{default_value}',\n"
    else:
        return ""


def generate_common_properties(
    widget: WidgetDefinition,
    shouldAddTwoColumns=True,
    shouldAddContainsHtml=True,
    allow_join_with=True,
):
    """
    - Handles twoColumns and containsHtml column properties.
    - Adds joinWith from the appearance's join_with (join_with=${questionName}).
    - If allow_join_with is False, leaves joinWith out.
    """
    join_with = widget.appearance.join_with if allow_join_with else None

    return (
        f"{generate_two_columns(widget.two_columns, shouldAddTwoColumns)}"
        f"{generate_contains_html(widget.contains_html, shouldAddContainsHtml)}"
        f"{generate_join_with(join_with)}"
    )


# Generate InputRadio widget
def generate_radio_widget(widget: WidgetDefinition, widget_label):
    return (
        f"{generate_constExport(widget.question_name, 'InputRadioType')}\n"
        f"{generate_defaultInputBase('inputRadioBase')},\n"
        f"{generate_path(widget.path)},\n"
        f"{generate_common_properties(widget)}"
        f"{generate_custom_path(widget.custom_path)}"
        f"{generate_custom_choice(widget.custom_choice)}"
        f"{widget_label},\n"
        f"{generate_help_popup(widget.help_popup)}"
        f"{generate_choices(widget.choices)},\n"
        f"{generate_conditional(widget.conditional)},\n"
        f"{generate_validation(widget.validation)}\n"
        f"}};"
    )


def _radio_number_bound(bound: int | str) -> tuple[int | str, bool]:
    """
    The TypeScript value of a RadioNumber's min or max: the number, or a function
    reading the response at that path. The bool tells whether it needs the surveyHelper
    import.
    """
    if isinstance(bound, str):
        return (
            f"(interview) => surveyHelper.getResponse(interview, '{bound}', 0) as any",
            True,
        )
    return bound, False


# Generate InputRadioNumber widget
def generate_radio_number_widget(
    widget: WidgetDefinition, widget_label
) -> WidgetResult:
    """
    - Writes the valueRange from the min and max parameters (required, see WidgetParameters).
    - Adds overMaxAllowed when the overMaxAllowed parameter is set.
    - Generates the TypeScript widget code for InputRadioNumberType.
    """
    parameters = widget.parameters
    min_value, min_needs_helper = _radio_number_bound(parameters.min)
    max_value, max_needs_helper = _radio_number_bound(parameters.max)

    result: WidgetResult = {
        "statement": "",
        "has_helper_import": min_needs_helper or max_needs_helper,
    }

    value_range = (
        f"{INDENT}valueRange: {{\n"
        f"{INDENT}{INDENT}min: {min_value},\n"
        f"{INDENT}{INDENT}max: {max_value}\n"
        f"{INDENT}}},\n"
    )
    over_max = f"{INDENT}overMaxAllowed: true,\n" if parameters.over_max_allowed else ""
    additional_choices = generate_additional_choices(widget.choices)
    result["statement"] = (
        f"{generate_constExport(widget.question_name, 'InputRadioNumberType')}\n"
        f"{generate_defaultInputBase('inputRadioNumberBase')},\n"
        f"{generate_path(widget.path)},\n"
        f"{generate_common_properties(widget)}"
        f"{widget_label},\n"
        f"{value_range}"
        f"{over_max}"
        f"{generate_help_popup(widget.help_popup)}"
        f"{additional_choices}"
        f"{generate_conditional(widget.conditional)},\n"
        f"{generate_validation(widget.validation)}\n"
        f"}};"
    )
    return result


# Generate Select widget
def generate_select_widget(widget: WidgetDefinition, widget_label):
    return (
        f"{generate_constExport(widget.question_name, 'InputSelectType')}\n"
        f"{generate_defaultInputBase('inputSelectBase')},\n"
        f"{generate_path(widget.path)},\n"
        f"{generate_common_properties(widget)}"
        f"{widget_label},\n"
        f"{generate_help_popup(widget.help_popup)}"
        f"{generate_choices(widget.choices)},\n"
        f"{generate_conditional(widget.conditional)},\n"
        f"{generate_validation(widget.validation)}\n"
        f"}};"
    )


# Generate InputString widget
def generate_string_widget(widget: WidgetDefinition, widget_label) -> WidgetResult:
    """
    - Adds the inputFilter from the formatter parameter (formatter=somethingCustomFormatter).
    - Adds the suffixLabel from the suffixLabel parameter (suffixLabel=sectionName:valueSuffix).
    - Generates the TypeScript widget code for InputStringType.
    """
    formatter = widget.parameters.formatter

    result: WidgetResult = {
        "statement": "",
        "has_helper_import": False,
        "has_formatter_import": False,
        "has_custom_formatter_import": False,
    }

    # Add formatter input filter if specified
    formatter_code = ""
    if formatter:
        if formatter.endswith("CustomFormatter"):
            formatter_code = f"{INDENT}inputFilter: customFormatters.{formatter},\n"
            result["has_custom_formatter_import"] = True
        else:
            formatter_code = f"{INDENT}inputFilter: formatters.{formatter},\n"
            result["has_formatter_import"] = True

    result["statement"] = (
        f"{generate_constExport(widget.question_name, 'InputStringType')}\n"
        f"{generate_defaultInputBase('inputStringBase')},\n"
        f"{generate_path(widget.path)},\n"
        f"{generate_common_properties(widget)}"
        f"{generate_default_value(widget.default_value)}"
        f"{formatter_code}"
        f"{widget_label},\n"
        f"{generate_suffix_label_code(widget.parameters.suffix_label)}"
        f"{generate_help_popup(widget.help_popup)}"
        f"{generate_conditional(widget.conditional)},\n"
        f"{generate_validation(widget.validation)}\n"
        f"}};"
    )
    return result


# Generate InputNumber widget
def generate_number_widget(widget: WidgetDefinition, widget_label):
    return (
        f"{generate_constExport(widget.question_name, 'InputStringType')}\n"
        f"{generate_defaultInputBase('inputNumberBase')},\n"
        f"{generate_path(widget.path)},\n"
        f"{generate_common_properties(widget)}"
        f"{widget_label},\n"
        f"{generate_suffix_label_code(widget.parameters.suffix_label)}"
        f"{generate_help_popup(widget.help_popup)}"
        f"{generate_conditional(widget.conditional)},\n"
        f"{generate_validation(widget.validation)}\n"
        f"}};"
    )


# Generate InfoText widget
def generate_info_text_widget(widget: WidgetDefinition, widget_label):
    return (
        f"{generate_constExport(widget.question_name, 'TextWidgetConfig')}\n"
        f"{generate_defaultInputBase('infoTextBase')},\n"
        f"{generate_path(widget.path)},\n"
        f"{generate_common_properties(widget, shouldAddTwoColumns = False, allow_join_with=False)}"
        f"{widget_label},\n"
        f"{generate_conditional(widget.conditional)}\n"
        f"}};"
    )


# Generate InputRange widget
def generate_range_widget(widget: WidgetDefinition, widget_label):
    notApplicableConfig = (
        "includeNotApplicable: true,\n" if widget.include_not_applicable else ""
    )
    return (
        f"{generate_constExport(widget.question_name, 'InputRangeType')}\n"
        f"{generate_defaultInputBase('inputRangeBase')},\n"
        f"{INDENT}...inputRange.{widget.input_range},\n"
        f"{generate_path(widget.path)},\n"
        f"{generate_common_properties(widget)}"
        f"{widget_label},\n"
        f"{notApplicableConfig}"
        f"{generate_help_popup(widget.help_popup)}"
        f"{generate_conditional(widget.conditional)},\n"
        f"{generate_validation(widget.validation)}\n"
        f"}};"
    )


# Generate InputCheckbox widget
def generate_checkbox_widget(widget: WidgetDefinition, widget_label):
    return (
        f"{generate_constExport(widget.question_name, 'InputCheckboxType')}\n"
        f"{generate_defaultInputBase('inputCheckboxBase')},\n"
        f"{generate_path(widget.path)},\n"
        f"{generate_common_properties(widget)}"
        f"{widget_label},\n"
        f"{generate_help_popup(widget.help_popup)}"
        f"{generate_choices(widget.choices)},\n"
        f"{generate_conditional(widget.conditional)},\n"
        f"{generate_validation(widget.validation)}\n"
        f"}};"
    )


# Generate NextButton widget
def generate_next_button_widget(widget: WidgetDefinition, widget_label):
    return (
        f"{generate_constExport(widget.question_name, 'ButtonWidgetConfig')}\n"
        f"{generate_defaultInputBase('buttonNextBase')},\n"
        f"{generate_path(widget.path)},\n"
        f"{generate_confirm_popup(widget.confirm_popup)}"
        f"{widget_label},\n"
        f"{generate_conditional(widget.conditional)}\n"
        f"}};"
    )


# Generate Text textarea widget
def generate_text_widget(widget: WidgetDefinition, widget_label):
    return (
        f"{generate_constExport(widget.question_name, 'InputTextType')}\n"
        f"{generate_defaultInputBase('textBase')},\n"
        f"{generate_path(widget.path)},\n"
        f"{generate_common_properties(widget)}"
        f"{widget_label},\n"
        f"{generate_help_popup(widget.help_popup)}"
        f"{generate_conditional(widget.conditional)},\n"
        f"{generate_validation(widget.validation)}\n"
        f"}};"
    )


def get_widgets_file_import_flags(
    section_widgets: list[WidgetDefinition],
) -> ImportFlags:
    """
    Analyze the section's widgets and determine which import flags should be set to True.

    Returns an ImportFlags dataclass with all the import flag booleans.
    """
    import_flags = ImportFlags()

    # Check all widgets for import flags
    for widget in section_widgets:
        if widget.parameters.custom_labels:
            import_flags.has_custom_labels_import = True
        if widget.choices:
            # Check to see if the choices finish with 'CustomChoices'
            if widget.choices.lower().endswith("customchoices"):
                import_flags.has_custom_choices_import = True
            else:
                import_flags.has_choices_import = True
        if widget.validation:
            # Check to see if the validation finish with 'CustomValidation'
            if widget.validation.lower().endswith("customvalidation"):
                import_flags.has_custom_validations_import = True
            else:
                import_flags.has_validations_import = True
        if widget.conditional and widget.conditional.lower().endswith(
            "customconditional"
        ):
            # Check to see if the conditional finish with 'CustomConditional'
            import_flags.has_custom_conditionals_import = True
        elif widget.conditional and not widget.conditional.lower().endswith(
            "customconditional"
        ):
            # Check to see if the conditional is not empty and does not finish with 'CustomConditional'
            import_flags.has_conditionals_import = True
        if widget.input_range:
            import_flags.has_input_range_import = True
        if widget.input_type == "Custom":
            import_flags.has_custom_widgets_import = True
        if widget.input_type == "BuiltIn":
            import_flags.has_built_in_widgets_import = True
        # Only the input types that write them can have a help or confirm popup (see
        # WIDGET_ALLOWED_INPUT_TYPES_BY_FIELD)
        if widget.help_popup or widget.confirm_popup:
            import_flags.has_help_popup_import = True

        # Check for {{nickname}}, {{count}}, and label_one in the labels, in every language
        has_nickname, has_count, _has_gender_context, has_label_one = (
            get_label_context_flags(
                labels=widget.label.values(),
                labels_one=widget.label_one.values(),
            )
        )
        if has_nickname:
            import_flags.has_nickname_label = True
        if has_count or has_label_one:
            import_flags.has_persons_count_label = True
        if any("{{genderedSuffix" in label for label in widget.label.values()):
            import_flags.has_gendered_suffix_label = True

    return import_flags
