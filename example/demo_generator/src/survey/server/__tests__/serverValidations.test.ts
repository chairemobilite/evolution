/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import validations from '../serverValidations';
import each from 'jest-each';

describe('Validate access code', function () {
    const accessCodeValidation = validations.accessCode.validations;

    each([
        ['undefined', undefined, false],
        ['blank', '', true],
        ['invalid all strings', 'all strings', true],
        ['valid format', '1234-1234', false],
        ['valid format prefixed', 'ab1234-1234', true],
        ['valid format suffixed', '1234-1234suf', true],
        ['no dash', '12341234', false],
        ['2 dashes', '1234--1234', true]
    ]).test('Access code: %s', (_title, accessCode, expected) => {
        expect(accessCodeValidation[0].validation(accessCode)).toEqual(expected);
    });
});
