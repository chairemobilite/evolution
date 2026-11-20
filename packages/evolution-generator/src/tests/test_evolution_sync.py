# Copyright Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests that what the generator copies from Evolution is still up to date with
# the Evolution sources of this repository:
# - BUILT_IN_VALIDATIONS and BUILT_IN_FORMATTERS, the names a widget may use without a
#   custom one, must be exactly the validations and formatters Evolution exports;
# - every Evolution module the generated TypeScript imports must exist, and export the
#   names the generated code uses from it (e.g. WidgetConfig.InputRadioType,
#   defaultInputBase.inputRadioBase, validations.requiredValidation).
# When Evolution adds, renames or removes one of them, these tests fail until the
# generator is updated, instead of the generated survey failing to compile.
#
# The TypeScript sources are read as text: the exports are found with regular
# expressions, which is enough for the `export const|function|type|...` and
# `export { ... }` / `export * from` forms used by these modules.

import re
from pathlib import Path

import pytest

from survey_definition.widgets_definition import (
    BUILT_IN_FORMATTERS,
    BUILT_IN_VALIDATIONS,
)

# src/tests/<this file> -> packages/
PACKAGES_DIRECTORY = Path(__file__).resolve().parents[3]
GENERATOR_SOURCE_DIRECTORY = PACKAGES_DIRECTORY / "evolution-generator" / "src"
VALIDATIONS_MODULE = "evolution-common/lib/services/widgets/validations/validations"
FORMATTERS_MODULE = "evolution-common/lib/utils/formatters"

# The generator scripts that write TypeScript (the tests are left out: their strings
# are inputs, not code the generator writes).
GENERATOR_SCRIPT_FILES = sorted(
    path
    for directory in ("scripts", "helpers")
    for path in (GENERATOR_SOURCE_DIRECTORY / directory).glob("*.py")
)

_TS_EXTENSIONS = (".ts", ".tsx")
_DECLARED_EXPORT_PATTERN = re.compile(
    r"^export\s+(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?"
    r"(?:const|let|var|function\*?|class|type|interface|enum)\s+(\w+)",
    re.MULTILINE,
)
_EXPORT_LIST_PATTERN = re.compile(r"^export\s+(?:type\s+)?\{([^}]*)\}", re.MULTILINE)
_EXPORT_ALL_PATTERN = re.compile(r"^export\s+\*\s+from\s+['\"]([^'\"]+)['\"]", re.M)
_EXPORT_DEFAULT_PATTERN = re.compile(r"^export\s+default\b", re.MULTILINE)

# An import written by the generator, e.g.
# import * as validations from 'evolution-common/lib/...';
# import { type ChoiceType } from 'evolution-common/lib/...';
# import appConfig from 'evolution-frontend/lib/...';
_GENERATED_IMPORT_PATTERN = re.compile(
    r"import\s+(?:\*\s+as\s+(?P<namespace>\w+)|\{(?P<names>[^}]*)\}|(?P<default>\w+))"
    r"\s+from\s+'(?P<module>evolution-[\w-]+/[^']+)'"
)
# Names the generator writes through a helper or a table instead of as x.<name>: they
# become WidgetConfig.<name>, defaultInputBase.<name> and odSurveyHelpers.<name> in the
# generated code.
_HELPER_MEMBER_PATTERNS = {
    "WidgetConfig": re.compile(r"generate_constExport\([^,]+,\s*'(\w+)'\)"),
    "defaultInputBase": re.compile(r"generate_defaultInputBase\('(\w+)'\)"),
    "odSurveyHelpers": re.compile(r"\"helper\":\s*\"(\w+)\""),
}


def _module_source_file(module: str) -> Path:
    """
    Input: an Evolution module as the generated code imports it, e.g.
        'evolution-common/lib/services/questionnaire/types'.
    Output: its TypeScript source file, e.g.
        packages/evolution-common/src/services/questionnaire/types/index.ts
        (lib/ is the compiled src/; other folders, e.g. tests/, are not compiled).
    Raises AssertionError when no source file exists.
    """
    package, _, path = module.partition("/")
    top_folder, _, rest = path.partition("/")
    folder = "src" if top_folder == "lib" else top_folder
    base = PACKAGES_DIRECTORY / package / folder / rest
    return _resolve_ts_file(base, module)


def _resolve_ts_file(base: Path, module: str) -> Path:
    candidates = [base.with_name(base.name + ext) for ext in _TS_EXTENSIONS]
    candidates += [base / f"index{ext}" for ext in _TS_EXTENSIONS]
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    raise AssertionError(
        f"The generated code imports {module!r}, but Evolution has no such module "
        f"(looked for {[str(c.relative_to(PACKAGES_DIRECTORY)) for c in candidates]})."
    )


def _exported_names(source_file: Path, seen: frozenset[Path] = frozenset()) -> set[str]:
    """
    Output: the names a TypeScript module exports, including the ones it re-exports
    with `export { a, b } from` and `export * from`, and 'default' when it has a
    default export.
    """
    if source_file in seen:
        return set()
    text = source_file.read_text(encoding="utf-8")
    names = set(_DECLARED_EXPORT_PATTERN.findall(text))
    for export_list in _EXPORT_LIST_PATTERN.findall(text):
        for item in export_list.split(","):
            item = re.sub(r"^\s*type\s+", "", item).strip()
            if item:
                # `a as b` exports b.
                names.add(item.split(" as ")[-1].strip())
    for relative_module in _EXPORT_ALL_PATTERN.findall(text):
        target = _resolve_ts_file(source_file.parent / relative_module, relative_module)
        names |= _exported_names(target, seen | {source_file})
    if _EXPORT_DEFAULT_PATTERN.search(text):
        names.add("default")
    return names


