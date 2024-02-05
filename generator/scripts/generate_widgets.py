# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes functions that generate the widgets.tsx file.
# These functions are intended to be invoked from the generate_survey.py script.
import openpyxl # Read data from Excel

indentation = "    " # Indentation of 4 spaces

# Function to generate widgets.tsx for each section
def generate_widgets(input_path, output_info_list):
    try: 
        workbook = openpyxl.load_workbook(input_path, data_only=True)
        sheet = workbook['Widgets'] # Get Widgets sheet
        rows = list(sheet.rows)

        # Transform Excel content into TypeScript code
        def convert_excel_to_typescript(section):
            headers = [cell.value for cell in rows[0]]

            section_rows = []
            for row in rows[1:]:
                values = [cell.value if cell.value is not None else '' for cell in row]

                if len(values) != len(headers):
                    print(f"Skipping row {row}: Number of values ({len(values)}) does not match the number of headers ({len(headers)}).")
                    continue

                row_dict = dict(zip(headers, values))
                section_rows.append(row_dict)

            # Filter rows based on section
            section_rows = [row for row in section_rows if row['section'] == section]

            # Loop the section rows to check if we need to import choices, custom conditionals, input_range, or custom widgets
            has_choices_import = False
            has_conditionals_import = False
            has_input_range_import = False
            has_custom_widgets_import = False
            has_help_popup_import = False
            for row in section_rows:
                if row['choices']:
                    has_choices_import = True
                if row['conditional']:
                    has_conditionals_import = True
                if row['inputRange']:
                    has_input_range_import = True
                if row['inputType'] == 'Custom':
                    has_custom_widgets_import = True
                if row['help_popup']:
                    has_help_popup_import = True

            # Generate import statements
            import_statements = generate_import_statements(has_choices_import, has_conditionals_import, has_input_range_import, has_custom_widgets_import, has_help_popup_import)

            # Generate widgets statements
            widgets_statements = [generate_widget_statement(row) for row in section_rows]
            widgets_statements = f"{import_statements}\n{'\n\n'.join(widgets_statements)}\n"

            # Generate widgets names
            widgets_names = '\n'.join([generate_widget_name(row, is_last_row=(index == len(section_rows) - 1)) for index, row in enumerate(section_rows)])
            widgets_names_statements = f"export const widgetsNames = [\n{''.join(widgets_names)}\n];\n" 

            return {'widgetsStatements': widgets_statements, 'widgetsNamesStatements': widgets_names_statements}

        # Process the output files based on sections
        for output_info in output_info_list:
            transformed_content = convert_excel_to_typescript(output_info['section'])

            # Write the transformed content to the widgets output file
            with open(output_info['output_folder'] + '/widgets.tsx', mode='w', encoding='utf-8', newline='\n') as f:
                f.write(transformed_content['widgetsStatements'])
                print(f"Generate {output_info['output_folder']}widgets.tsx successfully")

            # Write the transformed content to the widgetsNames output file
            with open(output_info['output_folder'] + '/widgetsNames.ts', mode='w', encoding='utf-8', newline='\n') as f:
                f.write(transformed_content['widgetsNamesStatements'])
                print(f"Generate {output_info['output_folder']}widgetsNames.ts successfully")
    
    except Exception as e:
        print(f"Error with widgets: {e}")
        raise e

# Generate widget statement for a row
def generate_widget_statement(row):
    question_name = row['questionName']
    input_type = row['inputType']
    section = row['section']
    path = row['path']
    conditional = row['conditional']
    validation = row['validation']
    input_range = row['inputRange']
    help_popup = row['help_popup']
    choices = row['choices']

    widget : str = ''
    if input_type == 'Custom':
        widget = generate_custom_widget(question_name)
    elif input_type == 'Radio':
        widget = generate_radio_widget(question_name, section, path, choices, help_popup, conditional, validation)
    elif input_type == 'Select':
        widget = generate_select_widget(question_name, section, path, choices, conditional, validation)
    elif input_type == 'String':
        widget = generate_string_widget(question_name, section, path, conditional, validation)
    elif input_type == 'Number':
        widget = generate_number_widget(question_name, section, path, conditional, validation)
    elif input_type == 'Text':
        widget = generate_text_widget(question_name, section, path, conditional)
    elif input_type == 'Range':
        widget = generate_range_widget(question_name, section, path, input_range, conditional, validation)
    elif input_type == 'Checkbox':
        widget = generate_checkbox_widget(question_name, section, path, choices, help_popup, conditional, validation)
    elif input_type == 'NextButton':
        widget = generate_next_button_widget(question_name, section, path)
    elif input_type == 'TextArea':
        widget = generate_text_area_widget(question_name, section, path, conditional, validation)
    else:
        widget = f"// {question_name}"

    return widget

