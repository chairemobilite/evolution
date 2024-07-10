# Evolution

Evolution is a survey platform for travel survey. Its originality resides in the support of travel diaries, where participants in the survey can enter all the trips they did in a day for example. But it allows to develop flexible questionnaires, in multiple arbitrary sections, with complex conditions, validations, labels and choices, which can all be scripted to use any of the previous answers.

Surveys that use this platform are complete applications. They are scripted: questions and sections are defined in Typescript.

Typically, a survey application is split in 2 separate websites, one where participants can fill the questionnaire directly and another one for administering, monitoring, validating surveys, as well as for technical support to participants and phone interviewers.

This repo contains an example travel survey, in the `example/demo_survey` folder. It is possible to copy-paste this directory and start editing the survey.

## Install dependencies on Linux

### Install Node.js on Linux

Skip this step if Node.js (version 18.x or 20.x) is already installed on your Linux system.

```bash
    sudo apt update
    sudo apt install nodejs curl
    node -v
    curl --version
    curl -sL https://deb.nodesource.com/setup_20.x -o /tmp/nodesource_setup.sh
    sudo bash /tmp/nodesource_setup.sh
    sudo apt install nodejs
    node -v
```

### Install Yarn on Linux

Skip this step if Yarn is already installed on your Linux system.

    ```bash
    sudo npm install -g yarn
    yarn -v
    ```

### Install PostgreSQL and PostGIS on Linux

For Linux users, follow these instructions to install dependencies.

```bash
    sudo apt update
    sudo apt install postgresql postgis
    psql --version

    # Create a password for the postgres user (optional)
    sudo -u postgres psql -c "ALTER USER postgres PASSWORD '<Password>'"
```

## Install dependencies on Windows

<!-- TODO: Install Node.js and Yarn on Windows -->

The following instructions explain how to install dependencies for Windows. 

* Download PostgreSQL at `https://www.enterprisedb.com/downloads/postgres-postgresql-downloads`
* Install PostgreSQL. During the installation, make sure you provide a password for your postgres database superuser, and that you install the components pgAdmin 4 and Stack Builder. You can use port 5432
* `psql --version`: Verify your PostgreSQL version inside Powershell
* Find and run the “Stack Builder” program that was installed with the database. Select the “Spatial Extensions” section and choose the latest “PostGIS Bundle” option. Accept the defaults and install

## Prepare and compile the application 
The following instructions explain how to prepare and compile the application 

* Create a `.env` file in the project root directory (you can copy the `.env.example` file) and setup the project
* Update the `.env` with the Postgres connection string and create a new Google map API key if you need the Google map in the project

```env 
    PG_CONNECTION_STRING_PREFIX = "postgres://postgres:<Password>@localhost:5432/" 
    GOOGLE_API_KEY = "<MyGoogleApiKey>"
```
* `git submodule init && git submodule update` will get the Transition repository
* `yarn install` or just `yarn`: Will download the packages required by the application
* `yarn compile`: Convert the typescript files to javascript
* `yarn setup`: Run this command to setup the database for the current project
* `yarn migrate`: Update the database schema with latest changes. This can be run whenever the source code is updated
* Optionally `yarn create-user`: Run this task to create a new user in the database. The user will be able to login to the web interface. This command can be run entirely in a non-interactive mode with the following parameters: `yarn create-user --username <username> --email <email> --password <clearTextPassword> [--first_name <firstName> --last_name <lastName> --[no-]admin --[no-]valid --[no-]confirmed --prefs <jsonStringOfPreferences>]`. For example, to create and administrator user with the english language as preference, run the following command `yarn create-user --username admin --email admin@example.org --password MyAdminPassword --admin --prefs '{ "lang": "en" }'`

## Run the example application

The example application contains 2 distinct application. For local development, we will run the participant app on port 8080 (the default port) and the administrative app on port 8082. Each application needs to build the client app and run the server. 

To build and run the *participant application*:

* `yarn build:dev` or `yarn build:prod` to build the client app, respectively in development mode (with complete code for debug purposes), or production mode (with minified code for better performances)
* `yarn start` will start the server and listen on port 8080

The participant application can be reached at `http://localhost:8080`.

To build and run the *administrative application*:

* `yarn build:admin:dev` or `yarn build:admin:prod` to build the admin app, respectively in develpment adn production modes.
* `HOST=http://localhost:8082 yarn start:admin --port 8082` will start the server on port 8082, while overwriting the HOST environment variable to match the admin URL.

## Update the application

When updating the application, or switching to a branch that may have changes to the `transition` submodule, run the following instructions to ensure the application is properly up to date

```
# Pull the branch
git checkout main
git pull origin main

# Update the applicaiton
yarn reset-submodules
yarn
yarn compile
yarn migrate
```

## Run UI tests for the application

Evolution supports running UI tests with playwright. Surveys need to implement their own tests, but `evolution-frontend` provider a library in the `tests/ui-testing` folder.

See the `examples/demo_survey/tests` folder for examples UI testing

To run the tests for the demo_survey application, follow the following steps:

Copy the configuration file in the repository to test and change the build to your needs

```
cp packages/evolution-frontend/playwright-example.config.ts survey/playwright.config.ts
```

Install the dependencies and browsers to use for playwright by running `yarn test:ui:install-dependencies`. This will install all playwright browsers and dependencies. It is possible to fine-tune the browsers to install. See the playwright documentation for more information (https://playwright.dev/docs/browsers).

For example, to run the tests on firefox, use
```
npx playwright install --with-deps firefox
```

You need to start the application as you would to run it:

```
yarn build:dev or yarn build:prod
yarn start
```

Run the UI tests
```
yarn test:survey
```

*Notes:* In the `test:survey` script to define in the project, add the `LOCALE_DIR` environment variable, to register the translations for the current project. For example, in the `demo_survey` project, the script is defined as follows:

```
"test:survey": "LOCALE_DIR=$(pwd)/locales npx playwright test"
```

Each test defined needs to get its own context for the test execution. The following gives and example of how to start a UI test for an application:

```js
import { test } from '@playwright/test';
import * as testHelpers from 'evolution-frontend/tests/ui-testing/testHelpers';
import * as surveyTestHelpers from 'evolution-frontend/tests/ui-testing/surveyTestHelpers';
import { SurveyObjectDetector } from 'evolution-frontend/tests/ui-testing/SurveyObjectDetectors';

const context = {
    page: null as any,
    objectDetector: new SurveyObjectDetector(),
    title: '',
    widgetTestCounters: {}
}

// Configure the tests to run in serial mode (one after the other)
test.describe.configure({ mode: 'serial' });

// Initialize the test page and add it to the context
test.beforeAll(async ({ browser }) => {
    context.page = await testHelpers.initializeTestPage(browser, context.objectDetector);
});

// Open the page and login
surveyTestHelpers.startAndLoginAnonymously({ context, title: 'Déplacements de longue distance au Québec', hasUser: false });

// TODO Add tests here

// Logout from the survey at the end
surveyTestHelpers.logout({ context });

```
