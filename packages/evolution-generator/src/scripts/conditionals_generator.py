# Copyright 2026, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This module defines ConditionalsGenerator: TypeScript generation (conditionals.tsx)
# for survey conditionals. It is used from generate_survey.py.
#
# Pre-generation validation of the Conditionals sheet is not done here. For now the
# Excel integrity check (see generate_survey.py::check_excel_integrity) only checks
# Sections, via SurveyDefinition; Conditionals will move to SurveyDefinition later.

from collections import defaultdict
import json

from helpers.generator_helpers import (
    INDENT,
    add_generator_comment,
    get_values_from_row,
    get_data_from_excel,
    generate_output_file,
)


class ConditionalsGenerator:
    """Generate TypeScript (conditionals.tsx) output from the Conditionals Excel sheet."""

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
    def _empty_to_none(value) -> str | None:
        """Treat empty string as None for optional Excel cells (e.g. logical_operator, parentheses)."""
        return None if value == "" else value

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
    def extract_conditionals_from_data(rows, headers) -> defaultdict:
        """Extract conditionals from rows and group them by conditional_name."""
        conditional_by_name = defaultdict(list)

        try:
            for row_number, row in enumerate(rows[1:], start=2):
                values = get_values_from_row(row, headers)
                row_dict = dict(zip(headers, values, strict=True))

                # Get values from the row dictionary
                conditional_name = row_dict.get("conditional_name")
                logical_operator = row_dict.get("logical_operator")
                path = row_dict.get("path")
                comparison_operator = row_dict.get("comparison_operator")
                value = row_dict.get("value")
                parentheses = row_dict.get("parentheses")
                value_when_hidden = row_dict.get("value_when_hidden")

                conditional = {
                    "logical_operator": logical_operator,
                    "path": path,
                    "comparison_operator": comparison_operator,
                    "value": value,
                    "parentheses": parentheses,
                }
                value_when_hidden = ConditionalsGenerator._empty_to_none(
                    value_when_hidden
                )
                if value_when_hidden is not None:
                    conditional["value_when_hidden"] = value_when_hidden

                conditional_by_name[conditional_name].append(conditional)

        except Exception as e:
            print(f"Error extracting conditionals from Excel data: {e}")
            raise e

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
    def generate_conditionals(cls, input_file: str, output_file: str) -> None:
        """Read the Conditionals sheet from ``input_file`` and write generated TypeScript to ``output_file`` (e.g. conditionals.tsx)."""
        rows, headers = get_data_from_excel(input_file, sheet_name="Conditionals")
        conditional_by_name = cls.extract_conditionals_from_data(rows, headers)
        ts_code = cls.generate_typescript_code(conditional_by_name)
        generate_output_file(ts_code, output_file)
