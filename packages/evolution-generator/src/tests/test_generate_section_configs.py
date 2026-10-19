# Copyright 2025, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

from pathlib import Path
from typing import NamedTuple

from helpers.generator_helpers import (
    INDENT,
    add_generator_comment,
)
from scripts.generate_section_configs import (
    _section_conditional_ts_expression,
    generate_section_configs,
)
from survey_definition.survey_definition import SurveyDefinition

IND = INDENT


def _expected_header_and_core_imports(
    *, is_section_completed: bool, has_titles: bool = False
) -> str:
    out = add_generator_comment()
    if has_titles:
        out += "import { TFunction } from 'i18next';\n"
    if is_section_completed:
        out += "import { isSectionCompleted } from 'evolution-common/lib/services/questionnaire/sections/navigationHelpers';\n"
    out += "import { SectionConfig } from 'evolution-common/lib/services/questionnaire/types';\n"
    out += "import { widgetsNames } from './widgetsNames';\n"
    return out


def test_section_conditional_ts_expression_custom_suffix():
    assert (
        _section_conditional_ts_expression("householdMemberIsCompleteCustomConditional")
        == "customConditionals.householdMemberIsCompleteCustomConditional"
    )


def test_section_conditional_ts_expression_generated_conditional():
    assert (
        _section_conditional_ts_expression("hasHouseholdSize1Conditional")
        == "conditionals.hasHouseholdSize1Conditional"
    )


