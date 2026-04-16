# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for scripts/generate_choices.py.

import os
import pytest

from helpers.generator_helpers import create_mocked_excel_data, delete_file_if_exists
from scripts.generate_choices import (
    generate_choices,
    generate_choices_yaml_locales,
    generate_import_statements,
)

# Path where create_mocked_excel_data writes the workbook; we delete it after each test.
MOCKED_EXCEL_FILE = "src/tests/references/test.xlsx"


@pytest.fixture()
def generated_files(tmp_path):
    """
    Use per-test output paths to avoid file leaks between tests.
    """
    output_tsx = tmp_path / "choices.tsx"
    locales_dir = tmp_path / "locales"
    en_choices_yaml_path = locales_dir / "en" / "choices.yaml"
    fr_choices_yaml_path = locales_dir / "fr" / "choices.yaml"

    yield {
        "choices_tsx_path": str(output_tsx),
        "locales_dir_path": str(locales_dir),
        "en_choices_yaml_path": str(en_choices_yaml_path),
        "fr_choices_yaml_path": str(fr_choices_yaml_path),
    }

    # Cleanup the mocked workbook (fixed path) and any output artifacts.
    delete_file_if_exists(MOCKED_EXCEL_FILE)
    delete_file_if_exists(str(output_tsx))
    delete_file_if_exists(str(en_choices_yaml_path))
    delete_file_if_exists(str(fr_choices_yaml_path))


