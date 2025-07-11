# Copyright 2025, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

from scripts.generate_labels import expand_gender, LabelFormatter, get_labels_file_path
import importlib


def test_label_formatter_bold():
    """
    Test LabelFormatter.replace with bold notation.
    """
    assert (
        LabelFormatter.replace("This is **important**.")
        == "This is <strong>important</strong>."
    )
    assert (
        LabelFormatter.replace("**Bold** and **again**")
        == "<strong>Bold</strong> and <strong>again</strong>"
    )


def test_label_formatter_oblique():
    """
    Test LabelFormatter.replace with oblique notation.
    """
    assert (
        LabelFormatter.replace("This is __oblique__.")
        == 'This is <span class="_pale _oblique">oblique</span>.'
    )
    assert (
        LabelFormatter.replace("__Oblique__ and __again__")
        == '<span class="_pale _oblique">Oblique</span> and <span class="_pale _oblique">again</span>'
    )


def test_label_formatter_green():
    """
    Test LabelFormatter.replace with green notation.
    """
    assert (
        LabelFormatter.replace("This is _green_green_green_.")
        == 'This is <span style="color: green;">green</span>.'
    )
    assert (
        LabelFormatter.replace("_green_yes_green_ and _green_no_green_")
        == '<span style="color: green;">yes</span> and <span style="color: green;">no</span>'
    )


def test_label_formatter_red():
    """
    Test LabelFormatter.replace with red notation.
    """
    assert (
        LabelFormatter.replace("This is _red_red_red_.")
        == 'This is <span style="color: red;">red</span>.'
    )
    assert (
        LabelFormatter.replace("_red_stop_red_ and _red_go_red_")
        == '<span style="color: red;">stop</span> and <span style="color: red;">go</span>'
    )


def test_label_formatter_newline():
    """
    Test LabelFormatter.replace with newlines.
    """
    assert LabelFormatter.replace("Line 1\nLine 2") == "Line 1<br />Line 2"


def test_label_formatter_combined():
    """
    Test LabelFormatter.replace with a string containing all supported notations.
    Should correctly replace bold, oblique, green, red, and preserve order.
    """
    label = "**Bold** and __oblique__ and _green_green_green_ and _red_red_red_."
    expected = (
        '<strong>Bold</strong> and <span class="_pale _oblique">oblique</span> and '
        '<span style="color: green;">green</span> and <span style="color: red;">red</span>.'
    )
    result = LabelFormatter.replace(label)
    assert result == expected


def test_label_formatter_unmatched_notation():
    """
    Test LabelFormatter.replace with unmatched notations (odd count).
    Should not replace.
    """
    assert LabelFormatter.replace("**unmatched") == "**unmatched"
    assert LabelFormatter.replace("__unmatched") == "__unmatched"
    assert LabelFormatter.replace("_green_unmatched") == "_green_unmatched"
    assert LabelFormatter.replace("_red_unmatched") == "_red_unmatched"


def test_get_labels_file_path_widgets():
    """
    Test get_labels_file_path returns path ending with {section}.yaml.
    """
    path = get_labels_file_path(
        labels_output_folder_path="../../example/demo_generator",
        language="fr",
        section="section1",
    )
    assert path == "../../example/demo_generator/fr/section1.yaml"


# TODO: test_delete_yaml_file
# TODO: test delete_all_labels_yaml_files (check that generate_labels() call this function only once)
# TODO: test add_translation
# TODO: test merged_section_translations
# TODO: test save_translations


def test_removed_files_global_multiple_entries():
    """
    Test that removed_files_global can track multiple (language, section) entries.
    """

    # Import the module fresh to reset the global
    generate_labels_mod = importlib.import_module("scripts.generate_labels")
    generate_labels_mod.removed_files_global.clear()

    # Add multiple entries
    generate_labels_mod.removed_files_global.add(("fr", "section1"))
    generate_labels_mod.removed_files_global.add(("en", "section2"))
    generate_labels_mod.removed_files_global.add(("fr", "section3"))
    assert ("fr", "section1") in generate_labels_mod.removed_files_global
    assert ("en", "section2") in generate_labels_mod.removed_files_global
    assert ("fr", "section3") in generate_labels_mod.removed_files_global
    assert len(generate_labels_mod.removed_files_global) == 3

    # Clear and check
    generate_labels_mod.removed_files_global.clear()
    assert generate_labels_mod.removed_files_global == set()


# TODO: test_deleteYamlFile
# TODO: test_addTranslation
# TODO: test_saveTranslations
# TODO: test_addTranslationsFromExcel
# TODO: test add_translations_from_excel


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


def test_expand_gender_with_space_after_gender():
    """
    Test expand_gender with a label containing a space after 'gender' ({{gender :...}}).
    Should replace correctly for all forms.
    """
    label = "Étudian{{gender :t/te/t·e}}"
    result = expand_gender(label)
    assert result["male"] == "Étudiant"
    assert result["female"] == "Étudiante"
    assert result["other"] == "Étudiant·e"


# TODO: test string_to_yaml


def test_merged_section_translations_merges_non_conflicting():
    """
    Test merged_section_translations merges non-conflicting keys.
    """
    from scripts.generate_labels import merged_section_translations

    a = {"home.region": "What is your region?", "home.country": "What is your country?"}
    b = {
        "home.city": "What is your city?",
        "home.zip": "What is your postal code?",
    }
    result = merged_section_translations(a.copy(), b)
    assert result == {
        "home.region": "What is your region?",
        "home.country": "What is your country?",
        "home.city": "What is your city?",
        "home.zip": "What is your postal code?",
    }


def test_merged_section_translations_warns_on_conflict(capsys):
    """
    Test merged_section_translations prints warning and keeps first value on conflict.
    """
    from scripts.generate_labels import merged_section_translations

    a = {"home.region": "What is your region?", "home.country": "What is your country?"}
    b = {
        "home.region": "Quelle est votre région?",
        "home.city": "Quelle est votre ville?",
    }
    result = merged_section_translations(a.copy(), b)
    assert result["home.region"] == "What is your region?"  # Should keep original value
    assert result["home.city"] == "Quelle est votre ville?"
    assert result["home.country"] == "What is your country?"
    captured = capsys.readouterr()
    assert "WARNING" in captured.out
    assert "key='home.region'" in captured.out


def test_merged_section_translations_merges_nested_dicts(capsys):
    """
    Test merged_section_translations merges nested dicts and warns on nested conflict.
    """
    from scripts.generate_labels import merged_section_translations

    a = {"home": {"region": "What is your region?", "country": "What is your country?"}}
    b = {
        "home": {
            "region": "Quelle est votre région?",
            "city": "Quelle est votre ville?",
            "zip": "Quel est votre code postal? M5V 2T6",
        }
    }
    result = merged_section_translations(a.copy(), b)
    assert (
        result["home"]["region"] == "What is your region?"
    )  # Should keep original value
    assert result["home"]["city"] == "Quelle est votre ville?"
    assert result["home"]["zip"] == "Quel est votre code postal? M5V 2T6"
    assert result["home"]["country"] == "What is your country?"
    captured = capsys.readouterr()
    assert "WARNING" in captured.out
    assert "key='region'" in captured.out


# TODO: test generate_labels
