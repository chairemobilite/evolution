/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import path from 'path';

import setupServer from 'evolution-backend/lib/apps/participant';
import { registerTranslationDir, addTranslationNamespace } from 'chaire-lib-backend/lib/config/i18next';
import {
    registerServerUpdateCallbacksModule,
    registerServerValidationsModule
} from 'evolution-backend/lib/config/serverConfigRegistry';

// This server only runs the questionnaire, so it registers what answering it
// needs, by the path of the module holding it rather than by the functions that
// module exports. Registering `undefined` configures nothing. The object parsers, the roles
// and the audits belong to the admin server, see `admin/server.ts`.
registerServerUpdateCallbacksModule(require.resolve('./server/serverFieldUpdate'));
registerServerValidationsModule(undefined);

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
