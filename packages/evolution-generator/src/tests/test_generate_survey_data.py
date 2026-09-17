# Copyright, Polytechnique Montreal and contributors
# This file is licensed under the MIT License.
# License text available at https://opensource.org/licenses/MIT

# Note: Tests for scripts/generate_survey_data.py: the SurveyData shape (per-sheet
# dataclasses) and the shared header/row validation built on ColumnSpec.

import pytest  # pyright: ignore[reportMissingImports]

from scripts import generate_survey_data
from scripts.generate_survey_data import (
    CHOICE_COLUMN_SPECS,
    CONDITIONAL_COLUMN_SPECS,
    INPUT_RANGE_COLUMN_SPECS,
    LABEL_COLUMN_SPECS,
    SECTION_COLUMN_SPECS,
    WIDGET_COLUMN_SPECS,
    ChoiceData,
    ColumnReference,
    ColumnSpec,
    ConditionalData,
    InputRangeData,
    LabelData,
    SectionData,
    SurveyData,
    WidgetData,
    collect_row_issues,
    collect_sheet_issues,
    collect_survey_issues,
    validate_required_headers,
)


class TestDataclassShapes:
    def test_section_data_required_fields_and_defaults(self):
        section = SectionData(section="home", in_nav=True, abbreviation="HM_")
        assert section.title_fr is None
        assert section.parent_section is None

    def test_widget_data_required_fields_and_defaults(self):
        widget = WidgetData(
            question_name="householdSize",
            input_type="Number",
            section="home",
            path="household.size",
        )
        assert widget.active is None
        assert widget.label_fr is None
        assert widget.two_columns is None

    def test_choice_data_required_fields_and_defaults(self):
        choice = ChoiceData(choices_name="yesNo")
        assert choice.value is None
        assert choice.hidden is False

    def test_input_range_data_required_fields_and_defaults(self):
        input_range = InputRangeData(
            input_range_name="ageRange",
            label_fr_min="Min",
            label_fr_max="Max",
            label_en_min="Min",
            label_en_max="Max",
            min_value=0,
            max_value=100,
            unit_fr="ans",
            unit_en="years",
        )
        assert input_range.label_fr_middle is None
        assert input_range.input_color is None

    def test_conditional_data_required_fields_and_defaults(self):
        conditional = ConditionalData(
            conditional_name="hasHouseholdSize1",
            path="household.size",
            comparison_operator="===",
            value=1,
        )
        assert conditional.logical_operator is None
        assert conditional.value_when_hidden is None

    def test_label_data_required_fields_and_defaults(self):
        label = LabelData(namespace="app", key="pageTitle")
        assert label.label_fr is None
        assert label.label_one_en is None

    def test_survey_data_defaults_to_empty_lists(self):
        survey_data = SurveyData()
        assert survey_data.sections == []
        assert survey_data.widgets == []
        assert survey_data.choices == []
        assert survey_data.input_ranges == []
        assert survey_data.conditionals == []
        assert survey_data.labels == []

    def test_survey_data_holds_parsed_rows(self):
        survey_data = SurveyData(
            sections=[SectionData(section="home", in_nav=True, abbreviation="HM_")],
            widgets=[
                WidgetData(
                    question_name="q1",
                    input_type="Text",
                    section="home",
                    path="home.q1",
                )
            ],
        )
        assert len(survey_data.sections) == 1
        assert len(survey_data.widgets) == 1
        assert survey_data.choices == []


