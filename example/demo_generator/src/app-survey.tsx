/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import runClientApp from 'evolution-frontend/lib/apps/participant';
import { setApplicationConfiguration } from 'chaire-lib-frontend/lib/config/application.config';

import surveySections from './survey/sections';
import { widgets as widgetsConfig } from './survey/widgetsConfigs';

// TODO Let there be an admin config that can be loaded only for the admin application, to avoid using require for the admin settings.
setApplicationConfiguration({
    sections: surveySections,
    widgets: widgetsConfig,
});

runClientApp({ appContext: process.env.EV_VARIANT });
