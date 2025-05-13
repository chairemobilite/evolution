/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import path from 'path';

import setupServer from 'evolution-backend/lib/apps/admin';
import { setProjectConfig } from 'evolution-backend/lib/config/projectConfig';
import { registerTranslationDir, addTranslationNamespace } from 'chaire-lib-backend/lib/config/i18next';
import roleDefinitions from '../survey/server/roleDefinition';
import simplifiedInterviewListFilter from '../survey/server/simplifiedInterviewListFilter';
import serverUpdateCallbacks from '../survey/server/serverFieldUpdate';
import serverValidations from '../survey/server/serverValidations';

const configureServer = () => {
    setProjectConfig({
        serverUpdateCallbacks,
        serverValidations,
        roleDefinitions,
        simplifiedInterviewListFilter
    });
};

setupServer(configureServer);

// FIXME Project directory is for runtime, locales should be in the config file (See #420)
registerTranslationDir(path.join(__dirname, '../../locales/'));
addTranslationNamespace('customServer');