class TestValidateRequiredHeaders:
    @pytest.mark.parametrize(
        "case",
        [
            {
                "sheet_name": "Sections",
                "specs": SECTION_COLUMN_SPECS,
                "headers": [
                    "section",
                    "title_fr",
                    "title_en",
                    "in_nav",
                    "template",
                    "parent_section",
                    "abbreviation",
                ],
            },
            {
                "sheet_name": "Widgets",
                "specs": WIDGET_COLUMN_SPECS,
                "headers": [
                    "questionName",
                    "inputType",
                    "section",
                    "path",
                    "active",
                    "conditional",
                    "validation",
                    "inputRange",
                    "help_popup",
                    "choices",
                ],
            },
            {
                "sheet_name": "Choices",
                "specs": CHOICE_COLUMN_SPECS,
                "headers": [
                    "choicesName",
                    "value",
                    "label::fr",
                    "label::en",
                    "label_one::fr",
                    "label_one::en",
                    "spreadChoicesName",
                    "conditional",
                ],
            },
            {
                "sheet_name": "InputRange",
                "specs": INPUT_RANGE_COLUMN_SPECS,
                "headers": [
                    "inputRangeName",
                    "labelFrMin",
                    "labelFrMax",
                    "labelEnMin",
                    "labelEnMax",
                    "minValue",
                    "maxValue",
                    "unitFr",
                    "unitEn",
                ],
            },
            {
                "sheet_name": "Conditionals",
                "specs": CONDITIONAL_COLUMN_SPECS,
                "headers": ["conditional_name", "path", "comparison_operator", "value"],
            },
            {
                "sheet_name": "Labels",
                "specs": LABEL_COLUMN_SPECS,
                "headers": ["namespace", "key", "label::fr", "label::en"],
            },
        ],
        ids=lambda case: case["sheet_name"],
    )
    def test_passes_when_all_required_headers_present(self, case):
        # Extra/optional headers are ignored.
        validate_required_headers(
            headers=case["headers"] + ["someExtraColumn"],
            specs=case["specs"],
            sheet_name="TestSheet",
        )

    @pytest.mark.parametrize(
        "case",
        [
            {"sheet_name": "Sections", "specs": SECTION_COLUMN_SPECS},
            {"sheet_name": "Widgets", "specs": WIDGET_COLUMN_SPECS},
            {"sheet_name": "Choices", "specs": CHOICE_COLUMN_SPECS},
            {"sheet_name": "InputRange", "specs": INPUT_RANGE_COLUMN_SPECS},
            {"sheet_name": "Conditionals", "specs": CONDITIONAL_COLUMN_SPECS},
            {"sheet_name": "Labels", "specs": LABEL_COLUMN_SPECS},
        ],
        ids=lambda case: case["sheet_name"],
    )
    def test_raises_when_a_required_header_is_missing(self, case):
        # Keep the same header count (so the "too few columns" check doesn't fire instead)
        # but replace one required header with an unrelated name.
        specs = case["specs"]
        first_required_header = next(spec.header for spec in specs if spec.required)
        headers = [
            (
                spec.header
                if spec.header != first_required_header
                else "someUnrelatedColumn"
            )
            for spec in specs
            if spec.required
        ]

        with pytest.raises(Exception, match=first_required_header):
            validate_required_headers(
                headers=headers, specs=specs, sheet_name=case["sheet_name"]
            )

    def test_optional_headers_are_not_required(self):
        # Sections' optional columns (has_preload, enable_conditional, ...) may be entirely absent.
        validate_required_headers(
            headers=[
                "section",
                "title_fr",
                "title_en",
                "in_nav",
                "template",
                "parent_section",
                "abbreviation",
            ],
            specs=SECTION_COLUMN_SPECS,
            sheet_name="Sections",
        )


