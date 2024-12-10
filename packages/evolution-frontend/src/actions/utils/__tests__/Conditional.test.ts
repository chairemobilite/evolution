/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import _cloneDeep from 'lodash/cloneDeep';
import each from 'jest-each';

import { checkConditional, checkChoicesConditional } from "../Conditional";

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

type CustomSurvey = {
    section1?: {
        q1?: string;
        q2?: number;
        q4?: string;
    };
    section2?: {
        q1?: string;
    };
    choicePath?: undefined | null | string | string[];
}

const interviewAttributes: UserInterviewAttributes = {
    id: 1,
    uuid: 'arbitrary uuid',
    participant_id: 1,
    is_completed: false,
    responses: {
        section1: {
            q1: 'abc',
            q2: 3
        },
        section2: {
            q1: 'test'
        }
    } as any,
    validations: {
        section1: {
            q1: true,
            q2: false
        },
        section2: {
            q1: true
        }
    } as any,
    is_valid: true
};

each([
    ['undefined conditional', undefined, [true, undefined, undefined]],
    ['boolean condition: true', true, [true, undefined, undefined]],
    ['boolean condition: false', false, [false, undefined, undefined]],
    ['function which returns a boolean: true', jest.fn().mockReturnValue(true), [true, undefined, undefined]],
    ['function which returns a boolean: false', jest.fn().mockReturnValue(false), [false, undefined, undefined]],
    ['function which returns a single boolean array: true', jest.fn().mockReturnValue([true]), [true, undefined, undefined]],
    ['function which returns a single boolean array: false', jest.fn().mockReturnValue([false]), [false, undefined, undefined]],
    ['function which returns a full array with null: true', jest.fn().mockReturnValue([true, null, null]), [true, null, null]],
    ['function which returns a full array with one values: true', jest.fn().mockReturnValue([true, 'string', null]), [true, 'string', null]],
    ['function which returns a full array with values: true', jest.fn().mockReturnValue([true, 'string', 'customString']), [true, 'string', 'customString']],
    ['function which returns a full array with custom value: true', jest.fn().mockReturnValue([true, null, 'customString']), [true, null, 'customString']],
    ['function which returns a full array with null: false', jest.fn().mockReturnValue([false, null, null]), [false, null, null]],
    ['function which returns a full array with one values: false', jest.fn().mockReturnValue([false, 'string', null]), [false, 'string', null]],
    ['function which returns a full array with values: false', jest.fn().mockReturnValue([false, 'string', 'customString']), [false, 'string', 'customString']],
    ['function which returns a full array with custom value: false', jest.fn().mockReturnValue([false, null, 'customString']), [false, null, 'customString']],
    ['function which returns 2-elements array with null: true', jest.fn().mockReturnValue([true, null]), [true, null, null]],
    ['function which returns 2-elements array with value: true', jest.fn().mockReturnValue([true, 'string']), [true, 'string', null]],
    ['function which returns 2-elements array with null: false', jest.fn().mockReturnValue([false, null]), [false, null, null]],
    ['function which returns 2-elements array with value: false', jest.fn().mockReturnValue([false, 'string']), [false, 'string', null]],
    ['legacy return value', jest.fn().mockReturnValue(null), [false, undefined, undefined]],
    ['function with error', jest.fn().mockImplementation(() => { throw 'error' }), [false, undefined, undefined]],
]).test('Test check conditional %s', (_title, conditional, expectedResult) => {
    expect(checkConditional(conditional, interviewAttributes, 'path', userAttributes)).toEqual(expectedResult);
    if (typeof conditional === 'function') {
        expect(conditional).toHaveBeenCalledTimes(1);
        expect(conditional).toHaveBeenCalledWith(interviewAttributes, 'path', userAttributes);
    }
});

