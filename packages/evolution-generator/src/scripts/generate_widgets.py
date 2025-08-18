# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes functions that generate the widgets.tsx and widgetsNames.ts files.
# These functions are intended to be invoked from the generate_survey.py script.
from helpers.generator_helpers import (
    INDENT,
    get_data_from_excel,
    add_generator_comment,
)
import re  # Regular expression module for pattern matching
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
    has_validations_import: bool = (
        True  # Default to True for validations.requiredValidation
    )
    has_custom_validations_import: bool = False
    has_custom_conditionals_import: bool = False
    has_help_popup_import: bool = False
    has_helper_import: bool = False
    has_formatter_import: bool = False
    has_custom_formatter_import: bool = False

    # Flags for specific labels
    has_nickname_label: bool = False
    has_persons_count_label: bool = False
    has_gendered_suffix_label: bool = False


class RadioNumberParametersResult(TypedDict):
    """
    TypedDict to hold the result of parsing parameters for a radio_number widget from the Widgets sheet.
    It contains:
    - min_value: int, the minimum value parsed from parameters.
    - max_value: int, the maximum value parsed from parameters.
    - over_max_allowed: bool, whether the 'overMaxAllowed' line was present in parameters.
    """

    min_value: int
    max_value: int
    over_max_allowed: bool


class StringParametersResult(TypedDict):
    """
    TypedDict to hold the result of parsing parameters for a string widget from the Widgets sheet.
    It contains:
    - formatter: str | None, the name of the formatter to use. It can end with `customFormatter` to use a custom formatter.
    """

    formatter: str | None


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
def generate_widgets(excel_file_path: str, widgets_output_folder: str):
    try:
        # Read data from Excel and return rows and headers
        rows, headers = get_data_from_excel(excel_file_path, sheet_name="Widgets")

        # Find the index of 'section' in headers
        section_index = headers.index("section")
        # Get all unique section names
        section_names = set(row[section_index].value for row in rows[1:])

        # Transform Excel content into TypeScript code
        def convert_excel_to_typescript(section):
            headers = [cell.value for cell in rows[0]]

            section_rows = []
            for row in rows[1:]:
                values = [cell.value if cell.value is not None else "" for cell in row]

                if len(values) != len(headers):
                    print(
                        f"Skipping row {row}: Number of values ({len(values)}) does not match the number of headers ({len(headers)})."
                    )
                    continue

                row_dict = dict(zip(headers, values))
                section_rows.append(row_dict)

            # Filter rows based on section
            section_rows = [row for row in section_rows if row["section"] == section]

            # Get the widgets file import flags
            import_flags = get_widgets_file_import_flags(section_rows)

            # Generate widgets statements
            widget_results = [generate_widget_statement(row) for row in section_rows]

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
            widgets_names_statements = generate_widgets_names_statements(section_rows)

            return {
                "widgetsStatements": widgets_statements,
                "widgetsNamesStatements": widgets_names_statements,
            }

        # Process the output files based on sections
        for section in section_names:
            if section is None:
                continue
            transformed_content = convert_excel_to_typescript(section)
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


