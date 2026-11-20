# Copyright Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for scripts/generator_config.py.

import os

import pytest  # pyright: ignore[reportMissingImports]

from scripts.generator_config import (
    GeneratorConfigError,
    SUPPORTED_SCRIPT_KEYS,
    load_generator_config,
)


@pytest.fixture
def excel_file(tmp_path):
    path = tmp_path / "survey.xlsx"
    path.write_bytes(b"")
    return str(path)


@pytest.fixture
def csv_folder(tmp_path):
    path = tmp_path / "survey_csv"
    path.mkdir()
    for file_name in ("Sections.csv", "Widgets.csv", "Labels.csv"):
        (path / file_name).write_text("a\n")
    return str(path)


def _load(tmp_path, text: str):
    config_path = tmp_path / "generatorConfigs.yaml"
    config_path.write_text(text)
    return load_generator_config(str(config_path))


def _error(tmp_path, text: str) -> str:
    with pytest.raises(GeneratorConfigError) as error:
        _load(tmp_path, text)
    return str(error.value)


class TestValidConfig:
    def test_excel_source_with_csv_copy(self, tmp_path, excel_file):
        config = _load(
            tmp_path,
            "survey_folder_path: survey\n"
            "survey_definition:\n"
            "    source: excel\n"
            f"    excel_file_path: {excel_file}\n"
            "    csv_folder_path: copy_csv\n"
            "enabled_scripts:\n"
            "    generate_widgets: true\n"
            "    generate_labels: false\n",
        )
        assert config.survey_folder_path == "survey"
        assert config.source == "excel"
        assert config.source_path == excel_file
        assert config.writes_csv_copy is True
        assert config.enabled_scripts == {
            "generate_widgets": True,
            "generate_labels": False,
        }
        assert config.summary_lines()[1:] == [
            f"Survey definition source: excel ({excel_file})",
            "CSV copy: copy_csv (written from the Excel file, don't edit)",
        ]

    def test_excel_source_without_csv_copy(self, tmp_path, excel_file):
        config = _load(
            tmp_path,
            "survey_folder_path: survey\n"
            "survey_definition:\n"
            "    source: excel\n"
            f"    excel_file_path: {excel_file}\n",
        )
        assert config.writes_csv_copy is False
        assert config.enabled_scripts == {}
        assert config.summary_lines()[2] == "CSV copy: not written (no csv_folder_path)"

    def test_csv_source(self, tmp_path, csv_folder, excel_file):
        config = _load(
            tmp_path,
            "survey_folder_path: survey\n"
            "survey_definition:\n"
            "    source: csv\n"
            f"    excel_file_path: {excel_file}\n"
            f"    csv_folder_path: {csv_folder}\n",
        )
        assert config.source_path == csv_folder
        assert config.writes_csv_copy is False
        assert config.summary_lines()[1:] == [
            f"Survey definition source: csv ({csv_folder})",
            f"Excel file: {excel_file} (not used: the source is csv)",
        ]

    def test_the_excel_file_may_be_missing_when_it_is_downloaded(self, tmp_path):
        config = _load(
            tmp_path,
            "survey_folder_path: survey\n"
            "survey_definition:\n"
            "    source: excel\n"
            "    excel_file_path: downloaded.xlsx\n"
            "enabled_scripts:\n"
            "    generate_excel: true\n",
        )
        assert config.enabled_scripts == {"generate_excel": True}


class TestOldConfig:
    def test_old_config_shows_the_block_with_its_own_paths(self, tmp_path):
        message = _error(
            tmp_path,
            "survey_folder_path: survey\n"
            "excel_file_path: references/Survey.xlsx\n"
            "enabled_scripts:\n"
            "    generate_widgets: true\n"
            "    copy_excel_to_csv: true\n",
        )
        assert message == (
            f"Error in {tmp_path / 'generatorConfigs.yaml'}:\n"
            "- the survey_definition block is missing.\n"
            "- excel_file_path is now set in the survey_definition block.\n"
            "- enabled_scripts.copy_excel_to_csv was removed: the CSV copy of the Excel "
            "file is written when survey_definition sets csv_folder_path with source: "
            "excel.\n"
            "\n"
            "The Generator needs to know which files you edit. Set this block in the "
            "file:\n"
            "\n"
            "survey_definition:\n"
            "    # The files you edit: excel or csv. The other format is written from it.\n"
            "    source: excel\n"
            "    excel_file_path: references/Survey.xlsx\n"
            f"    csv_folder_path: {os.path.join('references', 'Survey_csv')}\n"
            "\n"
            'See "Excel or CSV source" in packages/evolution-generator/README.md.'
        )

    def test_old_config_without_csv_copy_suggests_no_csv_folder(self, tmp_path):
        message = _error(
            tmp_path,
            "survey_folder_path: survey\nexcel_file_path: references/Survey.xlsx\n",
        )
        assert "    excel_file_path: references/Survey.xlsx\n" in message
        assert "csv_folder_path" not in message


