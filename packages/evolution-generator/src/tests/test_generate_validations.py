# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for scripts/generate_validations.py: validations.ts and the
# locales/<language>/validations.yaml error messages.

import os
import re

import pytest  # pyright: ignore[reportMissingImports]

from scripts.generate_validations import (
    _error_condition,
    _generate_import_statements,
    _generate_typescript_code,
    _generate_validation_typescript,
    generate_validations,
)
from survey_definition.survey_definition import SurveyDefinition
from survey_definition.validations_definition import (
    GENERATED_VALIDATIONS_IMPORTS,
    ValidationDefinition,
    Validations,
)
from tests.parametrize_cases import cases


def validations_row(
    *,
    validation_name="personAgeValidation",
    error_name="tooHigh",
    path=None,
    comparison_operator=">",
    value=120,
    error_message_fr="Trop élevé",
    error_message_en="Too high",
    is_warning=None,
) -> dict:
    """A row of the Validations sheet, keyed by its column names, from named parameters."""
    return {
        "validation_name": validation_name,
        "error_name": error_name,
        "path": path,
        "comparison_operator": comparison_operator,
        "value": value,
        "error_message::fr": error_message_fr,
        "error_message::en": error_message_en,
        "is_warning": is_warning,
    }


def validation(**columns) -> ValidationDefinition:
    """One checked row of the Validations sheet (see validations_row)."""
    return ValidationDefinition.model_validate(
        validations_row(**columns), context={"languages": ("fr", "en")}
    )


def validations_by_name(*rows: dict) -> dict[str, list[ValidationDefinition]]:
    return Validations.model_validate(
        list(rows), context={"languages": ("fr", "en")}
    ).by_name()


@pytest.fixture()
def output_paths(tmp_path):
    """Per-test output paths under pytest's `tmp_path` (see test_generate_choices.py)."""
    return {
        "tsx": str(tmp_path / "validations.ts"),
        "locales": str(tmp_path / "locales"),
        "fr_yaml": str(tmp_path / "locales" / "fr" / "validations.yaml"),
        "en_yaml": str(tmp_path / "locales" / "en" / "validations.yaml"),
    }


def read_file(path: str) -> str:
    with open(path, mode="r", encoding="utf-8") as file:
        return file.read()


class TestErrorCondition:
    """The TypeScript expression that is true when a row's error is shown."""

    @cases(
        dict(
            id="isBlank, the only one checked on a blank answer",
            comparison_operator="isBlank",
            value=None,
            expected="_isBlank(value)",
        ),
        dict(
            id="isNotInteger",
            comparison_operator="isNotInteger",
            value=None,
            expected="!_isBlank(value) && !Number.isInteger(Number(value))",
        ),
        dict(
            id="> a number",
            comparison_operator=">",
            value=18,
            expected="!_isBlank(value) && Number(value) > 18",
        ),
        dict(
            id="< a float",
            comparison_operator="<",
            value=0.5,
            expected="!_isBlank(value) && Number(value) < 0.5",
        ),
        dict(
            id=">= a negative number",
            comparison_operator=">=",
            value=-1,
            expected="!_isBlank(value) && Number(value) >= -1",
        ),
        dict(
            id="<= zero",
            comparison_operator="<=",
            value=0,
            expected="!_isBlank(value) && Number(value) <= 0",
        ),
        dict(
            id="=== a number, compared as numbers",
            comparison_operator="===",
            value=2,
            expected="!_isBlank(value) && Number(value) === 2",
        ),
        dict(
            id="!== a text",
            comparison_operator="!==",
            value="yes",
            expected='!_isBlank(value) && value !== "yes"',
        ),
        dict(
            id="=== a text with a quote",
            comparison_operator="===",
            value="l'auto",
            expected='!_isBlank(value) && value === "l\'auto"',
        ),
        dict(
            id="=== a bool",
            comparison_operator="===",
            value=True,
            expected="!_isBlank(value) && value === true",
        ),
    )
    def test_writes_the_condition_of_each_operator(
        self, comparison_operator, value, expected
    ):
        row = validation(comparison_operator=comparison_operator, value=value)
        assert _error_condition(row) == expected

    @cases(
        dict(
            id="a response path",
            path="household.size",
            answer="surveyHelper.getResponse(interview, 'household.size')",
        ),
        dict(
            id="relative path",
            path="${relativePath}.hasCar",
            answer="surveyHelper.getResponse(interview, `${relativePath}.hasCar`)",
        ),
        dict(
            id="current person",
            path="${currentPerson}.age",
            answer=(
                "surveyHelper.getResponse(interview, "
                "`household.persons.${currentPersonId}.age`)"
            ),
        ),
        dict(
            id="current journey",
            path="${currentJourney}.name",
            answer=(
                "surveyHelper.getResponse(interview, `household.persons."
                "${currentPersonId}.journeys.${currentJourneyId}.name`)"
            ),
        ),
        dict(
            id="current trip",
            path="${currentTrip}.mode",
            answer=(
                "surveyHelper.getResponse(interview, `household.persons."
                "${currentPersonId}.journeys.${currentJourneyId}.trips."
                "${currentTripId}.mode`)"
            ),
        ),
        dict(
            id="current segment",
            path="${currentSegment}.mode",
            answer=(
                "surveyHelper.getResponse(interview, `household.persons."
                "${currentPersonId}.journeys.${currentJourneyId}.trips."
                "${currentTripId}.segments.${currentSegmentId}.mode`)"
            ),
        ),
        dict(
            id="current visited place",
            path="${currentVisitedPlace}.activity",
            answer=(
                "surveyHelper.getResponse(interview, `household.persons."
                "${currentPersonId}.journeys.${currentJourneyId}.visitedPlaces."
                "${currentVisitedPlaceId}.activity`)"
            ),
        ),
    )
    def test_checks_the_answer_at_the_path(self, path, answer):
        row = validation(path=path, comparison_operator=">", value=2)
        assert _error_condition(row) == (f"!_isBlank({answer}) && Number({answer}) > 2")


