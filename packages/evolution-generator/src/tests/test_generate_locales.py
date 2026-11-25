# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for scripts/generate_locales.py.

import pytest
import ruamel.yaml

from scripts.generate_locales import generate_locales
from scripts.labels_generator import LabelsGenerator
from survey_definition.choices_definition import CHOICES_LOCALES_NAMESPACE
from survey_definition.sections_definition import SECTION_TITLES_NAMESPACE
from survey_definition.survey_definition import SurveyDefinition
from tests.parametrize_cases import cases


def _widget(section, question_name, **labels) -> dict:
    """An active String widget row with these label columns, e.g. **{"label::fr": "Nom"}."""
    return {
        "question_name": question_name,
        "input_type": "String",
        "active": True,
        "section": section,
        "path": f"{section}.{question_name}",
        **labels,
    }


def _label(namespace, key, **labels) -> dict:
    """A Labels row with these label columns, e.g. **{"label::fr": "Merci"}."""
    return {"namespace": namespace, "key": key, **labels}


def _survey_definition(languages, widgets=(), labels=(), **tables) -> SurveyDefinition:
    """A SurveyDefinition with these rows, and the sections the widgets are in (unless given)."""
    section_names = list(dict.fromkeys(widget["section"] for widget in widgets))
    tables.setdefault(
        "sections",
        [
            {"section": name, "in_nav": False, "abbreviation": f"S{index}_"}
            for index, name in enumerate(section_names)
        ],
    )
    return SurveyDefinition(
        languages=languages, widgets=list(widgets), labels=list(labels), **tables
    )


def _generate_labels(survey_definition: SurveyDefinition, locales) -> None:
    """Write the locales of the labels script alone, as `generate_survey --only labels` does."""
    generate_locales(
        survey_definition,
        str(locales),
        LabelsGenerator.labels_namespaces(survey_definition),
    )


def _read(locales, language: str, namespace: str) -> dict:
    """The generated locales/<language>/<namespace>.yaml, without its header."""
    yaml_path = locales / language / f"{namespace}.yaml"
    return ruamel.yaml.YAML(typ="safe").load(yaml_path.read_text(encoding="utf-8"))


class TestWidgetsAndLabels:
    """The Widgets and Labels tables, in their own namespaces."""

    def test_writes_the_widgets_labels_in_their_section_namespace(self, tmp_path):
        survey_definition = _survey_definition(
            ("fr", "en"),
            widgets=[
                _widget(
                    "section1",
                    "section1Question1",
                    **{"label::fr": "personne", "label::en": "person"},
                ),
                _widget(
                    "section1",
                    "section1Question2",
                    **{"label::fr": "une question", "label::en": "a question"},
                ),
                _widget(
                    "section2",
                    "section2Question1",
                    **{"label::fr": "une autre", "label::en": "another"},
                ),
            ],
        )
        _generate_labels(survey_definition, tmp_path)

        assert _read(tmp_path, "fr", "section1") == {
            "section1Question1": "personne",
            "section1Question2": "une question",
        }
        assert _read(tmp_path, "en", "section2") == {"section2Question1": "another"}

    def test_writes_the_labels_rows_in_their_namespace(self, tmp_path):
        survey_definition = _survey_definition(
            ("fr", "en"),
            labels=[
                _label(
                    "home",
                    "some.path",
                    **{
                        "label::fr": "personne",
                        "label::en": "person",
                        "label_one::fr": "une personne",
                        "label_one::en": "one person",
                    },
                ),
                _label(
                    "end", "thanks", **{"label::fr": "Merci", "label::en": "Thanks"}
                ),
            ],
        )
        _generate_labels(survey_definition, tmp_path)

        assert _read(tmp_path, "fr", "home") == {
            "some": {"path": "personne", "path_one": "une personne"}
        }
        assert _read(tmp_path, "en", "end") == {"thanks": "Thanks"}

    def test_writes_the_widgets_and_labels_of_a_namespace_together(self, tmp_path):
        survey_definition = _survey_definition(
            ("fr",),
            widgets=[_widget("home", "q1", **{"label::fr": "Question"})],
            labels=[_label("home", "intro", **{"label::fr": "Bienvenue"})],
        )
        _generate_labels(survey_definition, tmp_path)

        assert _read(tmp_path, "fr", "home") == {"q1": "Question", "intro": "Bienvenue"}

    def test_writes_a_translation_per_survey_language(self, tmp_path):
        """Each survey language reads its own label::<language> column."""
        survey_definition = _survey_definition(
            ("es", "en"),
            widgets=[
                _widget(
                    "home",
                    "carCount",
                    **{
                        "label::es": "¿Cuántos?",
                        "label::en": "How many?",
                        "label_one::es": "¿Cuántos tienes?",
                        "label_one::en": "How many do you have?",
                    },
                )
            ],
        )
        _generate_labels(survey_definition, tmp_path)

        assert sorted(path.name for path in tmp_path.iterdir()) == ["en", "es"]
        assert _read(tmp_path, "es", "home") == {
            "carCount": "¿Cuántos?",
            "carCount_one": "¿Cuántos tienes?",
        }

    def test_deletes_the_previous_keys(self, tmp_path):
        (tmp_path / "fr").mkdir()
        (tmp_path / "fr" / "home.yaml").write_text("removed: Supprimée\n")
        survey_definition = _survey_definition(
            ("fr",), widgets=[_widget("home", "q1", **{"label::fr": "Question"})]
        )
        _generate_labels(survey_definition, tmp_path)

        assert _read(tmp_path, "fr", "home") == {"q1": "Question"}

    def test_deletes_the_file_of_a_section_whose_widgets_are_all_inactive(
        self, tmp_path
    ):
        """A section whose widgets were all made inactive loses the labels written before."""
        (tmp_path / "fr").mkdir()
        (tmp_path / "fr" / "end.yaml").write_text("q2: Q2 fr\n")
        old = {**_widget("end", "q2", **{"label::fr": "Q2 fr"}), "active": False}
        survey_definition = _survey_definition(
            ("fr",), widgets=[_widget("home", "q1", **{"label::fr": "Q1 fr"}), old]
        )
        _generate_labels(survey_definition, tmp_path)

        assert not (tmp_path / "fr" / "end.yaml").exists()
        assert (tmp_path / "fr" / "home.yaml").exists()


