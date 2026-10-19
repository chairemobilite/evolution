# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Machinery shared by every table's definition module (sections_definition.py, ...):
# checking that the source provides the required field names, and turning one row into
# a definition model, with its problems reported in the Generator's error message format.

from pydantic import ValidationError


def check_required_field_names(
    field_names: list[str], expected_field_names: tuple[str, ...], table_name: str
) -> None:
    """
    Raise if any name in `expected_field_names` is missing from `field_names`.

    Separate from Pydantic's own required-field checking, since a field can be
    required to exist in the source while still allowing a blank value (e.g. parent_section).
    """
    if len(field_names) < len(expected_field_names):
        raise Exception(
            f"Too few fields in {table_name}: expected at least "
            f"{len(expected_field_names)} ({', '.join(expected_field_names)}), "
            f"got {len(field_names)}"
        )

    for expected in expected_field_names:
        if expected not in field_names:
            raise Exception(f"Missing expected field in {table_name}: {expected}")


def format_pydantic_errors(
    exc: ValidationError, table_name: str, row_number: int
) -> list[str]:
    """Convert a ValidationError from parsing one row into our "Error in ... row N" message format."""
    prefix = f"Error in {table_name} - "
    errors = exc.errors(include_url=False)

    # An error with an empty `loc` comes from a rule on the whole row (a model
    # validator), not from one field, so there is no field name or value to report.
    missing = [
        str(error["loc"][0])
        for error in errors
        if error["type"] == "missing" and error["loc"]
    ]
    issues: list[str] = []
    if missing:
        issues.append(
            f"{prefix}Required field is missing in row {row_number}. "
            f"Missing fields: {missing}"
        )

    for error in errors:
        if error["type"] == "missing":
            continue
        reason = error.get("ctx", {}).get("error", error["msg"])
        if not error["loc"]:
            issues.append(f"{prefix}Invalid row {row_number}: {reason}")
            continue
        # A per-language field (e.g. title) holds one entry per language, so its loc is
        # ("title", "fr"); name the field and language together, e.g. "title.fr".
        field_name = ".".join(str(part) for part in error["loc"])
        issues.append(
            f"{prefix}Invalid {field_name} in row {row_number}: {error['input']!r} - {reason}"
        )

    return issues


def _strip_blanks(row: dict) -> dict:
    """Drop None and empty/whitespace-only strings, so a blank value looks like a genuinely absent key to Pydantic."""
    return {
        key: value
        for key, value in row.items()
        if value is not None and not (isinstance(value, str) and not value.strip())
    }


def _collect_language_columns(row: dict, field_name: str, column_prefix: str) -> dict:
    """
    Move every `<column_prefix><language>` key of `row` into one dict under `field_name`,
    keyed by language, e.g. {"title_fr": "Accueil", "title_en": "Home"} becomes
    {"title": {"fr": "Accueil", "en": "Home"}}.

    This keeps a table's model the same whatever the survey languages are. Which
    languages must be present is checked by the table, from the survey languages in
    its validation context (see validation_context.py). A
    number is turned into text, since a spreadsheet stores a text like "1" as a
    number. Call it after _strip_blanks, so a blank cell is left out.
    """
    collected = {}
    rest = {}
    for key, value in row.items():
        if isinstance(key, str) and key.startswith(column_prefix):
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                value = str(value)
            collected[key.removeprefix(column_prefix)] = value
        else:
            rest[key] = value
    if collected:
        rest[field_name] = collected
    return rest


def _raise_if_check_fails(check, value, row: dict) -> None:
    """Run a survey_field_checks-style (value, row) -> bool check; raise ValueError using its docstring on failure."""
    if not check(value, row):
        reason = (check.__doc__ or check.__name__).strip().splitlines()[0]
        raise ValueError(reason)