# Generate import statement if needed
def generate_import_statements(has_choices_import, has_conditionals_import, has_input_range_import, has_custom_widgets_import, has_help_popup_import):
    choices_import = ("// " if not has_choices_import else "") + "import * as choices from '../../common/choices';\n"
    conditionals_import = ("// " if not has_conditionals_import else "") + "import * as conditionals from '../../common/conditionals';\n"
    custom_widgets_import = ("// " if not has_custom_widgets_import else "") + "import * as customWidgets from '../../common/customWidgets';\n"
    help_popup_import = ("// " if not has_help_popup_import else "") + "import * as helpPopup from '../../common/helpPopup';\n"
    input_range_import = ("// " if not has_input_range_import else "") + "import * as inputRange from '../../common/inputRange';\n"
    return f"import {{ TFunction }} from 'i18next';\n" \
            f"import * as defaultInputBase from '../../common/defaultInputBase';\n" \
            f"import {{ defaultConditional }} from '../../common/defaultConditional';\n" \
            f"{choices_import}" \
            f"{conditionals_import}" \
            f"{custom_widgets_import}" \
            f"{help_popup_import}" \
            f"import * as inputTypes from 'evolution-common/lib/services/surveyGenerator/types/inputTypes';\n" \
            f"{input_range_import}" \
            f"import * as validations from '../../common/validations';\n"

# Generate widgetsNames
def generate_widget_name(row, is_last_row=False):
    question_name = row['questionName']
    active = row['active']

    if active:
        return f"{indentation}'{question_name}'" if is_last_row else f"{indentation}'{question_name}',"
    else:
        return f"{indentation}// '{question_name}'" if is_last_row else f"{indentation}// '{question_name}',"

# Generate Custom widget
def generate_custom_widget(question_name):
    return f"export const {question_name} = customWidgets.{question_name};"

# Generate comma and skip line
def generate_comma(comma): return f"{',' if comma else ''}"
def generate_skip_line(skip_line): return f"{'\n' if skip_line else ''}"

# Generate all the widget parts
def generate_constExport(question_name, input_type): return f"export const {question_name}: inputTypes.{input_type} = {{"
def generate_defaultInputBase(defaultInputBase): return f"{indentation}...defaultInputBase.{defaultInputBase}"
def generate_path(path): return f"{indentation}path: '{path}'"
def generate_label(section, path): return f"{indentation}label: (t: TFunction) => t('{section}:{path}')"
def generate_help_popup(help_popup, comma=True, skip_line=True):
    if help_popup:
        return f"{indentation}helpPopup: helpPopup.{help_popup}{generate_comma(comma)}{generate_skip_line(skip_line)}"
    else:
        return ""
def generate_text(section, path): return f"{indentation}text: (t: TFunction) => `<p class=\"input-text\">${{t('{section}:{path}')}}</p>`"
def generate_choices(choices): return f"{indentation}choices: choices.{choices}"
def generate_conditional(conditional): 
    return f"{indentation}{"conditional: conditionals." + conditional if conditional else "conditional: defaultConditional"}"
def generate_validation(validation): 
    return f"{indentation}validations: validations.{validation if validation else "requiredValidation"}"

