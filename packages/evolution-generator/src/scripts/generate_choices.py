# Copyright 2024, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script includes functions that generate the choices.tsx file.
# These functions are intended to be invoked from the generate_survey.py script.
from helpers.generator_helpers import (
    INDENT,
    add_generator_comment,
    generate_label_typescript_with_context,
    get_label_context_flags,
    is_ts_file,
)
from scripts.labels_generator import LabelFormatter, LabelsGenerator
from survey_definition.choices_definition import ChoiceDefinition
from survey_definition.survey_definition import SURVEY_LANGUAGES, SurveyDefinition


def _format_labels(labels: dict[str, str]) -> dict[str, str]:
    """
    Apply the same label formatting rules as labels generation to each language's label.
    """
    return {
        language: LabelFormatter.replace(label) for language, label in labels.items()
    }


def _get_choice_label_context_flags(
    choice: ChoiceDefinition,
) -> tuple[bool, bool, bool, bool]:
    """
    Detect whether a choice's labels, in any language, require dynamic i18n context
    (see get_label_context_flags).
    """
    return get_label_context_flags(
        labels=_format_labels(choice.label).values(),
        labels_one=_format_labels(choice.label_one).values(),
    )


def _generate_choice_label_typescript(
    choice_name: str, value_key: str, choice: ChoiceDefinition
) -> str:
    """
    Generate the `label` field for a ChoiceType element.

    If the choice translations don't require any dynamic context, this returns a
    simple `(t) => t('choices:...')`.

    Otherwise, it returns a full TranslatableStringFunction `(t, interview, path) => {...}`
    compatible with evolution-common's I18nData type.
    """
    translation_key = f"choices:{choice_name}.{value_key}"
    has_nickname, has_count, has_gender_context, has_label_one = (
        _get_choice_label_context_flags(choice)
    )

    # Generate the TypeScript code for the label property with optional runtime context.
    return generate_label_typescript_with_context(
        property_name="label",
        translation_key=translation_key,
        base_indent=INDENT * 2,
        has_nickname=has_nickname,
        has_count=has_count,
        has_gender_context=has_gender_context,
        has_label_one=has_label_one,
        gender_context_expression="activePerson?.gender || activePerson?.sexAssignedAtBirth",
    )


def _get_conditional_typescript(conditional: str) -> str:
    """
    The TypeScript expression for a choice's conditional: a name ending with
    'CustomConditional' is in customConditionals.tsx, any other in conditionals.tsx.
    """
    if conditional.endswith("CustomConditional"):
        return f"customConditionals.{conditional}"
    return f"conditionals.{conditional}"


def _generate_typescript_code(
    choices_by_name: dict[str, list[ChoiceDefinition]],
) -> str:
    """
    Generate the full TypeScript source for the `choices.tsx` output file.
    """
    choices = [choice for group in choices_by_name.values() for choice in group]
    # Spread rows don't add a choice of their own, so only the other rows count.
    own_choices = [choice for choice in choices if choice.spread_choices_name is None]

    # Determine whether we need extra imports for conditionals and dynamic label contexts.
    conditionals = [choice.conditional for choice in own_choices if choice.conditional]
    has_custom_conditionals_import = any(
        conditional.endswith("CustomConditional") for conditional in conditionals
    )
    has_conditionals_import = any(
        not conditional.endswith("CustomConditional") for conditional in conditionals
    )
    needs_escape_import = False
    needs_od_survey_helpers_import = False
    for choice in own_choices:
        has_nickname, has_count, has_gender_context, has_label_one = (
            _get_choice_label_context_flags(choice)
        )
        if has_nickname:
            needs_escape_import = True
        if has_nickname or has_count or has_gender_context or has_label_one:
            needs_od_survey_helpers_import = True

    ts_code: str = ""
    ts_code += add_generator_comment()
    ts_code += _generate_import_statements(
        has_conditionals_import=has_conditionals_import,
        has_custom_conditionals_import=has_custom_conditionals_import,
        needs_escape_import=needs_escape_import,
        needs_od_survey_helpers_import=needs_od_survey_helpers_import,
    )

    for choice_name, choices in choices_by_name.items():
        ts_code += f"export const {choice_name}: ChoiceType[] = [\n"
        for index, choice in enumerate(choices):
            if choice.spread_choices_name is not None:
                ts_code += f"{INDENT}...{choice.spread_choices_name}"
            else:
                value_str = str(choice.value)
                value_key = value_str.replace("'", "\\'")
                hidden_suffix = (
                    f",\n{INDENT}{INDENT}hidden: true" if choice.hidden else ""
                )
                conditional_comma = "," if choice.conditional is not None else ""
                label_ts = _generate_choice_label_typescript(
                    choice_name=choice_name, value_key=value_key, choice=choice
                )
                ts_code += (
                    f"{INDENT}{{\n"
                    f"{INDENT}{INDENT}value: '{value_key}',\n"
                    f"{label_ts}{hidden_suffix}"
                    f"{conditional_comma}\n"
                )
                if choice.conditional is not None:
                    ts_code += (
                        f"{INDENT}{INDENT}conditional: "
                        f"{_get_conditional_typescript(choice.conditional)},\n"
                    )

                ts_code += f"{INDENT}}}"
            if index < len(choices) - 1:
                ts_code += ","
            ts_code += "\n"
        ts_code += "];\n\n"

    return ts_code