class TestGenerateValidationTypescript:
    """One exported ValidationFunction per validation_name."""

    def test_returns_one_error_per_row_in_source_order(self):
        rows = validations_by_name(
            validations_row(
                error_name="required", comparison_operator="isBlank", value=None
            ),
            validations_row(error_name="tooLow", comparison_operator="<", value=0),
            validations_row(error_name="tooHigh", is_warning=True),
        )["personAgeValidation"]
        assert _generate_validation_typescript("personAgeValidation", rows) == (
            "export const personAgeValidation: ValidationFunction = (value) => {\n"
            "    return [\n"
            "        {\n"
            "            validation: _isBlank(value),\n"
            "            errorMessage: (t: TFunction) => "
            "t('validations:personAgeValidation.required')\n"
            "        },\n"
            "        {\n"
            "            validation: !_isBlank(value) && Number(value) < 0,\n"
            "            errorMessage: (t: TFunction) => "
            "t('validations:personAgeValidation.tooLow')\n"
            "        },\n"
            "        {\n"
            "            validation: !_isBlank(value) && Number(value) > 120,\n"
            "            errorMessage: (t: TFunction) => "
            "t('validations:personAgeValidation.tooHigh'),\n"
            "            isWarning: true\n"
            "        }\n"
            "    ];\n"
            "};\n"
        )

    @cases(
        dict(
            id="only the answer of the widget",
            paths=[None],
            parameters="(value)",
        ),
        dict(
            id="the widget's answer and a response path",
            paths=[None, "household.size"],
            parameters="(value, _customValue, interview)",
        ),
        dict(
            id="only response paths",
            paths=["household.size"],
            parameters="(_value, _customValue, interview)",
        ),
        dict(
            id="a relative path",
            paths=["${relativePath}.hasCar"],
            parameters="(_value, _customValue, interview, path)",
        ),
        dict(
            id="a current context path",
            paths=[None, "${currentPerson}.age"],
            parameters="(value, _customValue, interview, path)",
        ),
    )
    def test_names_only_the_parameters_it_uses(self, paths, parameters):
        rows = [
            validation(error_name=f"error{index}", path=path)
            for index, path in enumerate(paths)
        ]
        code = _generate_validation_typescript("personAgeValidation", rows)
        assert code.startswith(
            f"export const personAgeValidation: ValidationFunction = {parameters} => {{\n"
        )

    def test_declares_the_relative_path(self):
        code = _generate_validation_typescript(
            "noCarValidation", [validation(path="${relativePath}.hasCar")]
        )
        assert (
            "    const relativePath = path.substring(0, path.lastIndexOf('.')); "
            "// Remove the last key from the path\n"
        ) in code

    @cases(
        dict(
            id="current person",
            path="${currentPerson}.age",
            declared=["currentPersonId"],
        ),
        dict(
            id="current trip, and the ids before it",
            path="${currentTrip}.mode",
            declared=["currentPersonId", "currentJourneyId", "currentTripId"],
        ),
        dict(
            id="current visited place, and the ids before it",
            path="${currentVisitedPlace}.activity",
            declared=["currentPersonId", "currentJourneyId", "currentVisitedPlaceId"],
        ),
    )
    def test_declares_the_ids_of_the_current_context(self, path, declared):
        code = _generate_validation_typescript(
            "contextValidation", [validation(path=path)]
        )
        declared_ids = [
            line.split(" = ")[0].removeprefix("    const ")
            for line in code.splitlines()
            if line.startswith("    const ")
        ]
        assert declared_ids == declared
        assert (
            "    const currentPersonId = odSurveyHelpers.getCurrentPersonId("
            "{ interview, path }); // Get the current person id\n"
        ) in code

    def test_does_not_declare_anything_without_paths(self):
        code = _generate_validation_typescript("personAgeValidation", [validation()])
        assert "const " not in code.split("return [")[0].split("=>", 1)[1]

    @cases(
        dict(
            id="nickname",
            message="{{nickname}} est trop âgé",
            expected=(
                "const nickname = _escape(activePerson?.nickname || "
                "t('survey:noNickname'));"
            ),
        ),
        dict(
            id="count",
            message="Vous êtes {{count}} personnes",
            expected="count: countPersons,",
        ),
        dict(
            id="gender",
            message="Il est {{gender:trop âgé/trop âgée}}",
            expected="context: activePerson?.gender || activePerson?.sexAssignedAtBirth,",
        ),
    )
    def test_gives_the_message_its_context(self, message, expected):
        code = _generate_validation_typescript(
            "personAgeValidation", [validation(error_message_fr=message)]
        )
        assert (
            "errorMessage: (t: TFunction, interview, path) => {\n" in code
            and expected in code
        )


