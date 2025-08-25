# Copyright 2025, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

from scripts.generate_labels import (
    expand_gender,
    LabelFormatter,
    get_labels_file_path,
    add_gender_or_base_translations,
)
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


# TODO: test delete_all_labels_yaml_files (check that generate_labels() call this function only once)
# TODO: test add_translation
# TODO: test merged_section_translations
# TODO: test save_translations
# TODO: test_deleteYamlFile
# TODO: test_addTranslation
# TODO: test_saveTranslations
# TODO: test_addTranslationsFromExcel
# TODO: test add_translations_from_excel


class TestAddGenderOrBaseTranslations:
    """Tests for add_gender_or_base_translations function"""

    def test_with_gender_dict(self, monkeypatch):
        """
        Test add_gender_or_base_translations with a gender dictionary.
        Should add appropriate entries to the translations dictionary.
        """
        # Mock the add_translation function to record calls
        calls = []

        def mock_add_translation(
            language, section, path, value, rowNumber, translations
        ):
            calls.append((language, section, path, value, rowNumber, translations))

        monkeypatch.setattr(
            "scripts.generate_labels.add_translation", mock_add_translation
        )

        # Setup test data
        language = "fr"
        section = "test_section"
        path = "test.path"
        gender_dict = {
            "male": "homme",
            "female": "femme",
            "custom": "personne",
            "other": "personne",
        }
        extraSuffix = ""
        rowNumber = 1
        translations_dict = {"fr": {}, "en": {}}

        # Call the function
        add_gender_or_base_translations(
            language,
            section,
            path,
            gender_dict,
            None,
            extraSuffix,
            rowNumber,
            translations_dict,
        )

        # Verify the calls to add_translation
        assert len(calls) == 3  # Should have 2 calls (other and female)
        assert calls[0] == (
            "fr",
            "test_section",
            "test.path",
            "personne",
            1,
            {},
        )  # Default 'other' value
        assert calls[1] == (
            "fr",
            "test_section",
            "test.path_male",
            "homme",
            1,
            {},
        )  # Male value differs
        assert calls[2] == (
            "fr",
            "test_section",
            "test.path_female",
            "femme",
            1,
            {},
        )  # Female value differs

    def test_with_label_only(self, monkeypatch):
        """
        Test add_gender_or_base_translations with a label only (no gender dictionary).
        Should add a single entry to the translations dictionary.
        """
        # Mock the add_translation function to record calls
        calls = []

        def mock_add_translation(
            language, section, path, value, rowNumber, translations
        ):
            calls.append((language, section, path, value, rowNumber, translations))

        monkeypatch.setattr(
            "scripts.generate_labels.add_translation", mock_add_translation
        )

        # Setup test data
        language = "en"
        section = "test_section"
        path = "test.path"
        gender_dict = None
        label = "Test label"
        extraSuffix = ""
        rowNumber = 1
        translations_dict = {"fr": {}, "en": {}}

        # Call the function
        from scripts.generate_labels import add_gender_or_base_translations

        add_gender_or_base_translations(
            language,
            section,
            path,
            gender_dict,
            label,
            extraSuffix,
            rowNumber,
            translations_dict,
        )

        # Verify the calls to add_translation
        assert len(calls) == 1  # Should have only one call
        assert calls[0] == ("en", "test_section", "test.path", "Test label", 1, {})

    def test_with_all_different_genders(self, monkeypatch):
        """
        Test add_gender_or_base_translations with all gender values different from "other".
        Should add entries for all gender types.
        """
        # Mock the add_translation function to record calls
        calls = []

        def mock_add_translation(
            language, section, path, value, rowNumber, translations
        ):
            calls.append((language, section, path, value, rowNumber, translations))

        monkeypatch.setattr(
            "scripts.generate_labels.add_translation", mock_add_translation
        )

        # Setup test data
        language = "fr"
        section = "test_section"
        path = "test.path"
        gender_dict = {
            "male": "étudiant",
            "female": "étudiante",
            "custom": "étudiant·e",
            "other": "étudiant/e",
        }
        extraSuffix = ""
        rowNumber = 1
        translations_dict = {"fr": {}, "en": {}}

        # Call the function
        from scripts.generate_labels import add_gender_or_base_translations

        add_gender_or_base_translations(
            language,
            section,
            path,
            gender_dict,
            None,
            extraSuffix,
            rowNumber,
            translations_dict,
        )

        # Verify the calls to add_translation
        assert len(calls) == 4  # Should have 4 calls (other, male, female, custom)
        assert calls[0] == (
            "fr",
            "test_section",
            "test.path",
            "étudiant/e",
            1,
            {},
        )  # Default 'other' value
        assert calls[1] == (
            "fr",
            "test_section",
            "test.path_male",
            "étudiant",
            1,
            {},
        )  # Male value
        assert calls[2] == (
            "fr",
            "test_section",
            "test.path_female",
            "étudiante",
            1,
            {},
        )  # Female value
        assert calls[3] == (
            "fr",
            "test_section",
            "test.path_custom",
            "étudiant·e",
            1,
            {},
        )  # Custom value

    def test_with_all_same_genders(self, monkeypatch):
        """
        Test add_gender_or_base_translations with all gender values identical to "other".
        Should add only default entries.
        """
        # Mock the add_translation function to record calls
        calls = []

        def mock_add_translation(
            language, section, path, value, rowNumber, translations
        ):
            calls.append((language, section, path, value, rowNumber, translations))

        monkeypatch.setattr(
            "scripts.generate_labels.add_translation", mock_add_translation
        )

        # Setup test data
        language = "fr"
        section = "test_section"
        path = "test.path"
        gender_dict = {
            "male": "moustique",
            "female": "moustique",
            "custom": "moustique",
            "other": "moustique",
        }
        extraSuffix = ""
        rowNumber = 1
        translations_dict = {"fr": {}, "en": {}}

        # Call the function
        from scripts.generate_labels import add_gender_or_base_translations

        add_gender_or_base_translations(
            language,
            section,
            path,
            gender_dict,
            None,
            extraSuffix,
            rowNumber,
            translations_dict,
        )

        # Verify the calls to add_translation
        assert len(calls) == 1  # Should have 4 calls (other, male, female, custom)
        assert calls[0] == (
            "fr",
            "test_section",
            "test.path",
            "moustique",
            1,
            {},
        )  # Default 'other' value

    def test_with_extra_suffix(self, monkeypatch):
        """
        Test add_gender_or_base_translations with an extra suffix.
        Should append the suffix to all keys.
        """
        # Mock the add_translation function to record calls
        calls = []

        def mock_add_translation(
            language, section, path, value, rowNumber, translations
        ):
            calls.append((language, section, path, value, rowNumber, translations))

        monkeypatch.setattr(
            "scripts.generate_labels.add_translation", mock_add_translation
        )

        # Setup test data
        language = "en"
        section = "test_section"
        path = "test.path"
        gender_dict = {
            "male": "actor",
            "female": "actress",
            "custom": "performer",
            "other": "performer",
        }
        extraSuffix = "_one"
        rowNumber = 1
        translations_dict = {"fr": {}, "en": {}}

        # Call the function
        from scripts.generate_labels import add_gender_or_base_translations

        add_gender_or_base_translations(
            language,
            section,
            path,
            gender_dict,
            None,
            extraSuffix,
            rowNumber,
            translations_dict,
        )

        # Verify the calls to add_translation
        assert len(calls) == 3  # Should have 3 calls (other, male, female)
        assert calls[0] == (
            "en",
            "test_section",
            "test.path_one",
            "performer",
            1,
            {},
        )  # Default with suffix
        assert calls[1] == (
            "en",
            "test_section",
            "test.path_male_one",
            "actor",
            1,
            {},
        )  # Male with suffix
        assert calls[2] == (
            "en",
            "test_section",
            "test.path_female_one",
            "actress",
            1,
            {},
        )  # Female with suffix

    def test_with_extra_suffix_and_previous_labels(self, monkeypatch):
        """
        Test add_gender_or_base_translations with an extra suffix and previous gendered labels.
        Only one translation string, but all genders should be added anyway as there are already strings with context
        """
        # Mock the add_translation function to record calls
        calls = []

        def mock_add_translation(
            language, section, path, value, rowNumber, translations
        ):
            calls.append((language, section, path, value, rowNumber, translations))

        monkeypatch.setattr(
            "scripts.generate_labels.add_translation", mock_add_translation
        )

        # Setup test data
        language = "en"
        section = "test_section"
        path = "test.path"
        gender_dict = None
        label = "Test label"
        extraSuffix = "_one"
        rowNumber = 1
        translations_dict = {
            "en": {
                "test_section": {
                    "test.path": "str",
                    "test.path_male": "strFemale",
                    "test.path_female": "strMale",
                    "test.path_custom": "strCustom",
                }
            },
            "fr": {},
        }

        # Call the function
        from scripts.generate_labels import add_gender_or_base_translations

        add_gender_or_base_translations(
            language,
            section,
            path,
            gender_dict,
            label,
            extraSuffix,
            rowNumber,
            translations_dict,
        )

        # Verify the calls to add_translation
        assert len(calls) == 4  # Should have 4 calls (other, male, female, custom)
        assert calls[0] == (
            "en",
            "test_section",
            "test.path_one",
            label,
            1,
            translations_dict[language],
        )  # Default with suffix
        assert calls[1] == (
            "en",
            "test_section",
            "test.path_male_one",
            label,
            1,
            translations_dict[language],
        )  # Male with suffix
        assert calls[2] == (
            "en",
            "test_section",
            "test.path_female_one",
            label,
            1,
            translations_dict[language],
        )  # Female with suffix
        assert calls[3] == (
            "en",
            "test_section",
            "test.path_custom_one",
            label,
            1,
            translations_dict[language],
        )  # Female with suffix

    def test_with_gender_same_and_extra_suffix_and_previous_labels(self, monkeypatch):
        """
        Test add_gender_or_base_translations with an extra suffix, gendered string and previous labels.
        All genders are the same, but should be added anyway as there are already strings with context
        """
        # Mock the add_translation function to record calls
        calls = []

        def mock_add_translation(
            language, section, path, value, rowNumber, translations
        ):
            calls.append((language, section, path, value, rowNumber, translations))

        monkeypatch.setattr(
            "scripts.generate_labels.add_translation", mock_add_translation
        )

        # Setup test data
        language = "en"
        section = "test_section"
        path = "test.path"
        gender_dict = {
            "male": "moustique",
            "female": "moustique",
            "custom": "moustique",
            "other": "moustique",
        }
        extraSuffix = "_one"
        rowNumber = 1
        translations_dict = {
            "en": {
                "test_section": {
                    "test.path": "str",
                    "test.path_male": "strFemale",
                    "test.path_female": "strMale",
                    "test.path_custom": "strCustom",
                }
            },
            "fr": {},
        }

        # Call the function
        from scripts.generate_labels import add_gender_or_base_translations

        add_gender_or_base_translations(
            language,
            section,
            path,
            gender_dict,
            None,
            extraSuffix,
            rowNumber,
            translations_dict,
        )

        # Verify the calls to add_translation
        assert len(calls) == 4  # Should have 4 calls (other, male, female, custom)
        assert calls[0] == (
            "en",
            "test_section",
            "test.path_one",
            "moustique",
            1,
            translations_dict[language],
        )  # Default with suffix
        assert calls[1] == (
            "en",
            "test_section",
            "test.path_male_one",
            "moustique",
            1,
            translations_dict[language],
        )  # Male with suffix
        assert calls[2] == (
            "en",
            "test_section",
            "test.path_female_one",
            "moustique",
            1,
            translations_dict[language],
        )  # Female with suffix
        assert calls[3] == (
            "en",
            "test_section",
            "test.path_custom_one",
            "moustique",
            1,
            translations_dict[language],
        )  # Custom with suffix