class TestGenerateChoices:
    """Tests for the public entry point generate_choices(input_file, output_file, ...)."""

    SHEET_NAME = "Choices"
    EXPECTED_HEADERS = [
        "choicesName",
        "value",
        "label::fr",
        "label::en",
        "spreadChoicesName",
        "conditional",
    ]

    def test_generates_choices_from_demo_excel_if_present(self, generated_files):
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
            generated_files["choices_tsx_path"],
            labels_output_folder_path=generated_files["locales_dir_path"],
        )

        assert os.path.isfile(generated_files["choices_tsx_path"])
        assert os.path.isfile(generated_files["en_choices_yaml_path"])
        assert os.path.isfile(generated_files["fr_choices_yaml_path"])

    def test_generates_typescript_and_locales_yaml_and_preserves_order(
        self, generated_files
    ):
        rows = [
            ["yesNoChoices", "yes", "Oui", "Yes", None, None],
            ["yesNoChoices", "no", "Non", "No", None, None],
            ["busCarTransport", "bus", "Autobus", "Bus", None, None],
            ["busCarTransport", "car", "Voiture", "Car", None, None],
            # spread row (no values/labels)
            ["transportModesChoices", None, None, None, "busCarTransport", None],
            ["transportModesChoices", "metro", "Métro", "Metro", None, None],
        ]
        create_mocked_excel_data(self.SHEET_NAME, self.EXPECTED_HEADERS, rows)

        generate_choices(
            MOCKED_EXCEL_FILE,
            generated_files["choices_tsx_path"],
            labels_output_folder_path=generated_files["locales_dir_path"],
        )

        assert os.path.isfile(generated_files["choices_tsx_path"])
        assert os.path.isfile(generated_files["en_choices_yaml_path"])
        assert os.path.isfile(generated_files["fr_choices_yaml_path"])

        with open(
            generated_files["choices_tsx_path"], mode="r", encoding="utf-8"
        ) as ts_file:
            ts_code = ts_file.read()
        assert (
            "import { type ChoiceType } from 'evolution-common/lib/services/questionnaire/types';"
            in ts_code
        )
        # Labels should use i18n translations (choices namespace)
        assert "label: (t) => t('choices:yesNoChoices.yes')" in ts_code
        assert "label: (t) => t('choices:yesNoChoices.no')" in ts_code

        with open(
            generated_files["en_choices_yaml_path"], mode="r", encoding="utf-8"
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

    def test_hidden_and_conditionals_are_written(self, generated_files):
        """
        Realistic behavior checks:
        - hidden => hidden: true in TS output
        - conditional => correct namespace prefix (conditionals vs customConditionals)
        """
        headers = [*self.EXPECTED_HEADERS, "hidden"]
        rows = [
            ["aChoices", "a", "A fr", "A en", None, "isAdult", True],
            ["aChoices", "b", "B fr", "B en", None, "fooCustomConditional", False],
        ]
        create_mocked_excel_data(self.SHEET_NAME, headers, rows)

        generate_choices(MOCKED_EXCEL_FILE, generated_files["choices_tsx_path"])

        with open(
            generated_files["choices_tsx_path"], mode="r", encoding="utf-8"
        ) as ts_file:
            ts_code = ts_file.read()

        assert "hidden: true" in ts_code
        assert "conditional: conditionals.isAdult" in ts_code
        assert "conditional: customConditionals.fooCustomConditional" in ts_code

    def test_invalid_row_with_missing_choices_name_raises(self, generated_files):
        rows = [
            ["", "yes", "Oui", "Yes", None, None],
            [None, "no", "Non", "No", None, None],
        ]
        create_mocked_excel_data(self.SHEET_NAME, self.EXPECTED_HEADERS, rows)

        with pytest.raises(Exception) as e_info:
            generate_choices(MOCKED_EXCEL_FILE, generated_files["choices_tsx_path"])
        assert str(e_info.value) == "Invalid row data in Choices sheet"

    def test_generates_spread_rows_into_typescript_array(self, generated_files):
        rows = [
            ["baseChoices", "a", "A fr", "A en", None, None],
            ["combinedChoices", None, None, None, "baseChoices", None],
            ["combinedChoices", "b", "B fr", "B en", None, None],
        ]
        create_mocked_excel_data(self.SHEET_NAME, self.EXPECTED_HEADERS, rows)

        generate_choices(MOCKED_EXCEL_FILE, generated_files["choices_tsx_path"])

        with open(
            generated_files["choices_tsx_path"], mode="r", encoding="utf-8"
        ) as ts_file:
            ts_code = ts_file.read()

        assert "export const combinedChoices: ChoiceType[] = [" in ts_code
        assert "...baseChoices" in ts_code

    def test_imports_are_uncommented_when_any_choice_has_conditional(
        self, generated_files
    ):
        rows = [["aChoices", "a", "A fr", "A en", None, "isAdult"]]
        create_mocked_excel_data(self.SHEET_NAME, self.EXPECTED_HEADERS, rows)

        generate_choices(MOCKED_EXCEL_FILE, generated_files["choices_tsx_path"])

        with open(
            generated_files["choices_tsx_path"], mode="r", encoding="utf-8"
        ) as ts_file:
            ts_code = ts_file.read()

        assert "import * as conditionals from './conditionals';" in ts_code
        assert "// import * as conditionals from './conditionals';" not in ts_code

    def test_imports_are_uncommented_when_any_choice_has_custom_conditional(
        self, generated_files
    ):
        rows = [["aChoices", "a", "A fr", "A en", None, "fooCustomConditional"]]
        create_mocked_excel_data(self.SHEET_NAME, self.EXPECTED_HEADERS, rows)

        generate_choices(MOCKED_EXCEL_FILE, generated_files["choices_tsx_path"])

        with open(
            generated_files["choices_tsx_path"], mode="r", encoding="utf-8"
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

    def test_missing_sheet_raises(self, generated_files):
        create_mocked_excel_data(
            self.SHEET_NAME + "Bad", self.EXPECTED_HEADERS, [["x"]]
        )
        with pytest.raises(Exception) as e_info:
            generate_choices(MOCKED_EXCEL_FILE, generated_files["choices_tsx_path"])
        assert str(e_info.value) == "Sheet with name Choices does not exist"

    def test_missing_expected_header_raises(self, generated_files):
        bad_headers = [
            "choicesNameBad",
            "value",
            "label::fr",
            "label::en",
            "spreadChoicesName",
            "conditional",
        ]
        rows = [["yesNoChoices", "yes", "Oui", "Yes", None, None]]
        create_mocked_excel_data(self.SHEET_NAME, bad_headers, rows)
        with pytest.raises(Exception) as e_info:
            generate_choices(MOCKED_EXCEL_FILE, generated_files["choices_tsx_path"])
        assert (
            str(e_info.value) == "Missing expected header in Choices sheet: choicesName"
        )

    def test_invalid_row_data_raises(self, generated_files):
        # Invalid: missing both value and spreadChoicesName
        rows = [["yesNoChoices", None, "Oui", "Yes", None, None]]
        create_mocked_excel_data(self.SHEET_NAME, self.EXPECTED_HEADERS, rows)
        with pytest.raises(Exception) as e_info:
            generate_choices(MOCKED_EXCEL_FILE, generated_files["choices_tsx_path"])
        assert str(e_info.value) == "Invalid row data in Choices sheet"


class TestGenerateChoicesYamlLocales:
    """Tests for generate_choices_yaml_locales(choices_by_name, labels_output_folder_path)."""

    def test_skips_spread_only_groups(self, generated_files):
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

        generate_choices_yaml_locales(
            choices_by_name,
            labels_output_folder_path=generated_files["locales_dir_path"],
        )

        with open(
            generated_files["en_choices_yaml_path"], mode="r", encoding="utf-8"
        ) as f:
            en_yaml = f.read()

        assert "\nbaseChoices:\n" in en_yaml
        assert "\nspreadOnlyChoices:\n" not in en_yaml

    def test_writes_only_languages_with_non_empty_values(self, generated_files):
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

        generate_choices_yaml_locales(
            choices_by_name,
            labels_output_folder_path=generated_files["locales_dir_path"],
        )

        assert os.path.isfile(generated_files["fr_choices_yaml_path"])
        assert not os.path.isfile(generated_files["en_choices_yaml_path"])

        with open(
            generated_files["fr_choices_yaml_path"], mode="r", encoding="utf-8"
        ) as f:
            fr_yaml = f.read()
        assert "\nonlyFrench:\n" in fr_yaml
        assert "\n    a:" in fr_yaml

    def test_omits_values_with_none_value_cell(self, generated_files):
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

        generate_choices_yaml_locales(
            choices_by_name,
            labels_output_folder_path=generated_files["locales_dir_path"],
        )

        with open(
            generated_files["en_choices_yaml_path"], mode="r", encoding="utf-8"
        ) as f:
            en_yaml = f.read()

        assert "\nmixed:\n" in en_yaml
        assert "\n    ok: OK\n" in en_yaml
        assert "\n    null:" not in en_yaml
        assert "\n    None:" not in en_yaml

    def test_choices_yaml_applies_label_formatter_bold_and_keeps_interpolation_tokens(
        self, generated_files
    ):
        """
        End-to-end: labels in Excel go through LabelFormatter (e.g. **Hello** -> <strong>Hello</strong>)
        and i18next interpolation tokens like {{nickname}} stay readable.
        """
        headers = TestGenerateChoices.EXPECTED_HEADERS
        rows = [
            [
                "greetingChoices",
                "hello",
                "**Hello** {{nickname}}",
                "**Hello** {{nickname}}",
                None,
                None,
            ]
        ]
        create_mocked_excel_data(TestGenerateChoices.SHEET_NAME, headers, rows)

        generate_choices(
            MOCKED_EXCEL_FILE,
            generated_files["choices_tsx_path"],
            labels_output_folder_path=generated_files["locales_dir_path"],
        )

        with open(
            generated_files["fr_choices_yaml_path"], mode="r", encoding="utf-8"
        ) as f:
            fr_yaml = f.read()

        assert "\ngreetingChoices:\n" in fr_yaml
        assert "hello: <strong>Hello</strong> {{nickname}}" in fr_yaml


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
        code = generate_import_statements(
            case["has_conditionals_import"], case["has_custom_import"]
        )
        assert (
            "import { type ChoiceType } from 'evolution-common/lib/services/questionnaire/types';"
            in code
        )
        for line in case["expected_lines"]:
            assert line in code
