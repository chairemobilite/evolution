# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: A helper to write parametrized tests with named parameters, so each value of a
# case says which parameter it is, instead of matching positions with the argnames.

from typing import Any

import pytest  # pyright: ignore[reportMissingImports]


def cases(*test_cases: dict[str, Any]) -> pytest.MarkDecorator:
    """
    Parametrize a test with named cases, e.g.

        @cases(
            dict(id="empty key", path="home..name"),
            dict(id="leading dot", path=".home"),
        )
        def test_reports_an_invalid_path(self, path): ...

    `id` names the case in the test report. The other keys are the test's parameters:
    every case must have the same ones.
    """
    names = [name for name in test_cases[0] if name != "id"]
    for test_case in test_cases:
        if "id" not in test_case or set(test_case) - {"id"} != set(names):
            raise ValueError(
                f"Each case needs an id and the parameters {names}, got {list(test_case)}"
            )
    return pytest.mark.parametrize(
        names,
        [
            pytest.param(*(test_case[name] for name in names), id=test_case["id"])
            for test_case in test_cases
        ],
    )
