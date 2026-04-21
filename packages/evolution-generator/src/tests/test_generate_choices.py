# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for scripts/generate_choices.py.

import os
import pytest

from helpers.generator_helpers import create_mocked_excel_data, delete_file_if_exists
from scripts.generate_choices import (
    generate_choices,
    _generate_choices_yaml_locales,
    _generate_import_statements,
)

# Path where create_mocked_excel_data writes the workbook; we delete it after each test.
MOCKED_EXCEL_FILE = "src/tests/references/test.xlsx"


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
):
    """
    Build a mocked Excel row for the `Choices` sheet using named parameters so
    the test data is easy to review.
    """
    return [
        choicesName,
        value,
        label_fr,
        label_en,
        label_one_fr,
        label_one_en,
        spreadChoicesName,
        conditional,
    ]


def choices_row_with_hidden(*, hidden, **kwargs):
    """
    Same as `choices_row`, but appends the `hidden` column (when tests include it).
    """
    return [*choices_row(**kwargs), hidden]


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


# Cleanup the mocked workbook (fixed path) and any output artifacts automatically after each test.
@pytest.fixture(autouse=True)
def cleanup_mocked_excel_file():
    """
    Ensure the mocked workbook written by create_mocked_excel_data (fixed path)
    is deleted after each test.
    """
    # In a pytest "yield fixture", code before `yield` runs before the test
    # (setup) and code after `yield` runs after the test (teardown), even if the
    # test fails.
    yield
    delete_file_if_exists(MOCKED_EXCEL_FILE)