# Generate widget statement for a row
def generate_widget_statement(row) -> WidgetResult:
    question_name = row["questionName"]
    input_type = row["inputType"]
    section = row["section"]
    path = row["path"]
    conditional = row["conditional"]
    validation = row["validation"]
    input_range = row["inputRange"]
    help_popup = row["help_popup"]
    choices = row["choices"]
    confirm_popup = row["confirm_popup"] if "confirm_popup" in row else None
    widget_label = generate_label(section, path, row, key_name="label")

    # Initialize result with default values
    result: WidgetResult = {"statement": "", "has_helper_import": False}

    if input_type == "Custom":
        result["statement"] = generate_custom_widget(question_name)
    elif input_type == "Radio":
        result["statement"] = generate_radio_widget(
            question_name,
            path,
            choices,
            help_popup,
            conditional,
            validation,
            widget_label,
            row,
        )
    elif input_type == "RadioNumber":
        result = generate_radio_number_widget(
            question_name,
            path,
            help_popup,
            conditional,
            validation,
            widget_label,
            row,
        )
    elif input_type == "Select":
        result["statement"] = generate_select_widget(
            question_name,
            path,
            choices,
            conditional,
            validation,
            widget_label,
            row,
        )
    elif input_type == "String":
        result = generate_string_widget(
            question_name,
            path,
            help_popup,
            conditional,
            validation,
            widget_label,
            row,
        )
    elif input_type == "Number":
        result["statement"] = generate_number_widget(
            question_name,
            path,
            help_popup,
            conditional,
            validation,
            widget_label,
            row,
        )
    elif input_type == "InfoText":
        # Widget label have a different key for InfoText
        widget_label = generate_label(section, path, row, key_name="text")
        result["statement"] = generate_info_text_widget(
            question_name, path, conditional, widget_label, row
        )
    elif input_type == "Range":
        result["statement"] = generate_range_widget(
            question_name,
            path,
            input_range,
            conditional,
            validation,
            widget_label,
            row,
        )
    elif input_type == "Checkbox":
        result["statement"] = generate_checkbox_widget(
            question_name,
            path,
            choices,
            help_popup,
            conditional,
            validation,
            widget_label,
            row,
        )
    elif input_type == "NextButton":
        result["statement"] = generate_next_button_widget(
            question_name, path, confirm_popup, widget_label, row
        )
    elif input_type == "Text":
        result["statement"] = generate_text_widget(
            question_name, path, conditional, validation, widget_label, row
        )
    else:
        result["statement"] = f"// {question_name}"

    return result


# Define a function to generate the widget name for a given row and group
def generate_widget_name(row, group, is_last):
    question_name = row["questionName"]
    active = row["active"]
    rowGroup = row.get("group") if row.get("group") else ""

    # Return the question_name commented if not active
    if group == rowGroup:
        if active:
            return f"{INDENT}'{question_name}'" + ("," if not is_last else "")
        else:
            return f"{INDENT}// '{question_name}'" + ("," if not is_last else "")


# Define a function to generate the widgets names statements
def generate_widgets_names_statements(section_rows):
    # Generate the widget name for each row in the group and add it to the widgets names statements
    group_question_dict = {}

    # Populate the dictionary with groups and their corresponding rows
    for row in section_rows:
        group = row.get("group") if row.get("group") else ""
        if group not in group_question_dict:
            group_question_dict[group] = []
        group_question_dict[group].append(row)

    # Start the widgets names statements with the import statement
    widgets_names_statements = "import { SectionConfig } from 'evolution-common/lib/services/questionnaire/types';\n"

    # For each group in the dictionary, generate the widgets names
    for group, rows in group_question_dict.items():
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

        # For each row in the group, generate the widget name and add it to the widgets names statements
        for i, row in enumerate(rows):
            is_last = i == len(rows) - 1  # Check if this is the last row in the group
            widgets_names = "\n".join([generate_widget_name(row, group, is_last)])
            widgets_names_statements += f"{widgets_names}\n"

        widgets_names_statements += "];\n"

    return widgets_names_statements


# Generate import statement if needed
def generate_import_statements(import_flags: ImportFlags) -> str:
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
    return (
        f"import {{ TFunction }} from 'i18next';\n"
        f"import * as defaultInputBase from 'evolution-frontend/lib/components/inputs/defaultInputBase';\n"
        f"import {{ defaultConditional }} from 'evolution-common/lib/services/widgets/conditionals/defaultConditional';\n"
        f"import * as WidgetConfig from 'evolution-common/lib/services/questionnaire/types';\n"
        f"{validations_import}"
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
    )


# Generate Custom widget
def generate_custom_widget(question_name):
    return f"export const {question_name} = customWidgets.{question_name};"


# Generate comma and skip line
def generate_comma(comma):
    return f"{',' if comma else ''}"


def generate_skip_line(skip_line):
    return f"{'\n' if skip_line else ''}"


