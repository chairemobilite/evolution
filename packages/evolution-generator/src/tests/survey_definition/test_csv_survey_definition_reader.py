# Copyright Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for survey_definition/csv_survey_definition_reader.py.

import pytest  # pyright: ignore[reportMissingImports]

from survey_definition.csv_survey_definition_reader import CsvSurveyDefinitionReader


def _write(folder, file_name: str, text: str, encoding: str = "utf-8") -> None:
    (folder / file_name).write_text(text, encoding=encoding, newline="")


class TestCsvSurveyDefinitionReader:
    def test_missing_folder_raises(self, tmp_path):
        with pytest.raises(Exception, match="CSV folder not found"):
            CsvSurveyDefinitionReader(str(tmp_path / "missing"))

    def test_reads_each_row_as_a_dict_keyed_by_the_headers(self, tmp_path):
        _write(
            tmp_path, "Choices.csv", "choicesName,value\r\nyesNo,yes\r\nyesNo,no\r\n"
        )
        reader = CsvSurveyDefinitionReader(str(tmp_path))
        assert reader.get_table("Choices", ["choicesName"]) == [
            {"choicesName": "yesNo", "value": "yes"},
            {"choicesName": "yesNo", "value": "no"},
        ]
        assert reader.warnings == []

    def test_an_empty_cell_is_none_and_values_are_text(self, tmp_path):
        _write(
            tmp_path,
            "InputRange.csv",
            "input_range_name,min_value,unit::fr\nslider,0,\n",
        )
        reader = CsvSurveyDefinitionReader(str(tmp_path))
        assert reader.get_table("InputRange", []) == [
            {"input_range_name": "slider", "min_value": "0", "unit::fr": None}
        ]

    def test_reads_quoted_cells_with_commas_and_line_breaks(self, tmp_path):
        _write(
            tmp_path,
            "Labels.csv",
            'namespace,key,text\nhome,intro,"Hello, ""you""\nthere"\n',
        )
        reader = CsvSurveyDefinitionReader(str(tmp_path))
        assert reader.get_table("Labels", [])[0]["text"] == 'Hello, "you"\nthere'

    def test_reads_a_file_with_a_byte_order_mark(self, tmp_path):
        """Excel's "CSV UTF-8" starts the file with a byte order mark."""
        _write(
            tmp_path, "Labels.csv", "namespace,key\nhome,intro\n", encoding="utf-8-sig"
        )
        reader = CsvSurveyDefinitionReader(str(tmp_path))
        assert reader.get_headers("Labels", ["namespace"]) == ["namespace", "key"]

    def test_drops_the_empty_rows_and_columns_after_the_data(self, tmp_path):
        _write(tmp_path, "Labels.csv", "namespace,key,,\nhome,intro,,\n,,,\n , ,,\n")
        reader = CsvSurveyDefinitionReader(str(tmp_path))
        assert reader.get_table("Labels", []) == [{"namespace": "home", "key": "intro"}]

    def test_keeps_the_empty_rows_between_rows_with_data(self, tmp_path):
        _write(tmp_path, "Labels.csv", "namespace,key\nhome,a\n,\nhome,b\n")
        reader = CsvSurveyDefinitionReader(str(tmp_path))
        assert reader.get_table("Labels", []) == [
            {"namespace": "home", "key": "a"},
            {"namespace": None, "key": None},
            {"namespace": "home", "key": "b"},
        ]

    def test_pads_short_rows_and_reads_cells_after_the_headers(self, tmp_path):
        _write(tmp_path, "Labels.csv", "namespace,key\nhome\nhome,b,note\n")
        reader = CsvSurveyDefinitionReader(str(tmp_path))
        assert reader.get_table("Labels", []) == [
            {"namespace": "home", "key": None, None: None},
            {"namespace": "home", "key": "b", None: "note"},
        ]

    def test_missing_required_table_raises(self, tmp_path):
        reader = CsvSurveyDefinitionReader(str(tmp_path))
        with pytest.raises(Exception, match=r"Missing Sections\.csv in CSV folder"):
            reader.get_table("Sections", ["section"])

    def test_missing_optional_table_is_empty(self, tmp_path):
        reader = CsvSurveyDefinitionReader(str(tmp_path))
        assert reader.get_table("InputRange", [], is_table_optional=True) == []

    def test_missing_required_field_raises(self, tmp_path):
        _write(tmp_path, "Labels.csv", "namespace\nhome\n")
        reader = CsvSurveyDefinitionReader(str(tmp_path))
        with pytest.raises(
            Exception, match="Missing expected header in Labels sheet: key"
        ):
            reader.get_table("Labels", ["namespace", "key"])

    def test_header_with_spaces_raises(self, tmp_path):
        _write(tmp_path, "Labels.csv", "namespace,the key\nhome,a\n")
        reader = CsvSurveyDefinitionReader(str(tmp_path))
        with pytest.raises(Exception, match="Header has spaces in Labels sheet"):
            reader.get_headers("Labels")

    def test_ignores_files_that_are_not_csv(self, tmp_path):
        _write(tmp_path, "README.md", "# Notes\n")
        reader = CsvSurveyDefinitionReader(str(tmp_path))
        assert reader.get_table("README", [], is_table_optional=True) == []

    def test_reads_the_languages_of_the_widgets_file(self, tmp_path):
        _write(tmp_path, "Widgets.csv", "question_name,label::fr,label::en\n")
        assert CsvSurveyDefinitionReader(str(tmp_path)).get_languages() == ("fr", "en")

    def test_widgets_file_without_label_columns_raises(self, tmp_path):
        _write(tmp_path, "Widgets.csv", "question_name\n")
        with pytest.raises(Exception, match="Missing label::<language> columns"):
            CsvSurveyDefinitionReader(str(tmp_path)).get_languages()
