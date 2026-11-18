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
from survey_definition.sheet_checks import (
    collect_sheet_issues,
    fields_in_survey_languages,
)
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
            `label_one::<language>` columns (written as `<key>_one`). Optional. When
            set in only some languages, the others fall back to `label` (e.g. the
            same French text for one or many), with a warning (see Labels.warnings).
    """

    # Strict: a value must already have the declared type, e.g. a number is rejected
    # for namespace or key instead of being turned into text.
    model_config = ConfigDict(strict=True)

    @model_validator(mode="before")
    @classmethod
    def _prepare_cells(cls, data: Any) -> Any:
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

    # An "after" validator: it checks label once the language columns are gathered.
    @model_validator(mode="after")
    def _label_in_every_survey_language(self, info: ValidationInfo) -> Self:
        """Check that `label` is in every survey language."""
        languages = context_languages(info)
        issues = [
            f"{LABEL_COLUMN_PREFIX}{language} is required"
            for language in languages
            if language not in self.label
        ]
        if issues:
            raise ValueError("; ".join(issues))
        return self


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
        # Report every row's problems at once, instead of stopping at the first one.
        if isinstance(rows, (list, tuple, set, frozenset)):
            rows = list(rows)
            if all(isinstance(row, (dict, LabelDefinition)) for row in rows):
                labels, issues = collect_sheet_issues(
                    rows=rows,
                    model=LabelDefinition,
                    table_name="Labels",
                    context=info.context,
                    # The rows check that no survey language is missing; this rule
                    # checks the other way, that no label is in another language
                    # (e.g. a label::fe typo), reported once for the sheet.
                    sheet_rules=[
                        fields_in_survey_languages(
                            info,
                            {
                                "label": LABEL_COLUMN_PREFIX,
                                "label_one": LABEL_ONE_COLUMN_PREFIX,
                            },
                        )
                    ],
                )
                if issues:
                    raise ValueError("\n".join(issues))
                return handler(labels)
        return handler(rows)

    def warnings(self, languages: Sequence[str]) -> list[str]:
        """
        The problems that don't stop the generation: a row with `label_one` set in some
        of the survey `languages` but not all. It may be intended, e.g. the French text
        is the same for one or many, so the missing ones fall back to `label`.
        """
        warnings: list[str] = []
        for row_number, label in enumerate(self.root, start=2):
            if not label.label_one:
                continue
            missing = [
                f"{LABEL_ONE_COLUMN_PREFIX}{language}"
                for language in languages
                if language not in label.label_one
            ]
            if missing:
                warnings.append(
                    f"Labels row {row_number} ({label.namespace}.{label.key}): "
                    f"label_one is not set in {missing}, so label is used instead "
                    "for one."
                )
        return warnings

    def __iter__(self) -> Iterator[LabelDefinition]:  # type: ignore[override]
        return iter(self.root)

    def __len__(self) -> int:
        return len(self.root)

    def __getitem__(self, index: int) -> LabelDefinition:
        return self.root[index]
