/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash.clonedeep';
import { UserInterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import each from 'jest-each';

import * as Helpers from '../frontendHelpers';

type CustomSurvey = {
    section1?: {
        q1?: string;
        q2?: number;
    };
    section2?: {
        q1?: string;
    }
}

const interviewAttributes: UserInterviewAttributes<CustomSurvey, unknown, unknown, unknown> = {
    id: 1,
    uuid: 'arbitrary uuid',
    user_id: 1,
    is_completed: false,
    responses: {
        section1: {
            q1: 'abc',
            q2: 3
        },
        section2: {
            q1: 'test'
        }
    },
    validations: {
        section1: {
            q1: true,
            q2: false
        },
        section2: {
            q1: true
        }
    },
    is_valid: true
};

const userAttributes = {
    id: 1,
    username: 'foo',
    preferences: {  },
    serializedPermissions: [],
    isAuthorized: () => true,
    is_admin: false,
    pages: [],
    showUserInfo: true
}

test('parseString', () => {
    // Default string value
    expect(Helpers.parseString('test', interviewAttributes, 'some.path')).toEqual('test');
    // Undefined
    expect(Helpers.parseString(undefined, interviewAttributes, 'some.path')).toEqual(undefined);

    const parseFct = jest.fn().mockReturnValue('test');
    // With function, without user
    expect(Helpers.parseString(parseFct, interviewAttributes, 'some.path')).toEqual('test');
    expect(parseFct).toHaveBeenCalledTimes(1);
    expect(parseFct).toHaveBeenCalledWith(interviewAttributes, 'some.path', undefined);
    // With function and user
    expect(Helpers.parseString(parseFct, interviewAttributes, 'some.path', userAttributes )).toEqual('test');
    expect(parseFct).toHaveBeenCalledTimes(2);
    expect(parseFct).toHaveBeenCalledWith(interviewAttributes, 'some.path', userAttributes);
});

test('parseBoolean', () => {
    // boolean value
    expect(Helpers.parseBoolean(false, interviewAttributes, 'some.path')).toEqual(false);
    // Undefined or null, with or without default value
    expect(Helpers.parseBoolean(undefined, interviewAttributes, 'some.path')).toEqual(true);
    expect(Helpers.parseBoolean(null, interviewAttributes, 'some.path')).toEqual(true);
    expect(Helpers.parseBoolean(undefined, interviewAttributes, 'some.path', undefined, false)).toEqual(false);

    const parseFct = jest.fn().mockReturnValue(true);
    // With function, without user
    expect(Helpers.parseBoolean(parseFct, interviewAttributes, 'some.path')).toEqual(true);
    expect(parseFct).toHaveBeenCalledTimes(1);
    expect(parseFct).toHaveBeenCalledWith(interviewAttributes, 'some.path', undefined);
    // With function and user
    expect(Helpers.parseBoolean(parseFct, interviewAttributes, 'some.path', userAttributes)).toEqual(true);
    expect(parseFct).toHaveBeenCalledTimes(2);
    expect(parseFct).toHaveBeenLastCalledWith(interviewAttributes, 'some.path', userAttributes);
    // With array return value
    parseFct.mockReturnValueOnce([false, 'a']);
    expect(Helpers.parseBoolean(parseFct, interviewAttributes, 'some.path', userAttributes)).toEqual(false);
    expect(parseFct).toHaveBeenCalledTimes(3);
    expect(parseFct).toHaveBeenLastCalledWith(interviewAttributes, 'some.path', userAttributes);
});

test('parse', () => {
    const returnValue = { foo: 'bar' }

    // Default values of different types
    expect(Helpers.parse('test', interviewAttributes, 'some.path')).toEqual('test');
    expect(Helpers.parse(4, interviewAttributes, 'some.path')).toEqual(4);
    expect(Helpers.parse(returnValue, interviewAttributes, 'some.path')).toEqual(returnValue);
    // Undefined
    expect(Helpers.parse(undefined, interviewAttributes, 'some.path')).toEqual(undefined);
    
    const parseFct = jest.fn().mockReturnValue(returnValue);
    // With function, without user
    expect(Helpers.parse(parseFct, interviewAttributes, 'some.path')).toEqual(returnValue);
    expect(parseFct).toHaveBeenCalledTimes(1);
    expect(parseFct).toHaveBeenCalledWith(interviewAttributes, 'some.path', undefined);
    // With function and user
    expect(Helpers.parse(parseFct, interviewAttributes, 'some.path', userAttributes )).toEqual(returnValue);
    expect(parseFct).toHaveBeenCalledTimes(2);
    expect(parseFct).toHaveBeenCalledWith(interviewAttributes, 'some.path', userAttributes);
});

test('parseInteger', () => {
    // integer value
    expect(Helpers.parseInteger(3, interviewAttributes, 'some.path')).toEqual(3);
    // Undefined
    expect(Helpers.parseInteger(undefined, interviewAttributes, 'some.path')).toEqual(undefined);

    // parse function returns number
    const returnValue = 4;
    const parseFct = jest.fn().mockReturnValue(returnValue);
    // With function, without user
    expect(Helpers.parseInteger(parseFct, interviewAttributes, 'some.path')).toEqual(returnValue);
    expect(parseFct).toHaveBeenCalledTimes(1);
    expect(parseFct).toHaveBeenCalledWith(interviewAttributes, 'some.path', undefined);
    // With function and user
    expect(Helpers.parseInteger(parseFct, interviewAttributes, 'some.path', userAttributes)).toEqual(returnValue);
    expect(parseFct).toHaveBeenCalledTimes(2);
    expect(parseFct).toHaveBeenLastCalledWith(interviewAttributes, 'some.path', userAttributes);

    // parse function returns string
    const returnValueStr = '4';
    const parseFctStr = jest.fn().mockReturnValue(returnValueStr);
    // With function, without user
    expect(Helpers.parseInteger(parseFctStr, interviewAttributes, 'some.path')).toEqual(returnValue);
    expect(parseFctStr).toHaveBeenCalledTimes(1);
    expect(parseFctStr).toHaveBeenCalledWith(interviewAttributes, 'some.path', undefined);
    // With function and user
    expect(Helpers.parseInteger(parseFctStr, interviewAttributes, 'some.path', userAttributes)).toEqual(returnValue);
    expect(parseFctStr).toHaveBeenCalledTimes(2);
    expect(parseFctStr).toHaveBeenLastCalledWith(interviewAttributes, 'some.path', userAttributes);
});

each([
    ['simple path', 'home.address', 'home.address'],
    ['single replacement for the whole string', '{section1.q1}', `abc`],
    ['single replacement at the beginning', '{section1.q1}.something', `abc.something`],
    ['single replacement at the end', 'something.{section1.q1}', `something.abc`],
    ['single replacement in the middle', 'something.{section1.q2}.other', `something.3.other`],
    ['replacement by an object response', 'something.{section1}.other', `something.unknown.other`],
    ['many replacements with no dot after second', 'something.{section1.q1}.{section2.q1}other', `something.abc.testother`],
    ['undefined replaced value', 'something.{section3.q1}.other', `something.unknown.other`],
    ['bot defined and undefined replaced values', 'something.{section1.q1}.{section3.q1}.other', `something.abc.unknown.other`],
]).test('interpolatePath, %s', (_title, path, expectedPath) => {
    expect(Helpers.interpolatePath(interviewAttributes, path)).toEqual(expectedPath);
});
