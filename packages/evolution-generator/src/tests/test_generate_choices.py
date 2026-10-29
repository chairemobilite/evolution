# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for scripts/generate_choices.py.

import os
import pytest

from helpers.generator_helpers import load_survey_definition
from scripts.generate_choices import (
    generate_choices,
    _generate_choices_yaml_locales,
    _generate_import_statements,
)
from survey_definition.choices_definition import Choices
from survey_definition.excel_survey_definition_reader import ExcelSurveyDefinitionReader
from survey_definition.survey_definition import SurveyDefinition

# A conditional the choices of these tests can name, as in the Conditionals table.
IS_ADULT_CONDITIONAL_ROW = {
    "conditional_name": "isAdultConditional",
    "path": "person.age",
    "comparison_operator": ">=",
    "value": 18,
}


def choices_row(
    *,
    choicesName,
    value=None,
    label_fr=None,
    label_en=None,
    label_one_fr=None,
    label_one_en=None,
    spreadChoicesName=None,
    conditional=None,
    hidden=None,
) -> dict:
    """
    Build a `Choices` row, keyed by the sheet's column names, using named parameters
    so the test data is easy to review.
    """
    return {
        "choicesName": choicesName,
        "value": value,
        "label::fr": label_fr,
        "label::en": label_en,
        "label_one::fr": label_one_fr,
        "label_one::en": label_one_en,
        "spreadChoicesName": spreadChoicesName,
        "conditional": conditional,
        "hidden": hidden,
    }


def survey_definition_with_choices(*rows: dict) -> SurveyDefinition:
    """A SurveyDefinition holding these Choices rows (and a conditional they may name)."""
    return SurveyDefinition(
        languages=("fr", "en"),
        conditionals=[IS_ADULT_CONDITIONAL_ROW],
        choices=list(rows),
    )


@pytest.fixture()
def output_paths(tmp_path):
    """
    Per-test output paths for generated artifacts.

    This fixture does not create files; it only returns paths under pytest's
    `tmp_path` for the generator to write into.

    `tmp_path` is a pytest-provided temporary directory unique to the test (under
    pytest's temp root). Pytest cleans it up automatically, so we don't need
    explicit deletion of generated outputs written there.
    """
    return {
        "choices_tsx_path": str(tmp_path / "choices.tsx"),
        "locales_dir_path": str(tmp_path / "locales"),
        "en_choices_yaml_path": str(tmp_path / "locales" / "en" / "choices.yaml"),
        "fr_choices_yaml_path": str(tmp_path / "locales" / "fr" / "choices.yaml"),
    }


def read_file(path: str) -> str:
    with open(path, mode="r", encoding="utf-8") as file:
        return file.read()


