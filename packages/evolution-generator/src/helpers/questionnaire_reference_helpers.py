# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Helpers shared by the scripts that write the questionnaire reference documents
# (e.g. generate_questionnaire_dictionary.py, generate_questionnaire_list.py), so they
# all present paths and conditionals the same way. Built from the SurveyDefinition.
# See scripts/conditionals_generator.py for the conditionals TypeScript generation.

from survey_definition.conditionals_definition import ConditionalDefinition
from survey_definition.sections_definition import Sections
from survey_definition.survey_definition import SurveyDefinition


def get_abbreviation_by_section(sections: Sections) -> dict[str, str]:
    """Map each section name to its abbreviation, as used by transform_path."""
    return {section.section: section.abbreviation for section in sections}


def transform_path(path: str, abbreviation_by_section: dict[str, str]) -> str:
    """
    Shorten `path` for the questionnaire reference documents by replacing its section
    prefix (the part before the first '.') with that section's abbreviation, e.g.
    'household.size' becomes 'hh_size' when 'household' has the abbreviation 'hh_'.

    Only a path whose first part is a known section is shortened; any other path
    ('${relativePath}.age', '${currentPerson}.age', 'usualWorkPlace.name', or one
    without a dot) is returned as is, dots included.
    """
    # If the path contains the relativePath, we don't change it
    if "${relativePath}." in path:
        return path

    # If the path contains '.', we change it to 'abreviation_fieldName'
    if "." in path:
        # limit the split to 1 to avoid too many values to unpack
        # FIXME This does not handle correctly cases of complex paths with multiple dots. See https://github.com/chairemobilite/evolution/issues/1058 for more details
        section_name, field_name = path.split(".", 1)

        # If the path doesn't start with a section (e.g. 'usualWorkPlace.name' or
        # '${currentPerson}.age'), we don't change it: dropping the prefix would lose
        # context and make different paths look the same (e.g. 'name').
        if section_name not in abbreviation_by_section:
            return path

        if path.count(".") > 1:
            print(
                f"Warning: The path '{path}' contains multiple dots, which may lead to incorrect section attribution. See issue #1058 in Evolution for details."
            )
        return f"{abbreviation_by_section[section_name]}{field_name}"
    else:
        return path


def describe_conditional(
    conditional_name: str,
    conditionals: list[ConditionalDefinition],
    abbreviation_by_section: dict[str, str],
) -> str:
    """
    Describe one conditional as a single line, e.g.
    `cond1 : HH_size > 1 && (HH_carNumber === 0 || ${relativePath}.age < 18)`.

    `conditionals` are the rows of that conditional, in source order (see
    Conditionals.by_name).
    """
    terms = []
    for conditional in conditionals:
        transformed_path = transform_path(conditional.path, abbreviation_by_section)

        # Construct the conditional string
        term = (
            f"{transformed_path} {conditional.comparison_operator} {conditional.value}"
        )

        # Add parentheses if they exist, and place them around the conditional string depending on the parentheses
        if conditional.parentheses == "(":
            term = f"({term}"
        elif conditional.parentheses == ")":
            term = f"{term})"

        # Add logical operator if it exists
        if conditional.logical_operator:
            term = f"{conditional.logical_operator} {term}"

        terms.append(term)

    return f"{conditional_name} : {' '.join(terms)}"


def describe_conditionals(survey_definition: SurveyDefinition) -> dict[str, str]:
    """Map each conditional_name of the survey definition to its description (see describe_conditional)."""
    abbreviation_by_section = get_abbreviation_by_section(survey_definition.sections)
    return {
        conditional_name: describe_conditional(
            conditional_name, conditionals, abbreviation_by_section
        )
        for conditional_name, conditionals in survey_definition.conditionals.by_name().items()
    }
