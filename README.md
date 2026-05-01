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

- Download PostgreSQL at `https://www.enterprisedb.com/downloads/postgres-postgresql-downloads`
- Install PostgreSQL. During the installation, make sure you provide a password for your postgres database superuser, and that you install the components pgAdmin 4 and Stack Builder. You can use port 5432
- `psql --version`: Verify your PostgreSQL version inside Powershell
- Find and run the “Stack Builder” program that was installed with the database. Select the “Spatial Extensions” section and choose the latest “PostGIS Bundle” option. Accept the defaults and install

## Prepare and compile the application

The following instructions explain how to prepare and compile the application

- Create a `.env` file in the project root directory (you can copy the `.env.example` file) and setup the project
- Update the `.env` with the Postgres connection string and create a new Google map API key if you need the Google map in the project

```env
    PG_CONNECTION_STRING_PREFIX = "postgres://postgres:<Password>@localhost:5432/"
    GOOGLE_API_KEY = "<MyGoogleApiKey>"
```

- `git submodule init && git submodule update` will get the Transition repository
- `yarn install` or just `yarn`: Will download the packages required by the application
- `yarn compile`: Convert the typescript files to javascript
- `yarn setup`: Run this command to setup the database for the current project
- `yarn migrate`: Update the database schema with latest changes. This can be run whenever the source code is updated
- Optionally `yarn create-user`: Run this task to create a new user in the database. The user will be able to login to the web interface. This command can be run entirely in a non-interactive mode with the following parameters: `yarn create-user --username <username> --email <email> --password <clearTextPassword> [--first_name <firstName> --last_name <lastName> --[no-]admin --[no-]valid --[no-]confirmed --prefs <jsonStringOfPreferences>]`. For example, to create and administrator user with the english language as preference, run the following command `yarn create-user --username admin --email admin@example.org --password MyAdminPassword --admin --prefs '{ "lang": "en" }'`

## Verify Excel (generator)

You can run this either via the repo `yarn` command, or directly via Python/Poetry (package).

Exit code `0` when valid. If invalid, exit code is non-zero and the terminal prints that the check failed, then each validation error message.

### Verify Excel with Yarn

From the repo root:

- `cd packages/evolution-generator`
- `poetry install`
- Back in the repo root: `yarn verifyExcel '/absolute/path/to/file.xlsx'`

### Verify Excel with Python / Poetry

From the repo root:

- `cd packages/evolution-generator`
- `poetry install`
- `poetry run verifyExcel '/absolute/path/to/file.xlsx'`

## Run the example application

The example application contains 2 distinct application. For local development, we will run the participant app on port 8080 (the default port) and the administrative app on port 8082. Each application needs to build the client app and run the server.

To build and run the _participant application_:

- `yarn build:dev` or `yarn build:prod` to build the client app, respectively in development mode (with complete code for debug purposes), or production mode (with minified code for better performances)
- `yarn start` will start the server and listen on port 8080

The participant application can be reached at `http://localhost:8080`.

To build and run the _administrative application_:

- `yarn build:admin:dev` or `yarn build:admin:prod` to build the admin app, respectively in development and production modes.
- `HOST=http://localhost:8082 yarn start:admin --port 8082` will start the server on port 8082, while overwriting the HOST environment variable to match the admin URL.

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

## Survey Area Configuration

A GeoJSON file for the survey area can be used by audit checks to validate whether declared geographies (e.g., home) are within the survey territory.

### Configuration

To enable territorial validation, add the `surveyAreaGeojsonPath` property to your project configuration (e.g., `config.js`):

```javascript
module.exports = {
  // ...
  surveyAreaGeojsonPath: "surveyArea.geojson",
};
```

The path is relative to the survey project directory (projectDirectory param in config file). If this property is missing or the file is not found, territorial validation is skipped.

### GeoJSON Specifications

- It must be a `FeatureCollection`.
- It should contain at least one feature with a `Polygon` or `MultiPolygon` geometry.
- If multiple features are present, only the first one (index 0) will be used for validation.
- **Multiple distinct areas**: If your survey territory consists of multiple disconnected areas, use a `MultiPolygon` geometry within a single feature.
- An example file with the Quebec province area is available at `example/demo_survey/surveyArea.geojson.example`.

