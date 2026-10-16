# Copyright 2026, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This module defines ConditionalsGenerator: TypeScript generation (conditionals.tsx)
# for survey conditionals. It is used from generate_survey.py.

from collections import defaultdict
import json

from helpers.generator_helpers import (
    INDENT,
    add_generator_comment,
    generate_output_file,
)
from survey_definition.conditionals_definition import Conditionals
from survey_definition.survey_definition import SurveyDefinition


class ConditionalsGenerator:
    """Generate TypeScript (conditionals.tsx) output from the SurveyDefinition's Conditionals table."""

    # Tokens used when expanding conditional paths in generated TypeScript (see ``generate_typescript_code``).
    CONDITIONALS_CURRENT_CONTEXT_SPECS: tuple[dict, ...] = (
        {
            "token": "${currentPerson}",
            "id_var": "currentPersonId",
            "helper": "getCurrentPersonId",
            "prefix": "household.persons.${currentPersonId}.",
            "deps": (),
            "comment": "Get the current person id",
        },
        {
            "token": "${currentJourney}",
            "id_var": "currentJourneyId",
            "helper": "getCurrentJourneyId",
            "prefix": "household.persons.${currentPersonId}.journeys.${currentJourneyId}.",
            "deps": ("currentPersonId",),
            "comment": "Get the current journey id",
        },
        {
            "token": "${currentTrip}",
            "id_var": "currentTripId",
            "helper": "getCurrentTripId",
            "prefix": "household.persons.${currentPersonId}.journeys.${currentJourneyId}.trips.${currentTripId}.",
            "deps": ("currentPersonId", "currentJourneyId"),
            "comment": "Get the current trip id",
        },
        {
            "token": "${currentSegment}",
            "id_var": "currentSegmentId",
            "helper": "getCurrentSegmentId",
            "prefix": "household.persons.${currentPersonId}.journeys.${currentJourneyId}.trips.${currentTripId}.segments.${currentSegmentId}.",
            "deps": ("currentPersonId", "currentJourneyId", "currentTripId"),
            "comment": "Get the current segment id",
        },
        {
            "token": "${currentVisitedPlace}",
            "id_var": "currentVisitedPlaceId",
            "helper": "getCurrentVisitedPlaceId",
            "prefix": "household.persons.${currentPersonId}.journeys.${currentJourneyId}.visitedPlaces.${currentVisitedPlaceId}.",
            "deps": ("currentPersonId", "currentJourneyId"),
            "comment": "Get the current visited place id",
        },
    )

    @staticmethod
    def _expand_tokenized_path(
        original_path: str, *, current_context_specs: tuple[dict, ...]
    ) -> str | None:
        """
        Expand any supported token into a TS template-string path.

        - For `${relativePath}`: keep the path as-is but wrap in backticks so interpolation works.
        - For `${current...}`: expand to the canonical interview path prefix.
        """
        if "${relativePath}" in original_path:
            return f"`{original_path}`"
        for spec in current_context_specs:
            token = spec["token"]
            if token in original_path:
                suffix = original_path.replace(f"{token}.", "")
                return f"`{spec['prefix']}{suffix}`"
        return None

    @staticmethod
    def _current_context_vars_needed(
        conditionals: list[dict], *, current_context_specs: tuple[dict, ...]
    ) -> set[str]:
        needed: set[str] = set()
        for conditional in conditionals:
            conditional_path = conditional.get("path") or ""
            for spec in current_context_specs:
                if spec["token"] in conditional_path:
                    needed.add(spec["id_var"])
                    needed.update(spec["deps"])
        return needed

    @staticmethod
    def _conditional_cell_to_primitive(
        value: object,
    ) -> bool | int | float | str | None:
        """Excel cell → Python value for generated TS."""

        # return None for null values
        if value is None or value == "null":
            return None

        # return boolean values as is
        if isinstance(value, bool):
            return value

        # return numbers as is
        if isinstance(value, (int, float)):
            return value

        # return strings as is if they are not convertible to a number or boolean
        if isinstance(value, str):
            if value == "":
                return ""
            c = value.casefold()  # convert to lowercase for case-insensitive comparison
            if c == "true":
                return True
            if c == "false":
                return False
            try:
                x = float(value)
            except ValueError:
                # return the string as is if it is not convertible to a number
                return value
            return int(x) if x.is_integer() else x
        return str(value)

    @staticmethod
    def _group_conditionals_by_name(conditionals: Conditionals) -> defaultdict:
        """Turn the validated Conditionals table, grouped by conditional_name, into the dicts generate_typescript_code expects."""
        # FIXME: These dicts hold the same data as the ConditionalDefinition objects
        # from conditionals.by_name(). They only exist because generate_typescript_code
        # (and its tests) still take the dict format that was read from the Excel file.
        # Make generate_typescript_code take conditionals.by_name() directly, then
        # remove this function.
        conditional_by_name = defaultdict(list)

        for conditional_name, definitions in conditionals.by_name().items():
            for definition in definitions:
                conditional = {
                    "logical_operator": definition.logical_operator,
                    "path": definition.path,
                    "comparison_operator": definition.comparison_operator,
                    "value": definition.value,
                    "parentheses": definition.parentheses,
                }
                if definition.value_when_hidden is not None:
                    conditional["value_when_hidden"] = definition.value_when_hidden

                conditional_by_name[conditional_name].append(conditional)

        return conditional_by_name

    @staticmethod
    def generate_typescript_code(conditional_by_name: defaultdict) -> str:
        """Generate TypeScript code based on conditionals grouped by name."""
        try:
            NEWLINE = "\n"
            ts_code = ""

            current_context_specs = (
                ConditionalsGenerator.CONDITIONALS_CURRENT_CONTEXT_SPECS
            )

            # Add Generator comment at the start of the file
            ts_code += add_generator_comment()

            # Add imports
            ts_code += (
                "import { checkConditionals } from "
                "'evolution-common/lib/services/widgets/conditionals/checkConditionals';"
                f"{NEWLINE}"
            )
            ts_code += (
                "import { type WidgetConditional } from "
                "'evolution-common/lib/services/questionnaire/types';"
                f"{NEWLINE}"
            )
            ts_code += (
                "import * as odSurveyHelpers from "
                "'evolution-common/lib/services/odSurvey/helpers';"
                f"{NEWLINE}"
            )

            # Emit one exported WidgetConditional (const) per conditional_name
            for conditional_name, conditionals in conditional_by_name.items():

                # Get the first non-None 'value_when_hidden' from the conditionals, or None if none is found.
                value_when_hidden = next(
                    (
                        c.get("value_when_hidden")
                        for c in conditionals
                        if c.get("value_when_hidden") is not None
                    ),
                    None,
                )

                # Check if any conditional has a path that contains "${relativePath}"
                conditionals_has_relative_path = any(
                    "${relativePath}" in conditional["path"]
                    for conditional in conditionals
                )
                declare_relative_path = (
                    f"{INDENT}const relativePath = path.substring(0, path.lastIndexOf('.')); "
                    f"// Remove the last key from the path{NEWLINE}"
                )

                # Check if any conditional has a path that contains "${currentPerson}", "${currentJourney}", "${currentTrip}", "${currentSegment}", or "${currentVisitedPlace}"
                current_context_vars_needed = (
                    ConditionalsGenerator._current_context_vars_needed(
                        conditionals, current_context_specs=current_context_specs
                    )
                )
                conditionals_has_current_context = len(current_context_vars_needed) > 0

                ts_code += (
                    f"\nexport const {conditional_name}: WidgetConditional = (interview"
                )
                # Check if any conditional has a path that contains "${relativePath}" or "${currentPerson}", "${currentJourney}", "${currentTrip}", "${currentSegment}", or "${currentVisitedPlace}"
                if conditionals_has_relative_path or conditionals_has_current_context:
                    ts_code += ", path"
                ts_code += f") => {{{NEWLINE}"
                ts_code += (
                    declare_relative_path if conditionals_has_relative_path else ""
                )
                # Check if any conditional has a path that contains "${currentPerson}", "${currentJourney}", "${currentTrip}", "${currentSegment}", or "${currentVisitedPlace}"
                # If so, declare the current context variables
                if conditionals_has_current_context:
                    for spec in current_context_specs:
                        if spec["id_var"] in current_context_vars_needed:
                            ts_code += (
                                f"{INDENT}const {spec['id_var']} = odSurveyHelpers.{spec['helper']}({{ interview, path }}); "
                                f"// {spec['comment']}{NEWLINE}"
                            )
                ts_code += INDENT + "return checkConditionals({" + NEWLINE
                ts_code += INDENT + INDENT + "interview," + NEWLINE

                # Add valueWhenHidden if it exists
                if value_when_hidden is not None:
                    ts_code += (
                        INDENT
                        + INDENT
                        + "valueWhenHidden: "
                        + json.dumps(
                            ConditionalsGenerator._conditional_cell_to_primitive(
                                value_when_hidden
                            )
                        )
                        + f",{NEWLINE}"
                    )
                ts_code += INDENT + INDENT + "conditionals: [" + NEWLINE

                # Add conditionals
                for index, conditional in enumerate(conditionals):
                    prim = ConditionalsGenerator._conditional_cell_to_primitive(
                        conditional["value"]
                    )
                    new_value = json.dumps(prim)
                    conditional_has_path = (
                        "${relativePath}" in conditional["path"]
                        # Check if any conditional has a path that contains "${currentPerson}", "${currentJourney}", "${currentTrip}", "${currentSegment}", or "${currentVisitedPlace}"
                        or any(
                            spec["token"] in conditional["path"]
                            for spec in current_context_specs
                        )
                    )
                    quote = "`" if conditional_has_path else "'"

                    # Check if any conditional has a path that contains "${currentPerson}", "${currentJourney}", "${currentTrip}", "${currentSegment}", or "${currentVisitedPlace}"
                    # If so, expand the path
                    expanded_path = ConditionalsGenerator._expand_tokenized_path(
                        conditional["path"], current_context_specs=current_context_specs
                    )
                    path = (
                        expanded_path
                        if expanded_path is not None
                        else f"{quote}{conditional['path']}{quote}"
                    )

                    ts_code += f"{INDENT}{INDENT}{INDENT}{{{NEWLINE}"
                    if conditional["logical_operator"]:
                        ts_code += (
                            f"{INDENT}{INDENT}{INDENT}{INDENT}logicalOperator: "
                            f"'{conditional['logical_operator']}',{NEWLINE}"
                        )
                    ts_code += f"{INDENT}{INDENT}{INDENT}{INDENT}path: {path},{NEWLINE}"
                    ts_code += (
                        f"{INDENT}{INDENT}{INDENT}{INDENT}comparisonOperator: "
                        f"'{conditional['comparison_operator']}',{NEWLINE}"
                    )
                    ts_code += (
                        f"{INDENT}{INDENT}{INDENT}{INDENT}value: {new_value},{NEWLINE}"
                    )
                    if conditional["parentheses"]:
                        ts_code += (
                            f"{INDENT}{INDENT}{INDENT}{INDENT}parentheses: "
                            f"'{conditional['parentheses']}',{NEWLINE}"
                        )
                    ts_code += f"{INDENT}{INDENT}{INDENT}}}"
                    ts_code += "," if index < len(conditionals) - 1 else ""
                    ts_code += f"{NEWLINE}"

                ts_code += f"{INDENT}{INDENT}]{NEWLINE}"
                ts_code += f"{INDENT}}});{NEWLINE}"
                ts_code += f"}};{NEWLINE}"

        except Exception as e:
            print(f"Error generating conditionals TypeScript code: {e}")
            raise e

        return ts_code

    @classmethod
    def generate_conditionals(
        cls, survey_definition: SurveyDefinition, output_file: str
    ) -> None:
        """Write TypeScript generated from ``survey_definition.conditionals`` to ``output_file`` (e.g. conditionals.tsx)."""
        conditional_by_name = cls._group_conditionals_by_name(
            survey_definition.conditionals
        )
        ts_code = cls.generate_typescript_code(conditional_by_name)
        generate_output_file(ts_code, output_file)
