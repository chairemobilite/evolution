/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import path from 'path';

import setupServer from 'evolution-backend/lib/apps/admin';
import { registerTranslationDir, addTranslationNamespace } from 'chaire-lib-backend/lib/config/i18next';
import {
    registerAuditInterviewModule,
    registerRoleDefinitionsModule,
    registerServerUpdateCallbacksModule,
    registerServerValidationsModule,
    registerSurveyObjectParsersModule,
    registerValidationListFilterModule
} from 'evolution-backend/lib/config/serverConfigRegistry';

// Every part of the server configuration is registered by the path of the module
// holding it, not by the functions that module exports, so that the workers
// running the batch audits and the exports load the same modules as this server
// and audit with the same configuration. Registering `undefined` configures
// nothing, and lists here what a survey may configure.
registerSurveyObjectParsersModule(require.resolve('../server/surveyObjectParsers'));
registerServerUpdateCallbacksModule(undefined);
registerServerValidationsModule(undefined);
registerRoleDefinitionsModule(undefined);
registerAuditInterviewModule(undefined);
registerValidationListFilterModule(undefined);

// Anything this survey adds to the server itself goes here, its own routes and
// monitoring views for instance. The express app is passed as the first argument.
// The server configuration registered above is loaded by the server right after
// this runs.
const configureServer = () => {
    // Nothing of its own in this example survey
};

setupServer(configureServer).catch((error) => {
    console.error('Error starting the server: ', error);
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
});

// FIXME Project directory is for runtime, locales should be in the config file (See #420)
registerTranslationDir(path.join(__dirname, '../../locales/'));
addTranslationNamespace('customServer');