# Generate all the widget parts
def generate_constExport(question_name, input_type):
    return f"export const {question_name}: WidgetConfig.{input_type} = {{"


def generate_defaultInputBase(defaultInputBase):
    return f"{INDENT}...defaultInputBase.{defaultInputBase}"


def generate_path(path):
    """
    Generates the TypeScript path property for a widget.
    - If path is empty or None, prints an error and returns an empty string.
    - If path contains invalid characters (anything except letters, numbers, '_', '.', '{', '}'), prints a warning.
    - Returns the formatted path string for TypeScript.
    """
    if not path:
        print("Error: path is missing in Widgets sheet.")
        return ""
    # Allow only a-z, A-Z, 0-9, _, ., {, }
    if not re.match(r"^[a-zA-Z0-9_.{}]+$", path):
        print(
            f"Warning: path '{path}' contains invalid characters in Widgets sheet. Allowed: a-z, A-Z, 0-9, _, ., {{, }}"
        )
    return f"{INDENT}path: '{path}'"


def generate_join_with(join_with):
    """Generate joinWith property"""
    if join_with:
        # Remove single quotes in join_with to prevent syntax errors
        escaped_join_with = join_with.replace("'", "")
        return f"{INDENT}joinWith: '{escaped_join_with}',\n"
    else:
        return ""


