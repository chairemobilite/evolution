# Development Documentation

This directory hosts documentation and references files related to the development of the evolution platform

## Content

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