/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { validateAccessCode, registerAccessCodeValidationFunction } from '../accessCode';
import each from 'jest-each';

describe('Access code validation', () => {
    const validCode = '7145328';
    registerAccessCodeValidationFunction((accessCode) => accessCode === validCode);
    each([
        ['Too short', '14323', false],
        ['Too long', '1542927564892', false],
        ['valid code 2', validCode, true],
        ['Changed first digit', (parseInt(validCode[0]) + 1 % 10) + validCode.slice(1), false],
        ['Changed last digit', validCode.slice(0, validCode.length - 1) + (parseInt(validCode[validCode.length - 1]) + 1 % 10), false],
        ['Alphanumeric', '83abcd734', false],
    ]).test('%s', (_description, accessCode, result) => {
        expect(validateAccessCode(accessCode)).toEqual(result);
    });
});