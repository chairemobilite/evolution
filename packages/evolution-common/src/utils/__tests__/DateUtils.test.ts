/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { parseDate } from '../DateUtils';

describe('parseDate function', () => {
    // Test cases for undefined input and Date object input
    test.each([
        [undefined, undefined, 'returns undefined for undefined input'],
        ['', undefined, 'returns undefined for empty string input'],
        [null, undefined, 'returns undefined for null input'],
        [new Date('2020-01-01'), new Date('2020-01-01'), 'returns the same Date object for Date input'],
    ])('%s: %s', (input, expected, description) => {
        expect(parseDate(input)).toEqual(expected);
    });

    // Test cases for string input
    test.each([
        ['2020-01-01', true, 'returns a valid Date object for valid date string input'],
        ['invalid-date', false, 'returns an invalid Date object for invalid date string input'],
    ])('%s: %s', (input, isValid, description) => {
        const result = parseDate(input);
        expect(result instanceof Date).toBeTruthy();
        expect(isValid ? !isNaN((result as Date).getTime()) : isNaN((result as Date).getTime())).toBeTruthy();
    });

    // Test case for logging error on invalid date string input
    test.each([
        ['invalid-date', true, 'logs an error for invalid date string input when showErrorOnValidate is true'],
    ])('%s with showErrorOnValidate=%s: %s', (input, showErrorOnValidate, description) => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
        parseDate(input, showErrorOnValidate);
        if (showErrorOnValidate) {
            expect(consoleSpy).toHaveBeenCalledWith('DateUtils parseDate: invalid date');
        } else {
            expect(consoleSpy).not.toHaveBeenCalled();
        }
        consoleSpy.mockRestore();
    });
});