def test_generate_section_configs_from_survey_definition(tmp_path: Path) -> None:
    class SectionConfigCase(NamedTuple):
        """The Sections table rows and the expected sectionConfigs.ts tail of `section` (after shared imports)."""

        id: str
        section: str
        rows: list[dict[str, object | None]]
        is_section_completed: bool
        extra_imports: str
        file_tail: str
        has_titles: bool = False

    SECTION_CONFIG_CASES: tuple[SectionConfigCase, ...] = (
        SectionConfigCase(
            id="minimal_first_section",
            section="home",
            rows=[
                {
                    "section": "home",
                    "in_nav": False,
                    "abbreviation": "HM_",
                    "has_preload": False,
                }
            ],
            is_section_completed=True,
            extra_imports="",
            file_tail=(
                f"\nexport const currentSectionName: string = 'home';\n"
                "const previousSectionName: SectionConfig['previousSection'] = null;\n"
                "const nextSectionName: SectionConfig['nextSection'] = null;\n"
                "\n// Config for the section\n"
                "export const sectionConfig: SectionConfig = {\n"
                f"{IND}previousSection: previousSectionName,\n"
                f"{IND}nextSection: nextSectionName,\n"
                f"{IND}widgets: widgetsNames,\n"
                f"{IND}// Do some actions before the section is loaded\n"
                f"{IND}// Allow to click on the section menu\n"
                f"{IND}enableConditional:true,\n"
                f"{IND}// Determine if the current section is completed\n"
                f"{IND}completionConditional: function (interview) {{\n"
                f"{IND}{IND}return isSectionCompleted({{ interview, sectionName: currentSectionName }});\n"
                f"{IND}}}\n"
                "};\n\n"
                "export default sectionConfig;\n"
            ),
        ),
        SectionConfigCase(
            id="parent_section_hidden_nav",
            section="personTrips",
            rows=[
                {
                    "section": "personTrips",
                    "in_nav": False,
                    "abbreviation": "PT_",
                    "parent_section": "household",
                    "has_preload": False,
                },
                # The parent section must exist in the Sections table
                {"section": "household", "in_nav": False, "abbreviation": "HH_"},
            ],
            is_section_completed=True,
            extra_imports="",
            file_tail=(
                "\nexport const currentSectionName: string = 'personTrips';\n"
                "const previousSectionName: SectionConfig['previousSection'] = null;\n"
                "const nextSectionName: SectionConfig['nextSection'] = 'household';\n"
                "\n// Config for the section\n"
                "export const sectionConfig: SectionConfig = {\n"
                f"{IND}previousSection: previousSectionName,\n"
                f"{IND}nextSection: nextSectionName,\n"
                f"{IND}navMenu: {{\n"
                f"{IND}{IND}type: 'hidden',\n"
                f"{IND}{IND}parentSection: 'household'\n"
                f"{IND}}},\n"
                f"{IND}widgets: widgetsNames,\n"
                f"{IND}// Do some actions before the section is loaded\n"
                f"{IND}// Allow to click on the section menu\n"
                f"{IND}enableConditional:true,\n"
                f"{IND}// Determine if the current section is completed\n"
                f"{IND}completionConditional: function (interview) {{\n"
                f"{IND}{IND}return isSectionCompleted({{ interview, sectionName: currentSectionName }});\n"
                f"{IND}}}\n"
                "};\n\n"
                "export default sectionConfig;\n"
            ),
        ),
        SectionConfigCase(
            id="titles_template_preload_conditionals",
            has_titles=True,
            section="trips",
            rows=[
                {
                    "section": "trips",
                    "title_fr": "Voyages",
                    "title_en": "Trips",
                    "in_nav": True,
                    "abbreviation": "TR_",
                    "template": "visitedPlaces",
                    "has_preload": True,
                    "enable_conditional": "visitedPlacesForPersonIsCompleteCustomConditional",
                    "completion_conditional": "hasHouseholdSize1Conditional",
                }
            ],
            is_section_completed=False,
            extra_imports=(
                "import * as customConditionals from '../../common/customConditionals';\n"
                "import * as conditionals from '../../common/conditionals';\n"
                "import { customPreload } from './customPreload';\n"
            ),
            file_tail=(
                f"\nexport const currentSectionName: string = 'trips';\n"
                "const previousSectionName: SectionConfig['previousSection'] = null;\n"
                "const nextSectionName: SectionConfig['nextSection'] = null;\n"
                "\n// Config for the section\n"
                "export const sectionConfig: SectionConfig = {\n"
                f"{IND}previousSection: previousSectionName,\n"
                f"{IND}nextSection: nextSectionName,\n"
                f"{IND}title: (t: TFunction) => t('sectionConfigs:trips.title'),\n"
                f"{IND}navMenu: {{\n"
                f"{IND}{IND}type: 'inNav',\n"
                f"{IND}{IND}menuName: (t: TFunction) => t('sectionConfigs:trips.title')\n"
                f"{IND}}},\n"
                f"{IND}template: 'visitedPlaces',\n"
                f"{IND}widgets: widgetsNames,\n"
                f"{IND}// Do some actions before the section is loaded\n"
                f"{IND}preload: customPreload,\n"
                f"{IND}// Allow to click on the section menu\n"
                f"{IND}enableConditional: customConditionals.visitedPlacesForPersonIsCompleteCustomConditional,\n"
                f"{IND}// Determine if the current section is completed\n"
                f"{IND}completionConditional: conditionals.hasHouseholdSize1Conditional\n"
                "\n"
                "};\n\n"
                "export default sectionConfig;\n"
            ),
        ),
    )

    for case in SECTION_CONFIG_CASES:
        survey_definition = SurveyDefinition(sections=case.rows)
        out_dir = tmp_path / case.id
        for row in case.rows:
            (out_dir / row["section"]).mkdir(parents=True, exist_ok=True)
        generate_section_configs(survey_definition, str(out_dir))

        generated = (out_dir / case.section / "sectionConfigs.ts").read_text(
            encoding="utf-8"
        )
        expected = (
            _expected_header_and_core_imports(
                is_section_completed=case.is_section_completed,
                has_titles=case.has_titles,
            )
            + case.extra_imports
            + case.file_tail
        )
        assert generated == expected, case.id


