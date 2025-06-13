# Copyright 2025, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

from scripts.generate_labels import expand_gender


def test_expand_gender_basic():
    """
    Test expand_gender with a label containing both male and female suffixes.
    Should replace {{gender:t/te}} with 't' for male and 'te' for female.
    """
    label = "Étudian{{gender:t/te}}"
    result = expand_gender(label)
    assert result["male"] == "Étudiant"
    assert result["female"] == "Étudiante"


def test_expand_gender_only_one_part():
    """
    Test expand_gender with a label containing only one part (female).
    Should replace {{gender:e}} with '' for male, 'e' for female and '' for other.
    """
    label = "Ami{{gender:e}}"
    result = expand_gender(label)
    assert result["male"] == "Ami"
    assert result["female"] == "Amie"
    assert result["other"] == "Ami"


def test_expand_gender_two_parts():
    """
    Test expand_gender with a label containing two parts (male/female).
    Should replace {{gender:eur/rice}} with 'eur' for male, 'rice' for female, and '' for other.
    """
    label = "act{{gender:eur/rice}}"
    result = expand_gender(label)
    assert result["male"] == "acteur"
    assert result["female"] == "actrice"
    assert result["other"] == "act"


def test_expand_gender_three_parts():
    """
    Test expand_gender with a label containing three parts (male/female/other).
    Should replace {{gender:/e/t·e}} with '' for male, 'e' for female, '·e' for other.
    """
    label = "Étudiant{{gender:/e/·e}}"
    result = expand_gender(label)
    assert result["male"] == "Étudiant"
    assert result["female"] == "Étudiante"
    assert result["other"] == "Étudiant·e"


def test_expand_gender_more_than_three_parts():
    """
    Test expand_gender with a label containing more than three parts.
    Only the first three should be used: male, female, other.
    """
    label = "mot{{gender:a/b/c/d/e}}"
    result = expand_gender(label)
    assert result["male"] == "mota"
    assert result["female"] == "motb"
    assert result["other"] == "motc"
    assert set(result.keys()) == {
        "male",
        "female",
        "other",
    }  # Ensure no extra keys are present


def test_expand_gender_multiple_occurrences():
    """
    Test expand_gender with a label containing multiple gender replacements.
    Should replace all occurrences accordingly.
    """
    label = "Étudian{{gender:t/te/t·e}} ou act{{gender:eur/rice/eur·rice}}"
    result = expand_gender(label)
    assert result["male"] == "Étudiant ou acteur"
    assert result["female"] == "Étudiante ou actrice"
    assert result["other"] == "Étudiant·e ou acteur·rice"


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