# Generate InputRadio widget
def generate_radio_widget(question_name, section, path, choices, help_popup, conditional, validation):
    return f"{generate_constExport(question_name, 'InputRadio')}\n" \
            f"{generate_defaultInputBase('inputRadioBase')},\n" \
            f"{generate_path(path)},\n" \
            f"{generate_label(section, path)},\n" \
            f"{generate_help_popup(help_popup)}" \
            f"{generate_choices(choices)},\n" \
            f"{generate_conditional(conditional)},\n" \
            f"{generate_validation(validation)}\n" \
            f"}};"

# Generate Select widget
def generate_select_widget(question_name, section, path, choices, conditional, validation):
    return f"{generate_constExport(question_name, 'InputSelect')}\n" \
            f"{generate_defaultInputBase('inputSelectBase')},\n" \
            f"{generate_path(path)},\n" \
            f"{generate_label(section, path)},\n" \
            f"{generate_choices(choices)},\n" \
            f"{generate_conditional(conditional)},\n" \
            f"{generate_validation(validation)}\n" \
            f"}};"

# Generate InputString widget
def generate_string_widget(question_name, section, path, conditional, validation):
    return f"{generate_constExport(question_name, 'InputString')}\n" \
            f"{generate_defaultInputBase('inputStringBase')},\n" \
            f"{generate_path(path)},\n" \
            f"{generate_label(section, path)},\n" \
            f"{generate_conditional(conditional)},\n" \
            f"{generate_validation(validation)}\n" \
            f"}};"

# Generate InputNumber widget
def generate_number_widget(question_name, section, path, conditional, validation):
    return f"{generate_constExport(question_name, 'InputString')}\n" \
            f"{generate_defaultInputBase('inputNumberBase')},\n" \
            f"{generate_path(path)},\n" \
            f"{generate_label(section, path)},\n" \
            f"{generate_conditional(conditional)},\n" \
            f"{generate_validation(validation)}\n" \
            f"}};"

# Generate Text widget
def generate_text_widget(question_name, section, path, conditional):
    return f"{generate_constExport(question_name, 'InputText')}\n" \
            f"{generate_defaultInputBase('inputTextBase')},\n" \
            f"{generate_path(path)},\n" \
            f"{generate_text(section, path)},\n" \
            f"{generate_conditional(conditional)}\n" \
            f"}};"

# Generate InputRange widget
def generate_range_widget(question_name, section, path, input_range, conditional, validation):
    return f"{generate_constExport(question_name, 'InputRange')}\n" \
            f"{generate_defaultInputBase('inputRangeBase')},\n" \
            f"{indentation}...inputRange.{input_range},\n" \
            f"{generate_path(path)},\n" \
            f"{generate_label(section, path)},\n" \
            f"{generate_conditional(conditional)},\n" \
            f"{generate_validation(validation)}\n" \
            f"}};"

# Generate InputCheckbox widget
def generate_checkbox_widget(question_name, section, path, choices, help_popup, conditional, validation):
    return f"{generate_constExport(question_name, 'InputCheckbox')}\n" \
            f"{generate_defaultInputBase('inputCheckboxBase')},\n" \
            f"{generate_path(path)},\n" \
            f"{generate_label(section, path)},\n" \
            f"{generate_help_popup(help_popup)}" \
            f"{generate_choices(choices)},\n" \
            f"{generate_conditional(conditional)},\n" \
            f"{generate_validation(validation)}\n" \
            f"}};"

# Generate NextButton widget
def generate_next_button_widget(question_name, section, path):
    return f"{generate_constExport(question_name, 'InputButton')}\n" \
            f"{generate_defaultInputBase('buttonNextBase')},\n" \
            f"{generate_path(path)},\n" \
            f"{generate_label(section, path)}\n" \
            f"}};"

# Generate TextArea widget
def generate_text_area_widget(question_name, section, path, conditional, validation):
    return f"{generate_constExport(question_name, 'TextArea')}\n" \
            f"{generate_defaultInputBase('textAreaBase')},\n" \
            f"{generate_path(path)},\n" \
            f"{generate_label(section, path)},\n" \
            f"{generate_conditional(conditional)},\n" \
            f"{generate_validation(validation)}\n" \
            f"}};"
