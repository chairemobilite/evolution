# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: The Sections table of the survey definition: SectionDefinition, one Pydantic
# model per row, validated on construction (types, allowed values, per-field and
# same-row checks); collect_sections_issues, which also runs the rules across rows (a
# field unique across the table, parent_section naming a real section); and Sections,
# the whole checked table.
#
# This module only defines the shape and the checks; it does not read any input source.
# See survey_definition.py for the bundle of all tables.

from collections.abc import Iterator, Sequence
from typing import Any, Self

from pydantic import (
    BaseModel,
    ConfigDict,
    RootModel,
    ValidationInfo,
    field_validator,
    model_validator,
)

from survey_definition import field_checks
from survey_definition.row_checks import _raise_if_check_fails
from survey_definition.sheet_checks import collect_sheet_issues, unique_field

# Field names the Sections source must provide, even though several of them
# (title_fr, title_en, template, parent_section) may be blank on a given row — see
# SectionDefinition below for which fields' *values* are actually mandatory.
SECTION_REQUIRED_FIELD_NAMES: tuple[str, ...] = (
    "section",
    "title_fr",
    "title_en",
    "in_nav",
    "template",
    "parent_section",
    "abbreviation",
)


class SectionDefinition(BaseModel):
    """
    One row of the Sections table: a survey section (page), validated on construction.

    Build instances through `collect_sections_issues` (below), which
    also runs the rules that need more than one row (unique `section`/`abbreviation`,
    `parent_section` exists).
    Constructing a SectionDefinition directly only runs the per-row rules below. Validation
    is strict: no type coercion (e.g. the string "yes" is rejected for a bool field).

    Attributes:
        section: Unique name of this section, and the value other rows use in their
            `parent_section` to nest under it. Required; must be a valid TypeScript
            identifier and unique across the table.
        in_nav: Whether this section appears in the navigation menu. Required. When
            true, `title_fr` and `title_en` become required too.
        abbreviation: Short code for this section, e.g. "h_". Required; must end with
            an underscore and be unique across the table.
        title_fr: French title shown for this section. Only required when `in_nav` is true.
        title_en: English title shown for this section. Only required when `in_nav` is true.
        template: How this section is rendered. True means it has its own custom
            `template.tsx`, a str names a builtin template, and None uses the default
            (no template). See `generate_section_configs.py`.
        parent_section: Name of another row's `section` to nest this section under
            (it then stays out of the navigation menu). If set, must name a real
            section in this table.
        has_preload: Whether a `customPreload` function runs before this section loads.
            Blank is treated as true by `generate_section_configs.py`.
        enable_conditional: Name of the conditional that decides whether this section's
            navigation item is enabled. If set, must end with "Conditional" or
            "CustomConditional". Blank means enabled once the previous section is complete.
        completion_conditional: Name of the conditional that decides whether this
            section is complete. Same naming rule as `enable_conditional`. Blank means
            the default completion check.
    """

    # By default, Pydantic silently converts values to the declared type: the text "yes"
    # or "1" becomes True for a bool field, the text "5" becomes 5 for an int field.
    # strict=True turns that off: a value must already have exactly the declared type,
    # otherwise it is reported as an error. A cell holding "yes" where a true/false
    # value is expected is most likely a mistake in the spreadsheet, so we want to
    # point it out rather than guess what was meant. The same goes for a TRUE that
    # became 1 or "true" after a round trip between Excel, LibreOffice Calc and a text
    # editor: it means the file was converted along the way, which is worth knowing.
    model_config = ConfigDict(strict=True)

    # No default: a blank value here is a genuinely missing required value.
    section: str
    in_nav: bool
    abbreviation: str

    title_fr: str | None = None
    title_en: str | None = None

    template: str | bool | None = None
    parent_section: str | None = None
    has_preload: bool | None = None
    enable_conditional: str | None = None
    completion_conditional: str | None = None

    @field_validator("section")
    @classmethod
    def _section_is_valid_identifier(cls, value: str, info: ValidationInfo) -> str:
        """Check that `section` is a valid TypeScript identifier."""
        _raise_if_check_fails(field_checks.valid_ts_identifier, value, info.data)
        return value

    @field_validator("abbreviation")
    @classmethod
    def _abbreviation_ends_with_underscore(
        cls, value: str, info: ValidationInfo
    ) -> str:
        """Check that `abbreviation` ends with an underscore (e.g. "h_")."""
        _raise_if_check_fails(field_checks.ends_with_underscore, value, info.data)
        return value

    # A model validator with mode="after" runs once every field above has been read and
    # checked, and gets the finished row as `self`. That is what a rule between two
    # fields needs (here: in_nav decides whether the titles are required), unlike a
    # field_validator, which only sees the one field it is attached to.
    @model_validator(mode="after")
    def _titles_required_when_in_nav(self) -> Self:
        """Check that `title_fr` and `title_en` are set whenever `in_nav` is true."""
        if self.in_nav:
            # A title of only spaces counts as blank, like in field_checks.non_blank.
            missing = [
                name
                for name in ("title_fr", "title_en")
                if not (getattr(self, name) or "").strip()
            ]
            if missing:
                verb = "is" if len(missing) == 1 else "are"
                raise ValueError(
                    f"{' and '.join(missing)} {verb} required when in_nav is true"
                )
        return self

    @field_validator("enable_conditional", "completion_conditional")
    @classmethod
    def _conditional_name_is_valid(
        cls, value: str | None, info: ValidationInfo
    ) -> str | None:
        """Check that a non-blank `enable_conditional`/`completion_conditional` ends with "Conditional"."""
        if value is not None:
            _raise_if_check_fails(field_checks.valid_conditional_name, value, info.data)
        return value


