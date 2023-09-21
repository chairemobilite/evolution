/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import { subject } from '@casl/ability';

import defineDefaultRoles, { InterviewSubject, InterviewsSubject, VALIDATOR_LVL1_ROLE, VALIDATOR_LVL2_ROLE } from '../roleDefinition';
import defineAbilitiesFor from 'chaire-lib-backend/lib/services/auth/userPermissions';
import each from 'jest-each';

defineDefaultRoles();

const interview = {
    id: 1,
    uuid: 'arbitrary',
    participant_id: 1,
    is_active: true
}

describe('default role', () => {
    const user = {
        id: 1,
        uuid: 'arbitrary user',
        is_admin: false
    };

    each([
        ['read same id', true, 'read'],
        ['update same id', true, 'update'],
        ['delete same id', true, 'delete'],
        ['create same id', true, 'create'],
        ['validate same id', true, 'validate'],
        ['confirm same id', true, 'confirm'],
        ['cannot read other', false, 'read'],
        ['cannot update other', false, 'update'],
        ['cannot delete other', false, 'delete'],
        ['cannot create other', false, 'create'],
        ['cannot validate other', false, 'validate'],
        ['cannot confirm other', false, 'confirm'],
    ]).test('Default has no permission: %s', (_title, same, permission) => {
        const testUser = _cloneDeep(user);
        testUser.id = same ? interview.participant_id : interview.participant_id + 1;
        const permissions = defineAbilitiesFor(testUser);
        expect(permissions.can(permission, subject(InterviewSubject, interview))).toEqual(false);
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
        ['can read other', 'read'],
        ['can update other', 'update'],
        ['can delete other', 'delete'],
        ['can create other', 'create'],
        ['can validate other', 'validate'],
        ['can confirm other', 'confirm'],
    ]).test('%s', (_title, permission) => {
        const permissions = defineAbilitiesFor(user);
        expect(permissions.can(permission, subject(InterviewSubject, interview))).toEqual(true);
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
        ['can read other', 'read', true],
        ['cannot update other', 'update', false],
        ['cannot delete other', 'delete', false],
        ['cannot create other', 'create', false],
        ['can validate other', 'validate', true],
        ['cannot confirm other', 'confirm', false],
    ]).test('%s', (_title, permission, expectedResult) => {
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
        ['can read other', 'read', true],
        ['cannot update other', 'update', false],
        ['cannot delete other', 'delete', false],
        ['cannot create other', 'create', false],
        ['can validate other', 'validate', true],
        ['cannot confirm other', 'confirm', true],
    ]).test('%s', (_title, permission, expectedResult) => {
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