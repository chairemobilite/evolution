# Copyright Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Checks that the names the generator copies from Evolution still exist:
# BUILT_IN_VALIDATIONS, BUILT_IN_FORMATTERS, BUILT_IN_SECTION_TEMPLATES, and the
# evolution-common names the generated TypeScript imports.
# Reads Evolution's exports from docs/internalApi/api.json (`yarn docs:api`, run by CI).
# Without that file the tests are skipped, or fail in CI.
# TODO: check the evolution-frontend imports once it is documented (#924).

import json
import os
import re
from pathlib import Path

import pytest

from survey_definition.sections_definition import BUILT_IN_SECTION_TEMPLATES
from survey_definition.widgets_definition import (
    BUILT_IN_FORMATTERS,
    BUILT_IN_VALIDATIONS,
)

# src/tests/<this file> -> repository root
REPOSITORY_DIRECTORY = Path(__file__).resolve().parents[4]
API_DOCUMENTATION_FILE = REPOSITORY_DIRECTORY / "docs" / "internalApi" / "api.json"
GENERATOR_SOURCE_DIRECTORY = (
    REPOSITORY_DIRECTORY / "packages" / "evolution-generator" / "src"
)
DOCUMENTED_PACKAGE = "evolution-common/"
DOCUMENTED_MODULE_PREFIX = "evolution-common/lib/"
VALIDATIONS_MODULE = "evolution-common/lib/services/widgets/validations/validations"
FORMATTERS_MODULE = "evolution-common/lib/utils/formatters"
SECTION_CONFIG_MODULE = "services/questionnaire/types/SectionConfig"

# The generator scripts that write TypeScript.
GENERATOR_SCRIPT_FILES = sorted(
    path
    for directory in ("scripts", "helpers")
    for path in (GENERATOR_SOURCE_DIRECTORY / directory).glob("*.py")
)

# An import written by the generator, e.g.
# import * as validations from 'evolution-common/lib/...';
# import { type ChoiceType } from 'evolution-common/lib/...';
# import appConfig from 'evolution-frontend/lib/...';
_GENERATED_IMPORT_PATTERN = re.compile(
    r"import\s+(?:\*\s+as\s+(?P<namespace>\w+)|\{(?P<names>[^}]*)\}|(?P<default>\w+))"
    r"\s+from\s+'(?P<module>evolution-[\w-]+/[^']+)'"
)
# Names written through a helper or a table instead of as x.<name>.
_HELPER_MEMBER_PATTERNS = {
    "WidgetConfig": re.compile(r"generate_constExport\([^,]+,\s*'(\w+)'\)"),
    "defaultInputBase": re.compile(r"generate_defaultInputBase\('(\w+)'\)"),
    "odSurveyHelpers": re.compile(r"\"helper\":\s*\"(\w+)\""),
}


@pytest.fixture(scope="module")
def documented_modules() -> dict[str, dict]:
    """Output: each documented module's typedoc entry, by its path, e.g. 'utils/formatters'."""
    if not API_DOCUMENTATION_FILE.is_file():
        message = (
            f"{API_DOCUMENTATION_FILE.relative_to(REPOSITORY_DIRECTORY)} not found: "
            "run `yarn docs:api` to check the names copied from Evolution."
        )
        if os.environ.get("CI"):
            pytest.fail(message)
        pytest.skip(message)
    project = json.loads(API_DOCUMENTATION_FILE.read_text(encoding="utf-8"))
    return {module["name"]: module for module in project.get("children", [])}


@pytest.fixture(scope="module")
def documented_exports(documented_modules) -> dict[str, set[str]]:
    """
    Output: the names each documented module exports, re-exports included, e.g.
        {'utils/formatters': {'accessCodeFormatter', ...}}.
    """
    return {
        name: {child["name"] for child in module.get("children", [])}
        for name, module in documented_modules.items()
    }


def _union_values(documented_modules: dict[str, dict], module: str, name: str) -> set:
    """Output: the values of a documented union of literals, e.g. type A = 'a' | 'b'."""
    declaration = next(
        (
            child
            for child in documented_modules.get(module, {}).get("children", [])
            if child["name"] == name
        ),
        None,
    )
    assert declaration is not None, f"Evolution's {module!r} no longer exports {name}."
    union = declaration.get("type", {})
    assert union.get("type") == "union" and all(
        member.get("type") == "literal" for member in union["types"]
    ), f"{name} is no longer a union of literal values: update this test."
    return {member["value"] for member in union["types"]}