class TestGenerateChoices:
    """Tests for the public entry point generate_choices(survey_definition, output_file, ...)."""

    def test_generates_choices_from_demo_excel_if_present(self, output_paths):
        """
        Optional end-to-end sanity test on the real demo spreadsheet (skipped if absent).

        Purpose: catch regressions that only show up on real-world inputs, without making
        CI brittle when the demo file isn't present in the checkout.
        """
        demo_input = os.path.normpath(
            os.path.join(
                os.path.dirname(__file__),
                "../../../../example/demo_generator/references/Household_Travel_Generate_Survey.xlsx",
            )
        )
        if not os.path.isfile(demo_input):
            pytest.skip(f"Demo generator file not found: {demo_input}")

        generate_choices(
            load_survey_definition(ExcelSurveyDefinitionReader(demo_input)),
            output_paths["choices_tsx_path"],
            labels_output_folder_path=output_paths["locales_dir_path"],
        )

        assert os.path.isfile(output_paths["choices_tsx_path"])
        assert os.path.isfile(output_paths["en_choices_yaml_path"])
        assert os.path.isfile(output_paths["fr_choices_yaml_path"])

    def test_generates_typescript_and_locales_yaml_and_preserves_order(
        self, output_paths
    ):
        survey_definition = survey_definition_with_choices(
            choices_row(
                choicesName="yesNoChoices", value="yes", label_fr="Oui", label_en="Yes"
            ),
            choices_row(
                choicesName="yesNoChoices", value="no", label_fr="Non", label_en="No"
            ),
            choices_row(
                choicesName="busCarTransport",
                value="bus",
                label_fr="Autobus",
                label_en="Bus",
            ),
            choices_row(
                choicesName="busCarTransport",
                value="car",
                label_fr="Voiture",
                label_en="Car",
            ),
            # spread row (no values/labels)
            choices_row(
                choicesName="transportModesChoices",
                spreadChoicesName="busCarTransport",
            ),
            choices_row(
                choicesName="transportModesChoices",
                value="metro",
                label_fr="Métro",
                label_en="Metro",
            ),
        )

        generate_choices(
            survey_definition,
            output_paths["choices_tsx_path"],
            labels_output_folder_path=output_paths["locales_dir_path"],
        )

        assert os.path.isfile(output_paths["choices_tsx_path"])
        assert os.path.isfile(output_paths["en_choices_yaml_path"])
        assert os.path.isfile(output_paths["fr_choices_yaml_path"])

        ts_code = read_file(output_paths["choices_tsx_path"])
        assert (
            "import { type ChoiceType } from 'evolution-common/lib/services/questionnaire/types';"
            in ts_code
        )
        assert "import { TFunction } from 'i18next';" in ts_code
        # Labels should use i18n translations (choices namespace)
        assert "label: (t: TFunction) => t('choices:yesNoChoices.yes')" in ts_code
        assert "label: (t: TFunction) => t('choices:yesNoChoices.no')" in ts_code
        # Without any conditional, both imports stay commented out
        assert "// import * as conditionals from './conditionals';" in ts_code
        assert (
            "// import * as customConditionals from './customConditionals';" in ts_code
        )

        en_yaml = read_file(output_paths["en_choices_yaml_path"])

        # YAML order should follow source row order (choicesName first appearance)
        idx_yes_no = en_yaml.find("\nyesNoChoices:\n")
        idx_bus_car = en_yaml.find("\nbusCarTransport:\n")
        idx_transport_modes = en_yaml.find("\ntransportModesChoices:\n")
        assert idx_yes_no != -1 and idx_bus_car != -1 and idx_transport_modes != -1
        assert idx_yes_no < idx_bus_car < idx_transport_modes

        # Values within a group should follow source row order
        idx_yes = en_yaml.find("\n    yes: Yes\n")
        idx_no = en_yaml.find("\n    no: No\n")
        assert idx_yes != -1 and idx_no != -1 and idx_yes < idx_no

    def test_hidden_and_conditionals_are_written(self, output_paths):
        """
        Realistic behavior checks:
        - hidden => hidden: true in TS output
        - conditional => correct namespace prefix (conditionals vs customConditionals)
        """
        survey_definition = survey_definition_with_choices(
            choices_row(
                choicesName="aChoices",
                value="a",
                label_fr="A fr",
                label_en="A en",
                conditional="isAdultConditional",
                hidden=True,
            ),
            choices_row(
                choicesName="aChoices",
                value="b",
                label_fr="B fr",
                label_en="B en",
                conditional="fooCustomConditional",
                hidden=False,
            ),
        )

        generate_choices(survey_definition, output_paths["choices_tsx_path"])

        ts_code = read_file(output_paths["choices_tsx_path"])
        assert ts_code.count("hidden: true") == 1
        assert "conditional: conditionals.isAdultConditional" in ts_code
        assert "conditional: customConditionals.fooCustomConditional" in ts_code
        assert "import * as conditionals from './conditionals';" in ts_code
        assert "// import * as conditionals from './conditionals';" not in ts_code
        assert "import * as customConditionals from './customConditionals';" in ts_code
        assert (
            "// import * as customConditionals from './customConditionals';"
            not in ts_code
        )

    def test_typescript_label_supports_nickname_count_and_gender_context(
        self, output_paths
    ):
        """
        If the choice labels contain {{nickname}}, {{count}} or {{gender:...}},
        the generated TS should:
        - import odSurveyHelpers (and lodash/escape for nickname)
        - generate a TranslatableStringFunction label (t, interview, path) => ...
        - pass nickname / count / context to t(...)
        """
        survey_definition = survey_definition_with_choices(
            choices_row(
                choicesName="greetingChoices",
                value="hello",
                label_fr="Bonjour **{{nickname}}** ({{count}}) Étudian{{gender:t/te/t·e}}",
                label_en="Hello **{{nickname}}** ({{count}}) Student{{gender:/ess/}}",
                label_one_fr="Salut **{{nickname}}**",
                label_one_en="Hi **{{nickname}}**",
            )
        )

        generate_choices(survey_definition, output_paths["choices_tsx_path"])

        ts_code = read_file(output_paths["choices_tsx_path"])
        assert (
            "import * as odSurveyHelpers from 'evolution-common/lib/services/odSurvey/helpers';"
            in ts_code
        )
        assert "import _escape from 'lodash/escape';" in ts_code
        assert "label: (t: TFunction, interview, path) => {" in ts_code
        assert (
            "const activePerson = odSurveyHelpers.getPerson({ interview, path });"
            in ts_code
        )
        assert (
            "const countPersons = odSurveyHelpers.countPersons({ interview });"
            in ts_code
        )
        assert (
            "context: activePerson?.gender || activePerson?.sexAssignedAtBirth"
            in ts_code
        )
        assert "count: countPersons" in ts_code
        assert "nickname," in ts_code

    def test_generates_spread_rows_into_typescript_array(self, output_paths):
        survey_definition = survey_definition_with_choices(
            choices_row(
                choicesName="baseChoices", value="a", label_fr="A fr", label_en="A en"
            ),
            choices_row(choicesName="combinedChoices", spreadChoicesName="baseChoices"),
            choices_row(
                choicesName="combinedChoices",
                value="b",
                label_fr="B fr",
                label_en="B en",
            ),
        )

        generate_choices(survey_definition, output_paths["choices_tsx_path"])

        ts_code = read_file(output_paths["choices_tsx_path"])
        assert "export const combinedChoices: ChoiceType[] = [" in ts_code
        assert "...baseChoices" in ts_code

    def test_writes_a_non_string_value_as_a_string(self, output_paths):
        survey_definition = survey_definition_with_choices(
            choices_row(
                choicesName="countChoices", value=1, label_fr="1", label_en="1"
            ),
            choices_row(
                choicesName="countChoices", value=True, label_fr="Oui", label_en="Yes"
            ),
        )

        generate_choices(survey_definition, output_paths["choices_tsx_path"])

        ts_code = read_file(output_paths["choices_tsx_path"])
        assert "value: '1'," in ts_code
        assert "value: 'True'," in ts_code

    def test_rejects_invalid_output_file_extension(self):
        with pytest.raises(Exception) as e_info:
            generate_choices(SurveyDefinition(languages=("fr", "en")), "choices.txt")
        assert (
            str(e_info.value)
            == "Invalid output file extension for choices.txt : must be an TypeScript .ts or .tsx file"
        )


