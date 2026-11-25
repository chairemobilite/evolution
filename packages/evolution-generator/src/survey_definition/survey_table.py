# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: SurveyTable, the base class of every table of the survey definition: what all
# the tables share, whatever their rows. Each table's module defines its own rows and
# checks (see sections_definition.py), and survey_definition.py bundles the tables.

from collections.abc import Iterator

from pydantic import BaseModel, RootModel


class SurveyTable[M: BaseModel](RootModel[list[M]]):
    """
    A whole table of the survey definition: a list of rows, one `M` per row, in
    source order. Iterable, indexable and `len()`-able, like the list of its rows.

    Each table defines how its rows are checked. A table is only built if it passes
    them, but it can still have problems that don't reject it: see `warnings`.
    """

    def warnings(self) -> list[str]:
        """
        The problems that don't reject the table, one message each, naming its row. A
        table without any such problem keeps this default, which returns an empty list.
        """
        return []

    def __iter__(self) -> Iterator[M]:  # type: ignore[override]
        return iter(self.root)

    def __len__(self) -> int:
        return len(self.root)

    def __getitem__(self, index: int) -> M:
        return self.root[index]
