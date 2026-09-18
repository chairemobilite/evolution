# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for survey_definition/sections_definition.py: SectionDefinition.

from survey_definition.sections_definition import SectionDefinition


class TestSectionDefinition:
    def test_section_definition_required_fields_and_defaults(self):
        # in_nav=False so title_fr/title_en aren't required for this minimal example.
        section = SectionDefinition(section="home", in_nav=False, abbreviation="HM_")
        assert section.title_fr is None
        assert section.parent_section is None