class TestCollectRowIssues:
    def _valid_widget_row(self) -> dict:
        return {
            "question_name": "householdSize",
            "input_type": "Number",
            "section": "home",
            "path": "household.size",
            "active": True,
            "conditional": "",
            "validation": "",
            "input_range": "",
            "help_popup": "",
            "choices": "",
        }

    def test_no_issues_for_a_fully_valid_row(self):
        issues = collect_row_issues(
            row=self._valid_widget_row(),
            specs=WIDGET_COLUMN_SPECS,
            sheet_name="Widgets",
            row_number=2,
        )
        assert issues == []

    def test_blank_optional_value_required_header_is_fine(self):
        # `conditional`/`validation`/etc. are required headers but may be blank per row.
        row = self._valid_widget_row()
        row["validation"] = None
        issues = collect_row_issues(
            row=row, specs=WIDGET_COLUMN_SPECS, sheet_name="Widgets", row_number=2
        )
        assert issues == []

    def test_reports_missing_required_value(self):
        row = self._valid_widget_row()
        row["path"] = None
        issues = collect_row_issues(
            row=row, specs=WIDGET_COLUMN_SPECS, sheet_name="Widgets", row_number=3
        )
        assert issues == [
            "Error in Widgets sheet - Required field is missing in row 3. "
            "Missing fields: ['path']"
        ]

    def test_reports_disallowed_value(self):
        row = self._valid_widget_row()
        row["input_type"] = "NotARealInputType"
        issues = collect_row_issues(
            row=row, specs=WIDGET_COLUMN_SPECS, sheet_name="Widgets", row_number=4
        )
        # The allowed-values list is long; only assert the structure and the offending value.
        assert len(issues) == 1
        assert issues[0].startswith(
            "Error in Widgets sheet - Invalid inputType in row 4:"
        )
        assert issues[0].endswith("got 'NotARealInputType'")

    def test_reports_wrong_type(self):
        row = self._valid_widget_row()
        row["active"] = "yes"
        issues = collect_row_issues(
            row=row, specs=WIDGET_COLUMN_SPECS, sheet_name="Widgets", row_number=5
        )
        assert issues == [
            "Error in Widgets sheet - Invalid active in row 5: must be one of "
            "types (bool), got str with value 'yes'"
        ]

    def test_reports_failed_custom_check(self):
        row = self._valid_widget_row()
        row["question_name"] = (
            "household size"  # contains a space, not a valid TS identifier
        )
        issues = collect_row_issues(
            row=row, specs=WIDGET_COLUMN_SPECS, sheet_name="Widgets", row_number=6
        )
        assert issues == [
            "Error in Widgets sheet - Invalid questionName in row 6: "
            "'household size' - Must be a valid TypeScript identifier "
            "(letters, digits, '_' or '$', not starting with a digit)."
        ]

    def test_collects_every_issue_in_one_pass(self):
        row = self._valid_widget_row()
        row["path"] = None  # missing required value
        row["input_type"] = "NotARealInputType"  # disallowed value
        row["question_name"] = "3invalid"  # failed custom check
        issues = collect_row_issues(
            row=row, specs=WIDGET_COLUMN_SPECS, sheet_name="Widgets", row_number=7
        )
        assert len(issues) == 3
        assert issues[0] == (
            "Error in Widgets sheet - Required field is missing in row 7. "
            "Missing fields: ['path']"
        )
        assert issues[1] == (
            "Error in Widgets sheet - Invalid questionName in row 7: "
            "'3invalid' - Must be a valid TypeScript identifier "
            "(letters, digits, '_' or '$', not starting with a digit)."
        )
        assert issues[2].startswith(
            "Error in Widgets sheet - Invalid inputType in row 7:"
        )
        assert issues[2].endswith("got 'NotARealInputType'")

    def test_empty_string_is_treated_as_missing(self):
        row = self._valid_widget_row()
        row["question_name"] = ""
        issues = collect_row_issues(
            row=row, specs=WIDGET_COLUMN_SPECS, sheet_name="Widgets", row_number=8
        )
        assert issues == [
            "Error in Widgets sheet - Required field is missing in row 8. "
            "Missing fields: ['questionName']"
        ]

    def test_conditionals_row_matches_existing_conditionals_generator_rules(self):
        row = {
            "conditional_name": "hasHouseholdSize1",
            "logical_operator": None,
            "path": "household.size",
            "comparison_operator": "===",
            "value": 1,
            "parentheses": None,
            "value_when_hidden": None,
        }
        issues = collect_row_issues(
            row=row,
            specs=CONDITIONAL_COLUMN_SPECS,
            sheet_name="Conditionals",
            row_number=2,
        )
        assert issues == []

        row["comparison_operator"] = "=="  # not one of the allowed comparison operators
        issues = collect_row_issues(
            row=row,
            specs=CONDITIONAL_COLUMN_SPECS,
            sheet_name="Conditionals",
            row_number=2,
        )
        assert issues == [
            "Error in Conditionals sheet - Invalid comparison_operator in row 2: "
            "must be one of ['!==', '<', '<=', '===', '>', '>='] or empty, got '=='"
        ]


