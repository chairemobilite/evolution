# Copyright 2026, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

import pytest  # pyright: ignore[reportMissingImports]
from pydantic import ValidationError

from helpers.generator_helpers import (
    INDENT,
    add_mocked_excel_sheet,
    create_mocked_excel_data,
    delete_file_if_exists,
    generate_label_typescript_with_context,
    get_label_context_flags,
    load_survey_definition,
)

MOCKED_EXCEL_FILE = "src/tests/references/test.xlsx"


class TestGetLabelContextFlags:
    def test_returns_all_false_when_no_tokens_present(self):
        assert get_label_context_flags(label_fr="Bonjour", label_en="Hello") == (
            False,
            False,
            False,
            False,
        )

    def test_detects_nickname_token(self):
        assert get_label_context_flags(label_fr="Bonjour {{nickname}}") == (
            True,
            False,
            False,
            False,
        )

    def test_detects_count_token_even_with_spaces(self):
        assert get_label_context_flags(label_en="Hello {{ count }}") == (
            False,
            True,
            False,
            False,
        )

    def test_detects_gender_token_with_or_without_spaces_around_colon(self):
        assert get_label_context_flags(label_fr="Étudian{{gender:t/te/t·e}}") == (
            False,
            False,
            True,
            False,
        )
        assert get_label_context_flags(label_fr="Étudian{{gender : t/te/t·e}}") == (
            False,
            False,
            True,
            False,
        )

    def test_detects_label_one_presence_and_ignores_whitespace_only(self):
        assert get_label_context_flags(label_one_fr="Salut") == (
            False,
            False,
            False,
            True,
        )
        assert get_label_context_flags(label_one_en="   ") == (
            False,
            False,
            False,
            False,
        )

    def test_detects_all_flags_together(self):
        assert get_label_context_flags(
            label_fr="Bonjour **{{nickname}}** ({{count}}) Étudian{{gender:t/te/t·e}}",
            label_one_en="Hi",
        ) == (
            True,
            True,
            True,
            True,
        )


class TestGenerateLabelTypescriptWithContext:
    def test_generates_simple_t_function_when_no_context_needed(self):
        result = generate_label_typescript_with_context(
            property_name="label",
            translation_key="sectionA:foo.bar",
            base_indent=INDENT,
            has_nickname=False,
            has_count=False,
            has_gender_context=False,
            has_label_one=False,
        )
        assert result == f"{INDENT}label: (t: TFunction) => t('sectionA:foo.bar')"

    def test_generates_full_function_with_nickname_context(self):
        result = generate_label_typescript_with_context(
            property_name="label",
            translation_key="sectionA:foo.bar",
            base_indent=INDENT,
            has_nickname=True,
            has_count=False,
            has_gender_context=False,
            has_label_one=False,
        )
        assert f"{INDENT}label: (t: TFunction, interview, path) => {{" in result
        assert (
            f"{INDENT}{INDENT}const activePerson = odSurveyHelpers.getPerson({{ interview, path }});"
            in result
        )
        assert (
            f"{INDENT}{INDENT}const nickname = _escape(activePerson?.nickname || t('survey:noNickname'));"
            in result
        )
        assert f"{INDENT}{INDENT}return t('sectionA:foo.bar', {{" in result
        assert f"{INDENT}{INDENT}{INDENT}nickname," in result

    def test_generates_count_persons_when_label_one_is_present(self):
        result = generate_label_typescript_with_context(
            property_name="label",
            translation_key="sectionB:baz",
            base_indent=INDENT,
            has_nickname=False,
            has_count=False,
            has_gender_context=False,
            has_label_one=True,
        )
        assert (
            f"{INDENT}{INDENT}const countPersons = odSurveyHelpers.countPersons({{ interview }});"
            in result
        )
        assert f"{INDENT}{INDENT}{INDENT}count: countPersons," in result

    def test_uses_provided_gender_context_expression(self):
        result = generate_label_typescript_with_context(
            property_name="text",
            translation_key="sectionC:qux",
            base_indent="",
            has_nickname=False,
            has_count=False,
            has_gender_context=True,
            has_label_one=False,
            gender_context_expression="activePerson?.gender",
        )
        assert "text: (t: TFunction, interview, path) => {" in result
        assert (
            "const activePerson = odSurveyHelpers.getPerson({ interview, path });"
            in result
        )
        assert "context: activePerson?.gender," in result


