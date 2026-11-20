# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script generates validations.ts, one ValidationFunction per
# validation_name of the Validations table, and the locales/<language>/validations.yaml
# error messages. It is used from generate_survey.py.

import json

from helpers.generator_helpers import (
    INDENT,
    add_generator_comment,
    generate_label_typescript_with_context,
    get_label_context_flags,
    is_ts_file,
)
from scripts.conditionals_generator import ConditionalsGenerator
from scripts.labels_generator import LabelFormatter, LabelsGenerator
from survey_definition.survey_definition import SurveyDefinition
from survey_definition.validations_definition import (
    VALIDATION_EQUALITY_OPERATORS,
    VALIDATION_NUMBER_OPERATORS,
    ValidationDefinition,
)

# The locales namespace of the error messages: locales/<language>/validations.yaml.
VALIDATIONS_LOCALES_NAMESPACE = "validations"


def _format_messages(messages: dict[str, str]) -> dict[str, str]:
    """Apply the same formatting rules as labels generation to each language's message."""
    return {
        language: LabelFormatter.replace(message)
        for language, message in messages.items()
    }


def _translation_key(validation: ValidationDefinition) -> str:
    """The key of the row's error message in the validations namespace, e.g. 'ageValidation.tooHigh'."""
    return f"{validation.validation_name}.{validation.error_name}"


def _answer_expression(path: str | None) -> str:
    """
    The TypeScript expression of the checked answer: `value`, the answer of the widget,
    for a blank path, or the response at `path` otherwise.
    """
    if path is None:
        return "value"
    expanded_path = ConditionalsGenerator._expand_tokenized_path(
        path,
        current_context_specs=ConditionalsGenerator.CONDITIONALS_CURRENT_CONTEXT_SPECS,
    )
    path_expression = expanded_path if expanded_path is not None else f"'{path}'"
    return f"surveyHelper.getResponse(interview, {path_expression})"


def _error_condition(validation: ValidationDefinition) -> str:
    """
    The TypeScript expression that is true when the row's error is shown. Every
    operator except isBlank is only checked on a non-blank answer.
    """
    answer = _answer_expression(validation.path)
    operator = validation.comparison_operator
    value = validation.value
    if operator == "isBlank":
        return f"_isBlank({answer})"
    if operator == "isNotInteger":
        condition = f"!Number.isInteger(Number({answer}))"
    elif operator in VALIDATION_NUMBER_OPERATORS or (
        operator in VALIDATION_EQUALITY_OPERATORS
        and isinstance(value, (int, float))
        and not isinstance(value, bool)
    ):
        # An answer may be saved as text, e.g. '7' from a text input: compare as numbers.
        condition = f"Number({answer}) {operator} {json.dumps(value)}"
    else:
        condition = f"{answer} {operator} {json.dumps(value)}"
    return f"!_isBlank({answer}) && {condition}"


def _message_context_flags(
    validation: ValidationDefinition,
) -> tuple[bool, bool, bool, bool]:
    """Whether the row's error message needs a nickname, count or gender context (see get_label_context_flags)."""
    return get_label_context_flags(
        labels=_format_messages(validation.error_message).values()
    )


def _generate_error_typescript(validation: ValidationDefinition) -> str:
    """The TypeScript object of one error: its condition, message, and isWarning."""
    has_nickname, has_count, has_gender_context, has_label_one = _message_context_flags(
        validation
    )
    error_message = generate_label_typescript_with_context(
        property_name="errorMessage",
        translation_key=(
            f"{VALIDATIONS_LOCALES_NAMESPACE}:{_translation_key(validation)}"
        ),
        base_indent=INDENT * 3,
        has_nickname=has_nickname,
        has_count=has_count,
        has_gender_context=has_gender_context,
        has_label_one=has_label_one,
        gender_context_expression="activePerson?.gender || activePerson?.sexAssignedAtBirth",
    )
    is_warning = f",\n{INDENT * 3}isWarning: true" if validation.is_warning else ""
    return (
        f"{INDENT * 2}{{\n"
        f"{INDENT * 3}validation: {_error_condition(validation)},\n"
        f"{error_message}{is_warning}\n"
        f"{INDENT * 2}}}"
    )


def _generate_validation_typescript(
    validation_name: str, validations: list[ValidationDefinition]
) -> str:
    """One exported ValidationFunction, returning one error per row of the validation."""
    paths = [validation.path for validation in validations if validation.path]
    specs = ConditionalsGenerator.CONDITIONALS_CURRENT_CONTEXT_SPECS
    needed_ids = ConditionalsGenerator._current_context_vars_needed(
        [{"path": path} for path in paths], current_context_specs=specs
    )
    has_relative_path = any("${relativePath}" in path for path in paths)

    declarations = ""
    if has_relative_path:
        declarations += (
            f"{INDENT}const relativePath = path.substring(0, path.lastIndexOf('.')); "
            "// Remove the last key from the path\n"
        )
    for spec in specs:
        if spec["id_var"] in needed_ids:
            declarations += (
                f"{INDENT}const {spec['id_var']} = odSurveyHelpers.{spec['helper']}"
                f"({{ interview, path }}); // {spec['comment']}\n"
            )

    # Only name the parameters the function uses: an unused one starts with '_', and
    # the ones after the last used one are left out.
    value = "value" if len(paths) < len(validations) else "_value"
    if has_relative_path or needed_ids:
        parameters = f"{value}, _customValue, interview, path"
    elif paths:
        parameters = f"{value}, _customValue, interview"
    else:
        parameters = value

    errors = ",\n".join(_generate_error_typescript(v) for v in validations)
    return (
        f"export const {validation_name}: ValidationFunction = ({parameters}) => {{\n"
        f"{declarations}"
        f"{INDENT}return [\n"
        f"{errors}\n"
        f"{INDENT}];\n"
        "};\n"
    )


