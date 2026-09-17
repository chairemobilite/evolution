# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Reusable per-cell checks for SurveyData column specs (see scripts/generate_survey_data.py).
# Each check takes the cell's own (already-non-None) value, plus the full row it came
# from (for checks that depend on a sibling column; unused by most checks here), and
# returns True when the value is valid, False when it isn't. The docstring's first
# line doubles as the error message collect_row_issues() reports on failure.

import re

_TS_IDENTIFIER_PATTERN = re.compile(r"^[a-zA-Z_$][a-zA-Z0-9_$]*$")
_PATH_CHARS_PATTERN = re.compile(r"^[a-zA-Z0-9_.{}]+$")


def valid_ts_identifier(value, row: dict) -> bool:
    """Must be a valid TypeScript identifier (letters, digits, '_' or '$', not starting with a digit)."""
    return bool(_TS_IDENTIFIER_PATTERN.match(str(value)))


def valid_path_chars(value, row: dict) -> bool:
    """Must only contain characters allowed in a survey response path: a-z, A-Z, 0-9, _, ., {, }."""
    return bool(_PATH_CHARS_PATTERN.match(str(value)))


def non_blank(value, row: dict) -> bool:
    """Must not be an empty/whitespace-only string."""
    return not (isinstance(value, str) and value.strip() == "")


def ends_with_underscore(value, row: dict) -> bool:
    """Must end with an underscore ('_'), e.g. 'h_'."""
    return str(value).endswith("_")


def valid_conditional_name(value, row: dict) -> bool:
    """Must end with 'Conditional' or 'CustomConditional' (e.g. 'hasHouseholdSize1Conditional', 'isCompleteCustomConditional')."""
    return str(value).endswith("Conditional")


def requires_titles_when_true(value, row: dict) -> bool:
    """When true, this row's title_fr and title_en must also be set."""
    if value is not True:
        return True
    return bool(row.get("title_fr")) and bool(row.get("title_en"))
