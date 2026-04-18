# Contributing to Evolution

Evolution depends on [Transition](https://github.com/chairemobilite/transition), included as a git submodule. See the [README](README.md) for an overview and setup instructions.

## How can I contribute

There are many ways to contribute to the development of Evolution. Here's a few.

### Asking a question

You can use the [issue tracker](https://github.com/chairemobilite/evolution/issues) of this GitHub project to ask a question. Before asking, make sure a similar question has not been asked before.

### Reporting bugs

If you use Evolution and encounter a bug, first make sure a similar issue has not been reported already. If not, you can file an issue in this project. Please provide all information required to reproduce the bug, and state the actual and expected behavior. Screenshots can greatly help visualize the issue.

### Requesting features and ideas

If there's something you would like to see in Evolution, no matter how big or small a change it may seem, you may start a discussion in the issue tracker [here](https://github.com/chairemobilite/evolution/issues). Members of the community can join in the discussion.

### Translating

Evolution uses the i18next node modules for managing translations. Platform-level translation files live in the repo-root `locales/` directory, with one folder per language prefix (e.g. `en`, `fr`). Each survey also ships its own `locales` directory. To support a new language, copy the folder for one of the existing languages, and edit the texts in each `.json` file.

### Developing the platform

If you want to start getting involved in the development of the application, a good idea is to contact the current development team through an issue describing the bug you want to fix or the feature you want to implement.

## Coding guidelines

To ensure consistency throughout the code base, we use `prettier` and `eslint` to automatically format the code files. The base rules are taken from the [google GTS project](https://github.com/google/gts) and some were added in `configs/`. Do not reformat code you didn't otherwise touch.

To automatically format code files in a workspace, simply run `yarn format` before a commit. The CI `check-format` job fails on drift.

Unfamiliar with the review process? Read [The ABC of a Pull Request](https://github.com/chairemobilite/transition/blob/main/docs/ABC_of_pull_requests.md) (maintained in the Transition repository).

## Git submodule

Evolution embeds [Transition](https://github.com/chairemobilite/transition) as a git submodule under `transition/`. After cloning, or when pulling a branch that updates the submodule, run:

```
git submodule init && git submodule update
yarn reset-submodules   # when the submodule needs to be re-cloned cleanly
yarn && yarn compile && yarn migrate
```

## Testing

There are 4 types of tests: unit tests, sequential tests, Python tests (for the generator), and UI tests.

- Unit tests are run using `yarn test` and run the complete test suites for all the `evolution-*` packages.
- Sequential tests are integration tests that require a test database (different from the one used in the application, as it truncates all the tables at the end). They are run with `yarn test:sequential`. Before running those, the database needs to be setup with the following `yarn` commands:
  - `yarn setup-test`: Same as `yarn setup`, but for the TEST environment.
  - `yarn migrate-test`: Same as `yarn migrate`, but for the TEST environment.
- Python tests cover the `evolution-generator` package (Excel validation and survey generation). Run with `yarn test:python`. Formatting with `yarn format:python` (uses `black`, requires `poetry install` in `packages/evolution-generator`).
- UI tests are integration tests that use the Playwright library. They are detailed in the next section.

To target a single package instead of the whole repo, use `yarn workspace <name> <script>` — e.g. `yarn workspace evolution-common test` or `yarn workspace evolution-backend test -- --testPathPattern=auditChecks`.

### UI testing with Playwright

First, copy the example Playwright config into the survey to test:
```
cp packages/evolution-frontend/playwright-example.config.ts [SURVEY_DIRECTORY]/playwright.config.ts
```

Install browser dependencies. Install all with `yarn test:ui:install-dependencies`, or a single browser with e.g.:
```
npx playwright install --with-deps firefox
```

Compile and start the application as you would run it normally:
```
yarn compile
yarn build:dev   # or yarn build:prod
yarn start
```

Then run the tests:
```
yarn test:ui
```

You can also open the Playwright graphic interface with:
```
yarn test:ui --ui
```

## Debugging

The `.vscode/launch.json.example` file contains various VSCode launch configurations that can be used to debug the server, the browsers or unit tests. Copy it to `.vscode/launch.json` and edit for each developer's need and specific configuration.

## Widget schema

- [widgetsSchema.json](docs/development/widgetsSchema.json): this is the schema of the most used widgets in all surveys that used the evolution platform prior to May 2024. This will serve in the development of generic widgets and generic sections that could be moved out of specific surveys and be used as templates instead. Future possible usages and attributes could also be added here for later use/analysis.

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
    ],
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

## Further documentation

- [Generator documentation](packages/evolution-generator/README.md)
- [Audits (post-submission validations)](packages/evolution-backend/src/services/audits/README.md)
- [Adding a new audit check](packages/evolution-backend/src/services/audits/auditChecks/README.md)
- [Nomenclature](docs/nomenclature.md)