# One row of each sheet generating a namespace, with the keys it generates.
GENERATED_NAMESPACE_CASES = (
    dict(
        id="choices",
        namespace=CHOICES_LOCALES_NAMESPACE,
        tables={
            "choices": [
                {"choicesName": "yesNo", "value": "yes", "label::fr": "Oui"},
            ]
        },
        generated={"yesNo": {"yes": "Oui"}},
    ),
    dict(
        id="sectionConfigs",
        namespace=SECTION_TITLES_NAMESPACE,
        tables={
            "sections": [
                {
                    "section": "home",
                    "in_nav": True,
                    "abbreviation": "HM_",
                    "title_fr": "Domicile",
                }
            ]
        },
        generated={"home": {"title": "Domicile"}},
    ),
)


class TestGeneratedNamespaces:
    """A namespace generated from another sheet, which the Labels table can add keys to."""

    @cases(*GENERATED_NAMESPACE_CASES)
    def test_writes_the_labels_rows_with_the_generated_keys_whichever_script_runs(
        self, tmp_path, namespace, tables, generated
    ):
        """Running only the sheet's script, or only the labels script, gives the same file."""
        survey_definition = _survey_definition(
            ("fr",),
            labels=[_label(namespace, "extra.text", **{"label::fr": "**Ajout**"})],
            **tables,
        )
        expected = {**generated, "extra": {"text": "<strong>Ajout</strong>"}}

        generate_locales(survey_definition, str(tmp_path / "sheet"), [namespace])
        _generate_labels(survey_definition, tmp_path / "labels")

        assert _read(tmp_path / "sheet", "fr", namespace) == expected
        assert _read(tmp_path / "labels", "fr", namespace) == expected

    @cases(*GENERATED_NAMESPACE_CASES)
    def test_writes_the_generated_keys_alone_without_labels_rows(
        self, tmp_path, namespace, tables, generated
    ):
        survey_definition = _survey_definition(("fr",), **tables)
        generate_locales(survey_definition, str(tmp_path), [namespace])

        assert _read(tmp_path, "fr", namespace) == generated

    @cases(
        dict(id="same key", key="yesNo.yes", overlapping_key="yesNo.yes"),
        dict(id="parent of a generated key", key="yesNo", overlapping_key="yesNo.yes"),
        dict(
            id="child of a generated key",
            key="yesNo.yes.detail",
            overlapping_key="yesNo.yes",
        ),
        dict(
            id="generated label_one",
            key="yesNo.yes_one",
            overlapping_key="yesNo.yes_one",
        ),
    )
    def test_refuses_a_labels_key_overlapping_a_generated_key(
        self, tmp_path, key, overlapping_key
    ):
        """One of them would silently be dropped; the previous files are left as they were."""
        (tmp_path / "fr").mkdir()
        (tmp_path / "fr" / "choices.yaml").write_text("previous: Précédent\n")
        survey_definition = _survey_definition(
            ("fr",),
            choices=[
                {
                    "choicesName": "yesNo",
                    "value": "yes",
                    "label::fr": "Oui",
                    "label_one::fr": "Un oui",
                }
            ],
            labels=[
                _label("home", "intro", **{"label::fr": "Bienvenue"}),
                _label("choices", key, **{"label::fr": "Autre"}),
            ],
        )

        with pytest.raises(ValueError) as error:
            generate_locales(
                survey_definition, str(tmp_path), [CHOICES_LOCALES_NAMESPACE]
            )

        assert str(error.value) == (
            f"Labels row 3: the key '{key}' of the choices namespace overlaps "
            f"'{overlapping_key}', generated from the Choices sheet: use another key"
        )
        assert _read(tmp_path, "fr", "choices") == {"previous": "Précédent"}

    def test_accepts_a_labels_key_sharing_only_a_prefix_with_a_generated_key(
        self, tmp_path
    ):
        """'yesNo.yesterday' is a sibling of 'yesNo.yes', not one of its children."""
        survey_definition = _survey_definition(
            ("fr",),
            choices=[{"choicesName": "yesNo", "value": "yes", "label::fr": "Oui"}],
            labels=[_label("choices", "yesNo.yesterday", **{"label::fr": "Hier"})],
        )
        generate_locales(survey_definition, str(tmp_path), [CHOICES_LOCALES_NAMESPACE])

        assert _read(tmp_path, "fr", "choices") == {
            "yesNo": {"yes": "Oui", "yesterday": "Hier"}
        }
