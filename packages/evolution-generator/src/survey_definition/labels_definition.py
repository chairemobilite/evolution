# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: The Labels table of the survey definition: LabelDefinition, one Pydantic model
# per row, validated on construction; and Labels, the whole checked table. Each row is
# one translation, written to locales/<language>/<namespace>.yaml under its key.
#
# This module only defines the shape and the checks; it does not read any input source.
# See survey_definition.py for the bundle of all tables, and scripts/labels_generator.py
# for the YAML generation.

from collections.abc import Iterator, Sequence
from typing import Any, Self

from pydantic import (
    BaseModel,
    ConfigDict,
    RootModel,
    ValidationInfo,
    model_validator,
)

from survey_definition.row_checks import _collect_language_columns, _strip_blanks
from survey_definition.sheet_checks import SheetRule, collect_sheet_issues
from survey_definition.validation_context import context_languages

# Field names the Labels source must provide. The label columns (one per language)
# aren't listed: a missing one is reported by the rows that need it.
LABEL_REQUIRED_FIELD_NAMES: tuple[str, ...] = ("namespace", "key")

# Prefixes of the translated columns: one per language, e.g. label::fr, label_one::en.
LABEL_COLUMN_PREFIX = "label::"
LABEL_ONE_COLUMN_PREFIX = "label_one::"


class LabelDefinition(BaseModel):
    """
    One row of the Labels table: a translation, validated on construction.

    Input: one row's fields, as keyword arguments or a dict (e.g.
        `LabelDefinition(**row)`, one row of the "Labels" sheet). A blank or
        whitespace-only cell is treated as an absent value.
    Output: a validated instance if every rule passes (see Attributes below);
        otherwise raises `pydantic.ValidationError` naming every field that failed.

    Build instances through `Labels(rows)` (below), which also checks that no row has
    a label in a language that isn't a survey language. The survey languages come from
    the validation context (see validation_context.py), e.g.
    `Labels.model_validate(rows, context={"languages": ("fr", "en")})`. Validation is strict: no type coercion (e.g. a number is rejected for
    `namespace` or `key`).

    Attributes:
        namespace: Translation namespace of this label, i.e. the locales file it is
            written to (locales/<language>/<namespace>.yaml). Required.
        key: Key of this label in its namespace. Required.
        label: The label by language, read from the `label::<language>` columns (e.g.
            {"fr": "Bonjour", "en": "Hello"}). Required, in every survey language.
        label_one: The singular form of the label by language, read from the
            `label_one::<language>` columns (written as `<key>_one`). Optional, but
            when set, it must be in every survey language too.
    """

    # See SectionDefinition.model_config: a value must already have the declared type.
    model_config = ConfigDict(strict=True)

    @model_validator(mode="before")
    @classmethod
    def _strip_blank_cells(cls, data: Any) -> Any:
        """Treat a blank/whitespace-only cell as an absent key, and gather the label::<language> and label_one::<language> columns."""
        if not isinstance(data, dict):
            return data
        data = _collect_language_columns(
            _strip_blanks(data), "label_one", LABEL_ONE_COLUMN_PREFIX
        )
        return _collect_language_columns(data, "label", LABEL_COLUMN_PREFIX)

    # No default: a blank value here is a genuinely missing required value.
    namespace: str
    key: str
    label: dict[str, str]

    label_one: dict[str, str] = {}

    # See SectionDefinition._titles_required_when_in_nav: a rule on several fields,
    # once they are all read.
    @model_validator(mode="after")
    def _labels_in_every_survey_language(self, info: ValidationInfo) -> Self:
        """Check that `label`, and `label_one` when set, are in every survey language."""
        languages = context_languages(info)
        issues = [
            f"{LABEL_COLUMN_PREFIX}{language} is required"
            for language in languages
            if language not in self.label
        ]
        if self.label_one:
            issues.extend(
                f"{LABEL_ONE_COLUMN_PREFIX}{language} is required when label_one "
                "is set in another language"
                for language in languages
                if language not in self.label_one
            )
        if issues:
            raise ValueError("; ".join(issues))
        return self


def _labels_in_survey_languages(info: ValidationInfo) -> SheetRule[LabelDefinition]:
    """
    Build a sheet rule: no row has a label in a language that isn't a survey language
    (from the validation context `info`), e.g. from a typo such as label::fe. Reported
    once for the table, not on each row. Without any row, or any language (they were
    invalid, and reported as such), there is nothing to compare.
    """

    def rule(rows: Sequence[tuple[int, LabelDefinition]], table_name: str) -> list[str]:
        if not rows:
            return []
        languages = context_languages(info)
        if not languages:
            return []
        other_columns = sorted(
            {
                prefix + language
                for _, label in rows
                for prefix, by_language in (
                    (LABEL_COLUMN_PREFIX, label.label),
                    (LABEL_ONE_COLUMN_PREFIX, label.label_one),
                )
                for language in by_language
                if language not in languages
            }
        )
        if not other_columns:
            return []
        return [
            f"Error in {table_name} - Unexpected columns: {other_columns}. "
            f"The survey languages are {list(languages)}."
        ]

    return rule


class Labels(RootModel[list[LabelDefinition]]):
    """
    The whole Labels sheet: a list of LabelDefinition that has passed every check.

    Input: a list (or tuple/set/frozenset) of rows, each either a raw dict (e.g. every
        row of the "Labels" sheet, as read from Excel) or an already-built
        LabelDefinition.
    Output: a validated instance — iterable, indexable, `len()`-able, one
        LabelDefinition per row in source order — if every row passes its rules;
        otherwise raises `pydantic.ValidationError` whose message lists every row
        problem, and the labels in another language than the survey languages, at once.
    """

    @model_validator(mode="wrap")
    @classmethod
    def _collect_all_issues(cls, rows: Any, handler, info: ValidationInfo) -> Any:
        # See Sections._collect_all_issues: report every row's problems at once.
        if isinstance(rows, (list, tuple, set, frozenset)):
            rows = list(rows)
            if all(isinstance(row, (dict, LabelDefinition)) for row in rows):
                labels, issues = collect_sheet_issues(
                    rows=rows,
                    model=LabelDefinition,
                    table_name="Labels",
                    context=info.context,
                    sheet_rules=[_labels_in_survey_languages(info)],
                )
                if issues:
                    raise ValueError("\n".join(issues))
                return handler(labels)
        return handler(rows)

    def __iter__(self) -> Iterator[LabelDefinition]:  # type: ignore[override]
        return iter(self.root)

    def __len__(self) -> int:
        return len(self.root)

    def __getitem__(self, index: int) -> LabelDefinition:
        return self.root[index]
