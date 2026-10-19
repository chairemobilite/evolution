# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: The survey definition: the survey as authored (sections, conditionals, choices,
# and later widgets, ...), bundled in one object. Each table has its own module in this
# package (sections_definition.py, ...) that defines and validates its rows; this module
# checks the rules that need more than one table, or the survey languages.
#
# This module only defines the shape; it does not read any input source. See
# generator_helpers.py::load_survey_definition() for that (loads the source and
# builds a SurveyDefinition instance from the table models).

from typing import Self

from pydantic import BaseModel, Field, model_validator

from survey_definition.choices_definition import Choices
from survey_definition.conditionals_definition import Conditionals
from survey_definition.sections_definition import Sections

# The survey languages: every choice label is required in each of them.
# TODO: Read them from the Generator config instead (see issue #2035).
SURVEY_LANGUAGES: tuple[str, ...] = ("fr", "en")


class SurveyDefinition(BaseModel):
    """
    The single source of truth for the survey definition, shared by (almost) every
    Generator script.

    Input: a dict with one key per table (`sections`, `conditionals`, `choices`, later
        `widgets`, ...), each holding that table's raw rows (or an already-built table
        object, e.g. `SurveyDefinition(sections=[...])`). Every key is optional; an
        omitted table defaults to empty.
    Output: a validated instance if every table is valid; otherwise raises
        `pydantic.ValidationError` listing the problems of every table, each reported
        as that table's own class does (e.g. `Sections` checks `parent_section` only
        once its rows and duplicates pass; see sections_definition.py). The rules
        across tables (see _cross_table_rules_are_valid) are only checked once every
        table is valid.

    The input source is loaded a single time into one instance of this class, which is
    then passed to each script, so they all work from the same already-validated data
    instead of each re-reading and re-parsing the source on its own.

    Attributes:
        sections: The Sections table, already checked: one SectionDefinition per row, in
            source order.
        conditionals: The Conditionals table, already checked: one ConditionalDefinition
            per row, in source order.
        choices: The Choices table, already checked: one ChoiceDefinition per row, in
            source order.
    """

    sections: Sections = Field(default_factory=lambda: Sections([]))
    conditionals: Conditionals = Field(default_factory=lambda: Conditionals([]))
    choices: Choices = Field(default_factory=lambda: Choices([]))

    @model_validator(mode="after")
    def _cross_table_rules_are_valid(self) -> Self:
        """Check the rules that need the survey languages or more than one table."""
        issues: list[str] = []
        issues.extend(self._choice_label_issues())
        issues.extend(self._choice_conditional_issues())
        if issues:
            raise ValueError("\n".join(issues))
        return self

    def _choice_label_issues(self) -> list[str]:
        """Check that every choice (not a spread) has a label in every survey language."""
        issues = []
        for row_number, choice in enumerate(self.choices, start=2):
            if choice.spread_choices_name is not None:
                continue
            missing = [
                f"label::{language}"
                for language in SURVEY_LANGUAGES
                if language not in choice.label
            ]
            if missing:
                issues.append(
                    f"Error in Choices - Required field is missing in row {row_number}. "
                    f"Missing fields: {missing}"
                )
        return issues

    def _choice_conditional_issues(self) -> list[str]:
        """Check that every choice conditional, unless custom, names a conditional of the Conditionals table."""
        # A name ending with 'CustomConditional' is written by hand in
        # customConditionals.tsx, so it isn't in the Conditionals table.
        conditional_names = {c.conditional_name for c in self.conditionals}
        return [
            f"Error in Choices - Invalid conditional in row {row_number}: "
            f"{choice.conditional!r} does not match any conditional_name of the "
            "Conditionals table"
            for row_number, choice in enumerate(self.choices, start=2)
            if choice.conditional is not None
            and not choice.conditional.endswith("CustomConditional")
            and choice.conditional not in conditional_names
        ]
