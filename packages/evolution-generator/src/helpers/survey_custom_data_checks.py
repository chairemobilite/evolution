# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Reusable per-cell checks for SurveyData column specs (see scripts/generate_survey_data.py).
# Each check takes a single, already-non-None cell value and returns True when the
# value is valid, False when it isn't. The docstring's first line doubles as the
# error message collect_row_issues() reports on failure.

import re

_TS_IDENTIFIER_PATTERN = re.compile(r"^[a-zA-Z_$][a-zA-Z0-9_$]*$")
_PATH_CHARS_PATTERN = re.compile(r"^[a-zA-Z0-9_.{}]+$")


def valid_ts_identifier(value) -> bool:
    """Must be a valid TypeScript identifier (letters, digits, '_' or '$', not starting with a digit)."""
    return bool(_TS_IDENTIFIER_PATTERN.match(str(value)))


def valid_path_chars(value) -> bool:
    """Must only contain characters allowed in a survey response path: a-z, A-Z, 0-9, _, ., {, }."""
    return bool(_PATH_CHARS_PATTERN.match(str(value)))


def non_blank(value) -> bool:
    """Must not be an empty/whitespace-only string."""
    return not (isinstance(value, str) and value.strip() == "")


def ends_with_underscore(value) -> bool:
    """Must end with an underscore ('_'), e.g. 'h_'."""
    return str(value).endswith("_")
