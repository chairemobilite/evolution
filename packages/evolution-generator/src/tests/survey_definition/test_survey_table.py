# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for survey_definition/survey_table.py: the base class of every table.

from pydantic import BaseModel

from survey_definition.sections_definition import SectionDefinition, Sections
from survey_definition.survey_table import SurveyTable


class _Row(BaseModel):
    """Helper for the tests below, not a test itself.

    The smallest row model a SurveyTable can hold, with a single field.
    """

    name: str


class _TableWithoutWarnings(SurveyTable[_Row]):
    """Helper for the tests below, not a test itself.

    A SurveyTable subclass that does not override warnings(), to check the
    base class default.
    """


def test_a_table_without_warnings_keeps_the_default():
    table = _TableWithoutWarnings([{"name": "home"}])
    assert table.warnings() == []


def test_a_table_reads_like_the_list_of_its_rows():
    rows = [
        SectionDefinition(section="home", in_nav=False, abbreviation="HM_"),
        SectionDefinition(section="end", in_nav=False, abbreviation="EN_"),
    ]
    sections = Sections(rows)
    assert len(sections) == 2
    assert sections[1] is rows[1]
    assert list(sections) == rows
