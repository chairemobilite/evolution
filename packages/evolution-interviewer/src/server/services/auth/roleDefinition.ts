/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { addRole, addRoleHomePage } from 'chaire-lib-backend/lib/services/auth/userPermissions';
import { InterviewsSubject, InterviewSubject } from 'evolution-backend/lib/services/auth/roleDefinition';

export const INTERVIEWER_ROLE = 'interviewer';
export const INTERVIEWER_SUPERVISOR_ROLE = 'interviewerSup';

export const InterviewersSubject = 'Interviewers';

export default () => {
    // Add an interviewer role
    addRole(INTERVIEWER_ROLE, ({ can }, _user) => {
        // Required permissions to list interviews by access code and create new interviews from access code
        can(['read', 'update'], InterviewsSubject);
        // Required permissions to read and edit any user's interview
        can(['read', 'update'], InterviewSubject);
        can(['create'], InterviewSubject);
    });
    addRoleHomePage(INTERVIEWER_ROLE, '/interviews');

    // Add an interviewer supervisor role
    addRole(INTERVIEWER_SUPERVISOR_ROLE, ({ can }, _user) => {
        // Required permissions to list interviews by access code and create new interviews from access code
        can(['read', 'update'], InterviewsSubject);
        // Required permissions to read and edit any user's interview
        can(['read', 'update'], InterviewSubject);
        can(['create'], InterviewSubject);
        can(['manage'], InterviewersSubject);
    });
};
