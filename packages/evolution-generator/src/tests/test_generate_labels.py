# Copyright 2025, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

from scripts.generate_labels import expand_gender


def test_expand_gender_basic():
    """
    Test expand_gender with a label containing both man and woman suffixes.
    Should replace {{gender:t/te}} with 't' for man and 'te' for woman.
    """
    label = "Étudian{{gender:t/te}}"
    result = expand_gender(label)
    assert result["man"] == "Étudiant"
    assert result["woman"] == "Étudiante"


def test_expand_gender_only_woman():
    """
    Test expand_gender with a label containing only one part (woman).
    Should replace {{gender:/e}} with '' for man and 'e' for woman.
    """
    label = "Ami{{gender:/e}}"
    result = expand_gender(label)
    assert result["man"] == "Ami"
    assert result["woman"] == "Amie"


def test_expand_gender_only_suffix():
    """
    Test expand_gender with a label containing only one part (woman).
    Should replace {{gender:e}} with '' for man and 'e' for woman.
    """
    label = "Ami{{gender:e}}"
    result = expand_gender(label)
    assert result["man"] == "Ami"
    assert result["woman"] == "Amie"


def test_expand_gender_multiple_occurrences():
    """
    Test expand_gender with a label containing multiple gender replacements.
    Should replace all occurrences accordingly.
    """
    label = "Étudian{{gender:t/te}} ou act{{gender:eur/rice}}"
    result = expand_gender(label)
    assert result["man"] == "Étudiant ou acteur"
    assert result["woman"] == "Étudiante ou actrice"


def test_expand_gender_no_gender():
    """
    Test expand_gender with a label that does not contain any gender context.
    Should return None.
    """
    label = "Bonjour"
    result = expand_gender(label)
    assert result is None


# TODO: test_addTranslation
# TODO: test_deleteYamlFile
# TODO: test_saveTranslations
# TODO: test_addTranslationsFromExcel
# TODO: test_stringToYaml
# TODO: test_generate_labels