def _generator_script_text(path: Path) -> str:
    """
    Output: the script's text, with the Python string syntax that hides the generated
    TypeScript undone: f-string braces ({{ }}) and strings split over lines
    ("import { a } from " "'evolution-...'") are joined.
    """
    text = path.read_text(encoding="utf-8")
    text = text.replace("{{", "{").replace("}}", "}")
    return re.sub(r"\"\s+f?\"", "", text)


def _generated_imports() -> dict[str, dict[str, set[str]]]:
    """
    Output: for each Evolution module the generated code imports, by the script that
    writes the name, the names that code uses from it:
        {module: {script name: {name, ...}}}
    A default import uses 'default'. A namespace import (`import * as x`) uses every
    `x.<name>` any script writes: a script may write the import and another one the
    code using it (e.g. odSurveyHelpers.getPerson, from generator_helpers.py).
    """
    texts = {path.name: _generator_script_text(path) for path in GENERATOR_SCRIPT_FILES}
    used: dict[str, dict[str, set[str]]] = {}
    module_by_namespace: dict[str, str] = {}

    def add(module: str, script: str, names: set[str]) -> None:
        used.setdefault(module, {}).setdefault(script, set()).update(names)

    for script, text in texts.items():
        for match in _GENERATED_IMPORT_PATTERN.finditer(text):
            if match["names"] is not None:
                names = set()
                for item in match["names"].split(","):
                    item = re.sub(r"^\s*type\s+", "", item).strip()
                    if item:
                        names.add(item.split(" as ")[0].strip())
                add(match["module"], script, names)
            elif match["default"] is not None:
                add(match["module"], script, {"default"})
            else:
                namespace = match["namespace"]
                assert module_by_namespace.get(namespace, match["module"]) == (
                    match["module"]
                ), f"{namespace!r} names two modules in the generated code."
                module_by_namespace[namespace] = match["module"]
                add(match["module"], script, set())

    for namespace, module in module_by_namespace.items():
        for script, text in texts.items():
            names = set(re.findall(rf"\b{namespace}\.(\w+)", text))
            if namespace in _HELPER_MEMBER_PATTERNS:
                names |= set(_HELPER_MEMBER_PATTERNS[namespace].findall(text))
            if names:
                add(module, script, names)
    return used


GENERATED_IMPORTS = _generated_imports()


def test_generator_scripts_import_evolution_modules():
    # Guards the regular expressions above: if they stop finding the imports, the
    # other tests would pass without checking anything.
    assert VALIDATIONS_MODULE in GENERATED_IMPORTS
    assert FORMATTERS_MODULE in GENERATED_IMPORTS
    assert "evolution-common/lib/services/questionnaire/types" in GENERATED_IMPORTS
    widget_config_names = GENERATED_IMPORTS[
        "evolution-common/lib/services/questionnaire/types"
    ]["generate_widgets.py"]
    assert {"InputRadioType", "TextWidgetConfig"} <= widget_config_names
    assert "inputRadioBase" in (
        GENERATED_IMPORTS["evolution-frontend/lib/components/inputs/defaultInputBase"][
            "generate_widgets.py"
        ]
    )
    od_survey_helpers = GENERATED_IMPORTS[
        "evolution-common/lib/services/odSurvey/helpers"
    ]
    assert "getPerson" in od_survey_helpers["generator_helpers.py"]
    assert "getCurrentPersonId" in od_survey_helpers["conditionals_generator.py"]


def test_built_in_validations_match_evolution_exports():
    exported = {
        name
        for name in _exported_names(_module_source_file(VALIDATIONS_MODULE))
        if name.endswith("Validation")
    }
    assert BUILT_IN_VALIDATIONS == exported, (
        "BUILT_IN_VALIDATIONS (survey_definition/widgets_definition.py) differs from "
        "the validations exported by Evolution: "
        f"missing {sorted(exported - BUILT_IN_VALIDATIONS)}, "
        f"no longer exported {sorted(BUILT_IN_VALIDATIONS - exported)}."
    )


def test_built_in_formatters_match_evolution_exports():
    exported = {
        name
        for name in _exported_names(_module_source_file(FORMATTERS_MODULE))
        if name.endswith("Formatter")
    }
    assert BUILT_IN_FORMATTERS == exported, (
        "BUILT_IN_FORMATTERS (survey_definition/widgets_definition.py) differs from "
        "the formatters exported by Evolution: "
        f"missing {sorted(exported - BUILT_IN_FORMATTERS)}, "
        f"no longer exported {sorted(BUILT_IN_FORMATTERS - exported)}."
    )


@pytest.mark.parametrize("module", sorted(GENERATED_IMPORTS))
def test_generated_imports_exist_in_evolution(module):
    exported = _exported_names(_module_source_file(module))
    missing = {
        script: sorted(names - exported)
        for script, names in GENERATED_IMPORTS[module].items()
        if names - exported
    }
    assert not missing, (
        f"The generated code uses names that {module!r} doesn't export, by the "
        f"generator script that writes them: {missing}."
    )
