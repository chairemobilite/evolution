# Generator

## Why Generator?

The Generator is designed to simplify and expedite your workflow. It allows for quick and easy corrections, reducing the time spent on repetitive tasks. Our primary goal is to make the creation of transit surveys as straightforward as possible. By automating the generation of survey components, we are not only enhancing productivity and efficiency, but also contributing to the implementation of sustainable practices in transportation. This tool is part of our commitment to promoting sustainable development within the transport sector.

## Table of Contents

-   [Why Generator?](#why-generator)
-   [How to Run?](#how-to-run)
-   [Project Structure](#project-structure)
-   [Start your own survey](#start-your-own-survey)
-   [Generate Excel](#generate-excel)
-   [Generate Widgets](#generate-widgets)
    -   [Widgets Fields](#widgets-fields)
    -   [Widgets Example](#widgets-example)
-   [Generate Sections](#generate-sections)
    -   [Sections Fields](#sections-fields)
    -   [Sections Example](#sections-example)
-   [Generate Conditionals](#generate-conditionals)
    -   [Conditionals Fields](#conditionals-fields)
    -   [Conditionals Example](#conditionals-example)
-   [Generate Choices](#generate-choices)
    -   [Choices Fields](#choices-fields)
    -   [Choices Example](#choices-example)
-   [Generate InputRange](#generate-inputrange)
    -   [InputRange Fields](#inputrange-fields)
    -   [InputRange Example](#inputrange-example)
-   [Generate Libelles](#generate-libelles)
    -   [Libelles Fields](#libelles-fields)
    -   [Libelles Example](#libelles-example)
-   [Document History](#document-history)

## How to Run?

To run this script, follow these steps:

1. Install Poetry.

    For windows users (with Powershell):

    ```bash
    <!-- Install Poetry -->
    (Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | py -

    <!-- Add Poetry to the PATH -->
    $Env:Path += ";C:\Users\<YourUserName>\AppData\Roaming\Python\Scripts"; setx PATH "$Env:Path"
    ```

    For Linux and Mac users:

    ```bash
    <!-- Install Poetry -->
    curl -sSL https://install.python-poetry.org | python3 -
    ```

    Verify the installation of Poetry

    ```bash
    poetry --version
    ```

2. Install all the Python dependencies.

    ```bash
    cd evolution/packages/evolution-generator
    poetry install
    ```

3. Navigate to the root folder of your project and run the following command.:

    ```bash
    yarn generateSurvey
    ```

## Project Structure

The Generator is designed to facilitate both manual and automated survey generation. It is capable of generating many files automatically, but some files require manual coding to meet specific survey requirements. The project is organized into key directories and files, each serving a specific role in the survey creation process. Here's a brief overview of the project's layout:

```plaintext
survey/
├─ common/ - Contains common files used across the survey.
│  ├─ choices.tsx - Contains the choices for the InputRadio and InputCheckbox widgets. (Generator)
│  ├─ conditionals.tsx - Contains the conditional logic for displaying widgets. (Generator)
│  ├─ customValidations.tsx - Contains custom validation functions for widgets. (Manual)
│  ├─ customWidgets.tsx - Contains custom widgets for the survey. (Manual)
│  ├─ helpPopup.tsx - Contains the help popups for the survey. (Manual)
│  ├─ inputRange.tsx - Contains the input range configurations for the InputRange widget. (Generator)
├─ sections/ - Contains all the sections for the survey.
│  ├─ sectionName/
│  |  ├─ groups.ts - Contains the groups for the section. (Manual)
│  |  ├─ preload.ts - Contains the preload function for the section. (Manual)
│  |  ├─ sectionConfigs.ts - Contains the configuration for the section. (Generator)
│  |  ├─ template.tsx - Contains the template for the section. (Manual)
│  |  ├─ widgets.tsx - Contains the widgets for the section. (Generator)
│  |  ├─ widgetsNames.ts - Contains the names of the widgets for the section. (Generator)
├─ sections.ts - Contains the configurations for all the sections. (Generator)
├─ widgetsConfigs.tsx - Contains the configurations for all the widgets. (Generator)

references/
├─ generateSurveyExample.xlsx - Contains the example Excel file for generating the survey. (Generator)

locales/
├─ en/
│  ├─ sectionName.yml - Contains the English libelles for the section. (Generator)
├─ fr/
│  ├─ sectionName.yml - Contains the French libelles for the section. (Generator)
```

> **Note:** For sections that utilize template, `template.tsx` should be implemented as a React component.

## Start your own survey

If you want to start your own survey, you can use the following steps:

1.  Copy `generateSurveyExample.xlsx` to your project.

    For Windows users:

    ```bash
    cd projectName
    copy ./evolution/packages/evolution-generator/src/examples/generateSurveyExample.xlsx ./survey/src/survey/references/generateSurveyExample.xlsx
    ```

    For Linux and Mac users:

    ```bash
    cd projectName
    cp ./evolution/packages/evolution-generator/src/examples/generateSurveyExample.xlsx ./survey/src/survey/references/generateSurveyExample.xlsx
    ```

2.  Copy `generatorConfig.yaml` to your project.

    For Windows users:

    ```bash
    cd projectName
    copy ./evolution/packages/evolution-generator/src/examples/generatorConfig.yaml ./survey/src/survey/config/generatorConfig.yaml
    ```

    For Linux and Mac users:

    ```bash
    cd projectName
    cp ./evolution/packages/evolution-generator/src/examples/generatorConfig.yaml ./survey/src/survey/config/generatorConfig.yaml
    ```

3.  Create a script command in your `package.json`.

    ```json
    "scripts": {
        "generateSurvey": "yarn workspace evolution-generator run generateSurvey --config_path ../../../survey/references/generatorConfigs.yaml"
    }
    ```

4.  Customize the `generatorConfig.yaml` file to match your project's requirements.

        ```yaml
        survey_folder_path: ../../../survey
        excel_file_path: ../../../survey/references/<Name_Excel_File>.xlsx

        enabled_scripts:
            generate_excel: true
            generate_section_configs: true
            generate_sections: true
            generate_widgets_configs: true
            generate_widgets: true
            generate_conditionals: true
            generate_choices: true
            generate_input_range: true
            generate_libelles: true
        ```

5.  Navigate to the root folder of your project and run the following command.:

    ```bash
    yarn generateSurvey
    ```

## Generate Excel

This step is optional but can greatly improve your workflow if you're frequently updating your project's Excel document. By using Microsoft 365 Cloud, you can avoid the need to manually upload your document every time you make a change. Here's how you can set it up:

1.  Make sure the `generatorConfig.yaml` has the correct settings.

    ```YAML
    excel_file_path: ../../../survey/references/<Name_Excel_File>.xlsx

    enabled_scripts:
       generate_excel: true
    ```

2.  Copy the `generateSurveyExample.xlsx` to your own Microsoft 365 Cloud.

3.  Update the `.env` file with the correct environment variables. You can ask the project manager for the correct values or follow the instructions below to get them.

    ```properties
    # Download Excel file with Office365 and Sharepoint
    SHAREPOINT_URL = "https://polymtlca0-my.sharepoint.com/personal/<your_email_polymtl_ca>/"
    EXCEL_FILE_PATH = "/personal/<your_email_polymtl_ca>/Documents/<folderName>/<yourExcelName>.xlsx"
    OFFICE365_USERNAME_EMAIL = "<yourOffice365UsernameEmail>"
    OFFICE365_PASSWORD = "<yourOffice365Password>"
    ```

## Generate Widgets

Widgets are the building blocks of your survey. They define the structure and interaction of your survey questions, providing a dynamic and engaging experience for respondents. The `Widgets` tab in Excel is used to generate these widgets in the `widgets.tsx` file. Each row in the `Widgets` tab corresponds to a widget in your survey.

### Widgets Fields

| Field                | Description                                             | Type    |
| -------------------- | ------------------------------------------------------- | ------- |
| questionName         | Name of the question                                    | string  |
| [inputType](#input)  | Type of input for the question                          | string  |
| active               | Widget activation status                                | boolean |
| section              | Section to which the question belongs                   | string  |
| group                | Group to which the question belongs (optional)          | string? |
| path                 | Path of the responses object for the question           | string  |
| fr                   | French label for the question                           | string  |
| en                   | English label for the question                          | string  |
| [conditional](#cond) | Conditional logic for displaying the widget (optional)  | string? |
| [validation](#val)   | Validation logic for the widget (optional)              | string? |
| [choices](#choices)  | Choices for the InputRadio and InputCheckbox (optional) | string? |
| [help_popup](#help)  | Help popup name for the question (optional)             | string? |
| [inputRange](#range) | Input range name for InputRange (optional)              | string? |
| comments             | Additional comments for the question (optional)         | string? |

> <span id="input">**Note:**</span> The `inputType` field specifies the type of input for the question and can be one of the following: Custom, Radio, Select, String, Number, InfoText, Range, Checkbox, NextButton, or Text

> <span id="cond">**Note:**</span> The `conditional` field allows you to define conditional logic for displaying the widget based on other responses. For example, you can specify a condition like `nbPersonsSevenOrMoreConditional` to show the widget only if the number of people is 7 or more.

> <span id="val">**Note:**</span> The `validation` field is optional and allows you to define validation logic for the widget. For example, `moreOrEqualTo7Validation` signifies that the widget will be considered valid if the entered value is equal to or greater than 7.

> <span id="choices">**Note:**</span> The `choices` field is optional, but relevant for `Radio` and `Checkbox` inputs and allows you to specify the available choices for the question.

> <span id="help">**Note:**</span> The `help_popup` field is optional and allows you to specify the name of the help popup for the question. This is useful for providing additional information or context to respondents.

> <span id="range">**Note:**</span> The `inputRange` field is optional and allows you to define the valid range of values for `Range` input.

### Widgets Example

In this example, we define a widget for the question `end_email`. This widget is an active InputString, and the path to the responses object for the question is `end.email`. The French and English labels for the question, the conditional logic for displaying the widget, and the validation logic are also provided. The corresponding TypeScript code and a visual representation of this widget are shown below:

| Field        | Value                           |
| ------------ | ------------------------------- |
| questionName | end_email                       |
| inputType    | String                          |
| active       | TRUE                            |
| section      | end                             |
| group        |                                 |
| path         | end.email                       |
| fr           | \*\*Courriel\*\*                |
| en           | \*\*E-mail\*\*                  |
| conditional  | hasAcceptGivingEmailConditional |
| validation   | emailValidation                 |

```typescript
// end/widgets.tsx
export const end_email: inputTypes.InputString = {
    ...defaultInputBase.inputStringBase,
    path: 'end.email',
    label: (t: TFunction) => t('end:end.email'),
    conditional: conditionals.hasAcceptGivingEmailConditional,
    validations: validations.emailValidation
};
```

![Email question example](./src/assets/images/emailQuestionExample.png)

## Generate Sections

Sections in your survey help organize questions into logical groups, making it easier for respondents to navigate and complete the survey. The table below outlines the fields used to define sections in the `Sections` tab, along with an example and the expected output in a `sections.ts` file and `sectionConfigs.ts`.

### Sections Fields

| Field             | Description                                      | Type      |
| ----------------- | ------------------------------------------------ | --------- |
| section           | Name of the section                              | string    |
| title_fr          | French label for the section (optional)          | string    |
| title_en          | English label for the section (optional)         | string    |
| in_nav            | Section visibility in the navigation             | boolean   |
| parent_section    | Parent section of the current section (optional) | string?   |
| [groups](#groups) | Groups in the section (optional)                 | string[]? |

> <span id="groups">**Note:**</span> The `groups` field is optional and allows you to specify the groups within the section. This is useful for organizing questions into subgroups within a section. For example, `personTrips,segments` signifies that the section contains two groups: `personTrips` and `segments`.

### Sections Example

In this example, we define a section named `household`. This section is visible in the navigation and contains the group `householdMembers`. The French and English labels for the section are also provided. The corresponding TypeScript code of this section are shown below:

<!-- section	title_fr	title_en	in_nav	parent_section	groups -->

| section   | title_fr               | title_en         | in_nav | parent_section | groups           |
| --------- | ---------------------- | ---------------- | ------ | -------------- | ---------------- |
| home      | Ménage                 | Household        | TRUE   |                |                  |
| household | Ménage                 | Household        | TRUE   |                | householdMembers |
| end       | Fin                    | End              | TRUE   |                |                  |
| completed | Questionnaire complété | Survey completed | FALSE  |                |                  |

```typescript
// household/sectionConfigs.ts

export const currentSectionName: SectionName = 'household';
const previousSectionName: SectionName = 'home';
const nextSectionName: SectionName = 'end';

// Config for the section
export const sectionConfig: SectionConfig = {
    previousSection: previousSectionName,
    nextSection: nextSectionName,
    title: {
        fr: 'Ménage',
        en: 'Household'
    },
    menuName: {
        fr: 'Ménage',
        en: 'Household'
    },
    widgets: widgetsNames,
    // Do some actions before the section is loaded
    preload: preload,
    // Allow to click on the section menu
    enableConditional: function (interview) {
        return isSectionComplete({ interview, sectionName: previousSectionName });
    },
    // Allow to click on the section menu
    completionConditional: function (interview) {
        return isSectionComplete({ interview, sectionName: currentSectionName });
    },
    groups: {
        householdMembers: groups.householdMembers
    }
};

export default sectionConfig;
```

```typescript
// sections.ts

// Export all the sections configs
const sectionsConfigs: SectionsConfigs = {
    home: homeConfigs,
    household: householdConfigs,
    end: endConfigs,
    completed: completedConfigs
};
export default sectionsConfigs;
```

## Generate Conditionals

In your survey logic, conditionals play a key role in determining if the widget will appear or not. The table below outlines the fields used to define conditionals in Conditionals tab, along with an example and the corresponding TypeScript code.

### Conditionals Fields

| Field                       | Description                                 | Type                    |
| --------------------------- | ------------------------------------------- | ----------------------- |
| conditionalName             | Name of the conditional                     | string                  |
| logicalOperator             | Logical operator (optional)                 | && or \|\|              |
| path                        | Path to the responses object for comparison | string                  |
| [comparisonOperator](#comp) | Operator for comparison                     | ===, ==, >, <, >= or <= |
| value                       | Value for the comparison                    | number or string        |
| [parentheses](#par)         | Parentheses (optional)                      | ( or )                  |

> <span id="comp">**Note:**</span> The `comparisonOperator` field helps compare respondent responses with the specified value. It determines how the respondent's answer should be evaluated in the conditional logic. For example, `>=` signifies that the condition is true when path responses is greater than or equal to the value.

> <span id="par">**Note:**</span> The `parentheses` field is optional and allows you to add priority to the conditional logic by using opening and closing parentheses. This is useful for specifying the order in which conditions should be evaluated. For example, you can use parentheses to create complex conditions like `conditional1 || (conditional2 && conditional3)`, where `conditional2 && conditional3` is evaluated first due to the parentheses.

### Conditionals Example

In this example, we are creating a conditional named `hasDrivingLicenseConditional`. This conditional checks if the age of the person is 16 or older and if the person has a driving license. The table below shows the fields and their corresponding values for this conditional.

| conditionalName              | logicalOperator | path                                   | comparisonOperator | value | parentheses |
| ---------------------------- | --------------- | -------------------------------------- | ------------------ | ----- | ----------- |
| hasDrivingLicenseConditional |                 | [${relativePath}](#rel).age            | >=                 | 16    |             |
| hasDrivingLicenseConditional | &&              | [${relativePath}](#rel).drivingLicense | ===                | yes   |             |

> <span id="rel">**Note:**</span> `${relativePath}` in `path` is used to obtain the relative path within the same group, facilitating the reference to responses object that share a common parent or group with the current widget.

The corresponding TypeScript code for this conditional is shown below:

```typescript
// conditionals.tsx
export const hasDrivingLicenseConditional: Conditional = (interview, path) => {
    const relativePath = path.substring(0, path.lastIndexOf('.')); // Remove the last key from the path
    return checkConditionals({
        interview,
        conditionals: [
            {
                path: `${relativePath}.age`,
                comparisonOperator: '>=',
                value: 16
            },
            {
                logicalOperator: '&&',
                path: `${relativePath}.drivingLicense`,
                comparisonOperator: '===',
                value: 'yes'
            }
        ]
    });
};
```

## Generate Choices

Choices in your survey define the available options in ­­`InputRadio` or `InputCheckbox` for respondents. The table below outlines the fields in Choices tab used to define choices, along with an example and the expected output in a ­`choices.tsx­` file.

### Choices Fields

| Field                        | Description                                           | Type             |
| ---------------------------- | ----------------------------------------------------- | ---------------- |
| choicesName                  | Name for the choices group                            | string           |
| value                        | Unique value for the choice                           | string or number |
| fr                           | French label for the choice                           | string or number |
| en                           | English label for the choice                          | string or number |
| [spreadChoicesName](#spread) | Spreading another choicesName (optional)              | string?          |
| conditional                  | Conditional name for displaying the choice (optional) | string?          |

> <span id="spread">**Note:**</span> The `spreadChoicesName` field is useful to avoid repetition. If you are using the same choices as another `choicesName`, you can specify the existing `choicesName` in `spreadChoicesName` to reuse the choices without duplicating them.

### Choices Example

In this example, we define two sets of choices: `yesNoChoices` and `yesNoDontKnowChoices`. The `yesNoChoices` set includes two options: "yes" and "no". The `yesNoDontKnowChoices` set extends the `yesNoChoices` set by adding an additional option: "don't know". This demonstrates how you can reuse and extend choice sets to create more complex selections. The corresponding TypeScript code and a visual representation of these choices are shown below:

| choicesName          | value    | fr             | en           | spreadChoicesName | conditional |
| -------------------- | -------- | -------------- | ------------ | ----------------- | ----------- |
| yesNoChoices         | yes      | Oui            | Yes          |                   |             |
| yesNoChoices         | no       | Non            | No           |                   |             |
| yesNoDontKnowChoices |          |                |              | yesNoChoices      |             |
| yesNoDontKnowChoices | dontKnow | Je ne sais pas | I don't know |                   |             |

```typescript
// choices.tsx
export const yesNoChoices: Choices = [
    {
        value: 'yes',
        label: {
            fr: 'Oui',
            en: 'Yes'
        }
    },
    {
        value: 'no',
        label: {
            fr: 'Non',
            en: 'No'
        }
    }
];

export const yesNoDontKnowChoices: Choices = [
    ...yesNoChoices,
    {
        value: 'dontKnow',
        label: {
            fr: 'Je ne sais pas',
            en: "I don't know"
        }
    }
];
```

![Yes or no choices example](./src/assets/images/yesNoChoicesExample.png)
![Yes, no or I don't know choices example](./src/assets/images/yesNoDontKnowChoicesExample.png)

## Generate InputRange

The `InputRange` tab in Excel is used to generate slider components in the `inputRange.tsx` file. These sliders allow users to select a value within a specified range. The table provided in the example below will generate the corresponding TypeScript code, defining the `confidentInputRange` object in `inputRange.tsx`.

### InputRange Fields

<!-- TODO: Change the label from labelFrMin to label_min_fr and labelEnMin to label_min_en, etc. -->

| Field          | Description                                 | Type   |
| -------------- | ------------------------------------------- | ------ |
| inputRangeName | Name of the input range                     | string |
| labelFrMin     | French label for the minimum value          | string |
| labelFrMax     | French label for the maximum value          | string |
| labelEnMin     | English label for the minimum value         | string |
| labelEnMax     | English label for the maximum value         | string |
| minValue       | Minimum numerical value for the input range | number |
| maxValue       | Maximum numerical value for the input range | number |
| unitFr         | Unit in French                              | string |
| unitEn         | Unit in English                             | string |

### InputRange Example

In this example, we define an InputRange named `confidentInputRange`. This InputRange allows users to select a value representing their confidence level, ranging from "Not at all confident" to "Very confident". The corresponding TypeScript code and a visual representation of this InputRange are shown below:

| inputRangeName      | labelFrMin           | labelFrMax    | labelEnMin           | labelEnMax     | minValue | maxValue | unitFr | unitEn |
| ------------------- | -------------------- | ------------- | -------------------- | -------------- | -------- | -------- | ------ | ------ |
| confidentInputRange | Pas du tout confiant | Très confiant | Not at all confident | Very confident | -10      | 100      | %      | %      |

```typescript
// inputRange.tsx
export const confidentInputRange: InputRangeConfig = {
    labels: [
        {
            fr: 'Pas du tout confiant',
            en: 'Not at all confident'
        },
        {
            fr: 'Très confiant',
            en: 'Very confident'
        }
    ],
    minValue: -10,
    maxValue: 100,
    formatLabel: (value, language) => {
        return value < 0 ? '' : `${value} ${language === 'fr' ? '%' : language === 'en' ? '%' : ''}`;
    }
};
```

![InputRange example](./src/assets/images/inputRangeExample.png)

## Generate Libelles

<!-- TODO: Modify the generate_libelles.py and documentation to support en_cati, en_one, en_cati_one, fr_cati, etc. -->

In the context of your survey logic, libelles (labels) play a crucial role in presenting questions to respondents in different languages. This Excel table below outlines the fields in `Widgets` tab used to define libelles, along with an example and the expected output in a `introduction.yml` file.

### Libelles Fields

| Field   | Description                           | Type   |
| ------- | ------------------------------------- | ------ |
| path    | Path of the responses                 | string |
| section | Section to which the question belongs | string |
| fr      | French libelle                        | string |
| en      | English libelle                       | string |

### Libelles Example

In this example, we define a libelle for the question `introduction.whichOrganization`. Libelles are used to present questions to respondents in different languages. In this case, we provide translations for both French and English. The text within the double asterisks `**` will be displayed in bold. The corresponding YAML output for the English translation is also shown.

| path                           | section      | fr                                                                 | en                                                                |
| ------------------------------ | ------------ | ------------------------------------------------------------------ | ----------------------------------------------------------------- |
| introduction.whichOrganization | introduction | À quelle [\*\*organisation\*\*](#asterisks) êtes-vous affilié(e) ? | Which [\*\*organization\*\*](#asterisks) are you affiliated with? |

<!-- TODO: Add {{nickname}} and other replacements in the libelles -->

> <span id="asterisks">**Note:**</span> Libelle between double asterisks `**` will be displayed in bold font.

> <span id="asterisks">**Note:**</span> Libelle between double underscores `__` will be displayed in blue italic font.

> <span id="asterisks">**Note:**</span> Libelle between double `_green_` will be displayed in green font.

> <span id="asterisks">**Note:**</span> Libelle between double `_red_` will be displayed in red font.

```yaml
# en/introduction.yml
introduction.whatOrganization: Which <strong>organization</strong> are you affiliated with?
```

## Document History

| Last Updated | Author                    |
| ------------ | ------------------------- |
| 2024-04-04   | Samuel Duhaime-Morissette |
