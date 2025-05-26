# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes functions that generate the widgets.tsx and widgetsNames.ts files.
# These functions are intended to be invoked from the generate_survey.py script.
from helpers.generator_helpers import INDENT, get_data_from_excel, add_generator_comment
import re  # Regular expression module for pattern matching


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

            # Loop the section rows to check if we need to import choices, custom conditionals, input_range, or custom widgets
            has_choices_import = False
            has_conditionals_import = False
            has_input_range_import = False
            has_custom_widgets_import = False
            has_custom_validations_import = False
            has_custom_conditionals_import = False
            has_help_popup_import = False
            has_persons_cnt_label = False
            has_gendered_suffix_label = False
            for row in section_rows:
                if row["choices"]:
                    has_choices_import = True
                if row["validation"].endswith("CustomValidation"):
                    # Check to see if the validation finish with 'CustomValidation'
                    has_custom_validations_import = True
                if row["conditional"] and row["conditional"].endswith(
                    "CustomConditional"
                ):
                    # Check to see if the conditional finish with 'CustomConditional'
                    has_custom_conditionals_import = True
                elif row["conditional"] and not row["conditional"].endswith(
                    "CustomConditional"
                ):
                    # Check to see if the conditional is not empty and does not finish with 'CustomConditional'
                    has_conditionals_import = True
                if row["inputRange"]:
                    has_input_range_import = True
                if row["inputType"] == "Custom":
                    has_custom_widgets_import = True
                if row["help_popup"] or row["confirm_popup"]:
                    has_help_popup_import = True
                if "hasPersonsCntLabel" in row and row["hasPersonsCntLabel"] == True:
                    has_persons_cnt_label = True
                if (
                    "hasGenderedSuffixLabel" in row
                    and row["hasGenderedSuffixLabel"] == True
                ):
                    has_gendered_suffix_label = True

            # Generate import statements
            import_statements = generate_import_statements(
                has_choices_import,
                has_conditionals_import,
                has_input_range_import,
                has_custom_widgets_import,
                has_custom_validations_import,
                has_help_popup_import,
                has_persons_cnt_label,
                has_gendered_suffix_label,
                has_custom_conditionals_import,
            )

            # Generate widgets statements
            widgets_statements = [
                generate_widget_statement(row) for row in section_rows
            ]
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
                print(f"Generate {widgets_output_path}/widgets.tsx successfully")

            # Write the transformed content to the widgetsNames output file
            with open(
                widgets_output_path + "/widgetsNames.ts",
                mode="w",
                encoding="utf-8",
                newline="\n",
            ) as f:
                f.write(ts_code)
                f.write(transformed_content["widgetsNamesStatements"])
                print(f"Generate {widgets_output_path}/widgetsNames.ts successfully")

    except Exception as e:
        print(f"Error with widgets: {e}")
        raise e