class TestGenerateTypescriptCode:
    """The whole validations.ts file, and the imports it needs."""

    BASE_IMPORTS = (
        "import { TFunction } from 'i18next';\n"
        "import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';\n"
        "import { type ValidationFunction } from "
        "'evolution-common/lib/services/questionnaire/types';\n"
    )
    SURVEY_HELPER = (
        "import * as surveyHelper from 'evolution-common/lib/utils/helpers';"
    )
    OD_SURVEY_HELPERS = "import * as odSurveyHelpers from 'evolution-common/lib/services/odSurvey/helpers';"
    ESCAPE = "import _escape from 'lodash/escape';"

    def test_starts_with_the_generator_comment_and_the_base_imports(self):
        code = _generate_typescript_code(validations_by_name(validations_row()))
        assert code.startswith("// This file was automatically generated")
        assert self.BASE_IMPORTS in code

    def test_imports_only_names_a_validation_name_cannot_take(self):
        # A validation_name that is an imported binding would redeclare it.
        imports = _generate_import_statements(
            needs_survey_helper_import=True,
            needs_od_survey_helpers_import=True,
            needs_escape_import=True,
        )
        bindings = set()
        for line in imports.splitlines():
            names = re.match(
                r"import (?:\{ (?:type )?(\w+) \}|\* as (\w+)|(\w+)) from", line
            )
            bindings.add(next(name for name in names.groups() if name))
        assert bindings == GENERATED_VALIDATIONS_IMPORTS

    def test_writes_an_empty_sheet_as_imports_only(self):
        code = _generate_typescript_code({})
        assert code.endswith(self.BASE_IMPORTS)

    @cases(
        dict(
            id="no path, no message context",
            columns={},
            survey_helper=False,
            od_survey_helpers=False,
            escape=False,
        ),
        dict(
            id="a response path",
            columns={"path": "household.size"},
            survey_helper=True,
            od_survey_helpers=False,
            escape=False,
        ),
        dict(
            id="a relative path",
            columns={"path": "${relativePath}.hasCar"},
            survey_helper=True,
            od_survey_helpers=False,
            escape=False,
        ),
        dict(
            id="a current context path",
            columns={"path": "${currentPerson}.age"},
            survey_helper=True,
            od_survey_helpers=True,
            escape=False,
        ),
        dict(
            id="a nickname in a message",
            columns={"error_message_en": "{{nickname}} is too old"},
            survey_helper=False,
            od_survey_helpers=True,
            escape=True,
        ),
        dict(
            id="a count in a message",
            columns={"error_message_en": "{{count}} persons"},
            survey_helper=False,
            od_survey_helpers=True,
            escape=False,
        ),
    )
    def test_imports_only_what_it_uses(
        self, columns, survey_helper, od_survey_helpers, escape
    ):
        code = _generate_typescript_code(
            validations_by_name(validations_row(**columns))
        )
        assert (self.SURVEY_HELPER in code) is survey_helper
        assert (self.OD_SURVEY_HELPERS in code) is od_survey_helpers
        assert (self.ESCAPE in code) is escape

    def test_exports_each_validation_in_order_of_first_appearance(self):
        code = _generate_typescript_code(
            validations_by_name(
                validations_row(validation_name="yearValidation"),
                validations_row(validation_name="personAgeValidation"),
                validations_row(
                    validation_name="yearValidation",
                    error_name="tooLow",
                    comparison_operator="<",
                    value=1910,
                ),
            )
        )
        exported = [
            line.split(":")[0].removeprefix("export const ")
            for line in code.splitlines()
            if line.startswith("export const ")
        ]
        assert exported == ["yearValidation", "personAgeValidation"]


