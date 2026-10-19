# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: What a table can receive through Pydantic's validation context: the information
# a rule needs but that the table doesn't have by itself, e.g. the survey languages.
# Each table's module keeps all its rules and reads that information from the context;
# SurveyDefinition only validates the tables in order and passes each one its context
# (see survey_definition.py).

from pydantic import ValidationInfo

# Languages of a survey definition built without any, e.g. in tests.
DEFAULT_SURVEY_LANGUAGES: tuple[str, ...] = ("fr", "en")


def context_languages(info: ValidationInfo) -> tuple[str, ...]:
    """
    The survey languages from the validation context, or DEFAULT_SURVEY_LANGUAGES when
    a table is built on its own (no context, e.g. `Sections(rows)` in a test).
    """
    return (info.context or {}).get("languages", DEFAULT_SURVEY_LANGUAGES)
