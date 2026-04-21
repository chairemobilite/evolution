# Copyright 2026, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

from helpers.generator_helpers import (
    INDENT,
    generate_label_typescript_with_context,
    get_label_context_flags,
)


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
