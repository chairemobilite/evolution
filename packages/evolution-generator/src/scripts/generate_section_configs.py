# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes functions that generate the sectionConfigs.ts file.
# These functions are intended to be invoked from the generate_survey.py script.
from helpers.generator_helpers import (
    INDENT,
    add_generator_comment,
)
from survey_definition.survey_definition import SurveyDefinition
import os
import shutil


def _section_conditional_ts_expression(name: str) -> str:
    """
    TypeScript expression for a section enable/completion conditional, matching widgets:
    names ending with CustomConditional (e.g. visitedPlacesForPersonIsCompleteCustomConditional)
        -> customConditionals.<name>
    generated conditionals from the Conditionals sheet (e.g. hasHouseholdSize1Conditional)
        -> conditionals.<name>
    """
    if name.endswith("CustomConditional"):
        return f"customConditionals.{name}"
    return f"conditionals.{name}"


# TODO: Write the section titles as translations (locales files) read with the `t`
# function, like the other labels, instead of one inline text per language.
def _generate_titles_code(titles: dict[str, str], indent: str) -> str:
    """
    The `<language>: '<title>'` lines of a section title object, one per language, in
    the survey languages' order, e.g. "fr: 'Accueil',\nen: 'Home'\n".
    """
    return (
        ",\n".join(
            f"{indent}{language}: '{title}'" for language, title in titles.items()
        )
        + "\n"
    )