def collect_sections_issues(
    rows: list[dict | SectionDefinition], table_name: str = "Sections"
) -> tuple[list[SectionDefinition], list[str]]:
    """Parse every Sections row, then check table-wide rules (unique section/abbreviation, parent_section exists). Returns (parsed sections, every issue found)."""
    return collect_sheet_issues(
        rows,
        SectionDefinition,
        table_name,
        [unique_field("section"), unique_field("abbreviation"), _parent_section_issues],
    )


def _parent_section_issues(
    rows: Sequence[tuple[int, SectionDefinition]], table_name: str
) -> list[str]:
    """Find every non-blank `parent_section` that doesn't name a real section in `rows`, or names the row's own section."""
    prefix = f"Error in {table_name} - "
    valid_sections = {section.section for _, section in rows}
    issues = []

    for row_number, section in rows:
        if section.parent_section is None:
            continue
        # A section's own name is in valid_sections, so it needs its own check.
        if section.parent_section == section.section:
            issues.append(
                f"{prefix}Invalid parent_section in row {row_number}: "
                f"{section.parent_section!r} - A section cannot be its own parent. "
                "Name another section, or leave it blank."
            )
        elif section.parent_section not in valid_sections:
            issues.append(
                f"{prefix}Invalid parent_section in row {row_number}: "
                f"{section.parent_section!r} does not match any section value"
            )
    return issues


class Sections(RootModel[list[SectionDefinition]]):
    """
    The whole Sections sheet: a list of SectionDefinition that has passed every check,
    the ones on each row and the ones across rows (see collect_sections_issues).

    An instance only exists if the sheet is valid, so whatever holds one doesn't need
    to check it again. Build it from the rows as read from the source (dicts) or from
    SectionDefinition objects; when the sheet has problems, the error message lists
    every one of them, not just the first.
    """

    @model_validator(mode="wrap")
    @classmethod
    def _collect_all_issues(cls, rows: Any, handler) -> Any:
        # Pydantic stops at the first error a validator raises, so a plain validator
        # would report the problems one at a time. Running the checks ourselves and
        # raising a single error that lists all of them is what reports everything.
        # Anything that isn't a list of rows is left to Pydantic's own error.
        if isinstance(rows, list) and all(
            isinstance(row, (dict, SectionDefinition)) for row in rows
        ):
            sections, issues = collect_sections_issues(rows)
            if issues:
                raise ValueError("\n".join(issues))
            return handler(sections)
        return handler(rows)

    def __iter__(self) -> Iterator[SectionDefinition]:  # type: ignore[override]
        return iter(self.root)

    def __len__(self) -> int:
        return len(self.root)