def _exports_of(documented_exports: dict[str, set[str]], module: str) -> set[str]:
    """
    Input: a module as the generated code imports it, e.g.
        'evolution-common/lib/services/questionnaire/types'.
    Output: its exports, documented as 'services/questionnaire/types'.
    """
    assert module.startswith(DOCUMENTED_MODULE_PREFIX), (
        f"The generated code imports {module!r}: an evolution-common module must be "
        f"imported from {DOCUMENTED_MODULE_PREFIX!r}."
    )
    documented_name = module.removeprefix(DOCUMENTED_MODULE_PREFIX)
    assert documented_name in documented_exports, (
        f"The generated code imports {module!r}, but Evolution's API documentation "
        f"has no {documented_name!r} module (rebuild it with `yarn docs:api`)."
    )
    return documented_exports[documented_name]


def _generator_script_text(path: Path) -> str:
    """
    Output: the script's text, with f-string braces ({{ }}) and strings split over
    lines joined, so the generated TypeScript reads as written.
    """
    text = path.read_text(encoding="utf-8")
    text = text.replace("{{", "{").replace("}}", "}")
    return re.sub(r"\"\s+f?\"", "", text)


def _generated_imports() -> dict[str, dict[str, set[str]]]:
    """
    Output: the names the generated code uses from each Evolution module, by script:
        {module: {script name: {name, ...}}}
    A default import is 'default'. For `import * as x`, every `x.<name>` in any script
    counts: the import and its uses may be written by different scripts.
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
    # Guards the regular expressions: without imports found, the other tests check nothing.
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


def test_built_in_validations_match_evolution_exports(documented_exports):
    exported = {
        name
        for name in _exports_of(documented_exports, VALIDATIONS_MODULE)
        if name.endswith("Validation")
    }
    assert BUILT_IN_VALIDATIONS == exported, (
        "BUILT_IN_VALIDATIONS (survey_definition/widgets_definition.py) differs from "
        "the validations exported by Evolution: "
        f"missing {sorted(exported - BUILT_IN_VALIDATIONS)}, "
        f"no longer exported {sorted(BUILT_IN_VALIDATIONS - exported)}."
    )


def test_built_in_formatters_match_evolution_exports(documented_exports):
    exported = {
        name
        for name in _exports_of(documented_exports, FORMATTERS_MODULE)
        if name.endswith("Formatter")
    }
    assert BUILT_IN_FORMATTERS == exported, (
        "BUILT_IN_FORMATTERS (survey_definition/widgets_definition.py) differs from "
        "the formatters exported by Evolution: "
        f"missing {sorted(exported - BUILT_IN_FORMATTERS)}, "
        f"no longer exported {sorted(BUILT_IN_FORMATTERS - exported)}."
    )


def test_built_in_section_templates_match_evolution_type(documented_modules):
    templates = _union_values(
        documented_modules, SECTION_CONFIG_MODULE, "BuiltinSectionTemplates"
    )
    assert BUILT_IN_SECTION_TEMPLATES == templates, (
        "BUILT_IN_SECTION_TEMPLATES (survey_definition/sections_definition.py) differs "
        "from Evolution's BuiltinSectionTemplates: "
        f"missing {sorted(templates - BUILT_IN_SECTION_TEMPLATES)}, "
        f"no longer in Evolution {sorted(BUILT_IN_SECTION_TEMPLATES - templates)}."
    )


@pytest.mark.parametrize(
    "module",
    sorted(m for m in GENERATED_IMPORTS if m.startswith(DOCUMENTED_PACKAGE)),
)
def test_generated_imports_exist_in_evolution(documented_exports, module):
    exported = _exports_of(documented_exports, module)
    missing = {
        script: sorted(names - exported)
        for script, names in GENERATED_IMPORTS[module].items()
        if names - exported
    }
    assert not missing, (
        f"The generated code uses names that {module!r} doesn't export, by the "
        f"generator script that writes them: {missing}."
    )
