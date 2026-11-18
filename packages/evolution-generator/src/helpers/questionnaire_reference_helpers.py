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


def transform_path(
    path: str,
    abbreviation_by_section: dict[str, str],
    section_name: str | None = None,
) -> str:
    """
    Shorten `path` for the questionnaire reference documents by replacing its section
    prefix (the part before the first '.') with that section's abbreviation, e.g.
    'household.size' becomes 'hh_size' when 'household' has the abbreviation 'hh_'.

    When `section_name` is given (the section of the widget the path belongs to), only
    a path whose first part is that section is shortened, e.g.
    'household.persons.{_activePersonId}.journeys' in the 'tripsIntro' section is
    returned as is. Without `section_name`, a path whose first part is any known
    section is shortened.

    Any other path ('${relativePath}.age', '${currentPerson}.age',
    'usualWorkPlace.name', or one without a dot) is returned as is, dots included.
    """
    # Paths relative to a context token, or without a dot, are kept as is
    if path.startswith("${") or "${relativePath}." in path or "." not in path:
        return path

    # limit the split to 1 to avoid too many values to unpack
    path_section_name, field_name = path.split(".", 1)

    if section_name is not None:
        if path_section_name == section_name:
            return f"{abbreviation_by_section[section_name]}{field_name}"
        # The path does not start with its widget's section, e.g. a path in the
        # household asked in the 'tripsIntro' section. Shortening it with the path's
        # section would describe it as a field of another section than its widget's,
        # and prefixing it with its widget's section abbreviation ('TI_household...')
        # would read as the non-existent 'tripsIntro.household...' path. The section
        # heading of the reference document already tells the widget's section.
        return path

    # If the path doesn't start with a section (e.g. 'usualWorkPlace.name'), we don't
    # change it: dropping the prefix would lose context and make different paths look
    # the same (e.g. 'name').
    if path_section_name not in abbreviation_by_section:
        return path

    return f"{abbreviation_by_section[path_section_name]}{field_name}"


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
