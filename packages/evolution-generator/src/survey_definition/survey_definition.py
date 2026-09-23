# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: The survey definition: the survey as authored (sections, and later widgets,
# choices, ...), bundled in one object. Each table has its own module in this package
# (sections_definition.py, ...) that defines and validates its rows.
#
# This module only defines the shape; it does not read any input source. See
# generator_helpers.py::load_survey_definition() for that (loads the source and
# builds a SurveyDefinition instance from the table models).

from pydantic import BaseModel, Field

from survey_definition.sections_definition import Sections


class SurveyDefinition(BaseModel):
    """
    The single source of truth for the survey definition, shared by (almost) every
    Generator script.

    Input: a dict with one key per table (currently just `sections`, later `widgets`,
        `choices`, ...), each holding that table's raw rows (or an already-built table
        object, e.g. `SurveyDefinition(sections=[...])`). Every key is optional; an
        omitted table defaults to empty.
    Output: a validated instance if every table is valid; otherwise raises
        `pydantic.ValidationError` listing the problems of every table, each reported
        as that table's own class does (e.g. `Sections` checks `parent_section` only
        once its rows and duplicates pass; see sections_definition.py).

    The input source is loaded a single time into one instance of this class, which is
    then passed to each script, so they all work from the same already-validated data
    instead of each re-reading and re-parsing the source on its own.

    Attributes:
        sections: The Sections table, already checked: one SectionDefinition per row, in
            source order.
    """

    sections: Sections = Field(default_factory=lambda: Sections([]))
