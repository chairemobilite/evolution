# Copyright 2025, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

from pathlib import Path
from typing import NamedTuple

from helpers.generator_helpers import (
    INDENT,
    add_generator_comment,
    create_mocked_excel_data,
    delete_file_if_exists,
)
from scripts.generate_section_configs import (
    _section_conditional_ts_expression,
    generate_section_configs,
)

MOCKED_EXCEL_FILE = "src/tests/references/test.xlsx"

IND = INDENT

HEADERS_MINIMAL = (
    "section",
    "title_fr",
    "title_en",
    "in_nav",
    "template",
    "parent_section",
    "has_preload",
)

HEADERS_WITH_CONDITIONALS = HEADERS_MINIMAL + (
    "enable_conditional",
    "completion_conditional",
)


def _sections_excel_row(
    headers: tuple[str, ...] | list[str], row_by_header: dict
) -> list:
    """Build one data row in sheet column order (each header key must be present in the dict)."""
    return [row_by_header[h] for h in headers]


def _expected_header_and_core_imports(*, is_section_completed: bool) -> str:
    out = add_generator_comment()
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


def test_generate_section_configs_from_excel(tmp_path: Path) -> None:
    class SectionConfigCase(NamedTuple):
        """One Sections sheet row and the expected sectionConfigs.ts tail (after shared imports)."""

        id: str
        section: str
        headers: tuple[str, ...]
        row: dict[str, object | None]
        is_section_completed: bool
        extra_imports: str
        file_tail: str

    SECTION_CONFIG_CASES: tuple[SectionConfigCase, ...] = (
        SectionConfigCase(
            id="minimal_first_section",
            section="home",
            headers=HEADERS_MINIMAL,
            row={
                "section": "home",
                "title_fr": None,
                "title_en": None,
                "in_nav": False,
                "template": None,
                "parent_section": None,
                "has_preload": False,
            },
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
            headers=HEADERS_MINIMAL,
            row={
                "section": "personTrips",
                "title_fr": None,
                "title_en": None,
                "in_nav": False,
                "template": None,
                "parent_section": "household",
                "has_preload": False,
            },
            is_section_completed=True,
            extra_imports="",
            file_tail=(
                "\nexport const currentSectionName: string = 'personTrips';\n"
                "const previousSectionName: SectionConfig['previousSection'] = null;\n"
                "const nextSectionName: SectionConfig['nextSection'] = null;\n"
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
            section="trips",
            headers=HEADERS_WITH_CONDITIONALS,
            row={
                "section": "trips",
                "title_fr": "Voyages",
                "title_en": "Trips",
                "in_nav": True,
                "template": "visitedPlaces",
                "parent_section": None,
                "has_preload": True,
                "enable_conditional": "visitedPlacesForPersonIsCompleteCustomConditional",
                "completion_conditional": "hasHouseholdSize1Conditional",
            },
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
                f"{IND}title: {{\n"
                f"{IND}{IND}fr: 'Voyages',\n"
                f"{IND}{IND}en: 'Trips'\n"
                f"{IND}}},\n"
                f"{IND}navMenu: {{\n"
                f"{IND}{IND}type: 'inNav',\n"
                f"{IND}{IND}menuName: {{\n"
                f"{IND}{IND}{IND}fr: 'Voyages',\n"
                f"{IND}{IND}{IND}en: 'Trips'\n"
                f"{IND}{IND}}}\n"
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
        create_mocked_excel_data(
            "Sections",
            list(case.headers),
            [_sections_excel_row(case.headers, case.row)],
        )
        try:
            out_dir = tmp_path / "sections"
            (out_dir / case.section).mkdir(parents=True, exist_ok=True)
            generate_section_configs(MOCKED_EXCEL_FILE, str(out_dir))

            generated = (out_dir / case.section / "sectionConfigs.ts").read_text(
                encoding="utf-8"
            )
            expected = (
                _expected_header_and_core_imports(
                    is_section_completed=case.is_section_completed
                )
                + case.extra_imports
                + case.file_tail
            )
            assert generated == expected, case.id
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)
