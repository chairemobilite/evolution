# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for the scripts that only need the sections names from the survey
# definition: generate_sections.py, generate_widgets_configs.py and generate_folders.py.

from scripts.generate_folders import generate_folders
from scripts.generate_sections import generate_sections
from scripts.generate_widgets_configs import generate_widgets_configs
from survey_definition.survey_definition import SurveyDefinition

SURVEY_DEFINITION = SurveyDefinition(
    sections=[
        {"section": "home", "in_nav": False, "abbreviation": "HM_"},
        {"section": "household", "in_nav": False, "abbreviation": "HH_"},
    ]
)


class TestGenerateSections:
    def test_imports_and_exports_every_section_in_source_order(self, tmp_path):
        """Every section of survey_definition.sections is imported and exported, in source order."""
        output_file = tmp_path / "sections.ts"

        generate_sections(SURVEY_DEFINITION, str(output_file))

        ts_code = output_file.read_text()
        assert (
            "import homeConfigs from './sections/home/sectionConfigs';\n"
            "import householdConfigs from './sections/household/sectionConfigs';\n"
        ) in ts_code
        assert (
            "const sectionsConfigs: SurveySectionsConfig = {\n"
            "    home: homeConfigs,\n"
            "    household: householdConfigs,\n"
            "};\n"
        ) in ts_code


class TestGenerateWidgetsConfigs:
    def test_imports_the_widgets_of_every_section_in_source_order(self, tmp_path):
        """The widgets of every section of survey_definition.sections are imported and listed, in source order."""
        output_file = tmp_path / "widgetsConfigs.tsx"

        generate_widgets_configs(SURVEY_DEFINITION, str(output_file))

        ts_code = output_file.read_text()
        assert (
            "import * as homeWidgets from './sections/home/widgets';\n"
            "import * as householdWidgets from './sections/household/widgets';\n"
        ) in ts_code
        assert (
            "const sectionsWidgets = [\n"
            "    homeWidgets,\n"
            "    householdWidgets,\n"
            "];\n"
        ) in ts_code


class TestGenerateFolders:
    def test_creates_a_folder_for_every_section(self, tmp_path):
        """A folder is created for every section of survey_definition.sections."""
        generate_folders(SURVEY_DEFINITION, str(tmp_path), enabled_scripts={})

        sections_folder = tmp_path / "src" / "survey" / "sections"
        assert sorted(p.name for p in sections_folder.iterdir()) == [
            "home",
            "household",
        ]