## Running tests

| Command                | Scope                                                                                   |
| ---------------------- | --------------------------------------------------------------------------------------- |
| `yarn test`            | Unit tests, all `evolution-*` packages                                                  |
| `yarn test:sequential` | DB integration tests (requires `setup-test` + `migrate-test`)                           |
| `yarn test:ui`         | Playwright UI tests — see [CONTRIBUTING.md](CONTRIBUTING.md#ui-testing-with-playwright) |
| `yarn test:python`     | Tests for Python code (currently `evolution-generator`)                                 |

To target a single package instead of the whole repo, use `yarn workspace <name> <script>` — e.g. `yarn workspace evolution-common test` or `yarn workspace evolution-backend test -- --testPathPattern=auditChecks`. `<name>` is the `name` field of that package's `package.json`.

## Linting and formatting

| Command       | Scope                                   |
| ------------- | --------------------------------------- |
| `yarn lint`   | ESLint across all packages              |
| `yarn format` | Prettier across all packages            |

## Generate and View API Documentation with Typedoc

**Note:** Currently, the documentation only covers the `Evolution-Common` package. Some functions are still missing JSDoc comments, so the documentation may not be complete.

For more details about Typedoc, visit the [official documentation](https://typedoc.org/).

### Generating internal API Documentation

To generate the internal API documentation, use the following command:

```bash
yarn docs:api
```

This will create the documentation in the `docs/internalApi` folder.

### Viewing the Documentation

To view the generated HTML documentation, you can use an extension like **Live Server** in Visual Studio Code. Follow these steps:

1. Install the **Live Server** extension from the VS Code marketplace.
2. Open the `docs/internalApi` folder in VS Code.
3. Right-click on the `index.html` file and select **Open with Live Server**.
4. The documentation will open in your default web browser.

Alternatively, you can use any HTTP server to serve the `docs/internalApi` folder and view the documentation in your browser.

## Import data to pre-fill surveys

It is possible to import data that will be used to pre-fill the response of an interview, for example, the address, to match with an access code.

The data to pre-fill can be imported from a csv file and use the script from Evolution: `importPreFilledResponses.task.ts`.

The import script supports the following fields: `AccessCode`, `PostalCode`, `Address`, `AptNumber`, `City`, `Province`, `AddrLat`, `AddrLon`, `PhoneNumber`, which are all optional. The `AccessCode` field is used as the reference value, ie the one that uniquely identifies the corresponding response row. The other fields will be used to prefill the home address and geography if available. They are mapped respectively to `home.postalCode`, `home.address`, `home.apartmentNumber`, `home.city`, `home.region` and the lat/lon values go to the `home.geography` field. Any additional field, as well as all the entered fields, in the csv file will be put in a `home.preData` field, available in the interview's `response` object, but not editable.

Here's an example csv file for import:

```
AccessCode,PostalCode,Address,AptNumber,City,Province,AddrLat,AddrLon,PhoneNumber,Strate,Lot
1234-1111,H3T 0A3,2500 chemin Polytechnique,,Montréal,Québec,45.50451,-73.614911,,1,1
1234-1112,H3T 0A3,2501 chemin Polytechnique,,Montréal,Québec,45.50452,-73.614912,,2,1
1234-1113,H3T 0A3,2502 chemin Polytechnique,,Montréal,Québec,45.50453,-73.614913,,3,1
```

This file can be imported by running the following command: `yarn node packages/evolution-backend/lib/tasks/importPreFilledResponses.task.js --file /absolute/path/to/file.csv`.

For a custom import or to support additional fields, the import task of Evolution can be copied and modified.

## Nomenclature

For naming consistency, see [Nomenclature](docs/nomenclature.md)

## Development/Contributing documentation

- General guidelines for contributions: [CONTRIBUTING.md](CONTRIBUTING.md).
- Generate a survey with Generator: [Generator documentation](packages/evolution-generator/README.md).
- Audits (post-submission validations): [packages/evolution-backend/src/services/audits/README.md](packages/evolution-backend/src/services/audits/README.md), with the practical guide for adding a new check at [packages/evolution-backend/src/services/audits/auditChecks/README.md](packages/evolution-backend/src/services/audits/auditChecks/README.md).
