/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import serverValidation from '../serverValidation';
import each from 'jest-each';

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

describe('With validation testField', () => {
    each([
        ['Not validated field', { 'responses.someField': 'abc'}, true],
        ['Valid testField', { 'responses.testField': '121'}, true],
        ['Invalid testField', { 'responses.testField': '122'}, { testField: validations.testField.validations[0].errorMessage }],
        ['Invalid client side', { 'validations.testField': false, 'responses.testField': '122'}, true],
        ['No data', { }, true],
    ]).test('%s', async (_description, valuesByPath, result) => {
        expect(await serverValidation(validations, valuesByPath, [])).toEqual(result);
    });
});

test('No server validation', async () => {
    expect(await serverValidation(undefined, { someField: 'abc' }, [])).toEqual(true);
});