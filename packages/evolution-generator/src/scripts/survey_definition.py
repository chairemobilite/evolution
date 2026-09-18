# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Defines the shape of the intermediate data layer between the Generator's input
# source (spreadsheet, CSV, JSON, API, ...) and the generation scripts: one Pydantic
# model per table (SectionDefinition, WidgetDefinition, ChoiceDefinition, InputRangeDefinition, ConditionalDefinition,
# LabelDefinition), bundled together as SurveyDefinition. Each model validates its own row on
# construction (types, allowed values, per-field and same-row checks); a table-level
# function alongside it (e.g. collect_sections_issues) then checks the rules a single
# row can't check by itself, such as a field being unique across the table.
#
# This module only defines the shape and the validation helpers; it does not read any
# input source. See generator_helpers.py::load_survey_definition() for that (loads the
# source and builds a SurveyDefinition instance from these models).

from __future__ import annotations

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    ValidationError,
    ValidationInfo,
    field_validator,
)

from helpers import survey_definition_checks


class SurveyDefinition(BaseModel):
    """
    The single source of truth for the survey definition, shared by (almost) every
    Generator script.

    The input source is loaded a single time into one instance of this class, which is
    then passed to each script, so they all work from the same already-validated data
    instead of each re-reading and re-parsing the source on its own.

    Attributes:
        sections: Every row of the Sections table, one SectionDefinition each, in source order.
    """

    sections: list[SectionDefinition] = Field(default_factory=list)
    ## widgets: list[WidgetDefinition] = Field(default_factory=list)
    ## choices: list[ChoiceDefinition] = Field(default_factory=list)
    ## input_ranges: list[InputRangeDefinition] = Field(default_factory=list)
    ## conditionals: list[ConditionalDefinition] = Field(default_factory=list)
    ## labels: list[LabelDefinition] = Field(default_factory=list)


# -------------------------------------- Sections --------------------------------------

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

    Build instances through `collect_sections_issues`, which also runs the rules that
    need more than one row (unique `section`/`abbreviation`, `parent_section` exists).
    Constructing a SectionDefinition directly only runs the per-row rules below. Validation
    is strict: no type coercion (e.g. the string "yes" is rejected for a bool field).

    Field order matters: `in_nav` must stay declared before `title_fr`/`title_en`, since
    `_titles_required_when_in_nav` reads it back through `info.data`, which Pydantic only
    fills with earlier-declared fields.

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

    model_config = ConfigDict(strict=True)

    # No default: a blank value here is a genuinely missing required value.
    section: str
    in_nav: bool
    abbreviation: str

    # validate_default=True makes the validator run even when the value is blank (and
    # the key was stripped by _strip_blanks) — the case it actually needs to catch.
    title_fr: str | None = Field(default=None, validate_default=True)
    title_en: str | None = Field(default=None, validate_default=True)

    template: str | bool | None = None
    parent_section: str | None = None
    has_preload: bool | None = None
    enable_conditional: str | None = None
    completion_conditional: str | None = None

    @field_validator("section")
    @classmethod
    def _section_is_valid_identifier(cls, value: str, info: ValidationInfo) -> str:
        """Check that `section` is a valid TypeScript identifier."""
        _raise_if_check_fails(
            survey_definition_checks.valid_ts_identifier, value, info.data
        )
        return value

    @field_validator("abbreviation")
    @classmethod
    def _abbreviation_ends_with_underscore(
        cls, value: str, info: ValidationInfo
    ) -> str:
        """Check that `abbreviation` ends with an underscore (e.g. "h_")."""
        _raise_if_check_fails(
            survey_definition_checks.ends_with_underscore, value, info.data
        )
        return value

    @field_validator("title_fr", "title_en")
    @classmethod
    def _titles_required_when_in_nav(
        cls, value: str | None, info: ValidationInfo
    ) -> str | None:
        """Check that `title_fr`/`title_en` are set whenever this row's `in_nav` is true."""
        if info.data.get("in_nav") and not value:
            raise ValueError("title_fr and title_en are required when in_nav is true")
        return value

    @field_validator("enable_conditional", "completion_conditional")
    @classmethod
    def _conditional_name_is_valid(
        cls, value: str | None, info: ValidationInfo
    ) -> str | None:
        """Check that a non-blank `enable_conditional`/`completion_conditional` ends with "Conditional"."""
        if value is not None:
            _raise_if_check_fails(
                survey_definition_checks.valid_conditional_name, value, info.data
            )
        return value


