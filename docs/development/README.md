# Development Documentation

This directory hosts documentation and references files related to the development of the evolution platform

# Evolution Platform Nomenclature

## Process Names

### Interview Process
1. **interview**
   Base process for all interview types
   
   a. **respondentInterview**
      - Process where a respondent completes their own interview
      - Real-time data collection from the respondent
      - Can be incomplete
   
   b. **assistedInterview**
      - Interview conducted by an interviewer (phone/chat/in-person)
      - Can be starting fresh or continuing a respondentInterview

2. **realTimeValidation**
   - Frontend/backend validation during interview
   - Data type checking
   - Response coherence verification
   - Applies to both interview types and to correction process (see below)

### Post-Interview Processing
3. **audit** (process) & **auditReport** (group of results) & **auditResult** (single result) & **auditCheck** (single validation/check)
   - Automated backend process analyzing completed interviews
   - Generates auditResult instances (error, warning or info)

4. **review** (manual)
   - Evaluation of audit reports
   - Decision-making process on interview validity
   - Determination if corrections are needed
   - Interview acceptance or rejection

5. **correction** (manual)
   - Modification of interview data
   - Direct editing of interview responses
   - Data cleaning and improvement

6. **enhancement** (automated)
   - Enhancement of interview data
   - Data improvement and quality enhancement

7. **export**
   - Data extraction of validated/audited interviews
   - Format conversion and preparation
   - Data compilation and organization

## Role Names

1. **respondent**
   - Individual providing interview responses
   - Primary data source
   - Self-guided interview participant

2. **interviewer**
   - Phone, chat or in-person support personnel
   - Guides respondents through interview process
   - Real-time data collection specialist

3. **auditor** (system role)
   - Automated system process
   - Performs systematic checks
   - Generates audit reports

4. **reviewer**
   - Evaluates audit reports
   - Makes decisions on interview validity
   - Determines necessary actions, like corrections needed

5. **corrector**
   - Implements required corrections
   - Adjusts geographic data
   - Modifies interview responses

6. **admin**
   - Manages data exports
   - System administration
   - (To be replaced by specific permissions)

## Role-Process Relationships
```
interview
    ├── respondentInterview (respondent)
    │   └── realTimeValidation
    └── assistedInterview (interviewer)
        └── realTimeValidation

system-auditor
    └── audit
        └── auditReport

reviewer
    └── review

corrector
    └── correction
        └── realTimeValidation

admin
    └── export
```

## Notes
- A single user may have multiple roles (e.g., reviewer and corrector)
- Admin role will be replaced by granular permissions
- Real-time validation applies to both interview types
- Audit is exclusively a system process

# Widget Schema

- widgetsSchema.json: this is the schema of the most used widgets in all surveys that used the evolution platform prior to May 2024. This will serve in the devlopement of generic widgets and generic sections that could be moved out of specific surveys and be used as templates instead. Future possible usages and attributes could also be added here for later use/analysis.

```
{
  "widgetShortname": { // the widget shortname
    "surveyObject": "SURVEY_OBJECT", // to which survey object is this widget associated
    "sections": [ // to which sections this widget was associated in previous surveys or could be associated in future surveys
      "SECTION1",
      "SECTION2"
    ],
    "paths": [ // to which path(s) this widget is associated
      "PATH"
    ],
    "inputTypes": [ // to which input types this widget was or should be associated
      "INPUT_TYPE1",
      "INPUT_TYPE2"
    ],
    "datatype": "text", // what is the datatype for this widget value
    "conditionals": [ // which paths are used inside the usual conditionals for this widget, or which generic conditional shortname could be used 
        "PATH1", 
        "PATH2"
    ], // 
    "validations": [
        "min", // example: there is a min value for this widget
        "max", // example: there is a min value for this widget
        "integer", // example: value must be an integer,
        "positiveInteger", // example: value must be an positive integer
        "lessThan16yearsOld"  // example: person should be less than 16 y.o.
    ], // which validations can or has been used with this widget
    "relatedSurveyObjects": [
        "Person", // example: person object
        "Household" // example: household object
    ], // which survey objects can be related to this widget, via conditionals, validations or actions
    "relatedPaths": [
        "PATH1",
        "PATH2"
    ], // which paths can be related to this widget, via conditionals, validations or actions
    "comments": "Comments on this widget"
  }
}
```