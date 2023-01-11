/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { subject } from '@casl/ability';

import defineDefaultRoles, { InterviewSubject, InterviewsSubject, VALIDATOR_LVL1_ROLE, VALIDATOR_LVL2_ROLE } from '../roleDefinition';
import defineAbilitiesFor from 'chaire-lib-backend/lib/services/auth/userPermissions';
import each from 'jest-each';

defineDefaultRoles();

const interview = {
    id: 1,
    uuid: 'arbitrary',
    user_id: 1,
    is_active: true
}

describe('default role', () => {
    const user = {
        id: 1,
        uuid: 'arbitrary user',
        is_admin: false
    };

    each([
        ['can read own', true, 'read', true],
        ['can update own', true, 'update', true],
        ['cannot delete own', true, 'delete', false],
        ['can create own', true, 'create', true],
        ['cannot validate own', true, 'validate', false],
        ['cannot confirm own', true, 'confirm', false],
        ['cannot read other', false, 'read', false],
        ['cannot update other', false, 'update', false],
        ['cannot delete other', false, 'delete', false],
        ['cannot create other', false, 'create', false],
        ['cannot validate other', false, 'validate', false],
        ['cannot confirm other', false, 'confirm', false],
    ]).test('%s', (_title, same, permission, expectedResult) => {
        user.id = same ? interview.user_id : interview.user_id + 1;
        const permissions = defineAbilitiesFor(user);
        expect(permissions.can(permission, subject(InterviewSubject, interview))).toEqual(expectedResult);
    });

    test('Interviews list', () => {
        const permissions = defineAbilitiesFor(user);
        expect(permissions.can('create', InterviewsSubject)).toBeFalsy();
        expect(permissions.can('read', InterviewsSubject)).toBeFalsy();
        expect(permissions.can('update', InterviewsSubject)).toBeFalsy();
        expect(permissions.can('delete', InterviewsSubject)).toBeFalsy();
        expect(permissions.can('validate', InterviewsSubject)).toBeFalsy();
        expect(permissions.can('confirm', InterviewsSubject)).toBeFalsy();
    });
});

describe('admin role', () => {
    const user = {
        id: 1,
        uuid: 'arbitrary user',
        is_admin: true
    };

    each([
        ['can read own', true, 'read', true],
        ['can update own', true, 'update', true],
        ['can delete own', true, 'delete', true],
        ['can create own', true, 'create', true],
        ['can validate own', true, 'validate', true],
        ['can confirm own', true, 'confirm', true],
        ['can read other', false, 'read', true],
        ['can update other', false, 'update', true],
        ['can delete other', false, 'delete', true],
        ['can create other', false, 'create', true],
        ['can validate other', false, 'validate', true],
        ['can confirm other', false, 'confirm', true],
    ]).test('%s', (_title, same, permission, expectedResult) => {
        user.id = same ? interview.user_id : interview.user_id + 1;
        const permissions = defineAbilitiesFor(user);
        expect(permissions.can(permission, subject(InterviewSubject, interview))).toEqual(expectedResult);
    });

    test('Interviews list', () => {
        const permissions = defineAbilitiesFor(user);
        expect(permissions.can('create', InterviewsSubject)).toBeTruthy();
        expect(permissions.can('read', InterviewsSubject)).toBeTruthy();
        expect(permissions.can('update', InterviewsSubject)).toBeTruthy();
        expect(permissions.can('delete', InterviewsSubject)).toBeTruthy();
        expect(permissions.can('validate', InterviewsSubject)).toBeTruthy();
        expect(permissions.can('confirm', InterviewsSubject)).toBeTruthy();
    })
});

describe('validator Lvl 1', () => {
    const user = {
        id: 1,
        uuid: 'arbitrary user',
        is_admin: false,
        permissions: { [VALIDATOR_LVL1_ROLE]: true, [VALIDATOR_LVL2_ROLE]: false }
    };

    each([
        ['can read own', true, 'read', true],
        ['can update own', true, 'update', true],
        ['cannot delete own', true, 'delete', false],
        ['can create own', true, 'create', true],
        ['can validate own', true, 'validate', true],
        ['cannot confirm own', true, 'confirm', false],
        ['can read other', false, 'read', true],
        ['cannot update other', false, 'update', false],
        ['cannot delete other', false, 'delete', false],
        ['cannot create other', false, 'create', false],
        ['can validate other', false, 'validate', true],
        ['cannot confirm other', false, 'confirm', false],
    ]).test('%s', (_title, same, permission, expectedResult) => {
        user.id = same ? interview.user_id : interview.user_id + 1;
        const permissions = defineAbilitiesFor(user);
        expect(permissions.can(permission, subject(InterviewSubject, interview))).toEqual(expectedResult);
    });

    test('Interviews list', () => {
        const permissions = defineAbilitiesFor(user);
        expect(permissions.can('create', InterviewsSubject)).toBeFalsy();
        expect(permissions.can('read', InterviewsSubject)).toBeTruthy();
        expect(permissions.can('update', InterviewsSubject)).toBeFalsy();
        expect(permissions.can('validate', InterviewsSubject)).toBeTruthy();
        expect(permissions.can('confirm', InterviewsSubject)).toBeFalsy();
        expect(permissions.can('delete', InterviewsSubject)).toBeFalsy();
    });
});

describe('validator Lvl 2', () => {
    const user = {
        id: 1,
        uuid: 'arbitrary user',
        is_admin: false,
        permissions: { [VALIDATOR_LVL1_ROLE]: false, [VALIDATOR_LVL2_ROLE]: true }
    };

    each([
        ['can read own', true, 'read', true],
        ['can update own', true, 'update', true],
        ['cannot delete own', true, 'delete', false],
        ['can create own', true, 'create', true],
        ['can validate own', true, 'validate', true],
        ['cannot confirm own', true, 'confirm', true],
        ['can read other', false, 'read', true],
        ['cannot update other', false, 'update', false],
        ['cannot delete other', false, 'delete', false],
        ['cannot create other', false, 'create', false],
        ['can validate other', false, 'validate', true],
        ['cannot confirm other', false, 'confirm', true],
    ]).test('%s', (_title, same, permission, expectedResult) => {
        user.id = same ? interview.user_id : interview.user_id + 1;
        const permissions = defineAbilitiesFor(user);
        expect(permissions.can(permission, subject(InterviewSubject, interview))).toEqual(expectedResult);
    });

    test('Interviews list', () => {
        const permissions = defineAbilitiesFor(user);
        expect(permissions.can('create', InterviewsSubject)).toBeFalsy();
        expect(permissions.can('read', InterviewsSubject)).toBeTruthy();
        expect(permissions.can('update', InterviewsSubject)).toBeFalsy();
        expect(permissions.can('validate', InterviewsSubject)).toBeTruthy();
        expect(permissions.can('confirm', InterviewsSubject)).toBeTruthy();
        expect(permissions.can('delete', InterviewsSubject)).toBeFalsy();
    });
});