def generate_label(section, path, row, key_name="label"):
    """
    Generates the TypeScript label or text property for a widget.
    The property name is controlled by key_name ('label' or 'text').
    Inspects the labels columns in the row to determine if nickname, count, or gender context is needed.
    - If no special flags are detected, returns a simple label function.
    - If {{nickname}} is present, adds nickname context.
    - If {{count}} is present, adds countPersons context.
    - If {{gender:...}} is present, adds getActivePersonGender context.
    - If label_one is present, adds countPersons assignment and count: countPersons to the translation context.
    """
    label_fr = row.get("label::fr", "")  # French label
    label_en = row.get("label::en", "")  # English label
    label_one_fr = row.get("label_one::fr", "")  # French label for one person
    label_one_en = row.get("label_one::en", "")  # English label for one person
    label_text = label_fr + label_en + label_one_fr + label_one_en  # Combine all labels

    has_nickname_label = "{{nickname}}" in label_text
    has_persons_count_label = "{{count}}" in label_text
    has_gender_context_label = (
        "{{gender:" in label_text
    )  # Format: {{gender:female}} or {{gender:male/female}} or {{gender:male/female/other}}
    has_label_one = bool(label_one_fr or label_one_en)

    if not (
        has_persons_count_label
        or has_gender_context_label
        or has_nickname_label
        or has_label_one
    ):
        return f"{INDENT}{key_name}: (t: TFunction) => t('{section}:{path}')"
    additional_t_context = ""
    initial_assignations = ""
    if has_nickname_label or has_gender_context_label:
        initial_assignations += f"{INDENT}{INDENT}const activePerson = odSurveyHelpers.getPerson({{ interview, path }});\n"
    if has_nickname_label:
        initial_assignations += f"{INDENT}{INDENT}const nickname = activePerson?.nickname || t('survey:noNickname');\n"
        additional_t_context += f"{INDENT}{INDENT}{INDENT}nickname,\n"
    if has_label_one or has_persons_count_label:
        initial_assignations += f"{INDENT}{INDENT}const countPersons = odSurveyHelpers.countPersons({{ interview }});\n"
    if has_gender_context_label:
        additional_t_context += (
            f"{INDENT}{INDENT}{INDENT}context: activePerson?.gender,\n"
        )
    if has_persons_count_label or has_label_one:
        additional_t_context += f"{INDENT}{INDENT}{INDENT}count: countPersons,\n"
    widget_label = (
        f"{INDENT}{key_name}: (t: TFunction, interview, path) => {{\n"
        f"{initial_assignations}"
        f"{INDENT}{INDENT}return t('{section}:{path}', {{\n"
        f"{additional_t_context}"
        f"{INDENT}{INDENT}}});\n"
        f"{INDENT}}}"
    )
    return widget_label


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
        choices (str): The choices identifier from the Excel row.

    Returns:
        str: The TypeScript code for the choices property.
    """
    if choices.lower().endswith("customchoices"):
        return f"{INDENT}choices: customChoices.{choices}"
    return f"{INDENT}choices: choices.{choices}"


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


def generate_custom_path(row):
    custom_path = row["customPath"] if "customPath" in row else None
    if custom_path:
        return f"{INDENT}customPath: '{custom_path}',\n"
    else:
        return ""


def generate_custom_choice(row):
    custom_choice = row["customChoice"] if "customChoice" in row else None
    if custom_choice:
        return f"{INDENT}customChoice: '{custom_choice}',\n"
    else:
        return ""


def generate_default_value(row):
    default_value = row["defaultValue"] if "defaultValue" in row else None
    if default_value:
        return f"{INDENT}defaultValue: '{default_value}',\n"
    else:
        return ""


def generate_common_properties(
    row, shouldAddTwoColumns=True, shouldAddContainsHtml=True, allow_join_with=True
):
    """
    - Handles twoColumns and containsHtml column properties.
    - Extracts joinWith from the 'appearance' column if present, using the pattern join_with=${questionName}.
    - Prints a warning if join_with is present but not in the expected pattern.
    - If allow_join_with is False, disables joinWith extraction.
    """
    twoColumns = row["twoColumns"] if "twoColumns" in row else False
    containsHtml = row["containsHtml"] if "containsHtml" in row else False

    join_with = None
    if allow_join_with:
        appearance = row.get("appearance")
        if appearance:
            match = re.search(r"join_with=\$\{([^}]+)\}", appearance)
            if match:
                join_with = match.group(1)
            elif "join_with=" in appearance:
                print(
                    f"Warning: appearance join_with pattern not recognized inside Widgets sheet: '{appearance}'"
                )

    return (
        f"{generate_two_columns(twoColumns, shouldAddTwoColumns)}"
        f"{generate_contains_html(containsHtml, shouldAddContainsHtml)}"
        f"{generate_join_with(join_with)}"
    )


# Generate InputRadio widget
def generate_radio_widget(
    question_name,
    path,
    choices,
    help_popup,
    conditional,
    validation,
    widget_label,
    row,
):
    return (
        f"{generate_constExport(question_name, 'InputRadioType')}\n"
        f"{generate_defaultInputBase('inputRadioBase')},\n"
        f"{generate_path(path)},\n"
        f"{generate_common_properties(row)}"
        f"{generate_custom_path(row)}"
        f"{generate_custom_choice(row)}"
        f"{widget_label},\n"
        f"{generate_help_popup(help_popup)}"
        f"{generate_choices(choices)},\n"
        f"{generate_conditional(conditional)},\n"
        f"{generate_validation(validation)}\n"
        f"}};"
    )


# Generate InputRadioNumber widget
def generate_radio_number_widget(
    question_name,
    path,
    help_popup,
    conditional,
    validation,
    widget_label,
    row,
) -> WidgetResult:
    """
    - Parses min and max from the 'parameters' column (format: min=0\\nmax=17), defaults to min=0, max=6.
    - Parses overMaxAllowed from the 'parameters' column (set to true if a line is 'overMaxAllowed').
    - Generates the TypeScript widget code for InputRadioNumberType.
    """
    parameters: RadioNumberParametersResult = get_radio_number_parameters(row)
    over_max_allowed = parameters["over_max_allowed"]

    result: WidgetResult = {"statement": "", "has_helper_import": False}

    # Determine the value of min_value and max_value based on their types
    if isinstance(parameters["min_value"], str):
        min_value = f"(interview) => surveyHelper.getResponse(interview, '{parameters["min_value"]}', 0) as any"
        result["has_helper_import"] = True
    else:
        min_value = parameters["min_value"]

    # Determine the value of max_value based on its type
    if isinstance(parameters["max_value"], str):
        max_value = f"(interview) => surveyHelper.getResponse(interview, '{parameters["max_value"]}', 0) as any"
        result["has_helper_import"] = True
    else:
        max_value = parameters["max_value"]

    value_range = (
        f"{INDENT}valueRange: {{\n"
        f"{INDENT}{INDENT}min: {min_value},\n"
        f"{INDENT}{INDENT}max: {max_value}\n"
        f"{INDENT}}},\n"
    )
    over_max = f"{INDENT}overMaxAllowed: true,\n" if over_max_allowed else ""
    result["statement"] = (
        f"{generate_constExport(question_name, 'InputRadioNumberType')}\n"
        f"{generate_defaultInputBase('inputRadioNumberBase')},\n"
        f"{generate_path(path)},\n"
        f"{generate_common_properties(row)}"
        f"{widget_label},\n"
        f"{value_range}"
        f"{over_max}"
        f"{generate_help_popup(help_popup)}"
        f"{generate_conditional(conditional)},\n"
        f"{generate_validation(validation)}\n"
        f"}};"
    )
    return result


# Generate Select widget
def generate_select_widget(
    question_name, path, choices, conditional, validation, widget_label, row
):
    return (
        f"{generate_constExport(question_name, 'InputSelectType')}\n"
        f"{generate_defaultInputBase('inputSelectBase')},\n"
        f"{generate_path(path)},\n"
        f"{generate_common_properties(row)}"
        f"{widget_label},\n"
        f"{generate_choices(choices)},\n"
        f"{generate_conditional(conditional)},\n"
        f"{generate_validation(validation)}\n"
        f"}};"
    )


# Generate InputString widget
def generate_string_widget(
    question_name, path, help_popup, conditional, validation, widget_label, row
):
    """
    - Parses formatter from the 'parameters' column (format: formatter=somethingCustomFormatter).
    - Generates the TypeScript widget code for InputStringType.
    """
    parameters: StringParametersResult = get_string_parameters(row)
    formatter = parameters["formatter"]

    result: WidgetResult = {
        "statement": "",
        "has_helper_import": False,
        "has_formatter_import": False,
        "has_custom_formatter_import": False,
    }

    # Add formatter input filter if specified
    formatter_code = ""
    if isinstance(formatter, str):
        if formatter.endswith("CustomFormatter"):
            formatter_code = f"{INDENT}inputFilter: customFormatters.{formatter},\n"
            result["has_custom_formatter_import"] = True
        else:
            formatter_code = f"{INDENT}inputFilter: formatters.{formatter},\n"
            result["has_formatter_import"] = True

    result["statement"] = (
        f"{generate_constExport(question_name, 'InputStringType')}\n"
        f"{generate_defaultInputBase('inputStringBase')},\n"
        f"{generate_path(path)},\n"
        f"{generate_common_properties(row)}"
        f"{generate_default_value(row)}"
        f"{formatter_code}"
        f"{widget_label},\n"
        f"{generate_help_popup(help_popup)}"
        f"{generate_conditional(conditional)},\n"
        f"{generate_validation(validation)}\n"
        f"}};"
    )
    return result


# Generate InputNumber widget
def generate_number_widget(
    question_name, path, help_popup, conditional, validation, widget_label, row
):
    return (
        f"{generate_constExport(question_name, 'InputStringType')}\n"
        f"{generate_defaultInputBase('inputNumberBase')},\n"
        f"{generate_path(path)},\n"
        f"{generate_common_properties(row)}"
        f"{widget_label},\n"
        f"{generate_help_popup(help_popup)}"
        f"{generate_conditional(conditional)},\n"
        f"{generate_validation(validation)}\n"
        f"}};"
    )


# Generate InfoText widget
def generate_info_text_widget(question_name, path, conditional, widget_label, row):
    return (
        f"{generate_constExport(question_name, 'TextWidgetConfig')}\n"
        f"{generate_defaultInputBase('infoTextBase')},\n"
        f"{generate_path(path)},\n"
        f"{generate_common_properties(row, shouldAddTwoColumns = False, allow_join_with=False)}"
        f"{widget_label},\n"
        f"{generate_conditional(conditional)}\n"
        f"}};"
    )


# Generate InputRange widget
def generate_range_widget(
    question_name,
    path,
    input_range,
    conditional,
    validation,
    widget_label,
    row,
):
    includeNotApplicable = (
        row["includeNotApplicable"] if "includeNotApplicable" in row else False
    )
    notApplicableConfig = (
        "includeNotApplicable: true,\n" if includeNotApplicable else ""
    )
    return (
        f"{generate_constExport(question_name, 'InputRangeType')}\n"
        f"{generate_defaultInputBase('inputRangeBase')},\n"
        f"{INDENT}...inputRange.{input_range},\n"
        f"{generate_path(path)},\n"
        f"{generate_common_properties(row)}"
        f"{widget_label},\n"
        f"{notApplicableConfig}"
        f"{generate_conditional(conditional)},\n"
        f"{generate_validation(validation)}\n"
        f"}};"
    )


# Generate InputCheckbox widget
def generate_checkbox_widget(
    question_name,
    path,
    choices,
    help_popup,
    conditional,
    validation,
    widget_label,
    row,
):
    return (
        f"{generate_constExport(question_name, 'InputCheckboxType')}\n"
        f"{generate_defaultInputBase('inputCheckboxBase')},\n"
        f"{generate_path(path)},\n"
        f"{generate_common_properties(row)}"
        f"{widget_label},\n"
        f"{generate_help_popup(help_popup)}"
        f"{generate_choices(choices)},\n"
        f"{generate_conditional(conditional)},\n"
        f"{generate_validation(validation)}\n"
        f"}};"
    )


# Generate NextButton widget
def generate_next_button_widget(question_name, path, confirm_popup, widget_label, row):
    return (
        f"{generate_constExport(question_name, 'ButtonWidgetConfig')}\n"
        f"{generate_defaultInputBase('buttonNextBase')},\n"
        f"{generate_path(path)},\n"
        f"{generate_confirm_popup(confirm_popup)}"
        f"{widget_label}\n"
        f"}};"
    )


# Generate Text textarea widget
def generate_text_widget(
    question_name, path, conditional, validation, widget_label, row
):
    return (
        f"{generate_constExport(question_name, 'InputTextType')}\n"
        f"{generate_defaultInputBase('textBase')},\n"
        f"{generate_path(path)},\n"
        f"{generate_common_properties(row)}"
        f"{widget_label},\n"
        f"{generate_conditional(conditional)},\n"
        f"{generate_validation(validation)}\n"
        f"}};"
    )


def parse_parameters(parameters: str) -> dict[str, str | None]:
    """
    Parses a parameters string into a dictionary of key-value pairs.
    - Converts keys to lowercase.
    - Returns True for values if a parameter does not contain '='.
    Example valid formats:
      - "min=1\nmax=5\noverMaxAllowed"
      - "min=1;max=5;overMaxAllowed"
      - "min=1 max=5 overMaxAllowed"
    """
    param_dict = {}
    param_lines = parameters.replace(";", "\n").replace(" ", "\n").splitlines()

    for line in param_lines:
        if not line.strip():
            continue
        param_parts = line.split("=", 1)
        key = param_parts[0].strip().lower()
        value = param_parts[1].strip() if len(param_parts) > 1 else True
        param_dict[key] = value

    return param_dict


def get_radio_number_parameters(row) -> RadioNumberParametersResult:
    """
    Parses the parameters string for min, max, and overMaxAllowed from the row.
    Returns a dict with keys: min_value, max_value, over_max_allowed.
    Prints warnings for invalid or unrecognized parameters.
    Example valid formats:
      - "min=1\nmax=5\noverMaxAllowed"
      - "min=1;max=5;overMaxAllowed"
      - "min=1 max=5 overMaxAllowed"
    """
    parameters = row.get("parameters", "")

    # Initialize the result with default values
    result: RadioNumberParametersResult = {
        "min_value": 0,
        "max_value": 6,
        "over_max_allowed": False,
    }

    param_dict = parse_parameters(parameters)

    for key, value in param_dict.items():
        if key == "min":
            try:
                result["min_value"] = int(value) if value is not None else 0
            except ValueError:
                result["min_value"] = value  # Keep as string if not an integer
        elif key == "max":
            try:
                result["max_value"] = int(value) if value is not None else 6
            except ValueError:
                result["max_value"] = value  # Keep as string if not an integer
        elif key == "overmaxallowed":
            result["over_max_allowed"] = True
        elif key != "":
            print(
                f"Warning: Unrecognized parameter '{key}' for radio_number in Widgets sheet. Expected 'min', 'max' or 'overMaxAllowed'."
            )

    # Validate min < max if they are numbers
    # Only validate min < max if both are numbers
    if (
        isinstance(result["min_value"], int)
        and isinstance(result["max_value"], int)
        and result["min_value"] >= result["max_value"]
    ):
        print(
            f"ValueError: min ({result['min_value']}) must be less than max ({result['max_value']}) in parameters in Widgets sheet."
        )

    return result


def get_string_parameters(row) -> StringParametersResult:
    """
    Parses the parameters string for formatter from the row.
    Returns a dict with keys: formatter.
    Prints warnings for invalid or unrecognized parameters.
    Example valid formats:
        - "formatter=eightDigitsAccessCodeFormatter"
        - "formatter=someFieldCustomFormatter"
    """
    parameters = row.get("parameters", "")

    # Initialize the result with default values
    result: StringParametersResult = {"formatter": None}

    param_dict = parse_parameters(parameters)

    for key, value in param_dict.items():
        if key == "formatter":
            result["formatter"] = value
        elif key != "":
            print(
                f"Warning: Unrecognized parameter '{key}' for string in Widgets sheet. Expected 'formatter'."
            )

    return result


def get_widgets_file_import_flags(section_rows) -> ImportFlags:
    """
    Analyze the section_rows and determine which import flags should be set to True.

    Returns an ImportFlags dataclass with all the import flag booleans.
    """
    import_flags = ImportFlags()

    # Check all rows for import flags
    for row in section_rows:
        if row["choices"]:
            # Check to see if the choices finish with 'CustomChoices'
            if row["choices"].lower().endswith("customchoices"):
                import_flags.has_custom_choices_import = True
            else:
                import_flags.has_choices_import = True
        if row["validation"]:
            # Check to see if the validation finish with 'CustomValidation'
            if row["validation"].lower().endswith("customvalidation"):
                import_flags.has_custom_validations_import = True
            else:
                import_flags.has_validations_import = True
        if row["conditional"] and row["conditional"].lower().endswith(
            "customconditional"
        ):
            # Check to see if the conditional finish with 'CustomConditional'
            import_flags.has_custom_conditionals_import = True
        elif row["conditional"] and not row["conditional"].lower().endswith(
            "customconditional"
        ):
            # Check to see if the conditional is not empty and does not finish with 'CustomConditional'
            import_flags.has_conditionals_import = True
        if row.get("inputRange"):
            import_flags.has_input_range_import = True
        if row["inputType"] == "Custom":
            import_flags.has_custom_widgets_import = True
        if row.get("help_popup") or row.get("confirm_popup"):
            import_flags.has_help_popup_import = True

        # Check all rows for label context
        label_fr = row.get("label::fr", "")
        label_en = row.get("label::en", "")
        label_one_en = row.get("label_one::en", "")
        label_one_fr = row.get("label_one::fr", "")
        # Check for {{nickname}}, {{count}}, and {{genderedSuffix:...}} in labels
        if "{{nickname}}" in label_fr or "{{nickname}}" in label_en:
            import_flags.has_nickname_label = True
        if (
            (label_one_en.strip())
            or (label_one_fr.strip())
            or "{{count}}" in label_fr
            or "{{count}}" in label_en
        ):
            import_flags.has_persons_count_label = True
        if "{{genderedSuffix" in label_fr or "{{genderedSuffix" in label_en:
            import_flags.has_gendered_suffix_label = True

    return import_flags
