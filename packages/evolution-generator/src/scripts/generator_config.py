# Copyright Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Reads and checks the Generator config file (generatorConfigs.yaml). Every
# survey made with the Generator has one: it says where the survey is generated, which
# files the survey definition is edited in (the Excel file or a folder of CSV files),
# and which scripts run. A config that is missing something stops the generation with
# a message that names each problem and shows the survey_definition block to paste.
import os
from dataclasses import dataclass, field
from typing import Any, Literal, Optional

import yaml

README_SECTION = 'See "Excel or CSV source" in packages/evolution-generator/README.md.'

# The scripts that can be enabled in the config's enabled_scripts block.
SUPPORTED_SCRIPT_KEYS = [
    "generate_excel",
    "generate_section_configs",
    "generate_sections",
    "generate_widgets_configs",
    "generate_widgets",
    "generate_conditionals",
    "generate_choices",
    "generate_input_range",
    "generate_labels",
    "generate_UI_tests",
    "generate_questionnaire_list",
    "generate_questionnaire_dictionary",
]

SURVEY_DEFINITION_SOURCES = ("excel", "csv")
EXCEL_FILE_EXTENSIONS = (".xlsx", ".xlsm", ".xltx", ".xltm")
# The tables a survey definition can't do without (see load_survey_definition).
REQUIRED_CSV_FILE_NAMES = ("Sections.csv", "Widgets.csv", "Labels.csv")

_TOP_LEVEL_KEYS = ("survey_folder_path", "survey_definition", "enabled_scripts")
_SURVEY_DEFINITION_KEYS = ("source", "excel_file_path", "csv_folder_path")
_EXCEL_FILE_PLACEHOLDER = "<path to your survey file>.xlsx"
_CSV_FOLDER_PLACEHOLDER = "<path to your survey folder of CSV files>"


class GeneratorConfigError(Exception):
    """A Generator config file that can't be used: the message says how to fix it."""


@dataclass(frozen=True)
class GeneratorConfig:
    """
    The checked content of a Generator config file.

    Attributes:
        config_path: Path of the config file, for messages.
        survey_folder_path: Folder of the survey the files are generated in.
        source: Where the survey definition is edited: "excel" (excel_file_path) or
            "csv" (csv_folder_path). The other one, when set, is written from it.
        excel_file_path: The Excel file: the source, or None with source "csv".
        csv_folder_path: The folder of CSV files, one per table: the source, or, with
            source "excel", the copy of the Excel file written for git diffs (None
            when no copy is wanted).
        enabled_scripts: Whether each script runs, by key (see SUPPORTED_SCRIPT_KEYS).
    """

    config_path: str
    survey_folder_path: str
    source: Literal["excel", "csv"]
    excel_file_path: Optional[str]
    csv_folder_path: Optional[str]
    enabled_scripts: dict[str, bool] = field(default_factory=dict)

    @property
    def source_path(self) -> str:
        """The file or folder the survey definition is read from."""
        path = self.excel_file_path if self.source == "excel" else self.csv_folder_path
        assert path is not None  # Checked by load_generator_config
        return path

    @property
    def writes_csv_copy(self) -> bool:
        """Whether the CSV folder is written from the Excel file."""
        return self.source == "excel" and self.csv_folder_path is not None

    def summary_lines(self) -> list[str]:
        """What the generation reads and writes, printed when it starts."""
        if self.source == "excel":
            csv_line = (
                f"CSV copy: {self.csv_folder_path} (written from the Excel file, "
                "don't edit)"
                if self.csv_folder_path is not None
                else "CSV copy: not written (no csv_folder_path)"
            )
            return [
                f"Config: {self.config_path}",
                f"Survey definition source: excel ({self.excel_file_path})",
                csv_line,
            ]
        excel_line = (
            f"Excel file: {self.excel_file_path} (not used: the source is csv)"
            if self.excel_file_path is not None
            else "Excel file: not used"
        )
        return [
            f"Config: {self.config_path}",
            f"Survey definition source: csv ({self.csv_folder_path})",
            excel_line,
        ]


def load_generator_config(
    config_path: str, enabled_scripts_override: Optional[dict[str, bool]] = None
) -> GeneratorConfig:
    """
    Read and check the Generator config file.

    `enabled_scripts_override` replaces the config's enabled_scripts (see the --only
    argument of generate_survey.py). Raises GeneratorConfigError listing every problem
    found, with the survey_definition block to paste.
    """
    if not os.path.isfile(config_path):
        raise GeneratorConfigError(
            f"Generator config file not found: {config_path}\n"
            "Every survey made with the Generator needs a generatorConfigs.yaml, e.g.:\n\n"
            + _config_example(survey_folder_path="<path to your survey folder>")
            + f"\n{README_SECTION}"
        )
    with open(config_path, "r", encoding="utf-8") as config_file:
        try:
            content = yaml.safe_load(config_file)
        except yaml.YAMLError as error:
            raise GeneratorConfigError(
                f"Error in {config_path}: not a valid YAML file.\n{error}"
            ) from error
    if not isinstance(content, dict):
        raise GeneratorConfigError(
            f"Error in {config_path}: the file must hold keys and values, e.g.:\n\n"
            + _config_example(survey_folder_path="<path to your survey folder>")
            + f"\n{README_SECTION}"
        )
    return _check_config(config_path, content, enabled_scripts_override)


