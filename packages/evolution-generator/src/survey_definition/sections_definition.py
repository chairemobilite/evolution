# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: The Sections table of the survey definition: SectionDefinition, one Pydantic
# model per row, validated on construction (types, allowed values, per-field and
# same-row checks); and Sections, the whole checked table, whose validation also runs
# the rules across rows (a field unique across the table, parent_section naming a real
# section).
#
# This module only defines the shape and the checks; it does not read any input source.
# See survey_definition.py for the bundle of all tables.

from collections.abc import Iterator
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
from survey_definition.row_checks import _raise_if_check_fails, _strip_blanks
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

    Input: one row's fields, as keyword arguments or a dict (e.g.
        `SectionDefinition(**row)`, one row of the "Sections" sheet). A blank or
        whitespace-only cell is treated as an absent value.
    Output: a validated instance if every per-row rule passes (see Attributes below
        for what's checked); otherwise raises `pydantic.ValidationError` naming every
        field that failed, not just the first.

    Build instances through `Sections.model_validate` (below), which also runs
    the rules that need more than one row (unique `section`/`abbreviation`,
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

    @model_validator(mode="before")
    @classmethod
    def _strip_blank_cells(cls, data: Any) -> Any:
        """Treat a blank/whitespace-only cell as an absent key, not a genuinely blank value."""
        return _strip_blanks(data) if isinstance(data, dict) else data

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


class Sections(RootModel[list[SectionDefinition]]):
    """
    The whole Sections sheet: a list of SectionDefinition that has passed every check,
    the ones on each row and the ones across rows (see its model validators).

    Input: a list (or tuple/set/frozenset) of rows, each either a raw dict (e.g. every
        row of the "Sections" sheet, as read from Excel) or an already-built
        SectionDefinition.
    Output: a validated instance — iterable, `len()`-able, one SectionDefinition per row
        in source order — if the whole sheet passes every rule (each row's own rules,
        plus unique `section`/`abbreviation` and a valid `parent_section` across rows);
        otherwise raises `pydantic.ValidationError` listing every problem found, not
        just the first.

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
        # Pydantic also accepts a tuple/set/frozenset for a list field (coercing it
        # without ever running our checks), so those are normalized into a real list
        # here too. Anything else is left to Pydantic's own error.
        if isinstance(rows, (list, tuple, set, frozenset)):
            rows = list(rows)
            if all(isinstance(row, (dict, SectionDefinition)) for row in rows):
                sections, issues = collect_sheet_issues(
                    rows=rows,
                    model=SectionDefinition,
                    table_name="Sections",
                    sheet_rules=[unique_field("section"), unique_field("abbreviation")],
                )
                if issues:
                    raise ValueError("\n".join(issues))
                return handler(sections)
        return handler(rows)

    @model_validator(mode="after")
    def _parent_sections_are_valid(self) -> Self:
        """Check that every non-blank `parent_section` names a real section, other than the row's own."""
        # Runs only once every row is valid and section is unique (see
        # _collect_all_issues), so row numbers follow the source order.
        prefix = "Error in Sections - "
        valid_sections = {section.section for section in self.root}
        issues = []

        for row_number, section in enumerate(self.root, start=2):
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
        if issues:
            raise ValueError("\n".join(issues))
        return self

    def __iter__(self) -> Iterator[SectionDefinition]:  # type: ignore[override]
        return iter(self.root)

    def __len__(self) -> int:
        return len(self.root)