class TestCollectSheetIssues:
    def _valid_section_row(self, section: str, abbreviation: str) -> dict:
        return {
            "section": section,
            "title_fr": "Accueil",
            "title_en": "Home",
            "in_nav": True,
            "abbreviation": abbreviation,
        }

    def test_no_issues_for_a_valid_sheet(self):
        rows = [
            self._valid_section_row("home", "HM_"),
            self._valid_section_row("profile", "PR_"),
        ]
        issues = collect_sheet_issues(
            rows=rows, specs=SECTION_COLUMN_SPECS, sheet_name="Sections"
        )
        assert issues == []

    def test_includes_each_row_s_own_issues(self):
        rows = [
            self._valid_section_row("home", "HM_"),
            {**self._valid_section_row("profile", "PR_"), "section": None},
        ]
        issues = collect_sheet_issues(
            rows=rows, specs=SECTION_COLUMN_SPECS, sheet_name="Sections"
        )
        assert issues == [
            "Error in Sections sheet - Required field is missing in row 3. "
            "Missing fields: ['section']"
        ]

    def test_reports_missing_titles_when_in_nav_is_true(self):
        rows = [
            {
                **self._valid_section_row("home", "HM_"),
                "title_fr": None,
                "title_en": None,
            }
        ]
        issues = collect_sheet_issues(
            rows=rows, specs=SECTION_COLUMN_SPECS, sheet_name="Sections"
        )
        assert issues == [
            "Error in Sections sheet - Invalid in_nav in row 2: True - "
            "When true, this row's title_fr and title_en must also be set."
        ]

    def test_allows_missing_titles_when_in_nav_is_false(self):
        rows = [
            {
                **self._valid_section_row("home", "HM_"),
                "title_fr": None,
                "title_en": None,
                "in_nav": False,
            }
        ]
        issues = collect_sheet_issues(
            rows=rows, specs=SECTION_COLUMN_SPECS, sheet_name="Sections"
        )
        assert issues == []

    def test_reports_duplicate_values_in_a_unique_column(self):
        rows = [
            self._valid_section_row("home", "HM_"),
            self._valid_section_row("profile", "PR_"),
            self._valid_section_row("home", "HM2_"),
        ]
        issues = collect_sheet_issues(
            rows=rows, specs=SECTION_COLUMN_SPECS, sheet_name="Sections"
        )
        assert issues == [
            "Error in Sections sheet - Duplicate section 'home': found in rows [2, 4]"
        ]

    def test_reports_duplicate_abbreviations_too(self):
        # abbreviation is also `unique`, independently of section.
        rows = [
            self._valid_section_row("home", "HM_"),
            self._valid_section_row("profile", "HM_"),
        ]
        issues = collect_sheet_issues(
            rows=rows, specs=SECTION_COLUMN_SPECS, sheet_name="Sections"
        )
        assert issues == [
            "Error in Sections sheet - Duplicate abbreviation 'HM_': found in rows [2, 3]"
        ]

    def test_blank_unique_values_do_not_count_as_duplicates_of_each_other(self):
        rows = [
            {
                **self._valid_section_row("home", "HM_"),
                "section": "",
                "abbreviation": "",
            },
            {
                **self._valid_section_row("profile", "PR_"),
                "section": "",
                "abbreviation": "",
            },
        ]
        issues = collect_sheet_issues(
            rows=rows, specs=SECTION_COLUMN_SPECS, sheet_name="Sections"
        )
        assert issues == [
            "Error in Sections sheet - Required field is missing in row 2. "
            "Missing fields: ['section', 'abbreviation']",
            "Error in Sections sheet - Required field is missing in row 3. "
            "Missing fields: ['section', 'abbreviation']",
        ]

    def test_reports_abbreviation_not_ending_with_underscore(self):
        rows = [{**self._valid_section_row("home", "HM"), "abbreviation": "HM"}]
        issues = collect_sheet_issues(
            rows=rows, specs=SECTION_COLUMN_SPECS, sheet_name="Sections"
        )
        assert issues == [
            "Error in Sections sheet - Invalid abbreviation in row 2: 'HM' - "
            "Must end with an underscore ('_'), e.g. 'h_'."
        ]

    def test_reports_enable_conditional_not_ending_with_conditional(self):
        rows = [
            {**self._valid_section_row("home", "HM_"), "enable_conditional": "hasSize1"}
        ]
        issues = collect_sheet_issues(
            rows=rows, specs=SECTION_COLUMN_SPECS, sheet_name="Sections"
        )
        assert issues == [
            "Error in Sections sheet - Invalid enable_conditional in row 2: "
            "'hasSize1' - Must end with 'Conditional' or 'CustomConditional' "
            "(e.g. 'hasHouseholdSize1Conditional', 'isCompleteCustomConditional')."
        ]

    def test_allows_parent_section_that_names_a_real_section(self):
        rows = [
            self._valid_section_row("home", "HM_"),
            {**self._valid_section_row("profile", "PR_"), "parent_section": "home"},
        ]
        issues = collect_sheet_issues(
            rows=rows, specs=SECTION_COLUMN_SPECS, sheet_name="Sections"
        )
        assert issues == []

    def test_reports_parent_section_that_names_no_section(self):
        rows = [
            self._valid_section_row("home", "HM_"),
            {
                **self._valid_section_row("profile", "PR_"),
                "parent_section": "doesNotExist",
            },
        ]
        issues = collect_sheet_issues(
            rows=rows, specs=SECTION_COLUMN_SPECS, sheet_name="Sections"
        )
        assert issues == [
            "Error in Sections sheet - Invalid parent_section in row 3: "
            "'doesNotExist' does not match any section value in this sheet"
        ]


