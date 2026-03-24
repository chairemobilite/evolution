#!/usr/bin/env python3
# Copyright 2026, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

import json
import sys

try:
    from scripts.conditionals import Conditionals
except ModuleNotFoundError:
    from conditionals import Conditionals


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "Missing excel file path argument"}))
        return 2

    excel_file_path = sys.argv[1]

    try:
        integrity_ok, errors = Conditionals().check_with_messages(excel_file_path)
        payload: dict = {
            "ok": True,
            "integrityOk": integrity_ok,
            "excelFilePath": excel_file_path,
        }
        if errors:
            payload["errors"] = errors
        print(json.dumps(payload))
        return 0
    except Exception as error:
        print(json.dumps({"ok": False, "error": str(error), "excelFilePath": excel_file_path}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
