# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: What a table can receive through Pydantic's validation context: the information
# a rule needs but that the table doesn't have by itself, e.g. the survey languages.
# Each table's module keeps all its rules and reads that information from the context;
# SurveyDefinition only validates the tables in order and passes each one its context
# (see survey_definition.py).

from pydantic import ValidationInfo


def context_languages(info: ValidationInfo) -> tuple[str, ...]:
    """
    The survey languages from the validation context.

    Raises RuntimeError when they are missing, e.g. `Sections(rows)` with a row in the
    navigation menu: a table built on its own needs them passed, e.g.
    `Sections.model_validate(rows, context={"languages": ("fr", "en")})`. This is an
    error in the code calling it, not in the survey, so it isn't reported as a row
    problem. Call it only where a rule needs the languages, so a table that doesn't
    (e.g. an empty one) can still be built without them.
    """
    context = info.context or {}
    if "languages" not in context:
        raise RuntimeError(
            "The survey languages are missing from the validation context: build "
            "the table through SurveyDefinition, or pass them, e.g. "
            "Sections.model_validate(rows, context={'languages': ('fr', 'en')})."
        )
    return context["languages"]