# Generate widget statement for a row
def generate_widget_statement(row):
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
    has_persons_cnt_label = (
        row["hasPersonsCntLabel"] if "hasPersonsCntLabel" in row else False
    )
    has_gendered_suffix_label = (
        row["hasGenderedSuffixLabel"] if "hasGenderedSuffixLabel" in row else False
    )
    widget_label = generate_label(
        section, path, has_persons_cnt_label, has_gendered_suffix_label
    )

    widget: str = ""
    if input_type == "Custom":
        widget = generate_custom_widget(question_name)
    elif input_type == "Radio":
        widget = generate_radio_widget(
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
        widget = generate_radio_number_widget(
            question_name,
            path,
            help_popup,
            conditional,
            validation,
            widget_label,
            row,
        )
    elif input_type == "Select":
        widget = generate_select_widget(
            question_name,
            path,
            choices,
            conditional,
            validation,
            widget_label,
            row,
        )
    elif input_type == "String":
        widget = generate_string_widget(
            question_name,
            path,
            help_popup,
            conditional,
            validation,
            widget_label,
            row,
        )
    elif input_type == "Number":
        widget = generate_number_widget(
            question_name,
            path,
            help_popup,
            conditional,
            validation,
            widget_label,
            row,
        )
    elif input_type == "InfoText":
        widget = generate_info_text_widget(
            question_name, section, path, conditional, row
        )
    elif input_type == "Range":
        widget = generate_range_widget(
            question_name,
            path,
            input_range,
            conditional,
            validation,
            widget_label,
            row,
        )
    elif input_type == "Checkbox":
        widget = generate_checkbox_widget(
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
        widget = generate_next_button_widget(
            question_name, path, confirm_popup, widget_label, row
        )
    elif input_type == "Text":
        widget = generate_text_widget(
            question_name, path, conditional, validation, widget_label, row
        )
    else:
        widget = f"// {question_name}"

    return widget


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
def generate_import_statements(
    has_choices_import,
    has_conditionals_import,
    has_input_range_import,
    has_custom_widgets_import,
    has_custom_validations_import,
    has_help_popup_import,
    has_persons_cnt_label,
    has_gendered_suffix_label,
    has_custom_conditionals_import,
):
    choices_import = (
        "// " if not has_choices_import else ""
    ) + "import * as choices from '../../common/choices';\n"
    conditionals_import = (
        "// " if not has_conditionals_import else ""
    ) + "import * as conditionals from '../../common/conditionals';\n"
    custom_widgets_import = (
        "// " if not has_custom_widgets_import else ""
    ) + "import * as customWidgets from './customWidgets';\n"
    custom_validations_import = (
        "// " if not has_custom_validations_import else ""
    ) + "import * as customValidations from '../../common/customValidations';\n"
    custom_conditionals_import = (
        "// " if not has_custom_conditionals_import else ""
    ) + "import * as customConditionals from '../../common/customConditionals';\n"
    custom_help_popup_import = (
        "// " if not has_help_popup_import else ""
    ) + "import * as customHelpPopup from '../../common/customHelpPopup';\n"
    input_range_import = (
        "// " if not has_input_range_import else ""
    ) + "import * as inputRange from '../../common/inputRange';\n"
    cnt_person_import = (
        "import { countPersons, getPerson } from '../../helperFunctions/helper';\n"
        if has_persons_cnt_label == True or has_gendered_suffix_label == True
        else ""
    )
    gendered_suffix_import = (
        "import { getGenderedSuffixes } from '../../helperFunctions/frontendHelper';\n"
        if has_gendered_suffix_label == True
        else ""
    )
    return (
        f"import {{ TFunction }} from 'i18next';\n"
        f"import * as defaultInputBase from 'evolution-frontend/lib/components/inputs/defaultInputBase';\n"
        f"import {{ defaultConditional }} from 'evolution-common/lib/services/widgets/conditionals/defaultConditional';\n"
        f"import * as WidgetConfig from 'evolution-common/lib/services/questionnaire/types';\n"
        f"import * as validations from 'evolution-common/lib/services/widgets/validations/validations';\n"
        f"{choices_import}"
        f"{conditionals_import}"
        f"{input_range_import}"
        f"{cnt_person_import}"
        f"{gendered_suffix_import}"
        f"{custom_conditionals_import}"
        f"{custom_widgets_import}"
        f"{custom_help_popup_import}"
        f"{custom_validations_import}"
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
    return f"{INDENT}path: '{path}'"


def generate_join_with(join_with):
    """Generate joinWith property"""
    if join_with:
        # Remove single quotes in join_with to prevent syntax errors
        escaped_join_with = join_with.replace("'", "")
        return f"{INDENT}joinWith: '{escaped_join_with}',\n"
    else:
        return ""


def generate_label(
    section, path, has_persons_cnt_label=False, has_gendered_suffix_label=False
):
    if not (has_persons_cnt_label == True or has_gendered_suffix_label == True):
        return f"{INDENT}label: (t: TFunction) => t('{section}:{path}')"
    additional_t_context = f"{INDENT}{INDENT}{INDENT}nickname: person.nickname,\n"
    initial_assignations = f"{INDENT}{INDENT}const person = getPerson(interview)\n"
    if has_persons_cnt_label == True:
        additional_t_context += (
            f"{INDENT}{INDENT}{INDENT}count: countPersons(interview),\n"
        )
    if has_gendered_suffix_label == True:
        additional_t_context += (
            f"{INDENT}{INDENT}{INDENT}...getGenderedSuffixes(person, t)\n"
        )
    widget_label = (
        f"{INDENT}label: (t: TFunction, interview, path) => {{\n"
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


def generate_text(section, path):
    return f"{INDENT}text: (t: TFunction) => `<p class=\"input-text\">${{t('{section}:{path}')}}</p>`"


def generate_choices(choices):
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
):
    """
    - Parses min and max from the 'parameters' column (format: min=0\\nmax=17), defaults to min=0, max=6.
    - Parses overMaxAllowed from the 'appearance' column (set to true if 'overMaxAllowed' is present).
    - Generates the TypeScript widget code for InputRadioNumberType.
    """
    min_value = 0  # Default min value
    max_value = 6  # Default max value
    parameters = row.get("parameters", "")
    if parameters:
        for line in parameters.splitlines():
            if line.startswith("min="):
                try:
                    min_value = int(line.split("=", 1)[1])
                except Exception:
                    pass
            elif line.startswith("max="):
                try:
                    max_value = int(line.split("=", 1)[1])
                except Exception:
                    pass

    appearance = row.get("appearance", "")
    over_max_allowed = "overMaxAllowed" in appearance

    value_range = (
        f"{INDENT}valueRange: {{\n"
        f"{INDENT}{INDENT}min: {min_value},\n"
        f"{INDENT}{INDENT}max: {max_value}\n"
        f"{INDENT}}},\n"
    )
    over_max = f"{INDENT}overMaxAllowed: true,\n" if over_max_allowed else ""
    return (
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
    return (
        f"{generate_constExport(question_name, 'InputStringType')}\n"
        f"{generate_defaultInputBase('inputStringBase')},\n"
        f"{generate_path(path)},\n"
        f"{generate_common_properties(row)}"
        f"{generate_default_value(row)}"
        f"{widget_label},\n"
        f"{generate_help_popup(help_popup)}"
        f"{generate_conditional(conditional)},\n"
        f"{generate_validation(validation)}\n"
        f"}};"
    )


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
def generate_info_text_widget(question_name, section, path, conditional, row):
    return (
        f"{generate_constExport(question_name, 'TextWidgetConfig')}\n"
        f"{generate_defaultInputBase('infoTextBase')},\n"
        f"{generate_path(path)},\n"
        f"{generate_common_properties(row, shouldAddTwoColumns = False, allow_join_with=False)}"
        f"{generate_text(section, path)},\n"
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
