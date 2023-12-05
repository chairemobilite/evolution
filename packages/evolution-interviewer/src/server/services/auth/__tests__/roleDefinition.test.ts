/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import { subject } from '@casl/ability';

import { InterviewsSubject, InterviewSubject } from 'evolution-backend/lib/services/auth/roleDefinition';
import defineUserRoles, { INTERVIEWER_ROLE, INTERVIEWER_SUPERVISOR_ROLE, InterviewersSubject } from '../roleDefinition';
import defineAbilitiesFor from 'chaire-lib-backend/lib/services/auth/userPermissions';
import each from 'jest-each';

defineUserRoles();

const interview = {
    id: 1,
    uuid: 'arbitrary',
    participant_id: 1,
    is_active: true
}

describe('Interviewer role', () => {
    const user = {
        id: 1,
        uuid: 'arbitrary user',
        is_admin: false,
        permissions: { [INTERVIEWER_ROLE]: true }
    };

    each([
        ['can read other', 'read', true],
        ['can update other', 'update', true],
        ['cannot delete other', 'delete', false],
        ['can create other', 'create', true],
        ['cannot validate other', 'validate', false],
        ['cannot confirm other', 'confirm', false],
    ]).test('%s', (_title, permission, expectedResult) => {
        const permissions = defineAbilitiesFor(user);
        expect(permissions.can(permission, subject(InterviewSubject, interview))).toEqual(expectedResult);
    });

    test('Interviews list', () => {
        const permissions = defineAbilitiesFor(user);
        expect(permissions.can('create', InterviewsSubject)).toBeFalsy();
        expect(permissions.can('read', InterviewsSubject)).toBeTruthy();
        expect(permissions.can('update', InterviewsSubject)).toBeTruthy();
        expect(permissions.can('validate', InterviewsSubject)).toBeFalsy();
        expect(permissions.can('confirm', InterviewsSubject)).toBeFalsy();
        expect(permissions.can('delete', InterviewsSubject)).toBeFalsy();
    });

    test('Interviewers', () => {
        const permissions = defineAbilitiesFor(user);
        expect(permissions.can('manage', InterviewersSubject)).toBeFalsy();
    });
});

describe('Interviewer supervisor role', () => {
    const user = {
        id: 1,
        uuid: 'arbitrary user',
        is_admin: false,
        permissions: { [INTERVIEWER_ROLE]: false, [INTERVIEWER_SUPERVISOR_ROLE]: true }
    };

    each([
        ['can read other', 'read', true],
        ['can update other', 'update', true],
        ['cannot delete other', 'delete', false],
        ['can create other', 'create', true],
        ['cannot validate other', 'validate', false],
        ['cannot confirm other', 'confirm', false],
    ]).test('%s', (_title, permission, expectedResult) => {
        const permissions = defineAbilitiesFor(user);
        expect(permissions.can(permission, subject(InterviewSubject, interview))).toEqual(expectedResult);
    });

    test('Interviews list', () => {
        const permissions = defineAbilitiesFor(user);
        expect(permissions.can('create', InterviewsSubject)).toBeFalsy();
        expect(permissions.can('read', InterviewsSubject)).toBeTruthy();
        expect(permissions.can('update', InterviewsSubject)).toBeTruthy();
        expect(permissions.can('validate', InterviewsSubject)).toBeFalsy();
        expect(permissions.can('confirm', InterviewsSubject)).toBeFalsy();
        expect(permissions.can('delete', InterviewsSubject)).toBeFalsy();
    });

    test('Interviewers', () => {
        const permissions = defineAbilitiesFor(user);
        expect(permissions.can('manage', InterviewersSubject)).toBeTruthy();
    });
});