# ------------------------------------- Helpers --------------------------------------


def validate_required_field_names(
    field_names: list[str], expected_field_names: tuple[str, ...], table_name: str
) -> None:
    """
    Raise if any name in `expected_field_names` is missing from `field_names`.

    Separate from Pydantic's own required-field checking, since a field can be
    required to exist in the source while still allowing a blank value (e.g. parent_section).
    """
    if len(field_names) < len(expected_field_names):
        raise Exception(
            f"Too few fields in {table_name}: expected at least "
            f"{len(expected_field_names)} ({', '.join(expected_field_names)}), "
            f"got {len(field_names)}"
        )

    for expected in expected_field_names:
        if expected not in field_names:
            raise Exception(f"Missing expected field in {table_name}: {expected}")


def format_pydantic_errors(
    exc: ValidationError, table_name: str, row_number: int
) -> list[str]:
    """Convert a ValidationError from parsing one row into our "Error in ... row N" message format."""
    prefix = f"Error in {table_name} - "
    errors = exc.errors(include_url=False)

    missing = [str(error["loc"][0]) for error in errors if error["type"] == "missing"]
    issues: list[str] = []
    if missing:
        issues.append(
            f"{prefix}Required field is missing in row {row_number}. "
            f"Missing fields: {missing}"
        )

    for error in errors:
        if error["type"] == "missing":
            continue
        field_name = str(error["loc"][0])
        reason = error.get("ctx", {}).get("error", error["msg"])
        issues.append(
            f"{prefix}Invalid {field_name} in row {row_number}: {error['input']!r} - {reason}"
        )

    return issues


def _strip_blanks(row: dict) -> dict:
    """Drop None/"" values, so a blank value looks like a genuinely absent key to Pydantic."""
    return {key: value for key, value in row.items() if value not in (None, "")}


def _raise_if_check_fails(check, value, row: dict) -> None:
    """Run a survey_definition_checks-style (value, row) -> bool check; raise ValueError using its docstring on failure."""
    if not check(value, row):
        reason = (check.__doc__ or check.__name__).strip().splitlines()[0]
        raise ValueError(reason)


def collect_sections_issues(
    rows: list[dict], table_name: str = "Sections"
) -> tuple[list[SectionDefinition], list[str]]:
    """Parse every Sections row, then check table-wide rules (unique section/abbreviation, parent_section exists). Returns (parsed sections, every issue found)."""
    issues: list[str] = []
    parsed: list[tuple[int, SectionDefinition]] = []

    for row_number, row in enumerate(rows, start=2):
        try:
            section = SectionDefinition(**_strip_blanks(row))
        except ValidationError as exc:
            issues.extend(format_pydantic_errors(exc, table_name, row_number))
            continue
        parsed.append((row_number, section))

    issues.extend(_duplicate_value_issues(parsed, "section", table_name))
    issues.extend(_duplicate_value_issues(parsed, "abbreviation", table_name))
    issues.extend(_parent_section_issues(parsed, table_name))

    return [section for _, section in parsed], issues


def _duplicate_value_issues(
    rows: list[tuple[int, SectionDefinition]], field_name: str, table_name: str
) -> list[str]:
    """Find every value of `field_name` that repeats across `rows`."""
    prefix = f"Error in {table_name} - "
    row_numbers_by_value: dict[str, list[int]] = {}
    for row_number, section in rows:
        row_numbers_by_value.setdefault(getattr(section, field_name), []).append(
            row_number
        )
    return [
        f"{prefix}Duplicate {field_name} {value!r}: found in rows {row_numbers}"
        for value, row_numbers in row_numbers_by_value.items()
        if len(row_numbers) > 1
    ]


def _parent_section_issues(
    rows: list[tuple[int, SectionDefinition]], table_name: str
) -> list[str]:
    """Find every non-blank `parent_section` that doesn't name a real section in `rows`."""
    prefix = f"Error in {table_name} - "
    valid_sections = {section.section for _, section in rows}
    return [
        f"{prefix}Invalid parent_section in row {row_number}: "
        f"{section.parent_section!r} does not match any section value"
        for row_number, section in rows
        if section.parent_section is not None
        and section.parent_section not in valid_sections
    ]
