# Copyright Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: The base class of every survey definition reader (the Excel file, or a folder
# of CSV files), with the checks on table headers they share, so both sources report
# the same problems with the same messages.
from abc import ABC, abstractmethod
from itertools import takewhile
from typing import Any, List, Sequence

# Prefix of the translated columns the survey languages are read from, in the Widgets
# table: one column per language, e.g. label::fr, label::en.
LANGUAGE_COLUMN_PREFIX = "label::"


def is_empty_value(value: Any) -> bool:
    """A cell with no value or only an empty/whitespace-only string, like row_checks.py's blanks."""
    return value is None or (isinstance(value, str) and not value.strip())


class SurveyDefinitionReader(ABC):
    """
    Reads the survey definition from its source: the survey languages (get_languages)
    and each table as a list of dicts keyed by its headers (get_table).

    `warnings` lists the problems found while reading that don't stop the generation.
    """

    def __init__(self) -> None:
        self.warnings: List[str] = []

    @abstractmethod
    def get_table(
        self,
        table_name: str,
        required_fields: List[str],
        is_table_optional: bool = False,
    ) -> List[dict]:
        """
        Return every row of the table (its first row is the header) as a dict keyed by
        its headers. Raises if the table or one of `required_fields` is missing; with
        `is_table_optional`, a missing table is read as an empty table.
        """

    @abstractmethod
    def get_headers(
        self, table_name: str, expected_headers: Sequence[str] = ()
    ) -> List[Any]:
        """
        Return the values of the table's header row, one per column. Raises if the
        table or one of `expected_headers` is missing, or if a header before the first
        empty one has spaces (see _check_headers).
        """

    def get_languages(self) -> tuple[str, ...]:
        """
        Return the survey languages, one per `label::<language>` header of the Widgets
        table, in column order, e.g. ("fr", "en") for label::fr and label::en.

        The source carries its own languages, so a survey is checked the same way from
        any app or config. Raises if there is no such header.
        """
        languages = tuple(
            header.removeprefix(LANGUAGE_COLUMN_PREFIX)
            for header in self.get_headers("Widgets")
            if isinstance(header, str) and header.startswith(LANGUAGE_COLUMN_PREFIX)
        )
        if not languages:
            raise Exception(
                "Missing label::<language> columns in Widgets sheet: the survey languages "
                "are read from them, e.g. label::fr and label::en."
            )
        return languages

    @staticmethod
    def _check_headers(
        table_name: str, headers: Sequence[Any], expected_headers: Sequence[str] = ()
    ) -> None:
        """
        Raise if a header before the first empty one has spaces, or if one of
        `expected_headers` is missing from `headers`.
        """
        # Text after the first empty header (e.g. a note in a column left apart) is
        # not a header, so it may have spaces.
        for header in takewhile(lambda header: not is_empty_value(header), headers):
            if isinstance(header, str) and " " in header:
                raise Exception(f"Header has spaces in {table_name} sheet: {header!r}")
        for expected in expected_headers:
            if expected not in headers:
                raise Exception(
                    f"Missing expected header in {table_name} sheet: {expected}"
                )