class TestGenerateChoicesYamlLocales:
    """Tests for _generate_choices_yaml_locales(choices_by_name, languages, labels_output_folder_path)."""

    def _generate(self, output_paths, *rows: dict, languages=("fr", "en")):
        _generate_choices_yaml_locales(
            Choices.model_validate(
                list(rows), context={"languages": languages}
            ).by_name(),
            languages=languages,
            labels_output_folder_path=output_paths["locales_dir_path"],
        )

    def test_skips_spread_only_groups(self, output_paths):
        """
        If a choicesName only spreads another group and has no concrete values, it should
        not appear in locales/*/choices.yaml (no empty {} blocks).
        """
        self._generate(
            output_paths,
            choices_row(
                choicesName="baseChoices", value="a", label_fr="A fr", label_en="A en"
            ),
            # spread-only: should be skipped from YAML output
            choices_row(
                choicesName="spreadOnlyChoices", spreadChoicesName="baseChoices"
            ),
        )

        en_yaml = read_file(output_paths["en_choices_yaml_path"])
        assert "\nbaseChoices:\n" in en_yaml
        assert "\nspreadOnlyChoices:\n" not in en_yaml

    def test_writes_one_file_per_survey_language(self, output_paths):
        """The survey languages decide the locales files, e.g. Spanish and English."""
        self._generate(
            output_paths,
            {
                "choicesName": "yesNo",
                "value": "yes",
                "label::es": "Sí",
                "label::en": "Yes",
            },
            languages=("es", "en"),
        )

        assert sorted(os.listdir(output_paths["locales_dir_path"])) == ["en", "es"]
        es_yaml = read_file(
            os.path.join(output_paths["locales_dir_path"], "es", "choices.yaml")
        )
        assert "\nyesNo:\n    yes: Sí\n" in es_yaml

    def test_choices_yaml_applies_label_formatter_bold_and_keeps_interpolation_tokens(
        self, output_paths
    ):
        """
        End-to-end: labels go through LabelFormatter (e.g. **Hello** -> <strong>Hello</strong>)
        and i18next interpolation tokens like {{nickname}} stay readable.
        """
        survey_definition = survey_definition_with_choices(
            choices_row(
                choicesName="greetingChoices",
                value="hello",
                label_fr="**Hello** {{nickname}}",
                label_en="**Hello** {{nickname}}",
            )
        )

        generate_choices(
            survey_definition,
            output_paths["choices_tsx_path"],
            labels_output_folder_path=output_paths["locales_dir_path"],
        )

        fr_yaml = read_file(output_paths["fr_choices_yaml_path"])
        assert "\ngreetingChoices:\n" in fr_yaml
        assert "hello: <strong>Hello</strong> {{nickname}}" in fr_yaml

    def test_choices_yaml_supports_gendered_labels(self, output_paths):
        """
        If a choice label contains {{gender:...}}, locales/*/choices.yaml should include:
        - the base key using the "other" form
        - gender-specific keys only when they differ from "other"
        """
        self._generate(
            output_paths,
            choices_row(
                choicesName="studentChoices",
                value="student",
                # male: Étudiant, female: Étudiante, custom/other: Étudiant·e
                label_fr="Étudian{{gender:t/te/t·e}}",
                # I know it's not grammatically correct, but it's just a test
                label_en="Student{{gender:/ess/}}",
            ),
        )

        fr_yaml = read_file(output_paths["fr_choices_yaml_path"])
        assert "\nstudentChoices:\n" in fr_yaml
        # base key is the "other" form
        assert "\n    student: Étudiant·e\n" in fr_yaml
        # gender-specific keys only when they differ from "other"
        assert "\n    student_male: Étudiant\n" in fr_yaml
        assert "\n    student_female: Étudiante\n" in fr_yaml
        assert "\n    student_custom:" not in fr_yaml

        en_yaml = read_file(output_paths["en_choices_yaml_path"])
        assert "\nstudentChoices:\n" in en_yaml
        # male/custom/other are "" for a 1-part gender expression, female is "ess"
        assert "\n    student: Student\n" in en_yaml
        assert "\n    student_female: Studentess\n" in en_yaml
        assert "\n    student_male:" not in en_yaml
        assert "\n    student_custom:" not in en_yaml

    def test_choices_yaml_supports_label_one(self, output_paths):
        self._generate(
            output_paths,
            choices_row(
                choicesName="greetingChoices",
                value="hello",
                label_fr="Bonjour",
                label_en="Hello",
                label_one_fr="Salut",
                label_one_en="Hi",
            ),
        )

        en_yaml = read_file(output_paths["en_choices_yaml_path"])
        assert "\ngreetingChoices:\n" in en_yaml
        assert "\n    hello: Hello\n" in en_yaml
        assert "\n    hello_one: Hi\n" in en_yaml