def _generate_choices_yaml_locales(
    choices_by_name: dict[str, list[ChoiceDefinition]],
    languages: tuple[str, ...],
    labels_output_folder_path: str,
):
    """
    Generate locales choices YAML files containing the labels for each choice, one per
    survey language.

    Output:
      <surveyRoot>/locales/<language>/choices.yaml, e.g. locales/fr/choices.yaml

    Schema (per language file):
      <choicesName>:
        <value>: <label>
    """
    # Reuse the exact same translation-key generation behavior as labels generation.
    # We build a flat translations dict first (like LabelsGenerator does), then convert to
    # the nested choices.yaml schema expected by the frontend.
    translations_dict = {language: {} for language in languages}

    # Preserve source order: choices_by_name keeps the rows top-down.
    rowNumber = 2
    for choice_name, choices in choices_by_name.items():
        for choice in choices:
            # Skip spread rows: their labels come from the spread source
            if choice.spread_choices_name is not None:
                continue
            label_key = f"{choice_name}.{choice.value}"
            labels = _format_labels(choice.label)
            labels_one = _format_labels(choice.label_one)

            # Add translations for the choice with gender and count suffixes
            for language in languages:
                for label, extra_suffix in (
                    (labels.get(language), ""),
                    (labels_one.get(language), "_one"),
                ):
                    LabelsGenerator.add_gender_or_base_translations(
                        language=language,
                        section="choices",
                        label_key=label_key,
                        gender_dict=LabelsGenerator.expand_gender(label),
                        label=label,
                        extraSuffix=extra_suffix,
                        rowNumber=rowNumber,
                        translations_dict=translations_dict,
                    )

            rowNumber += 1  # Increment row number

    # Delete existing files first to avoid stale keys if some choices are removed
    LabelsGenerator.delete_all_labels_yaml_files(
        labels_output_folder_path=labels_output_folder_path,
        languages=list(languages),
        sections=["choices"],
    )

    # Save translations
    for language, translations in translations_dict.items():
        LabelsGenerator.save_translations(
            language,
            "choices",
            labels_output_folder_path,
            translations,
        )


# Function to generate choices.tsx
def generate_choices(
    survey_definition: SurveyDefinition,
    output_file: str,
    labels_output_folder_path: str | None = None,
):
    """
    Write choices.tsx (one exported ChoiceType[] list per choicesName) and, when
    `labels_output_folder_path` is given, the locales/<language>/choices.yaml labels.

    Args:
        survey_definition: Already-validated survey definition, read for its Choices
            table.
        output_file: TypeScript file to write.
        labels_output_folder_path: The survey's locales folder, or None to skip the
            labels.
    """
    try:
        is_ts_file(output_file)  # Check if the output file is an TypeScript file

        choices_by_name = survey_definition.choices.by_name()

        # Generate TypeScript code
        ts_code = _generate_typescript_code(choices_by_name=choices_by_name)

        # Write TypeScript code to a file
        with open(output_file, mode="w", encoding="utf-8", newline="\n") as ts_file:
            ts_file.write(ts_code)

        print(f"Generated {output_file} successfully")

        # Generate locales/<lang>/choices.yaml files
        if labels_output_folder_path is not None:
            _generate_choices_yaml_locales(
                choices_by_name,
                languages=SURVEY_LANGUAGES,
                labels_output_folder_path=labels_output_folder_path,
            )

    except Exception as e:
        # Handle any other exceptions that might occur during script execution
        print(f"An error occurred: {e}")
        raise e


# Generate import statement if needed
def _generate_import_statements(
    has_conditionals_import,
    has_custom_conditionals_import,
    needs_escape_import: bool = False,
    needs_od_survey_helpers_import: bool = False,
):
    escape_import = (
        "import _escape from 'lodash/escape';\n" if needs_escape_import else ""
    )
    od_survey_helpers_import = (
        "import * as odSurveyHelpers from 'evolution-common/lib/services/odSurvey/helpers';\n"
        if needs_od_survey_helpers_import
        else ""
    )
    conditionals_import = (
        "// " if not has_conditionals_import else ""
    ) + "import * as conditionals from './conditionals';\n"
    custom_conditionals_import = (
        "// " if not has_custom_conditionals_import else ""
    ) + "import * as customConditionals from './customConditionals';\n"
    return (
        f"import {{ TFunction }} from 'i18next';\n"
        f"import {{ type ChoiceType }} from 'evolution-common/lib/services/questionnaire/types';\n"
        f"{escape_import}"
        f"{od_survey_helpers_import}"
        f"{conditionals_import}"
        f"{custom_conditionals_import}\n"
    )
