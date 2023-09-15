/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import serverValidation from '../serverValidation';
import each from 'jest-each';
import { InterviewAttributes } from 'evolution-common/lib/services/interviews/interview';

const validations = {
    testField: {
        validations: [
            {
                validation: (value: string) => (parseInt(value) % 2 === 0),
                errorMessage: {
                    fr: 'Valeur paire',
                    en: 'Value is even'
                }
            }
        ]
    }
};

const interviewAttributes: InterviewAttributes<unknown, unknown, unknown, unknown> = {
    uuid: 'arbitrary',
    id: 4,
    participant_id: 4,
    is_valid: true,
    is_active: true,
    is_completed: false,
    responses: {},
    validations: {},
    logs: []
};

describe('With validation testField', () => {
    each([
        ['Not validated field', { 'responses.someField': 'abc'}, true],
        ['Valid testField', { 'responses.testField': '121'}, true],
        ['Invalid testField', { 'responses.testField': '122'}, { testField: validations.testField.validations[0].errorMessage }],
        ['Invalid client side', { 'validations.testField': false, 'responses.testField': '122'}, true],
        ['No data', { }, true],
    ]).test('%s', async (_description, valuesByPath, result) => {
        expect(await serverValidation(interviewAttributes, validations, valuesByPath, [])).toEqual(result);
    });
});

test('No server validation', async () => {
    expect(await serverValidation(interviewAttributes, undefined, { someField: 'abc' }, [])).toEqual(true);
});