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
        field_name = str(error["loc"][0])
        issues.append(
            f"{prefix}Invalid {field_name} in row {row_number}: {error['input']!r} - {reason}"
        )

    return issues


def _strip_blanks(row: dict) -> dict:
    """Drop None/"" values, so a blank value looks like a genuinely absent key to Pydantic."""
    return {key: value for key, value in row.items() if value not in (None, "")}


def _raise_if_check_fails(check, value, row: dict) -> None:
    """Run a survey_field_checks-style (value, row) -> bool check; raise ValueError using its docstring on failure."""
    if not check(value, row):
        reason = (check.__doc__ or check.__name__).strip().splitlines()[0]
        raise ValueError(reason)
