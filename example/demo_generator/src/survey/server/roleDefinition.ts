/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { addRoleHomePage } from 'chaire-lib-backend/lib/services/auth/userPermissions';
import setupRoleDefinition from 'evolution-interviewer/lib/server/services/auth/roleDefinition';

export default () => {
    setupRoleDefinition();

    addRoleHomePage('admin', '/admin');
};
