# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Checks on a whole sheet (table) of the survey definition, the same for every
# table. collect_sheet_issues parses every row into the table's definition model, then
# runs the rules a single row can't check by itself, given as a list of "sheet rules".
# Each table's module says which model and which rules to use (see
# sections_definition.py::Sections._collect_all_issues). Reports every problem
# found, not just the first.

import difflib
from collections.abc import Callable, Sequence
from itertools import takewhile

from pydantic import BaseModel, ValidationError, ValidationInfo

from survey_definition.row_checks import format_pydantic_errors
from survey_definition.validation_context import context_languages

type SheetRule[M: BaseModel] = Callable[[Sequence[tuple[int, M]], str], list[str]]


def collect_sheet_issues[M: BaseModel](
    rows: list[dict | M],
    model: type[M],
    table_name: str,
    sheet_rules: Sequence[SheetRule[M]],
    context: dict | None = None,
    is_skipped: Callable[[dict | M], bool] | None = None,
) -> tuple[list[M], list[str]]:
    """Parse every row into `model`, then run each of `sheet_rules` on the rows that parsed. Returns (parsed rows, every issue found).

    A row for which `is_skipped` is true (e.g. an inactive widget) is left out: it isn't
    parsed, checked or returned. The rows are still numbered as in the source, skipped
    ones included, so every issue names the row of the source.

    `context` is the table's validation context (see validation_context.py), passed on
    to each row so its rules can read it. A row that is already a `model` instance was
    checked when it was built, so it is kept as is; the sheet rules still apply to it.
    Blank-stripping isn't done here: each table's own model handles that itself (see
    SectionDefinition._strip_blank_cells).
    """
    issues: list[str] = []
    parsed: list[tuple[int, M]] = []

    for row_number, row in enumerate(rows, start=2):
        if is_skipped is not None and is_skipped(row):
            continue
        if isinstance(row, model):
            parsed.append((row_number, row))
            continue
        try:
            definition = model.model_validate(row, context=context)
        except ValidationError as exc:
            issues.extend(format_pydantic_errors(exc, table_name, row_number))
            continue
        parsed.append((row_number, definition))

    for sheet_rule in sheet_rules:
        issues.extend(sheet_rule(parsed, table_name))

    return [definition for _, definition in parsed], issues


# Columns any sheet may have, which the generator doesn't read: notes for whoever edits
# the sheet.
COMMENT_COLUMN_NAMES: tuple[str, ...] = ("comments",)


def unknown_columns_warning(
    sheet_name: str,
    headers: Sequence,
    model: type[BaseModel],
    column_prefix_by_field: dict[str, str],
    languages: Sequence[str] = (),
) -> str | None:
    """
    The warning listing the columns of a sheet its table doesn't read, or None if
    there is none. They are ignored, so a misspelled header (e.g. Label_min::fr) loses
    its whole column, and may only show up as another column reported missing.

    A known column is a field of `model` (or its alias), a translated column (a key of
    `column_prefix_by_field` maps a field to the prefix of its columns, e.g.
    {"title": "title_"}, see row_checks.py::_collect_language_columns) or a comment
    column (COMMENT_COLUMN_NAMES). Text after the first empty header is a note, not a
    column (see ExcelSurveyDefinitionReader.get_headers). Each unknown column names
    the closest known one, e.g. 'Label_min::fr' (did you mean 'label_min::fr'?), with
    the translated columns in the survey `languages`.
    """
    known_columns = {
        name
        for field_name, field in model.model_fields.items()
        if field_name not in column_prefix_by_field
        for name in (field_name, field.alias)
        if name is not None
    } | set(COMMENT_COLUMN_NAMES)
    prefixes = tuple(column_prefix_by_field.values())
    columns = takewhile(
        lambda header: header is not None and str(header).strip() != "", headers
    )
    unknown = [
        column
        for column in columns
        if column not in known_columns
        and not (isinstance(column, str) and column.startswith(prefixes))
    ]
    if not unknown:
        return None
    descriptions = []
    for column in unknown:
        # The translated columns in the survey languages, and in the column's own
        # language (e.g. en for lable::en): a misspelled label::en is the column the
        # survey languages are read from. Compared in lower case: a wrong case is a
        # common typo.
        candidates = [
            *sorted(known_columns),
            *(
                prefix + language
                for prefix in prefixes
                for language in [*languages, _language_of(str(column), prefix)]
                if language
            ),
        ]
        candidate_by_lower_case = {
            candidate.lower(): candidate for candidate in candidates
        }
        # get_close_matches scores how alike two names are, character by character,
        # from 0 (nothing in common) to 1 (the same), e.g. abreviation and
        # abbreviation score 0.96. It gives the best candidate scoring at least 0.6,
        # or none: the column is then listed without a suggestion, rather than with
        # a misleading one. It only guesses from the spelling, hence "did you mean".
        closest = difflib.get_close_matches(
            str(column).lower(), list(candidate_by_lower_case), n=1
        )
        descriptions.append(
            f"{column!r} (did you mean {candidate_by_lower_case[closest[0]]!r}?)"
            if closest
            else repr(column)
        )
    return (
        f"{sheet_name} sheet has columns it doesn't read, so they are ignored: "
        f"{', '.join(descriptions)}"
    )