def test_generate_section_configs_links_sections_in_source_order(
    tmp_path: Path,
) -> None:
    """Each section's previous and next sections are its neighbours in the Sections table."""
    survey_definition = SurveyDefinition(
        sections=[
            {"section": "home", "in_nav": False, "abbreviation": "HM_"},
            {"section": "household", "in_nav": False, "abbreviation": "HH_"},
            {"section": "end", "in_nav": False, "abbreviation": "EN_"},
        ]
    )
    for section in ("home", "household", "end"):
        (tmp_path / section).mkdir()

    generate_section_configs(survey_definition, str(tmp_path))

    def previous_and_next(section: str) -> tuple[str, str]:
        lines = (tmp_path / section / "sectionConfigs.ts").read_text().splitlines()
        previous_line = next(l for l in lines if "previousSectionName:" in l)
        next_line = next(l for l in lines if "nextSectionName:" in l)
        return previous_line.split(" = ")[1], next_line.split(" = ")[1]

    assert previous_and_next("home") == ("null;", "'household';")
    assert previous_and_next("household") == ("'home';", "'end';")
    assert previous_and_next("end") == ("'household';", "null;")


def test_generate_section_configs_writes_the_titles_as_translations(
    tmp_path: Path,
) -> None:
    """The titles go in locales/<language>/sectionConfigs.yaml, one file per survey language."""
    survey_definition = SurveyDefinition(
        languages=["es", "en"],
        sections=[
            {
                "section": "home",
                "in_nav": True,
                "abbreviation": "HM_",
                "title_es": "Inicio",
                "title_en": "Home",
            },
            # No title: not in the translations
            {"section": "end", "in_nav": False, "abbreviation": "EN_"},
        ],
    )
    for section in ("home", "end"):
        (tmp_path / "sections" / section).mkdir(parents=True)
    locales = tmp_path / "locales"

    generate_section_configs(
        survey_definition,
        str(tmp_path / "sections"),
        labels_output_folder_path=str(locales),
    )

    generated = (tmp_path / "sections" / "home" / "sectionConfigs.ts").read_text(
        encoding="utf-8"
    )
    assert "import { TFunction } from 'i18next';\n" in generated
    assert (
        f"{IND}title: (t: TFunction) => t('sectionConfigs:home.title'),\n" in generated
    )
    assert (
        f"{IND}{IND}menuName: (t: TFunction) => t('sectionConfigs:home.title')\n"
        in generated
    )
    end = (tmp_path / "sections" / "end" / "sectionConfigs.ts").read_text(
        encoding="utf-8"
    )
    assert "TFunction" not in end
    assert sorted(path.name for path in locales.iterdir()) == ["en", "es"]
    assert (
        (locales / "es" / "sectionConfigs.yaml")
        .read_text(encoding="utf-8")
        .endswith("home:\n    title: Inicio\n")
    )
    assert (
        (locales / "en" / "sectionConfigs.yaml")
        .read_text(encoding="utf-8")
        .endswith("home:\n    title: Home\n")
    )


def test_generate_section_configs_replaces_stale_section_titles(tmp_path: Path) -> None:
    locales = tmp_path / "locales"
    (locales / "fr").mkdir(parents=True)
    (locales / "fr" / "sectionConfigs.yaml").write_text(
        "removed:\n    title: Supprimée\n"
    )
    (tmp_path / "home").mkdir()
    survey_definition = SurveyDefinition(
        sections=[
            {
                "section": "home",
                "in_nav": True,
                "abbreviation": "HM_",
                "title_fr": "Accueil",
                "title_en": "Home",
            }
        ]
    )

    generate_section_configs(
        survey_definition, str(tmp_path), labels_output_folder_path=str(locales)
    )

    french = (locales / "fr" / "sectionConfigs.yaml").read_text(encoding="utf-8")
    assert "removed" not in french
    assert french.endswith("home:\n    title: Accueil\n")
