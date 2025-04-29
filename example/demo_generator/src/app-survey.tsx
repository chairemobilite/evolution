import runClientApp from 'evolution-frontend/lib/apps/participant';
import { setApplicationConfiguration } from 'chaire-lib-frontend/lib/config/application.config';

import surveySections from './survey/sections';
import { widgets as widgetsConfig } from './survey/widgetsConfigs';
// FIXME Some helpers don't have the right type, they should not be in the config helper then...
import projectHelpers from './survey/helper';

// TODO Let there be an admin config that can be loaded only for the admin application, to avoid using require for the admin settings.
setApplicationConfiguration({
    sections: surveySections,
    widgets: widgetsConfig,
    projectHelpers: projectHelpers as any
});

runClientApp({ appContext: process.env.EV_VARIANT });