def _check_config(
    config_path: str,
    content: dict,
    enabled_scripts_override: Optional[dict[str, bool]],
) -> GeneratorConfig:
    problems: list[str] = []
    block_problems: list[str] = []

    survey_folder_path = content.get("survey_folder_path")
    if not isinstance(survey_folder_path, str) or not survey_folder_path.strip():
        problems.append(
            "survey_folder_path is missing: the folder of the survey the files are "
            "generated in, e.g. survey_folder_path: ../../survey"
        )

    for key in content:
        if key == "excel_file_path":
            block_problems.append(
                "excel_file_path is now set in the survey_definition block."
            )
        elif key not in _TOP_LEVEL_KEYS:
            problems.append(
                f"unknown key {key!r}. The keys are: {', '.join(_TOP_LEVEL_KEYS)}."
            )

    enabled_scripts = content.get("enabled_scripts") or {}
    if not isinstance(enabled_scripts, dict):
        problems.append("enabled_scripts must list scripts, each true or false.")
        enabled_scripts = {}
    for key, value in enabled_scripts.items():
        if key == "copy_excel_to_csv":
            block_problems.append(
                "enabled_scripts.copy_excel_to_csv was removed: the CSV copy of the "
                "Excel file is written when survey_definition sets csv_folder_path "
                "with source: excel."
            )
        elif key not in SUPPORTED_SCRIPT_KEYS:
            problems.append(
                f"unknown script {key!r} in enabled_scripts. The scripts are: "
                f"{', '.join(SUPPORTED_SCRIPT_KEYS)}."
            )
        elif not isinstance(value, bool):
            problems.append(
                f"enabled_scripts.{key} must be true or false, not {value!r}."
            )
    if enabled_scripts_override is not None:
        enabled_scripts = enabled_scripts_override
    enabled_scripts = {
        key: value is True
        for key, value in enabled_scripts.items()
        if key in SUPPORTED_SCRIPT_KEYS
    }

    block = content.get("survey_definition")
    if block is None:
        block_problems.insert(0, "the survey_definition block is missing.")
        block = {}
    elif not isinstance(block, dict):
        block_problems.insert(
            0, "survey_definition must be a block of keys (see below)."
        )
        block = {}

    source = block.get("source")
    excel_file_path = _path_or_none(block.get("excel_file_path"))
    csv_folder_path = _path_or_none(block.get("csv_folder_path"))
    if content.get("survey_definition") is not None:
        block_problems.extend(
            _check_survey_definition_block(
                block, source, excel_file_path, csv_folder_path, enabled_scripts
            )
        )

    if problems or block_problems:
        raise GeneratorConfigError(
            _error_message(
                config_path, content, problems, block_problems, survey_folder_path
            )
        )

    assert isinstance(survey_folder_path, str)
    return GeneratorConfig(
        config_path=config_path,
        survey_folder_path=survey_folder_path,
        source=source,
        excel_file_path=excel_file_path,
        csv_folder_path=csv_folder_path,
        enabled_scripts=enabled_scripts,
    )