class TestLoadSurveyDefinition:
    """Tests for load_survey_definition (builds a SurveyDefinition from the Sections and Conditionals sheets)."""

    VALID_SECTIONS_HEADERS = [
        "section",
        "title_fr",
        "title_en",
        "in_nav",
        "template",
        "parent_section",
        "abbreviation",
    ]
    VALID_SECTIONS_ROWS = [["home", "Accueil", "Home", True, "", "", "HM_"]]

    VALID_CONDITIONALS_HEADERS = [
        "conditional_name",
        "logical_operator",
        "path",
        "comparison_operator",
        "value",
        "parentheses",
        "value_when_hidden",
    ]
    VALID_CONDITIONALS_ROWS = [["cond1", "", "household.size", "===", 1, "", ""]]

    def test_valid_file_returns_a_survey_definition(self):
        workbook = create_mocked_excel_data(
            "Sections", self.VALID_SECTIONS_HEADERS, self.VALID_SECTIONS_ROWS
        )
        add_mocked_excel_sheet(
            workbook,
            "Conditionals",
            self.VALID_CONDITIONALS_HEADERS,
            self.VALID_CONDITIONALS_ROWS,
        )
        try:
            survey_definition = load_survey_definition(MOCKED_EXCEL_FILE)
            assert [section.section for section in survey_definition.sections] == [
                "home"
            ]
            assert [
                conditional.conditional_name
                for conditional in survey_definition.conditionals
            ] == ["cond1"]
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_conditionals_sheet_without_value_when_hidden_column_is_valid(self):
        """value_when_hidden is optional: its column doesn't need to exist at all."""
        workbook = create_mocked_excel_data(
            "Sections", self.VALID_SECTIONS_HEADERS, self.VALID_SECTIONS_ROWS
        )
        add_mocked_excel_sheet(
            workbook,
            "Conditionals",
            self.VALID_CONDITIONALS_HEADERS[:-1],  # drop value_when_hidden
            [row[:-1] for row in self.VALID_CONDITIONALS_ROWS],
        )
        try:
            survey_definition = load_survey_definition(MOCKED_EXCEL_FILE)
            assert survey_definition.conditionals[0].value_when_hidden is None
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_missing_sections_sheet_raises(self):
        create_mocked_excel_data(
            "OtherSheet",
            self.VALID_SECTIONS_HEADERS,
            self.VALID_SECTIONS_ROWS,
        )
        try:
            with pytest.raises(
                Exception, match="Sheet with name Sections does not exist"
            ):
                load_survey_definition(MOCKED_EXCEL_FILE)
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_missing_conditionals_sheet_raises(self):
        create_mocked_excel_data(
            "Sections",
            self.VALID_SECTIONS_HEADERS,
            self.VALID_SECTIONS_ROWS,
        )
        try:
            with pytest.raises(
                Exception, match="Sheet with name Conditionals does not exist"
            ):
                load_survey_definition(MOCKED_EXCEL_FILE)
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_invalid_sections_row_raises_validation_error(self):
        workbook = create_mocked_excel_data(
            "Sections",
            self.VALID_SECTIONS_HEADERS,
            [[None, "Accueil", "Home", True, "", "", "HM_"]],
        )
        add_mocked_excel_sheet(
            workbook,
            "Conditionals",
            self.VALID_CONDITIONALS_HEADERS,
            self.VALID_CONDITIONALS_ROWS,
        )
        try:
            with pytest.raises(ValidationError):
                load_survey_definition(MOCKED_EXCEL_FILE)
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)

    def test_invalid_conditionals_row_raises_validation_error(self):
        workbook = create_mocked_excel_data(
            "Sections", self.VALID_SECTIONS_HEADERS, self.VALID_SECTIONS_ROWS
        )
        add_mocked_excel_sheet(
            workbook,
            "Conditionals",
            self.VALID_CONDITIONALS_HEADERS,
            [[None, "", "household.size", "===", 1, "", ""]],
        )
        try:
            with pytest.raises(ValidationError):
                load_survey_definition(MOCKED_EXCEL_FILE)
        finally:
            delete_file_if_exists(MOCKED_EXCEL_FILE)