class TestGenerateChoices:
    """Tests for the public entry point generate_choices(input_file, output_file, ...)."""

    SHEET_NAME = "Choices"
    EXPECTED_HEADERS = [
        "choicesName",
        "value",
        "label::fr",
        "label::en",
        "label_one::fr",
        "label_one::en",
        "spreadChoicesName",
        "conditional",
    ]

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
            demo_input,
            output_paths["choices_tsx_path"],
            labels_output_folder_path=output_paths["locales_dir_path"],
        )

        assert os.path.isfile(output_paths["choices_tsx_path"])
        assert os.path.isfile(output_paths["en_choices_yaml_path"])
        assert os.path.isfile(output_paths["fr_choices_yaml_path"])

    def test_generates_typescript_and_locales_yaml_and_preserves_order(
        self, output_paths
    ):
        rows = [
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
        ]
        create_mocked_excel_data(self.SHEET_NAME, self.EXPECTED_HEADERS, rows)

        generate_choices(
            MOCKED_EXCEL_FILE,
            output_paths["choices_tsx_path"],
            labels_output_folder_path=output_paths["locales_dir_path"],
        )

        assert os.path.isfile(output_paths["choices_tsx_path"])
        assert os.path.isfile(output_paths["en_choices_yaml_path"])
        assert os.path.isfile(output_paths["fr_choices_yaml_path"])

        with open(
            output_paths["choices_tsx_path"], mode="r", encoding="utf-8"
        ) as ts_file:
            ts_code = ts_file.read()
        assert (
            "import { type ChoiceType } from 'evolution-common/lib/services/questionnaire/types';"
            in ts_code
        )
        assert "import { TFunction } from 'i18next';" in ts_code
        # Labels should use i18n translations (choices namespace)
        assert "label: (t: TFunction) => t('choices:yesNoChoices.yes')" in ts_code
        assert "label: (t: TFunction) => t('choices:yesNoChoices.no')" in ts_code

        with open(
            output_paths["en_choices_yaml_path"], mode="r", encoding="utf-8"
        ) as f:
            en_yaml = f.read()

        # YAML order should follow Excel row order (choicesName first appearance)
        idx_yes_no = en_yaml.find("\nyesNoChoices:\n")
        idx_bus_car = en_yaml.find("\nbusCarTransport:\n")
        idx_transport_modes = en_yaml.find("\ntransportModesChoices:\n")
        assert idx_yes_no != -1 and idx_bus_car != -1 and idx_transport_modes != -1
        assert idx_yes_no < idx_bus_car < idx_transport_modes

        # Values within a group should follow Excel row order
        idx_yes = en_yaml.find("\n    yes: Yes\n")
        idx_no = en_yaml.find("\n    no: No\n")
        assert idx_yes != -1 and idx_no != -1 and idx_yes < idx_no

    def test_hidden_and_conditionals_are_written(self, output_paths):
        """
        Realistic behavior checks:
        - hidden => hidden: true in TS output
        - conditional => correct namespace prefix (conditionals vs customConditionals)
        """
        headers = [*self.EXPECTED_HEADERS, "hidden"]
        rows = [
            choices_row_with_hidden(
                choicesName="aChoices",
                value="a",
                label_fr="A fr",
                label_en="A en",
                conditional="isAdult",
                hidden=True,
            ),
            choices_row_with_hidden(
                choicesName="aChoices",
                value="b",
                label_fr="B fr",
                label_en="B en",
                conditional="fooCustomConditional",
                hidden=False,
            ),
        ]
        create_mocked_excel_data(self.SHEET_NAME, headers, rows)

        generate_choices(MOCKED_EXCEL_FILE, output_paths["choices_tsx_path"])

        with open(
            output_paths["choices_tsx_path"], mode="r", encoding="utf-8"
        ) as ts_file:
            ts_code = ts_file.read()

        assert "hidden: true" in ts_code
        assert "conditional: conditionals.isAdult" in ts_code
        assert "conditional: customConditionals.fooCustomConditional" in ts_code

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
        rows = [
            choices_row(
                choicesName="greetingChoices",
                value="hello",
                label_fr="Bonjour **{{nickname}}** ({{count}}) Étudian{{gender:t/te/t·e}}",
                label_en="Hello **{{nickname}}** ({{count}}) Student{{gender:/ess/}}",
                label_one_fr="Salut **{{nickname}}**",
                label_one_en="Hi **{{nickname}}**",
            )
        ]
        create_mocked_excel_data(self.SHEET_NAME, self.EXPECTED_HEADERS, rows)

        generate_choices(MOCKED_EXCEL_FILE, output_paths["choices_tsx_path"])

        with open(
            output_paths["choices_tsx_path"], mode="r", encoding="utf-8"
        ) as ts_file:
            ts_code = ts_file.read()

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

    def test_invalid_row_with_missing_choices_name_raises(self, output_paths):
        rows = [
            choices_row(choicesName="", value="yes", label_fr="Oui", label_en="Yes"),
            choices_row(choicesName=None, value="no", label_fr="Non", label_en="No"),
        ]
        create_mocked_excel_data(self.SHEET_NAME, self.EXPECTED_HEADERS, rows)

        with pytest.raises(Exception) as e_info:
            generate_choices(MOCKED_EXCEL_FILE, output_paths["choices_tsx_path"])
        assert str(e_info.value) == "Invalid row data in Choices sheet"

    def test_generates_spread_rows_into_typescript_array(self, output_paths):
        rows = [
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
        ]
        create_mocked_excel_data(self.SHEET_NAME, self.EXPECTED_HEADERS, rows)

        generate_choices(MOCKED_EXCEL_FILE, output_paths["choices_tsx_path"])

        with open(
            output_paths["choices_tsx_path"], mode="r", encoding="utf-8"
        ) as ts_file:
            ts_code = ts_file.read()

        assert "export const combinedChoices: ChoiceType[] = [" in ts_code
        assert "...baseChoices" in ts_code

    def test_imports_are_uncommented_when_any_choice_has_conditional(
        self, output_paths
    ):
        rows = [
            choices_row(
                choicesName="aChoices",
                value="a",
                label_fr="A fr",
                label_en="A en",
                conditional="isAdult",
            )
        ]
        create_mocked_excel_data(self.SHEET_NAME, self.EXPECTED_HEADERS, rows)

        generate_choices(MOCKED_EXCEL_FILE, output_paths["choices_tsx_path"])

        with open(
            output_paths["choices_tsx_path"], mode="r", encoding="utf-8"
        ) as ts_file:
            ts_code = ts_file.read()

        assert "import * as conditionals from './conditionals';" in ts_code
        assert "// import * as conditionals from './conditionals';" not in ts_code

    def test_imports_are_uncommented_when_any_choice_has_custom_conditional(
        self, output_paths
    ):
        rows = [
            choices_row(
                choicesName="aChoices",
                value="a",
                label_fr="A fr",
                label_en="A en",
                conditional="fooCustomConditional",
            )
        ]
        create_mocked_excel_data(self.SHEET_NAME, self.EXPECTED_HEADERS, rows)

        generate_choices(MOCKED_EXCEL_FILE, output_paths["choices_tsx_path"])

        with open(
            output_paths["choices_tsx_path"], mode="r", encoding="utf-8"
        ) as ts_file:
            ts_code = ts_file.read()

        assert "import * as customConditionals from './customConditionals';" in ts_code
        assert (
            "// import * as customConditionals from './customConditionals';"
            not in ts_code
        )

    @pytest.mark.parametrize(
        "case",
        [
            pytest.param(
                {
                    "input_file": "src/tests/references/test.csv",
                    "output_file": "choices.tsx",
                    "expected_error": "Invalid input file extension for src/tests/references/test.csv : must be an Excel 2010+ .xlsx, .xlsm, .xltx or .xltm file",
                },
                id="invalid_input_extension",
            ),
            pytest.param(
                {
                    "input_file": MOCKED_EXCEL_FILE,
                    "output_file": "choices.txt",
                    "expected_error": "Invalid output file extension for choices.txt : must be an TypeScript .ts or .tsx file",
                },
                id="invalid_output_extension",
            ),
        ],
    )
    def test_rejects_invalid_file_extensions(self, case):
        with pytest.raises(Exception) as e_info:
            generate_choices(case["input_file"], case["output_file"])
        assert str(e_info.value) == case["expected_error"]

    def test_missing_sheet_raises(self, output_paths):
        create_mocked_excel_data(
            self.SHEET_NAME + "Bad", self.EXPECTED_HEADERS, [["x"]]
        )
        with pytest.raises(Exception) as e_info:
            generate_choices(MOCKED_EXCEL_FILE, output_paths["choices_tsx_path"])
        assert str(e_info.value) == "Sheet with name Choices does not exist"

    def test_missing_expected_header_raises(self, output_paths):
        bad_headers = [
            "choicesNameBad",  # Bad header name, it should be choicesName
            "value",
            "label::fr",
            "label::en",
            "label_one::fr",
            "label_one::en",
            "spreadChoicesName",
            "conditional",
        ]
        rows = [
            choices_row(
                choicesName="yesNoChoices", value="yes", label_fr="Oui", label_en="Yes"
            )
        ]
        create_mocked_excel_data(self.SHEET_NAME, bad_headers, rows)
        with pytest.raises(Exception) as e_info:
            generate_choices(MOCKED_EXCEL_FILE, output_paths["choices_tsx_path"])
        assert (
            str(e_info.value) == "Missing expected header in Choices sheet: choicesName"
        )

    def test_invalid_row_data_raises(self, output_paths):
        # Invalid: missing both value and spreadChoicesName
        rows = [choices_row(choicesName="yesNoChoices", label_fr="Oui", label_en="Yes")]
        create_mocked_excel_data(self.SHEET_NAME, self.EXPECTED_HEADERS, rows)
        with pytest.raises(Exception) as e_info:
            generate_choices(MOCKED_EXCEL_FILE, output_paths["choices_tsx_path"])
        assert str(e_info.value) == "Invalid row data in Choices sheet"


