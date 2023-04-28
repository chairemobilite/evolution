/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { addRole, DEFAULT_ROLE_NAME } from 'chaire-lib-backend/lib/services/auth/userPermissions';
import serverConfig from '../../config/projectConfig';

/** constant for single interview objects. Used to check permissions on routes affecting a single object at a time */
export const InterviewSubject = 'Interview';
/** constant for the list of interviews. Used on routes affecting lists of interviews */
export const InterviewsSubject = 'Interviews';

// Add default roles for users accessing the interview (not the participant)
export const VALIDATOR_LVL1_ROLE = 'validatorLvl1';
export const VALIDATOR_LVL2_ROLE = 'validatorLvl2';

const addDefaultPermissions = () => {
    // By default, no access to interviews
};

// Default role can only create interviews and read/update their own active interview
const defineDefaultRoles = function (): void {
    // Add default role
    addRole(DEFAULT_ROLE_NAME, addDefaultPermissions);

    // Add an interviewer role
    addRole(VALIDATOR_LVL1_ROLE, ({ can }, user) => {
        addDefaultPermissions();
        // Required permissions to list interviews to validate
        can(['read', 'validate'], InterviewsSubject);
        // Required permissions to validate any user's interviews
        can(['read', 'validate'], InterviewSubject);
    });

    // Add an interviewer role
    addRole(VALIDATOR_LVL2_ROLE, ({ can }, user) => {
        addDefaultPermissions();
        // Required permissions to list interviews to validate and confirm
        can(['read', 'validate', 'confirm'], InterviewsSubject);
        // Required permissions to validate and confirm any user's interviews
        can(['read', 'validate', 'confirm'], InterviewSubject);
    });

    // Try adding custom project roles
    if (typeof serverConfig.roleDefinitions === 'function') {
        console.log('Loading project specific user roles');
        serverConfig.roleDefinitions();
    } else {
        // no project specific roles
        console.log(
            'No project specific roles defined. You can define roles in a callback function set to the `roleDefinitions` field in the server configuration.'
        );
    }
};

export default defineDefaultRoles;
