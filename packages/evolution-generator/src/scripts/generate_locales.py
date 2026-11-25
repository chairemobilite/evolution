# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: This script writes the locales files, locales/<language>/<namespace>.yaml.
# It is intended to be invoked from the generate_survey.py script, once, after the
# other scripts.
#
# A namespace's file can get its translations from many sheets: the sheet that
# generates it (e.g. Choices for choices.yaml), the Widgets sheet (a section's
# namespace) and the Labels sheet (any namespace). Each file is rewritten from scratch,
# so keys of removed rows don't stay behind, with the translations of all these sheets,
# whichever script asked for it: running only the choices or only the labels script
# then gives the same choices.yaml.
from collections.abc import Callable, Iterable

from scripts.generate_choices import choices_translations
from scripts.generate_input_range import input_range_translations
from scripts.generate_section_configs import section_titles_translations
from scripts.labels_generator import LabelRow, LabelsGenerator
from survey_definition.choices_definition import CHOICES_LOCALES_NAMESPACE
from survey_definition.input_range_definition import INPUT_RANGE_LOCALES_NAMESPACE
from survey_definition.sections_definition import SECTION_TITLES_NAMESPACE
from survey_definition.survey_definition import SurveyDefinition

# The namespaces generated from another sheet than Widgets and Labels, with that
# sheet's name and the function returning its translations: for each survey language,
# the YAML values by their dot-separated key in the namespace.
GENERATED_NAMESPACES: dict[
    str, tuple[str, Callable[[SurveyDefinition], dict[str, dict]]]
] = {
    CHOICES_LOCALES_NAMESPACE: ("Choices", choices_translations),
    SECTION_TITLES_NAMESPACE: ("Sections", section_titles_translations),
    INPUT_RANGE_LOCALES_NAMESPACE: ("InputRange", input_range_translations),
}


def _keys_overlap(key: str, other_key: str) -> bool:
    """Whether two dot-separated keys would write the same YAML value, e.g. 'yesNo.yes' and 'yesNo'."""
    return (
        key == other_key
        or key.startswith(f"{other_key}.")
        or other_key.startswith(f"{key}.")
    )


def _check_no_generated_key(
    label_rows: list[LabelRow],
    namespace: str,
    sheet: str,
    generated_translations: dict[str, dict],
    languages: tuple[str, ...],
):
    """
    Check that the Labels rows of a generated namespace don't write a key generated
    from its sheet: one of them would silently be dropped.

    Raises:
        ValueError: naming the Labels row and the key it shares with the sheet.
    """
    generated_keys = {
        key for translations in generated_translations.values() for key in translations
    }
    for label_row in label_rows:
        row_translations: dict[str, dict] = {language: {} for language in languages}
        LabelsGenerator.add_label_rows_translations(
            [label_row], languages, row_translations
        )
        row_keys = {
            key
            for translations in row_translations.values()
            for key in translations.get(namespace, {})
        }
        for key in sorted(row_keys):
            generated_key = next(
                (
                    generated_key
                    for generated_key in sorted(generated_keys)
                    if _keys_overlap(key, generated_key)
                ),
                None,
            )
            if generated_key is not None:
                raise ValueError(
                    f"Labels row {label_row.row_number}: the key '{key}' of the "
                    f"{namespace} namespace overlaps '{generated_key}', generated from "
                    f"the {sheet} sheet: use another key"
                )


def namespace_translations(
    survey_definition: SurveyDefinition, namespace: str
) -> dict[str, dict]:
    """
    All the translations of a namespace: for each survey language, the YAML values by
    their dot-separated key, from the sheet that generates it, if any, then the Widgets
    and Labels rows in this namespace.
    """
    languages = survey_definition.languages
    label_rows = [
        label_row
        for label_row in LabelsGenerator.label_rows(survey_definition)
        if label_row.namespace == namespace
    ]
    generated_translations: dict[str, dict] = {}
    if namespace in GENERATED_NAMESPACES:
        sheet, get_translations = GENERATED_NAMESPACES[namespace]
        generated_translations = get_translations(survey_definition)
        _check_no_generated_key(
            LabelsGenerator.label_rows_from_labels(survey_definition.labels),
            namespace,
            sheet,
            generated_translations,
            languages,
        )

    translations_dict = {
        language: {namespace: dict(generated_translations.get(language, {}))}
        for language in languages
    }
    LabelsGenerator.add_label_rows_translations(
        label_rows, languages, translations_dict
    )
    return {
        language: translations[namespace]
        for language, translations in translations_dict.items()
    }


def generate_locales(
    survey_definition: SurveyDefinition,
    labels_output_folder_path: str,
    namespaces: Iterable[str],
):
    """
    Rewrite locales/<language>/<namespace>.yaml for each of `namespaces` and each
    survey language, with all its translations (see namespace_translations). The
    translations are all built before any file is deleted, so an error leaves the
    previous files as they were.

    Args:
        survey_definition: Already-validated survey definition.
        labels_output_folder_path: The survey's locales folder.
        namespaces: The namespaces to rewrite, e.g. the ones of the scripts that ran.
    """
    translations_by_namespace = {
        namespace: namespace_translations(survey_definition, namespace)
        for namespace in sorted(namespaces)
    }
    for namespace, translations_by_language in translations_by_namespace.items():
        LabelsGenerator.regenerate_labels_yaml_files(
            labels_output_folder_path,
            survey_definition.languages,
            namespace,
            translations_by_language,
        )
