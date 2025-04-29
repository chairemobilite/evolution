import path from 'path';

import setupServer from 'evolution-backend/lib/apps/participant/index';
import { setProjectConfig } from 'evolution-backend/lib/config/projectConfig';
import { registerTranslationDir, addTranslationNamespace } from 'chaire-lib-backend/lib/config/i18next';
import roleDefinitions from './survey/server/roleDefinition';
import customFilterForValidation from './survey/server/serverConfiguration';
import serverUpdateCallbacks from './survey/server/serverFieldUpdate';
import serverValidations from './survey/server/serverValidations';

// if (process.env.EV_VARIANT === undefined) {
//     console.error('EV_VARIANT environment variable is not set. Please set it to the variant you want to run.');
//     process.exit();
// } else if (!surveyVariants.includes(process.env.EV_VARIANT)) {
//     console.error('Invalid value for EV_VARIANT. Possible values are ', surveyVariants);
//     process.exit();
// }

const configureServer = () => {
    // Default values for each field. Same as default config, but this is an example project, keep it here.
    setProjectConfig({
        serverUpdateCallbacks,
        serverValidations,
        roleDefinitions,
        validationListFilter: customFilterForValidation
    });
};

setupServer(configureServer);

// FIXME Project directory is for runtime, locales should be in the config file (See #420)
registerTranslationDir(path.join(__dirname, '../locales/'));
addTranslationNamespace('customServer');
