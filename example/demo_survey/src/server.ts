/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import path from 'path';

import setupServer from 'evolution-legacy/lib/apps/participant/server';
import { setProjectConfig } from 'evolution-backend/lib/config/projectConfig';
import { registerTranslationDir, addTranslationNamespace } from 'chaire-lib-backend/lib/config/i18next';
import serverUpdateCallbacks from './server/serverFieldUpdate';

const configureServer = () => {
    // Default values for each field. Same as default config, but this is an example project, keep it here.
    setProjectConfig({
        serverUpdateCallbacks: serverUpdateCallbacks as any,
        serverValidations: undefined,
        roleDefinitions: undefined
    });
}

setupServer(configureServer);

// FIXME Project directory is for runtime, locales should be in the config file (See #420)
registerTranslationDir(path.join(__dirname, `../locales/`));
addTranslationNamespace('customServer');