class TestGenerateChoicesYamlLocales:
    """Tests for _generate_choices_yaml_locales(choices_by_name, labels_output_folder_path)."""

    def test_skips_spread_only_groups(self, output_paths):
        """
        If a choicesName only spreads another group and has no concrete values, it should
        not appear in locales/*/choices.yaml (no empty {} blocks).
        """
        choices_by_name = {
            "baseChoices": [
                {
                    "value": "a",
                    "label_yaml": {"fr": "A fr", "en": "A en"},
                    "spread_choices_name": None,
                    "hidden": False,
                }
            ],
            # spread-only: should be skipped from YAML output
            "spreadOnlyChoices": [
                {
                    "value": None,
                    "label_yaml": {"fr": None, "en": None},
                    "spread_choices_name": "baseChoices",
                    "hidden": False,
                }
            ],
        }

        _generate_choices_yaml_locales(
            choices_by_name,
            labels_output_folder_path=output_paths["locales_dir_path"],
        )

        with open(
            output_paths["en_choices_yaml_path"], mode="r", encoding="utf-8"
        ) as f:
            en_yaml = f.read()

        assert "\nbaseChoices:\n" in en_yaml
        assert "\nspreadOnlyChoices:\n" not in en_yaml

    def test_writes_only_languages_with_non_empty_values(self, output_paths):
        choices_by_name = {
            "onlyFrench": [
                {
                    "value": "a",
                    "label_yaml": {"fr": "Bonjour", "en": None},
                    "spread_choices_name": None,
                    "hidden": False,
                }
            ]
        }

        _generate_choices_yaml_locales(
            choices_by_name,
            labels_output_folder_path=output_paths["locales_dir_path"],
        )

        assert os.path.isfile(output_paths["fr_choices_yaml_path"])
        assert not os.path.isfile(output_paths["en_choices_yaml_path"])

        with open(
            output_paths["fr_choices_yaml_path"], mode="r", encoding="utf-8"
        ) as f:
            fr_yaml = f.read()
        assert "\nonlyFrench:\n" in fr_yaml
        assert "\n    a:" in fr_yaml

    def test_omits_values_with_none_value_cell(self, output_paths):
        choices_by_name = {
            "mixed": [
                {
                    "value": None,
                    "label_yaml": {
                        "fr": "Should not appear",
                        "en": "Should not appear",
                    },
                    "spread_choices_name": None,
                    "hidden": False,
                },
                {
                    "value": "ok",
                    "label_yaml": {"fr": "OK", "en": "OK"},
                    "spread_choices_name": None,
                    "hidden": False,
                },
            ]
        }

        _generate_choices_yaml_locales(
            choices_by_name,
            labels_output_folder_path=output_paths["locales_dir_path"],
        )

        with open(
            output_paths["en_choices_yaml_path"], mode="r", encoding="utf-8"
        ) as f:
            en_yaml = f.read()

        assert "\nmixed:\n" in en_yaml
        assert "\n    ok: OK\n" in en_yaml
        assert "\n    null:" not in en_yaml
        assert "\n    None:" not in en_yaml

    def test_choices_yaml_applies_label_formatter_bold_and_keeps_interpolation_tokens(
        self, output_paths
    ):
        """
        End-to-end: labels in Excel go through LabelFormatter (e.g. **Hello** -> <strong>Hello</strong>)
        and i18next interpolation tokens like {{nickname}} stay readable.
        """
        headers = TestGenerateChoices.EXPECTED_HEADERS
        rows = [
            choices_row(
                choicesName="greetingChoices",
                value="hello",
                label_fr="**Hello** {{nickname}}",
                label_en="**Hello** {{nickname}}",
            )
        ]
        create_mocked_excel_data(TestGenerateChoices.SHEET_NAME, headers, rows)

        generate_choices(
            MOCKED_EXCEL_FILE,
            output_paths["choices_tsx_path"],
            labels_output_folder_path=output_paths["locales_dir_path"],
        )

        with open(
            output_paths["fr_choices_yaml_path"], mode="r", encoding="utf-8"
        ) as f:
            fr_yaml = f.read()

        assert "\ngreetingChoices:\n" in fr_yaml
        assert "hello: <strong>Hello</strong> {{nickname}}" in fr_yaml

    def test_choices_yaml_supports_gendered_labels(self, output_paths):
        """
        If a choice label contains {{gender:...}}, locales/*/choices.yaml should include:
        - the base key using the "other" form
        - gender-specific keys only when they differ from "other"
        """
        choices_by_name = {
            "studentChoices": [
                {
                    "value": "student",
                    # male: Étudiant, female: Étudiante, custom/other: Étudiant·e
                    "label_yaml": {
                        "fr": "Étudian{{gender:t/te/t·e}}",
                        "en": "Student{{gender:/ess/}}",  # I know it's not grammatically correct, but it's just a test
                    },
                    "spread_choices_name": None,
                    "hidden": False,
                }
            ]
        }

        _generate_choices_yaml_locales(
            choices_by_name,
            labels_output_folder_path=output_paths["locales_dir_path"],
        )

        with open(
            output_paths["fr_choices_yaml_path"], mode="r", encoding="utf-8"
        ) as f:
            fr_yaml = f.read()

        assert "\nstudentChoices:\n" in fr_yaml
        # base key is the "other" form
        assert "\n    student: Étudiant·e\n" in fr_yaml
        # gender-specific keys only when they differ from "other"
        assert "\n    student_male: Étudiant\n" in fr_yaml
        assert "\n    student_female: Étudiante\n" in fr_yaml
        assert "\n    student_custom:" not in fr_yaml

        with open(
            output_paths["en_choices_yaml_path"], mode="r", encoding="utf-8"
        ) as f:
            en_yaml = f.read()

        assert "\nstudentChoices:\n" in en_yaml
        # male/custom/other are "" for a 1-part gender expression, female is "ess"
        assert "\n    student: Student\n" in en_yaml
        assert "\n    student_female: Studentess\n" in en_yaml
        assert "\n    student_male:" not in en_yaml
        assert "\n    student_custom:" not in en_yaml

    def test_choices_yaml_supports_label_one(self, output_paths):
        choices_by_name = {
            "greetingChoices": [
                {
                    "value": "hello",
                    "label_yaml": {"fr": "Bonjour", "en": "Hello"},
                    "label_one_yaml": {"fr": "Salut", "en": "Hi"},
                    "spread_choices_name": None,
                    "hidden": False,
                }
            ]
        }

        _generate_choices_yaml_locales(
            choices_by_name,
            labels_output_folder_path=output_paths["locales_dir_path"],
        )

        with open(
            output_paths["en_choices_yaml_path"], mode="r", encoding="utf-8"
        ) as f:
            en_yaml = f.read()

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