class TestGenerateImportStatements:
    """Tests for generate_import_statements(has_conditionals_import, has_custom_conditionals_import)."""

    @pytest.mark.parametrize(
        "case",
        [
            pytest.param(
                {
                    "has_conditionals_import": False,
                    "has_custom_import": False,
                    "expected_lines": [
                        "// import * as conditionals from './conditionals';",
                        "// import * as customConditionals from './customConditionals';",
                    ],
                },
                id="both_commented_out_when_unused",
            ),
            pytest.param(
                {
                    "has_conditionals_import": True,
                    "has_custom_import": False,
                    "expected_lines": [
                        "import * as conditionals from './conditionals';",
                        "// import * as customConditionals from './customConditionals';",
                    ],
                },
                id="conditionals_enabled_custom_commented_out",
            ),
            pytest.param(
                {
                    "has_conditionals_import": False,
                    "has_custom_import": True,
                    "expected_lines": [
                        "// import * as conditionals from './conditionals';",
                        "import * as customConditionals from './customConditionals';",
                    ],
                },
                id="custom_enabled_conditionals_commented_out",
            ),
        ],
    )
    def test_import_lines_match_flags(self, case):
        code = _generate_import_statements(
            case["has_conditionals_import"], case["has_custom_import"]
        )
        assert (
            "import { type ChoiceType } from 'evolution-common/lib/services/questionnaire/types';"
            in code
        )
        for line in case["expected_lines"]:
            assert line in code