class TestGenerateValidations:
    """The public entry point: validations.ts and the locales."""

    def _survey_definition(self, *rows: dict) -> SurveyDefinition:
        return SurveyDefinition(languages=("fr", "en"), validations=list(rows))

    def test_writes_the_typescript_and_one_yaml_file_per_language(self, output_paths):
        generate_validations(
            self._survey_definition(validations_row()),
            output_paths["tsx"],
            labels_output_folder_path=output_paths["locales"],
        )
        assert "export const personAgeValidation: ValidationFunction" in read_file(
            output_paths["tsx"]
        )
        assert "personAgeValidation:\n    tooHigh: Trop élevé\n" in read_file(
            output_paths["fr_yaml"]
        )
        assert "personAgeValidation:\n    tooHigh: Too high\n" in read_file(
            output_paths["en_yaml"]
        )

    def test_skips_the_locales_without_a_locales_folder(self, output_paths):
        generate_validations(
            self._survey_definition(validations_row()), output_paths["tsx"]
        )
        assert os.path.isfile(output_paths["tsx"])
        assert not os.path.exists(output_paths["locales"])

    def test_writes_the_messages_in_source_order(self, output_paths):
        generate_validations(
            self._survey_definition(
                validations_row(validation_name="yearValidation", error_name="tooLow"),
                validations_row(
                    error_name="required",
                    comparison_operator="isBlank",
                    value=None,
                    error_message_en="Required",
                ),
                validations_row(
                    validation_name="yearValidation",
                    error_name="tooHigh",
                    comparison_operator=">",
                    value=2026,
                ),
            ),
            output_paths["tsx"],
            labels_output_folder_path=output_paths["locales"],
        )
        assert read_file(output_paths["en_yaml"]).endswith(
            "yearValidation:\n"
            "    tooLow: Too high\n"
            "    tooHigh: Too high\n"
            "personAgeValidation:\n"
            "    required: Required\n"
        )

    @cases(
        dict(
            id="bold",
            message="**Trop** élevé",
            expected="tooHigh: <strong>Trop</strong> élevé",
        ),
        dict(
            id="interpolation kept",
            message="{{nickname}} est trop âgé",
            expected="tooHigh: '{{nickname}} est trop âgé'",
        ),
        dict(
            id="gender",
            message="Trop {{gender:âgé/âgée}}",
            expected="tooHigh: Trop âgé\n    tooHigh_female: Trop âgée",
        ),
    )
    def test_formats_the_messages_like_the_labels(
        self, output_paths, message, expected
    ):
        generate_validations(
            self._survey_definition(validations_row(error_message_fr=message)),
            output_paths["tsx"],
            labels_output_folder_path=output_paths["locales"],
        )
        assert expected in read_file(output_paths["fr_yaml"])

    def test_removes_the_messages_of_a_previous_generation(self, output_paths):
        generate_validations(
            self._survey_definition(validations_row(validation_name="oldValidation")),
            output_paths["tsx"],
            labels_output_folder_path=output_paths["locales"],
        )
        generate_validations(
            self._survey_definition(validations_row()),
            output_paths["tsx"],
            labels_output_folder_path=output_paths["locales"],
        )
        assert "oldValidation" not in read_file(output_paths["en_yaml"])

    def test_removes_the_messages_when_the_sheet_is_empty(self, output_paths):
        generate_validations(
            self._survey_definition(validations_row()),
            output_paths["tsx"],
            labels_output_folder_path=output_paths["locales"],
        )
        generate_validations(
            self._survey_definition(),
            output_paths["tsx"],
            labels_output_folder_path=output_paths["locales"],
        )
        assert not os.path.exists(output_paths["en_yaml"])
        assert "export const" not in read_file(output_paths["tsx"])

    def test_rejects_an_output_file_that_is_not_typescript(self, output_paths):
        with pytest.raises(Exception):
            generate_validations(
                self._survey_definition(validations_row()), "validations.js"
            )