def _generate_import_statements(
    *,
    needs_survey_helper_import: bool,
    needs_od_survey_helpers_import: bool,
    needs_escape_import: bool,
) -> str:
    survey_helper_import = (
        "import * as surveyHelper from 'evolution-common/lib/utils/helpers';\n"
        if needs_survey_helper_import
        else ""
    )
    od_survey_helpers_import = (
        "import * as odSurveyHelpers from 'evolution-common/lib/services/odSurvey/helpers';\n"
        if needs_od_survey_helpers_import
        else ""
    )
    escape_import = (
        "import _escape from 'lodash/escape';\n" if needs_escape_import else ""
    )
    return (
        "import { TFunction } from 'i18next';\n"
        "import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';\n"
        "import { type ValidationFunction } from 'evolution-common/lib/services/questionnaire/types';\n"
        f"{escape_import}"
        f"{survey_helper_import}"
        f"{od_survey_helpers_import}"
    )


def _generate_typescript_code(
    validations_by_name: dict[str, list[ValidationDefinition]],
) -> str:
    """Generate the full TypeScript source for the validations.ts output file."""
    validations = [v for group in validations_by_name.values() for v in group]
    paths = [validation.path for validation in validations if validation.path]
    specs = ConditionalsGenerator.CONDITIONALS_CURRENT_CONTEXT_SPECS
    has_current_context = any(spec["token"] in path for path in paths for spec in specs)
    message_flags = [_message_context_flags(v) for v in validations]
    needs_escape_import = any(has_nickname for has_nickname, *_ in message_flags)
    needs_message_context = any(any(flags) for flags in message_flags)

    ts_code = add_generator_comment()
    ts_code += _generate_import_statements(
        needs_survey_helper_import=bool(paths),
        needs_od_survey_helpers_import=has_current_context or needs_message_context,
        needs_escape_import=needs_escape_import,
    )
    for validation_name, group in validations_by_name.items():
        ts_code += "\n" + _generate_validation_typescript(validation_name, group)
    return ts_code


def _generate_validations_yaml_locales(
    validations_by_name: dict[str, list[ValidationDefinition]],
    languages: tuple[str, ...],
    labels_output_folder_path: str,
) -> None:
    """
    Generate the locales validations YAML files containing the error messages, one per
    survey language.

    Output:
      <surveyRoot>/locales/<language>/validations.yaml, e.g. locales/fr/validations.yaml

    Schema (per language file):
      <validation_name>:
        <error_name>: <error message>
    """
    translations_dict = {language: {} for language in languages}

    row_number = 2
    for validations in validations_by_name.values():
        for validation in validations:
            messages = _format_messages(validation.error_message)
            for language in languages:
                message = messages.get(language)
                LabelsGenerator.add_gender_or_base_translations(
                    language=language,
                    section=VALIDATIONS_LOCALES_NAMESPACE,
                    label_key=_translation_key(validation),
                    gender_dict=LabelsGenerator.expand_gender(message),
                    label=message,
                    extraSuffix="",
                    rowNumber=row_number,
                    translations_dict=translations_dict,
                )
            row_number += 1

    # Delete existing files first to avoid stale keys if some validations are removed
    LabelsGenerator.delete_all_labels_yaml_files(
        labels_output_folder_path=labels_output_folder_path,
        languages=list(languages),
        sections=[VALIDATIONS_LOCALES_NAMESPACE],
    )

    for language, translations in translations_dict.items():
        LabelsGenerator.save_translations(
            language,
            VALIDATIONS_LOCALES_NAMESPACE,
            labels_output_folder_path,
            translations,
        )


def generate_validations(
    survey_definition: SurveyDefinition,
    output_file: str,
    labels_output_folder_path: str | None = None,
) -> None:
    """
    Write validations.ts (one exported ValidationFunction per validation_name)
    and, when `labels_output_folder_path` is given, the
    locales/<language>/validations.yaml error messages.

    Args:
        survey_definition: Already-validated survey definition, read for its
            Validations table and its languages.
        output_file: TypeScript file to write.
        labels_output_folder_path: The survey's locales folder, or None to skip the
            error messages.
    """
    try:
        is_ts_file(output_file)  # Check if the output file is a TypeScript file

        validations_by_name = survey_definition.validations.by_name()

        ts_code = _generate_typescript_code(validations_by_name)
        with open(output_file, mode="w", encoding="utf-8", newline="\n") as ts_file:
            ts_file.write(ts_code)
        print(f"Generated {output_file} successfully")

        if labels_output_folder_path is not None:
            _generate_validations_yaml_locales(
                validations_by_name,
                languages=survey_definition.languages,
                labels_output_folder_path=labels_output_folder_path,
            )

    except Exception as e:
        print(f"An error occurred: {e}")
        raise e
