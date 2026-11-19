# Copyright Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script tests the generate_UI_tests function.
from scripts.generate_UI_tests import generate_UI_tests
from survey_definition.survey_definition import SurveyDefinition


class TestGenerateUITests:
    """Tests for the public entry point generate_UI_tests(survey_definition, output_file)."""

    def _generate(self, tmp_path, widgets: list[dict]) -> str:
        """Generate the UI tests template for `widgets` in a home section and return its content."""
        output_file = tmp_path / "common-UI-tests-helpers-template.ts"
        survey_definition = SurveyDefinition(
            languages=["fr"],
            sections=[{"section": "home", "in_nav": False, "abbreviation": "HM_"}],
            widgets=[
                {"active": True, "section": "home", "label::fr": "Libellé", **widget}
                for widget in widgets
            ],
        )
        generate_UI_tests(survey_definition, str(output_file))
        return output_file.read_text(encoding="utf-8")

    def test_conditional_input_widget_gets_an_input_visible_test(self, tmp_path):
        code = self._generate(
            tmp_path,
            [
                {
                    "question_name": "homeName",
                    "input_type": "String",
                    "path": "home.name",
                    "conditional": "hasHomeCustomConditional",
                }
            ],
        )
        assert (
            "testHelpers.inputVisibleTest({ context, path: 'home.name', isVisible: true });"
            in code
        )

    def test_conditional_text_widget_only_gets_a_text_visible_test(self, tmp_path):
        """A text widget has no input with its path, so only its text visibility is tested."""
        code = self._generate(
            tmp_path,
            [
                {
                    "question_name": "activePersonTitle",
                    "input_type": "InfoText",
                    "path": "activePersonTitle",
                    "conditional": "hasHomeCustomConditional",
                }
            ],
        )
        assert "inputVisibleTest" not in code
        assert "testHelpers.waitTextVisible({ context, text: '?' });" in code
