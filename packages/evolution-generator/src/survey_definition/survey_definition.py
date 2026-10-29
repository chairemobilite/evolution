# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: The survey definition: the survey as authored (its languages, sections,
# conditionals, and later widgets, choices, ...), bundled in one object. Each table has
# its own module in this package (sections_definition.py, ...) that defines and
# validates its rows, and holds every rule about that table. This module only holds
# the rules about the survey languages: it validates them, then each table, passing
# each one, through Pydantic's validation context, what its rules need but the table
# doesn't have by itself, e.g. the survey languages (see validation_context.py).
#
# This module only defines the shape; it does not read any input source. See
# generator_helpers.py::load_survey_definition() for that (loads the source and
# builds a SurveyDefinition instance from the table models).

import re
from typing import Any

from pydantic import (
    BaseModel,
    Field,
    ValidationError,
    ValidationInfo,
    field_validator,
)

from survey_definition.choices_definition import Choices
from survey_definition.conditionals_definition import Conditionals
from survey_definition.labels_definition import Labels
from survey_definition.sections_definition import Sections

# A language code: two lowercase letters, optionally followed by a region, e.g. 'fr' or
# 'en-CA'. It names the translated columns (title_fr) and the locales folders (locales/fr).
_LANGUAGE_CODE_PATTERN = re.compile(r"[a-z]{2}(-[A-Z]{2})?")


class SurveyDefinition(BaseModel):
    """
    The single source of truth for the survey definition, shared by (almost) every
    Generator script.

    Input: a dict with the survey `languages` and one key per table (`sections`,
        `conditionals`, `labels`, `choices`, later `widgets`, ...), each holding that table's raw
        rows (or an already-built table object, e.g. `SurveyDefinition(sections=[...])`).
        `languages` is required; an omitted table defaults to empty.
    Output: a validated instance if the languages and every table are valid;
        otherwise raises `pydantic.ValidationError` with one error per invalid field,
        a table's listing all its problems as that table's own class does (e.g.
        `Sections` checks `parent_section` only once its rows and duplicates pass;
        see sections_definition.py).

    An already-built table object is kept as is: its rows were checked when it was
    built, with the context it was built with.

    The input source is loaded a single time into one instance of this class, which is
    then passed to each script, so they all work from the same already-validated data
    instead of each re-reading and re-parsing the source on its own.

    Attributes:
        languages: The survey languages, e.g. ('fr', 'en'), read from the workbook (see
            generator_helpers.py::read_survey_languages).
            Every translated field (e.g. a section title) must be set in each of them,
            and none in another language.
        conditionals: The Conditionals table, already checked: one ConditionalDefinition
            per row, in source order.
        sections: The Sections table, already checked: one SectionDefinition per row, in
            source order.
        labels: The Labels table, already checked: one LabelDefinition per row, in
            source order.
        choices: The Choices table, already checked: one ChoiceDefinition per row, in
            source order.
    """

    # Pydantic validates a table field with the table's own validators (e.g.
    # Conditionals), so a table needing nothing from the other fields needs no
    # validator here. Fields are validated in the order they are declared, and a
    # field's validator can read the fields before it (info.data). So the languages
    # come first, and the tables follow in dependency order: a table only gets
    # information from the fields before it.
    languages: tuple[str, ...]
    conditionals: Conditionals = Field(default_factory=lambda: Conditionals([]))
    sections: Sections = Field(default_factory=lambda: Sections([]))
    labels: Labels = Field(default_factory=lambda: Labels([]))
    choices: Choices = Field(default_factory=lambda: Choices([]))

    @field_validator("languages")
    @classmethod
    def _languages_are_valid(cls, languages: tuple[str, ...]) -> tuple[str, ...]:
        """Check that there is at least one language, each a valid code, none repeated."""
        if not languages:
            raise ValueError("At least one survey language is required.")
        invalid = [
            language
            for language in languages
            if not _LANGUAGE_CODE_PATTERN.fullmatch(language)
        ]
        if invalid:
            raise ValueError(
                f"Invalid survey languages {invalid}: each must be a language code "
                "like 'fr' or 'en-CA'."
            )
        repeated = sorted({lang for lang in languages if languages.count(lang) > 1})
        if repeated:
            raise ValueError(f"Repeated survey languages: {repeated}")
        return languages

    @field_validator("sections", mode="before")
    @classmethod
    def _sections_are_valid(cls, rows: Any, info: ValidationInfo) -> Any:
        """Validate the Sections table with the survey languages in its context."""
        # The languages are missing from info.data when they are invalid. That problem
        # is already reported, so check the sections with no language at all: their
        # other problems are still reported, without a title error for each language.
        languages = info.data.get("languages", ())
        return _validated_table(Sections, rows, context={"languages": languages})

    @field_validator("labels", mode="before")
    @classmethod
    def _labels_are_valid(cls, rows: Any, info: ValidationInfo) -> Any:
        """Validate the Labels table with the survey languages in its context."""
        # See _sections_are_valid: no language at all when they are invalid.
        languages = info.data.get("languages", ())
        return _validated_table(Labels, rows, context={"languages": languages})

    @field_validator("choices", mode="before")
    @classmethod
    def _choices_are_valid(cls, rows: Any, info: ValidationInfo) -> Any:
        """Validate the Choices table with the survey languages and the conditional names in its context."""
        # See _sections_are_valid: no language at all when they are invalid. Without a
        # valid Conditionals table (already reported), the choice conditionals aren't
        # compared to it.
        languages = info.data.get("languages", ())
        conditionals = info.data.get("conditionals")
        conditional_names = (
            set(conditionals.by_name()) if conditionals is not None else None
        )
        return _validated_table(
            Choices,
            rows,
            context={"languages": languages, "conditional_names": conditional_names},
        )


def _validated_table[T: BaseModel](
    table: type[T], rows: Any, context: dict | None
) -> T:
    """
    Validate `rows` into `table` with its validation `context`, for a table field whose
    validator passes it a context. The table's error (all its problems, one per line)
    is raised as is, the same as for a field Pydantic validates by itself, rather than
    nested in the error of the SurveyDefinition field holding the table.
    """
    try:
        return table.model_validate(rows, context=context)
    except ValidationError as exc:
        issues = []
        for error in exc.errors():
            reason = error.get("ctx", {}).get("error", error["msg"])
            issues.extend(str(reason).split("\n"))
        raise ValueError("\n".join(issues)) from exc
