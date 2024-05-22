/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import {
    parseDate,
    getDateFromDateString,
    getDateStringFromDate,
    getWeekdayFromDate,
    getUnixEpochFromDate,
} from '../DateUtils';

// deprecated:
describe('parseDate function', () => {
    // Test cases for undefined input and Date object input
    test.each([
        [undefined, undefined, 'returns undefined for undefined input'],
        ['', undefined, 'returns undefined for empty string input'],
        [null, undefined, 'returns undefined for null input'],
        [new Date('2020-01-01'), new Date('2020-01-01'), 'returns the same Date object for Date input'],
    ])('%s: %s', (input, expected, _) => {
        expect(parseDate(input)).toEqual(expected);
    });

    // Test cases for string input
    test.each([
        ['2020-01-01', true, 'returns a valid Date object for valid date string input'],
        ['invalid-date', false, 'returns an invalid Date object for invalid date string input'],
    ])('%s: %s', (input, isValid, _) => {
        const result = parseDate(input);
        expect(result instanceof Date).toBeTruthy();
        expect(isValid ? !isNaN((result as Date).getTime()) : isNaN((result as Date).getTime())).toBeTruthy();
    });

    // Test case for logging error on invalid date string input
    test.each([
        ['invalid-date', true, 'logs an error for invalid date string input when showErrorOnValidate is true'],
    ])('%s with showErrorOnValidate=%s: %s', (input, showErrorOnValidate, _) => {
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

describe('getDateFromDateString', () => {
    test('returns undefined for undefined, empty string, or null input', () => {
        expect(getDateFromDateString(undefined)).toBeUndefined();
        expect(getDateFromDateString('')).toBeUndefined();
    });

    test('returns undefined for invalid date string', () => {
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

        expect(getDateFromDateString('invalid')).toBeUndefined();
        expect(consoleErrorSpy).not.toHaveBeenCalled();

        expect(getDateFromDateString('invalid', true)).toBeUndefined();
        expect(consoleErrorSpy).toHaveBeenCalledWith('DateUtils getDateFromDateString: invalid date string');

        consoleErrorSpy.mockRestore();
    });

    test('returns a valid Date object for valid date string', () => {
        const dateString = '2023-05-22';
        const result = getDateFromDateString(dateString);
        expect(result).toBeInstanceOf(Date);
        expect(result?.toISOString()).toEqual('2023-05-22T00:00:00.000Z');
    });
});

describe('getDateStringFromDate', () => {
    test('returns undefined for undefined or invalid date input', () => {
        expect(getDateStringFromDate(undefined)).toBeUndefined();
        expect(getDateStringFromDate(new Date('invalid'))).toBeUndefined();
    });

    test('returns a valid date string in the format YYYY-MM-DD for valid date input', () => {
        const date = new Date('2023-05-22T00:00:00.000Z');
        const result = getDateStringFromDate(date);
        expect(result).toEqual('2023-05-22');
    });

    test('returns a valid date string in the format YYYY-MM-DD for valid date input (with needed padding)', () => {
        const date = new Date('2023-01-01T00:00:00.000Z');
        const result = getDateStringFromDate(date);
        expect(result).toEqual('2023-01-01');
    });

    test('returns a valid date string in the format YYYY-MM-DD for valid date input (with different hours)', () => {
        const date = new Date('2023-01-01T23:59:00.000Z');
        const result = getDateStringFromDate(date);
        expect(result).toEqual('2023-01-01');
    });

});

describe('getWeekdayFromDate', () => {
    test('returns undefined for undefined or invalid date input', () => {
        expect(getWeekdayFromDate(undefined)).toBeUndefined();
        expect(getWeekdayFromDate(new Date('invalid'))).toBeUndefined();
    });

    test('returns the correct weekday number for valid date input', () => {
        const date = new Date('2023-05-22T00:00:00.000Z'); // Monday
        const result = getWeekdayFromDate(date);
        expect(result).toEqual(1);
    });
});

describe('getUnixEpochFromDate', () => {
    test('returns undefined for undefined or invalid date input', () => {
        expect(getUnixEpochFromDate(undefined)).toBeUndefined();
        expect(getUnixEpochFromDate(new Date('invalid'))).toBeUndefined();
    });

    test('returns a valid Unix epoch timestamp in seconds for valid date input', () => {
        const date = new Date('2023-05-22T00:00:00.000Z');
        const result = getUnixEpochFromDate(date);
        expect(result).toEqual(1684713600);
    });
});