class TestCollectSurveyIssues:
    """Cross-sheet `references` (ColumnReference(sheet=...)) can only be resolved with
    every sheet's rows, so these tests exercise collect_survey_issues against a small,
    self-contained SHEET_COLUMN_SPECS (monkeypatched) instead of the real production
    specs, which today have no cross-sheet reference to exercise this path with."""

    def _column_spec(
        self, field: str, references: ColumnReference | None = None
    ) -> ColumnSpec:
        return ColumnSpec(
            field=field,
            header=field,
            required=False,
            value_required=False,
            allowed_values=None,
            allowed_types=None,
            unique=False,
            references=references,
            custom_data_checks=(),
        )

    def _patch_sheet_column_specs(self, monkeypatch):
        sheet_a_specs = (self._column_spec("code"),)
        sheet_b_specs = (
            self._column_spec(
                "parent_code", references=ColumnReference(field="code", sheet="SheetA")
            ),
        )
        monkeypatch.setattr(
            generate_survey_data,
            "SHEET_COLUMN_SPECS",
            {"SheetA": sheet_a_specs, "SheetB": sheet_b_specs},
        )

    def test_allows_a_value_matching_another_sheet(self, monkeypatch):
        self._patch_sheet_column_specs(monkeypatch)
        rows_by_sheet = {
            "SheetA": [{"code": "home"}],
            "SheetB": [{"parent_code": "home"}],
        }
        assert collect_survey_issues(rows_by_sheet=rows_by_sheet) == []

    def test_reports_a_value_matching_nothing_in_the_referenced_sheet(
        self, monkeypatch
    ):
        self._patch_sheet_column_specs(monkeypatch)
        rows_by_sheet = {
            "SheetA": [{"code": "home"}],
            "SheetB": [{"parent_code": "home"}, {"parent_code": "missing"}],
        }
        issues = collect_survey_issues(rows_by_sheet=rows_by_sheet)
        assert issues == [
            "Error in SheetB sheet - Invalid parent_code in row 3: 'missing' "
            "does not match any code value in the SheetA sheet"
        ]