def _check_survey_definition_block(
    block: dict,
    source: Any,
    excel_file_path: Optional[str],
    csv_folder_path: Optional[str],
    enabled_scripts: dict[str, bool],
) -> list[str]:
    problems = [
        f"unknown key {key!r} in survey_definition. The keys are: "
        f"{', '.join(_SURVEY_DEFINITION_KEYS)}."
        for key in block
        if key not in _SURVEY_DEFINITION_KEYS
    ]
    if source is None:
        problems.append(
            "survey_definition.source is missing: excel or csv, the files you edit."
        )
        return problems
    if source not in SURVEY_DEFINITION_SOURCES:
        problems.append(
            f"survey_definition.source must be excel or csv, not {source!r}."
        )
        return problems

    if excel_file_path is not None and not excel_file_path.lower().endswith(
        EXCEL_FILE_EXTENSIONS
    ):
        problems.append(
            f"survey_definition.excel_file_path must be an Excel file "
            f"({', '.join(EXCEL_FILE_EXTENSIONS)}): {excel_file_path}"
        )

    if source == "excel":
        if excel_file_path is None:
            problems.append(
                "survey_definition.excel_file_path is missing: the source is excel."
            )
        # generate_excel downloads the file before it is read.
        elif not enabled_scripts.get("generate_excel") and not os.path.isfile(
            excel_file_path
        ):
            problems.append(
                f"survey_definition.excel_file_path not found: {excel_file_path}"
            )
        if csv_folder_path is not None and os.path.isfile(csv_folder_path):
            problems.append(
                "survey_definition.csv_folder_path must be a folder, not a file: "
                f"{csv_folder_path}"
            )
        return problems

    if enabled_scripts.get("generate_excel"):
        problems.append(
            "enabled_scripts.generate_excel downloads the Excel file, but the source "
            "is csv: set it to false."
        )
    if csv_folder_path is None:
        problems.append(
            "survey_definition.csv_folder_path is missing: the source is csv."
        )
    elif not os.path.isdir(csv_folder_path):
        problems.append(
            f"survey_definition.csv_folder_path not found: {csv_folder_path}"
        )
    else:
        missing = [
            file_name
            for file_name in REQUIRED_CSV_FILE_NAMES
            if not os.path.isfile(os.path.join(csv_folder_path, file_name))
        ]
        if missing:
            problems.append(
                f"survey_definition.csv_folder_path has no {', '.join(missing)}: "
                f"{csv_folder_path}"
            )
    return problems


def _path_or_none(value: Any) -> Optional[str]:
    if value is None or (isinstance(value, str) and not value.strip()):
        return None
    return str(value)


def _error_message(
    config_path: str,
    content: dict,
    problems: list[str],
    block_problems: list[str],
    survey_folder_path: Any,
) -> str:
    lines = [f"Error in {config_path}:"]
    lines.extend(f"- {problem}" for problem in [*problems, *block_problems])
    if block_problems:
        lines.append("")
        lines.append(
            "The Generator needs to know which files you edit. "
            "Set this block in the file:"
        )
        lines.append("")
        lines.append(_suggested_block(content))
    lines.append(README_SECTION)
    return "\n".join(lines)


def _suggested_block(content: dict) -> str:
    """The survey_definition block to paste, filled with the paths the config already has."""
    block = content.get("survey_definition")
    block = block if isinstance(block, dict) else {}
    excel_file_path = _path_or_none(block.get("excel_file_path")) or _path_or_none(
        content.get("excel_file_path")
    )
    csv_folder_path = _path_or_none(block.get("csv_folder_path"))
    source = block.get("source")
    if source not in SURVEY_DEFINITION_SOURCES:
        source = "csv" if csv_folder_path and not excel_file_path else "excel"

    enabled_scripts = content.get("enabled_scripts")
    copied_to_csv = (
        isinstance(enabled_scripts, dict)
        and enabled_scripts.get("copy_excel_to_csv") is True
    )
    if csv_folder_path is None and excel_file_path and copied_to_csv:
        # Where the CSV copy was written before survey_definition existed.
        csv_folder_path = default_csv_folder_path(excel_file_path)

    return _survey_definition_block(
        source,
        excel_file_path or (_EXCEL_FILE_PLACEHOLDER if source == "excel" else None),
        csv_folder_path or (_CSV_FOLDER_PLACEHOLDER if source == "csv" else None),
    )


def _survey_definition_block(
    source: str, excel_file_path: Optional[str], csv_folder_path: Optional[str]
) -> str:
    lines = [
        "survey_definition:",
        "    # The files you edit: excel or csv. The other format is written from it.",
        f"    source: {source}",
    ]
    if excel_file_path is not None:
        lines.append(f"    excel_file_path: {excel_file_path}")
    if csv_folder_path is not None:
        lines.append(f"    csv_folder_path: {csv_folder_path}")
    return "\n".join(lines) + "\n"


def _config_example(survey_folder_path: str) -> str:
    return (
        f"survey_folder_path: {survey_folder_path}\n"
        + _survey_definition_block(
            "excel",
            _EXCEL_FILE_PLACEHOLDER,
            "<path to the CSV copy of the file>",
        )
        + "enabled_scripts:\n"
        + "".join(
            f"    {key}: {'false' if key == 'generate_excel' else 'true'}\n"
            for key in SUPPORTED_SCRIPT_KEYS
        )
    )


def default_csv_folder_path(excel_file_path: str) -> str:
    """Return "<excel_name>_csv" next to the Excel file, where the CSV copy was written by default."""
    excel_folder_path = os.path.dirname(excel_file_path)
    excel_file_name = os.path.splitext(os.path.basename(excel_file_path))[0]
    return os.path.join(excel_folder_path, f"{excel_file_name}_csv")
