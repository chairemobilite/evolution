# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for survey_definition/sheet_checks.py: collect_sheet_issues and the sheet
# rules shared by every table (see test_sections_definition.py for the Sections ones).

from types import SimpleNamespace

import pytest  # pyright: ignore[reportMissingImports]
from pydantic import BaseModel, ValidationInfo, model_validator

from survey_definition.sheet_checks import (
    collect_sheet_issues,
    fields_in_survey_languages,
    unique_field,
)


class TestCollectSheetIssues:
    # Any model works, not only SectionDefinition: this is what the other tables reuse.
    class _Item(BaseModel):
        name: str
        code: int

    def test_parses_every_row_and_reports_row_errors_with_the_table_name(self):
        rows = [{"name": "a", "code": 1}, {"name": "b"}]
        items, issues = collect_sheet_issues(rows, self._Item, "Items", [])
        assert [item.name for item in items] == ["a"]
        assert issues == [
            "Error in Items - Required field is missing in row 3. "
            "Missing fields: ['code']"
        ]

    def test_runs_every_sheet_rule_on_the_rows_that_parsed(self):
        rows = [
            {"name": "a", "code": 1},
            {"name": "a", "code": 2},
            {"name": "b", "code": 2},
            {"name": "c"},
        ]
        _, issues = collect_sheet_issues(
            rows, self._Item, "Items", [unique_field("name"), unique_field("code")]
        )
        assert issues == [
            "Error in Items - Required field is missing in row 5. "
            "Missing fields: ['code']",
            "Error in Items - Duplicate name 'a': found in rows [2, 3]",
            "Error in Items - Duplicate code 2: found in rows [3, 4]",
        ]


class TestCollectSheetIssuesContext:
    def test_passes_the_context_to_each_row(self):
        class Row(BaseModel):
            value: int

            @model_validator(mode="after")
            def _below_the_limit(self, info: ValidationInfo):
                if self.value > info.context["limit"]:
                    raise ValueError("above the limit")
                return self

        rows, issues = collect_sheet_issues(
            rows=[{"value": 1}, {"value": 5}],
            model=Row,
            table_name="Rows",
            sheet_rules=[],
            context={"limit": 3},
        )
        assert [row.value for row in rows] == [1]
        assert issues == ["Error in Rows - Invalid row 3: above the limit"]


class TestFieldsInSurveyLanguages:
    # Any model with translated fields (dicts by language) works.
    class _Item(BaseModel):
        name: dict[str, str] = {}
        name_one: dict[str, str] = {}

    PREFIXES = {"name": "name::", "name_one": "name_one::"}

    def _issues(self, items: list, context: dict | None) -> list[str]:
        """Run the rule on `items`, numbered from row 2, with the validation `context`."""
        # The rule only reads the info's context, so a stand-in for ValidationInfo does.
        rule = fields_in_survey_languages(
            SimpleNamespace(context=context), self.PREFIXES
        )
        rows = [(row_number, item) for row_number, item in enumerate(items, start=2)]
        return rule(rows, "Items")

    def test_no_issue_when_every_field_is_in_a_survey_language(self):
        items = [self._Item(name={"fr": "a", "en": "b"}, name_one={"fr": "c"})]
        assert self._issues(items, {"languages": ("fr", "en")}) == []

    def test_reports_every_column_in_another_language_once(self):
        items = [
            self._Item(name={"fr": "a", "fe": "b"}),
            self._Item(name={"fe": "c"}, name_one={"es": "d"}),
        ]
        assert self._issues(items, {"languages": ("fr", "en")}) == [
            "Error in Items - Unexpected columns: ['name::fe', 'name_one::es']. "
            "The survey languages are ['fr', 'en']."
        ]

    def test_needs_no_language_without_a_translated_value(self):
        """E.g. an empty table, or rows without a title: the context isn't read."""
        assert self._issues([], None) == []
        assert self._issues([self._Item()], None) == []

    def test_needs_the_survey_languages_for_a_translated_value(self):
        with pytest.raises(RuntimeError, match="survey languages are missing"):
            self._issues([self._Item(name={"fr": "a"})], None)

    def test_no_issue_without_any_survey_language(self):
        """The languages were invalid, and are reported as such: nothing to compare to."""
        assert self._issues([self._Item(name={"fr": "a"})], {"languages": ()}) == []