class TestExpandGender:
    """Tests for expand_gender function"""

    def test_expand_gender_basic(self):
        """
        Test expand_gender with a label containing both male and female suffixes.
        Should replace {{gender:t/te}} with 't' for male, custom and other and 'te' for female.
        """
        label = "Étudian{{gender:t/te}}"
        result = expand_gender(label)
        assert result["male"] == "Étudiant"
        assert result["female"] == "Étudiante"
        assert result["custom"] == "Étudiant"
        assert result["other"] == "Étudiant"

    def test_expand_gender_only_one_part(self):
        """
        Test expand_gender with a label containing only one part (female).
        Should replace {{gender:e}} with '' for male, custom and other and 'e' for female.
        """
        label = "Ami{{gender:e}}"
        result = expand_gender(label)
        assert result["male"] == "Ami"
        assert result["female"] == "Amie"
        assert result["custom"] == "Ami"
        assert result["other"] == "Ami"

    def test_expand_gender_two_parts(self):
        """
        Test expand_gender with a label containing two parts (male/female).
        Should replace {{gender:eur/rice}} with 'eur' for male, 'rice' for female, and 'eur' for custom and other.
        """
        label = "act{{gender:eur/rice}}"
        result = expand_gender(label)
        assert result["male"] == "acteur"
        assert result["female"] == "actrice"
        assert result["custom"] == "acteur"
        assert result["other"] == "acteur"

    def test_expand_gender_three_parts(self):
        """
        Test expand_gender with a label containing three parts (male/female/other).
        Should replace {{gender:/e/·e}} with '' for male, 'e' for female, '·e' for other and custom.
        """
        label = "Étudiant{{gender:/e/·e}}"
        result = expand_gender(label)
        assert result["male"] == "Étudiant"
        assert result["female"] == "Étudiante"
        assert result["custom"] == "Étudiant·e"
        assert result["other"] == "Étudiant·e"

    def test_expand_gender_four_parts(self):
        """
        Test expand_gender with a label containing four parts (male/female/custom/other).
        Should replace {{gender:a/b//d}} with 'a' for male, 'b' for female, '' for custom and 'd' for other.
        """
        label = "mot{{gender:a/b//d}}"
        result = expand_gender(label)
        assert result["male"] == "mota"
        assert result["female"] == "motb"
        assert result["custom"] == "mot"
        assert result["other"] == "motd"

    def test_expand_gender_four_parts_with_quotes(self):
        """
        Test expand_gender with a label containing four parts (male/female/custom/other), one of which has quotes.
        Should replace {{gender:il/elle/iel/"il/elle"}} with 'il' for male, 'elle' for female, 'iel' for custom and 'il/elle' for other.
        """
        label = '{{gender:il/elle/iel/"il/elle"}}'
        result = expand_gender(label)
        assert result["male"] == "il"
        assert result["female"] == "elle"
        assert result["custom"] == "iel"
        assert result["other"] == "il/elle"

    def test_expand_gender_with_quotes(self):
        """
        Test expand_gender with a label containing four parts (male/female/custom/other), with various quotes in it.
        """
        label = 'Test{{gender:\'single\'//"dou/ble with slash and escaped \\""/quote"in}}end'
        result = expand_gender(label)
        assert result["male"] == "Testsingleend"
        assert result["female"] == "Testend"
        assert result["custom"] == 'Testdou/ble with slash and escaped "end'
        assert result["other"] == 'Testquote"inend'

    def test_expand_gender_more_than_four_parts(self):
        """
        Test expand_gender with a label containing more than four parts.
        Only the first four should be used: male, female, custom, other.
        """
        label = "mot{{gender:a/b/c/d/e}}"
        result = expand_gender(label)
        assert result["male"] == "mota"
        assert result["female"] == "motb"
        assert result["custom"] == "motc"
        assert result["other"] == "motd"
        assert set(result.keys()) == {
            "male",
            "female",
            "custom",
            "other",
        }  # Ensure no extra keys are present

    def test_expand_gender_multiple_occurrences(self):
        """
        Test expand_gender with a label containing multiple gender replacements with multiple patterns.
        Should replace all occurrences accordingly.
        """
        label = "Étudiant{{gender:/e/·e}} ou act{{gender:eur/rice}}"
        result = expand_gender(label)
        assert result["male"] == "Étudiant ou acteur"
        assert result["female"] == "Étudiante ou actrice"
        assert result["custom"] == "Étudiant·e ou acteur"
        assert result["other"] == "Étudiant·e ou acteur"

    def test_expand_gender_no_gender(self):
        """
        Test expand_gender with a label that does not contain any gender context.
        Should return None.
        """
        label = "Bonjour"
        result = expand_gender(label)
        assert result is None

    def test_expand_gender_with_space_after_gender(self):
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
