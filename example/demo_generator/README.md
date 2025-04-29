# Demo Generator - Household Travel Survey

This directory is a demo of a household travel survey. It showcases the capabilities of the Evolution-Generator.

Most of the files in this directory (but not all) are generated using the Evolution-Generator. The generator creates configurations for the questionnaire, including sections, widgets, and labels.

## Evolution-Generator Documentation

You can see the documentation for the Evolution-Generator [here](../../packages/evolution-generator/README.md).

## How to Generate Files

To generate the files, run the following command from the root of the `evolution` project:

```bash
yarn generateSurvey:example
```

## How to Start

To start using this demo, follow the steps below:

> **Note:** This section will be updated soon with more detailed instructions.

## Limitations

While most of the files in this directory are generated using the Evolution-Generator, some files were manually created or customized. These include:

-   `config.js`
-   `app-survey.tsx`
-   `server.ts`
-   `helper.ts`
-   `interviewerMonitoring.ts`
-   `roleDefinition.ts`
-   `serverConfiguration.ts`
-   `serverFieldUpdate.ts`
-   `serverValidations.ts`
-   `serverFieldUpdate.test.ts`
-   `serverValidation.test.ts`
-   `common-tests-helper.ts`
-   `test-one-person-no-trips.UI.spec.ts`
-   `test-two-persons-no-trips.UI.spec.ts`
-   `styles.scss`
-   `webpack.admin.config.js`
-   `webpack.config.js`

These files are not part of the automated generation process and may require manual updates or maintenance.

> **Goal:** The ultimate aim of this project is to enable setting up a fully functional survey system without writing code, relying solely on configurations to generated files. This will allow for easy customization and flexibility in creating different types of surveys.