def _language_of(column: str, prefix: str) -> str | None:
    """The language a column ends with, after the separator of `prefix` (:: or _), e.g. en for lable::en with label::; None if it has none."""
    separator = "::" if prefix.endswith("::") else prefix[-1]
    if separator not in column:
        return None
    return column.rsplit(separator, 1)[1] or None


def unique_field(field_name: str) -> SheetRule[BaseModel]:
    """Build a sheet rule: the value of `field_name` must not repeat across rows."""

    def rule(rows: Sequence[tuple[int, BaseModel]], table_name: str) -> list[str]:
        prefix = f"Error in {table_name} - "
        row_numbers_by_value: dict[str, list[int]] = {}
        for row_number, definition in rows:
            row_numbers_by_value.setdefault(getattr(definition, field_name), []).append(
                row_number
            )
        return [
            f"{prefix}Duplicate {field_name} {value!r}: found in rows {row_numbers}"
            for value, row_numbers in row_numbers_by_value.items()
            if len(row_numbers) > 1
        ]

    return rule


def fields_in_survey_languages(
    info: ValidationInfo, column_prefix_by_field: dict[str, str]
) -> SheetRule[BaseModel]:
    """
    Build a sheet rule: no row has a translated field in a language that isn't a survey
    language (from the validation context `info`), e.g. from a typo such as title_fe.
    Reported once for the table, not on each row.

    `column_prefix_by_field` maps each translated field, a dict by language (see
    row_checks.py::_collect_language_columns), to the prefix of its columns, e.g.
    {"title": "title_"}, to name the unexpected columns. The survey languages are only
    read when a row has a translated value, so a table without any can be built
    without them. Without any language (they were invalid, and reported as such),
    there is nothing to compare to.
    """

    def rule(rows: Sequence[tuple[int, BaseModel]], table_name: str) -> list[str]:
        columns_by_language: dict[str, set[str]] = {}
        for _, definition in rows:
            for field_name, column_prefix in column_prefix_by_field.items():
                for language in getattr(definition, field_name):
                    columns_by_language.setdefault(language, set()).add(
                        column_prefix + language
                    )
        if not columns_by_language:
            return []
        languages = context_languages(info)
        if not languages:
            return []
        other_columns = sorted(
            column
            for language, columns in columns_by_language.items()
            if language not in languages
            for column in columns
        )
        if not other_columns:
            return []
        return [
            f"Error in {table_name} - Unexpected columns: {other_columns}. "
            f"The survey languages are {list(languages)}."
        ]

    return rule
