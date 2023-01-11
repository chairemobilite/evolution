/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
const { setProjectConfig } = require('evolution-backend/lib/config/projectConfig');
const router = require('chaire-lib-backend/lib/api/admin.routes').default;
const adminRoutes = require('./routes/admin/admin.routes');

// Default values for each field. Same as default config, but this is an example project, keep it here.
setProjectConfig({
    serverUpdateCallbacks: [],
    serverValidations: undefined,
    roleDefinitions: undefined
});

adminRoutes(router);