describe('Test check choice conditional', () => {
    const basicChoices = [
        { value: 'a' },
        { value: 'b' }
    ];
    const withGrouped = [
        { value: 'c' },
        { groupShortname: 'gsn', groupLabel: 'label', choices: basicChoices }
    ];
    const withTrueFalseValues = [
        { value: false },
        { value: true }
    ];
    const variousConditionalAllTrue = [
        { value: 'a', conditional: true },
        { value: 'b', conditional: jest.fn().mockReturnValue(true) },
        { value: 'c', conditional: jest.fn().mockReturnValue([true]) },
        { value: 'd', conditional: jest.fn().mockReturnValue([true, 'a']) }
    ];
    const variousConditional = [
        { value: 'a', conditional: true },
        { value: 'b', conditional: jest.fn().mockReturnValue(false) },
        { groupShortname: 'gsn', groupLabel: 'label', choices: [
            { value: 'c', conditional: jest.fn().mockReturnValue([false]) },
            { value: 'd', conditional: jest.fn().mockReturnValue([false, 'a']) }
        ] },
        { value: 'e', condition: true },
        { value: 'f', conditional: [false, 'a'] }
    ]

    each([
        ['Choices with boolean values (false)', withTrueFalseValues, false, [true, false]],
        ['Choices with boolean values (true)', withTrueFalseValues, true, [true, true]],
        ['Choices with undefined conditional, single response', basicChoices, 'a', [true, 'a']],
        ['Some grouped choices, undefined conditional, single response', withGrouped, 'a', [true, 'a']],
        ['Choices with undefined conditional, no response', basicChoices, undefined, [true, undefined]],
        ['Choices with various conditional value, all true, single response', variousConditionalAllTrue, 'a', [true, 'a']],
        ['Choices with various conditional values, some false, single response stays', variousConditional, 'a', [true, 'a']],
        ['Choices with various conditional values, some false, single response removed', variousConditional, 'b', [false, undefined]],
        ['Choices with various conditional values, some false, single response changed', variousConditional, 'd', [false, 'a']],
        ['Parsed choices with undefined conditional, single response', jest.fn().mockReturnValue(basicChoices), 'a', [true, 'a']],
        ['Parsed with some grouped choices, undefined conditional, single response', jest.fn().mockReturnValue(basicChoices), 'a', [true, 'a']],
        ['Parsed choices with undefined conditional, no response', jest.fn().mockReturnValue(basicChoices), undefined, [true, undefined]],
        ['Parsed choices with various conditional value, all true, single response', jest.fn().mockReturnValue(variousConditionalAllTrue), 'a', [true, 'a']],
        ['Parsed choices with various conditional values, some false, single response stays', jest.fn().mockReturnValue(variousConditional), 'a', [true, 'a']],
        ['Parsed choices with various conditional values, some false, single response removed', jest.fn().mockReturnValue(variousConditional), 'b', [false, undefined]],
        ['Parsed choices with various conditional values, some false, single response changed', jest.fn().mockReturnValue(variousConditional), 'd', [false, 'a']],
        ['Choices with undefined conditional, multi-response', basicChoices, ['a', 'b'], [true, ['a', 'b']]],
        ['Some grouped choices, undefined conditional, multi-response', withGrouped, ['a', 'c'], [true, ['a', 'c']]],
        ['Choices with various conditional value, all true, multi-response', variousConditionalAllTrue, ['a', 'b', 'c'], [true, ['a', 'b', 'c']]],
        ['Choices with various conditional values, some false, multi-response, all stay', variousConditional, ['a', 'e'], [true, ['a', 'e']]],
        ['Choices with various conditional values, some false, multi-response, all gone', variousConditional, ['b', 'c'], [false, []]],
        ['Choices with various conditional values, some false, multi-response, some gone', variousConditional, ['a', 'c'], [false, ['a']]],
        ['Choices with various conditional values, some false, multi-response, some changes', variousConditional, ['b', 'd', 'e'], [false, ['a', 'e']]],
        ['Choices with various conditional values, some false, multi-response, some changes with duplicates', variousConditional, ['c', 'd', 'f'], [false, ['a']]],
    ]).test('%s', (_title, choices, currentValue: undefined | null | string | string[], expectedResult) => {
        const interview = _cloneDeep(interviewAttributes);
        (interview.responses as any).choicePath = currentValue;
        expect(checkChoicesConditional(currentValue, choices, interview, 'choicePath', userAttributes)).toEqual(expectedResult);
    });
})