class TestInvalidConfig:
    def test_missing_file_shows_a_whole_example(self, tmp_path):
        with pytest.raises(GeneratorConfigError) as error:
            load_generator_config(str(tmp_path / "missing.yaml"))
        message = str(error.value)
        assert message.startswith(
            f"Generator config file not found: {tmp_path / 'missing.yaml'}\n"
        )
        assert "survey_definition:\n    # The files you edit" in message
        for script_key in SUPPORTED_SCRIPT_KEYS:
            assert f"    {script_key}: " in message

    def test_invalid_yaml(self, tmp_path):
        assert "not a valid YAML file" in _error(tmp_path, "survey_folder_path: [\n")

    def test_not_a_mapping(self, tmp_path):
        assert "the file must hold keys and values" in _error(tmp_path, "- a\n- b\n")

    def test_missing_survey_folder_path(self, tmp_path, excel_file):
        message = _error(
            tmp_path,
            f"survey_definition:\n    source: excel\n    excel_file_path: {excel_file}\n",
        )
        assert "- survey_folder_path is missing" in message
        # The survey_definition block is fine: it isn't shown again.
        assert "Set this block" not in message

    @pytest.mark.parametrize(
        "block, problem",
        [
            ("    excel_file_path: a.xlsx\n", "survey_definition.source is missing"),
            (
                "    source: CSV\n",
                "survey_definition.source must be excel or csv, not 'CSV'",
            ),
            ("    source: excel\n", "survey_definition.excel_file_path is missing"),
            (
                "    source: excel\n    excel_file_path: missing.xlsx\n",
                "survey_definition.excel_file_path not found: missing.xlsx",
            ),
            (
                "    source: excel\n    excel_file_path: survey.csv\n",
                "survey_definition.excel_file_path must be an Excel file",
            ),
            ("    source: csv\n", "survey_definition.csv_folder_path is missing"),
            (
                "    source: csv\n    csv_folder_path: missing_csv\n",
                "survey_definition.csv_folder_path not found: missing_csv",
            ),
            (
                "    source: excel\n    excel_path: a.xlsx\n",
                "unknown key 'excel_path' in survey_definition",
            ),
        ],
    )
    def test_survey_definition_problem_shows_the_block(self, tmp_path, block, problem):
        message = _error(
            tmp_path, f"survey_folder_path: survey\nsurvey_definition:\n{block}"
        )
        assert f"- {problem}" in message
        assert "Set this block in the file:\n\nsurvey_definition:\n" in message

    def test_csv_folder_without_a_required_table(self, tmp_path, csv_folder):
        os.remove(os.path.join(csv_folder, "Widgets.csv"))
        message = _error(
            tmp_path,
            "survey_folder_path: survey\n"
            "survey_definition:\n"
            "    source: csv\n"
            f"    csv_folder_path: {csv_folder}\n",
        )
        assert (
            f"- survey_definition.csv_folder_path has no Widgets.csv: {csv_folder}"
            in message
        )
        # The suggested block keeps the user's own source and folder.
        assert f"    source: csv\n    csv_folder_path: {csv_folder}\n" in message

    def test_generate_excel_with_csv_source(self, tmp_path, csv_folder):
        message = _error(
            tmp_path,
            "survey_folder_path: survey\n"
            "survey_definition:\n"
            "    source: csv\n"
            f"    csv_folder_path: {csv_folder}\n"
            "enabled_scripts:\n"
            "    generate_excel: true\n",
        )
        assert (
            "- enabled_scripts.generate_excel downloads the Excel file, but the source is csv"
            in message
        )

    def test_unknown_keys_and_scripts(self, tmp_path, excel_file):
        message = _error(
            tmp_path,
            "survey_folder_path: survey\n"
            "survey_folder: survey\n"
            "survey_definition:\n"
            "    source: excel\n"
            f"    excel_file_path: {excel_file}\n"
            "enabled_scripts:\n"
            "    generate_widget: true\n"
            "    generate_labels: yes please\n",
        )
        assert "- unknown key 'survey_folder'" in message
        assert "- unknown script 'generate_widget' in enabled_scripts" in message
        assert "- enabled_scripts.generate_labels must be true or false" in message

    def test_the_only_override_replaces_enabled_scripts(self, tmp_path, excel_file):
        config_path = tmp_path / "generatorConfigs.yaml"
        config_path.write_text(
            "survey_folder_path: survey\n"
            "survey_definition:\n"
            "    source: excel\n"
            f"    excel_file_path: {excel_file}\n"
            "enabled_scripts:\n"
            "    generate_widgets: true\n"
        )
        config = load_generator_config(
            str(config_path), enabled_scripts_override={"generate_labels": True}
        )
        assert config.enabled_scripts == {"generate_labels": True}
