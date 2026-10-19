# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for survey_definition/row_checks.py: the field-name and
# row-parsing helpers shared by every table's definition module.

import pytest  # pyright: ignore[reportMissingImports]
from pydantic import BaseModel, ValidationError, model_validator

from survey_definition.row_checks import (
    _collect_language_columns,
    _raise_if_check_fails,
    _strip_blanks,
    format_pydantic_errors,
    check_required_field_names,
)
from survey_definition.sections_definition import (
    SECTION_REQUIRED_FIELD_NAMES,
    SectionDefinition,
)


class TestCheckRequiredFieldNames:
    def test_passes_when_all_required_field_names_present(self):
        # Extra/optional fields are ignored.
        check_required_field_names(
            field_names=list(SECTION_REQUIRED_FIELD_NAMES) + ["someExtraField"],
            expected_field_names=SECTION_REQUIRED_FIELD_NAMES,
            table_name="Sections",
        )

    def test_raises_when_a_required_field_name_is_missing(self):
        # Keep the same field count (so the "too few fields" check doesn't fire
        # instead) but replace one required field name with an unrelated name.
        field_names = [
            name if name != "abbreviation" else "someUnrelatedField"
            for name in SECTION_REQUIRED_FIELD_NAMES
        ]

        with pytest.raises(Exception, match="abbreviation"):
            check_required_field_names(
                field_names=field_names,
                expected_field_names=SECTION_REQUIRED_FIELD_NAMES,
                table_name="Sections",
            )

    def test_raises_when_too_few_field_names(self):
        # The message should name the required fields, not just say "too few".
        with pytest.raises(Exception, match="Too few fields.*abbreviation"):
            check_required_field_names(
                field_names=["section"],
                expected_field_names=SECTION_REQUIRED_FIELD_NAMES,
                table_name="Sections",
            )


class TestStripBlanks:
    def test_drops_none_and_empty_string_values(self):
        assert _strip_blanks({"a": None, "b": "", "c": "kept"}) == {"c": "kept"}

    def test_drops_whitespace_only_strings(self):
        assert _strip_blanks({"a": "   ", "b": "\t", "c": " kept "}) == {"c": " kept "}

    def test_keeps_falsy_values_that_are_not_blank(self):
        # False and 0 are real answers, not blank cells.
        assert _strip_blanks({"a": False, "b": 0}) == {"a": False, "b": 0}

    def test_does_not_modify_the_input(self):
        row = {"a": None, "b": "kept"}
        _strip_blanks(row)
        assert row == {"a": None, "b": "kept"}


class TestRaiseIfCheckFails:
    def test_does_nothing_when_the_check_passes(self):
        def check(value, row):
            """Must be positive."""
            return value > 0

        assert _raise_if_check_fails(check, 1, {}) is None

    def test_raises_with_the_first_docstring_line_as_the_message(self):
        def check(value, row):
            """Must be positive.

            More detail that should not end up in the message.
            """
            return value > 0

        with pytest.raises(ValueError) as error:
            _raise_if_check_fails(check, -1, {})
        assert str(error.value) == "Must be positive."

    def test_falls_back_to_the_function_name_without_a_docstring(self):
        def is_positive(value, row):
            return value > 0

        with pytest.raises(ValueError, match="is_positive"):
            _raise_if_check_fails(is_positive, -1, {})

    def test_passes_the_row_to_the_check(self):
        seen = {}

        def check(value, row):
            """Records the row it was given."""
            seen["row"] = row
            return True

        _raise_if_check_fails(check, "x", {"sibling": 1})
        assert seen["row"] == {"sibling": 1}


class TestFormatPydanticErrors:
    def _validation_error(self, **row) -> ValidationError:
        with pytest.raises(ValidationError) as error:
            SectionDefinition(**row)
        return error.value

    def test_groups_every_missing_field_into_one_message(self):
        issues = format_pydantic_errors(
            self._validation_error(in_nav=False), table_name="Sections", row_number=5
        )
        assert issues == [
            "Error in Sections - Required field is missing in row 5. "
            "Missing fields: ['section', 'abbreviation']"
        ]

    def test_reports_each_other_error_on_its_own(self):
        issues = format_pydantic_errors(
            self._validation_error(section="home", in_nav="yes", abbreviation="HM"),
            table_name="Sections",
            row_number=3,
        )
        assert issues == [
            "Error in Sections - Invalid in_nav in row 3: 'yes' - "
            "Input should be a valid boolean",
            "Error in Sections - Invalid abbreviation in row 3: 'HM' - "
            "Must end with an underscore ('_'), e.g. 'h_'.",
        ]

    def test_puts_the_missing_message_first_then_the_others(self):
        issues = format_pydantic_errors(
            self._validation_error(in_nav="yes"), table_name="Widgets", row_number=9
        )
        assert issues == [
            "Error in Widgets - Required field is missing in row 9. "
            "Missing fields: ['section', 'abbreviation']",
            "Error in Widgets - Invalid in_nav in row 9: 'yes' - "
            "Input should be a valid boolean",
        ]

    def test_reports_a_rule_on_the_whole_row_without_a_field_name(self):
        # A rule between fields (a model validator) belongs to the row itself rather
        # than to one field.
        class Range(BaseModel):
            low: int
            high: int

            @model_validator(mode="after")
            def _low_below_high(self):
                if self.low > self.high:
                    raise ValueError("low must not be above high")
                return self

        with pytest.raises(ValidationError) as error:
            Range(low=2, high=1)
        issues = format_pydantic_errors(error.value, table_name="Ranges", row_number=4)
        assert issues == ["Error in Ranges - Invalid row 4: low must not be above high"]

    def test_names_a_per_language_field_with_its_language(self):
        issues = format_pydantic_errors(
            self._validation_error(
                section="home", in_nav=False, abbreviation="HM_", title_en=True
            ),
            table_name="Sections",
            row_number=2,
        )
        assert issues == [
            "Error in Sections - Invalid title.en in row 2: True - "
            "Input should be a valid string"
        ]


class TestCollectLanguageColumns:
    def test_gathers_the_columns_of_every_language_into_one_dict(self):
        row = {"section": "home", "title_fr": "Accueil", "title_es": "Inicio"}
        assert _collect_language_columns(row, "title", "title_") == {
            "section": "home",
            "title": {"fr": "Accueil", "es": "Inicio"},
        }

    def test_reads_a_number_as_text_but_not_a_bool(self):
        row = {"title_fr": 1, "title_en": 2.5, "title_es": True}
        assert _collect_language_columns(row, "title", "title_")["title"] == {
            "fr": "1",
            "en": "2.5",
            "es": True,
        }

    def test_leaves_a_row_without_such_columns_unchanged(self):
        row = {"section": "home"}
        assert _collect_language_columns(row, "title", "title_") == row
