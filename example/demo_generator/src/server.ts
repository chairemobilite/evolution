/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import path from 'path';

import setupServer from 'evolution-backend/lib/apps/participant';
import { registerTranslationDir, addTranslationNamespace } from 'chaire-lib-backend/lib/config/i18next';
import {
    registerRoleDefinitionsModule,
    registerServerUpdateCallbacksModule,
    registerServerValidationsModule,
    registerValidationListFilterModule
} from 'evolution-backend/lib/config/serverConfigRegistry';

// The modules of the server configuration are registered by their path, not by
// the functions they export, so that the workers of the pool load the same ones.
registerServerUpdateCallbacksModule(require.resolve('./survey/server/serverFieldUpdate'));
registerServerValidationsModule(require.resolve('./survey/server/serverValidations'));
registerRoleDefinitionsModule(require.resolve('./survey/server/roleDefinition'));
registerValidationListFilterModule(require.resolve('./survey/server/validationListFilter'));

// Anything this survey adds to the server itself goes here. The server
// configuration registered above is loaded right after this runs.
const configureServer = () => {
    // Nothing of its own in this example survey
};

setupServer(configureServer).catch((error) => {
    console.error('Error starting the server: ', error);
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
});

// FIXME Project directory is for runtime, locales should be in the config file (See #420)
registerTranslationDir(path.join(__dirname, '../locales/'));
addTranslationNamespace('customServer');