# Function to generate sectionConfigs.ts for each section
def generate_section_configs(
    survey_definition: SurveyDefinition, section_config_output_folder: str
):
    """
    Write sectionConfigs.ts in each section's folder.

    Args:
        survey_definition: Already-validated survey definition, read for its
            Sections table and its languages.
        section_config_output_folder: Folder holding one folder per section.
    """
    try:
        sections = survey_definition.sections
        previousSection = None  # Initialize previousSection as None
        nextSection = None  # Initialize nextSection as None

        # Iterate through each section, in source order
        for section_index, section_definition in enumerate(sections):
            section = section_definition.section
            # The title in each survey language, in the languages' order
            titles = {
                language: section_definition.title.get(language)
                for language in survey_definition.languages
            }
            # A section only gets a title (and a navigation menu item) when it has one
            # in every language.
            has_titles = all(titles.values())
            in_nav = section_definition.in_nav
            template = section_definition.template
            parent_section = section_definition.parent_section
            # A blank has_preload means the section has a preload function
            has_preload = section_definition.has_preload is not False
            enable_conditional_name = section_definition.enable_conditional
            completion_conditional_name = section_definition.completion_conditional

            # Generate code for section
            def generate_section_code(previousSection, nextSection):
                ts_section_code = ""  # TypeScript code for the section

                # Determine if the section needs to import isSectionCompleted
                needs_is_section_completed = completion_conditional_name is None or (
                    enable_conditional_name is None and previousSection is not None
                )

                # Determine if the section needs to import customConditionals
                needs_custom_conditionals_import = any(
                    n is not None and n.endswith("CustomConditional")
                    for n in (
                        enable_conditional_name,
                        completion_conditional_name,
                    )
                )

                # Determine if the section needs to import conditionals
                needs_conditionals_import = any(
                    n is not None and not n.endswith("CustomConditional")
                    for n in (
                        enable_conditional_name,
                        completion_conditional_name,
                    )
                )

                # Add generator comment
                ts_section_code += add_generator_comment()

                # Add imports
                if needs_is_section_completed:
                    ts_section_code += "import { isSectionCompleted } from 'evolution-common/lib/services/questionnaire/sections/navigationHelpers';\n"
                ts_section_code += "import { SectionConfig } from 'evolution-common/lib/services/questionnaire/types';\n"
                ts_section_code += "import { widgetsNames } from './widgetsNames';\n"
                if needs_custom_conditionals_import:
                    ts_section_code += "import * as customConditionals from '../../common/customConditionals';\n"
                if needs_conditionals_import:
                    ts_section_code += (
                        "import * as conditionals from '../../common/conditionals';\n"
                    )

                # Add the custom preload import if the section has a preload function
                # FIXME Should the generator provide a default preload function? Currently there are none
                if has_preload:
                    ts_section_code += (
                        "import { customPreload } from './customPreload';\n"
                    )

                # Generate the section output file
                section_output_file = (
                    f"{section_config_output_folder}/{section}/sectionConfigs.ts"
                )

                # Check if the sections has template
                has_custom_template = template is not None and template == True
                has_builtin_template = isinstance(template, str)

                # Add imports for template if the section has custom template and add it to the templateMapping in the configuration. For builtin templates, it should be already set
                if has_custom_template:
                    ts_section_code += f"import SectionTemplate from './template';\n"
                    ts_section_code += f"import appConfig from 'evolution-frontend/lib/config/application.config';\n\n"
                    ts_section_code += f"appConfig.templateMapping['{section}Section'] = SectionTemplate;\n"

                    # Copy the skeleton template file if the section has a custom template and it does not exist
                    # Define the destination path for the template file
                    destination_template_file = os.path.join(
                        section_config_output_folder, section, "template.tsx"
                    )

                    # Check if the template file exists in the destination folder
                    if not os.path.exists(destination_template_file):
                        # Define the source path for the template file
                        source_template_file = os.path.abspath(
                            os.path.join(
                                os.path.dirname(__file__), "../skeleton/template.tsx"
                            )
                        )
                        if not os.path.exists(source_template_file):
                            raise FileNotFoundError(
                                f"Template file not found: {source_template_file}"
                            )
                        # Ensure the destination directory exists
                        os.makedirs(
                            os.path.dirname(destination_template_file), exist_ok=True
                        )
                        # If the template file does not exist, copy it from the source
                        shutil.copyfile(source_template_file, destination_template_file)
                        print(f"Copied template.tsx to {destination_template_file}")

                # Generate currentSectionName
                ts_section_code += (
                    f"\nexport const currentSectionName: string = '{section}';\n"
                )

                # Generate previousSectionName
                if previousSection is not None:
                    ts_section_code += f"const previousSectionName: SectionConfig['previousSection'] = '{previousSection}';\n"
                else:
                    ts_section_code += "const previousSectionName: SectionConfig['previousSection'] = null;\n"

                # Generate nextSectionName
                # Check if there is a next section
                if section_index < len(sections) - 1:
                    nextSection = sections[section_index + 1].section
                    ts_section_code += f"const nextSectionName: SectionConfig['nextSection'] = '{nextSection}';\n"
                else:
                    ts_section_code += (
                        "const nextSectionName: SectionConfig['nextSection'] = null;\n"
                    )

                # FIXME Add an official warning if both in_nav and parent_section are set
                if in_nav and parent_section is not None:
                    print(
                        f"Warning: both in_nav and parent_section are set for section '{section}'. in_nav will have precedence."
                    )

                # Generate config for the section
                ts_section_code += f"\n// Config for the section\n"
                ts_section_code += f"export const sectionConfig: SectionConfig = {{\n"
                ts_section_code += f"{INDENT}previousSection: previousSectionName,\n"
                ts_section_code += f"{INDENT}nextSection: nextSectionName,\n"
                if has_titles:
                    ts_section_code += f"{INDENT}title: {{\n"
                    ts_section_code += _generate_titles_code(titles, INDENT * 2)
                    ts_section_code += f"{INDENT}}},\n"
                # Generate the navigation menu item, either in nav with title or hidden with parent
                if has_titles and in_nav == True:
                    ts_section_code += f"{INDENT}navMenu: {{\n"
                    ts_section_code += f"{INDENT}{INDENT}type: 'inNav',\n"
                    ts_section_code += f"{INDENT}{INDENT}menuName: {{\n"
                    ts_section_code += _generate_titles_code(titles, INDENT * 3)
                    ts_section_code += f"{INDENT}{INDENT}}}\n"
                    ts_section_code += f"{INDENT}}},\n"
                elif parent_section is not None:
                    ts_section_code += f"{INDENT}navMenu: {{\n"
                    ts_section_code += f"{INDENT}{INDENT}type: 'hidden',\n"
                    ts_section_code += (
                        f"{INDENT}{INDENT}parentSection: '{parent_section}'\n"
                    )
                    ts_section_code += f"{INDENT}}},\n"
                if has_custom_template:
                    ts_section_code += f"{INDENT}// The template to fill is in the 'template.tsx' file of this section\n"
                    ts_section_code += f"{INDENT}template: '{section}Section',\n"
                elif has_builtin_template:
                    ts_section_code += f"{INDENT}template: '{template}',\n"
                ts_section_code += f"{INDENT}widgets: widgetsNames,\n"
                ts_section_code += (
                    f"{INDENT}// Do some actions before the section is loaded\n"
                )
                if has_preload:
                    ts_section_code += f"{INDENT}preload: customPreload,\n"

                # Generate enableConditional
                ts_section_code += f"{INDENT}// Allow to click on the section menu\n"
                if enable_conditional_name:
                    ts_section_code += f"{INDENT}enableConditional: {_section_conditional_ts_expression(enable_conditional_name)},\n"
                elif previousSection is None:
                    ts_section_code += f"{INDENT}enableConditional:true,\n"
                else:
                    ts_section_code += (
                        f"{INDENT}enableConditional: function (interview) {{\n"
                    )
                    ts_section_code += f"{INDENT}{INDENT}return isSectionCompleted({{ interview, sectionName: previousSectionName }});\n"
                    ts_section_code += f"{INDENT}}},\n"

                # Generate completionConditional
                ts_section_code += (
                    f"{INDENT}// Determine if the current section is completed\n"
                )
                if completion_conditional_name:
                    ts_section_code += f"{INDENT}completionConditional: {_section_conditional_ts_expression(completion_conditional_name)}\n"
                else:
                    ts_section_code += (
                        f"{INDENT}completionConditional: function (interview) {{\n"
                    )
                    ts_section_code += f"{INDENT}{INDENT}return isSectionCompleted({{ interview, sectionName: currentSectionName }});\n"
                    ts_section_code += f"{INDENT}}}"
                ts_section_code += f"\n}};\n\n"
                ts_section_code += f"export default sectionConfig;\n"

                # Write TypeScript code to a file
                with open(
                    section_output_file,
                    mode="w",
                    encoding="utf-8",
                    newline="\n",
                ) as ts_file:
                    ts_file.write(ts_section_code)

                print(f"Generated {section_output_file} successfully")

            # Generate section code
            generate_section_code(previousSection, nextSection)

            # Update previousSection with the current section
            previousSection = section

    except Exception as e:
        # Handle any other exceptions that might occur during script execution
        print(f"Error with sectionConfigs.ts: {e}")
        raise e
