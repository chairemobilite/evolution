/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import {
    DateValidationError,
    validateISODateString,
    validateDateRange,
    validateProjectDates,
    parseISODateToStartOfDay,
    parseISODateToEndOfDay
} from '../../utils/DateTimeUtils';

describe('validateISODateString', () => {
    describe('valid dates', () => {
        test.each([
            ['2024-01-01', 'simple date'],
            ['2024-12-31', 'end of year'],
            ['2024-02-29', 'leap year date'],
            ['2000-02-29', 'century leap year'],
            ['2024-06-15', 'mid-year date']
        ])('should validate %s (%s)', (dateString) => {
            const result = validateISODateString(dateString);
            expect(result).toBe(dateString);
        });
    });

    describe('invalid format', () => {
        test.each([
            ['2024-1-1', 'missing zero padding'],
            ['2024/01/01', 'wrong separator'],
            ['01-01-2024', 'wrong order'],
            ['2024-13-01', 'invalid month'],
            ['2024-00-01', 'zero month'],
            ['2024-01-32', 'invalid day'],
            ['2024-01-00', 'zero day'],
            ['24-01-01', 'two-digit year'],
            ['not-a-date', 'completely invalid'],
            ['', 'empty string'],
            ['2024-01', 'incomplete date'],
            ['2024-01-01 ', 'trailing space'],
            [' 2024-01-01', 'leading space']
        ])('should reject %s (%s)', (dateString) => {
            expect(() => validateISODateString(dateString)).toThrow(DateValidationError);
        });
    });

    describe('invalid date values', () => {
        test.each([
            ['2024-02-30', 'non-leap year February 30th'],
            ['2023-02-29', 'non-leap year February 29th'],
            ['2024-04-31', 'April 31st (only 30 days)'],
            ['2024-06-31', 'June 31st (only 30 days)'],
            ['2024-09-31', 'September 31st (only 30 days)'],
            ['2024-11-31', 'November 31st (only 30 days)'],
            ['1900-02-29', 'non-century leap year']
        ])('should reject %s (%s)', (dateString) => {
            expect(() => validateISODateString(dateString)).toThrow(DateValidationError);
            expect(() => validateISODateString(dateString)).toThrow(/Invalid date/);
        });
    });

    test('should provide helpful error messages', () => {
        expect(() => validateISODateString('2024/01/01')).toThrow(/Invalid date format.*Expected YYYY-MM-DD/);
        expect(() => validateISODateString('2024-02-30')).toThrow(/do not form a valid date/);
    });
});

describe('validateDateRange', () => {
    test('should accept valid date range', () => {
        const startDate = validateISODateString('2024-01-01');
        const endDate = validateISODateString('2024-12-31');
        expect(() => validateDateRange(startDate, endDate)).not.toThrow();
    });

    test('should accept date range with one day difference', () => {
        const startDate = validateISODateString('2024-01-01');
        const endDate = validateISODateString('2024-01-02');
        expect(() => validateDateRange(startDate, endDate)).not.toThrow();
    });

    test('should reject when end date is before start date', () => {
        const startDate = validateISODateString('2024-12-31');
        const endDate = validateISODateString('2024-01-01');
        expect(() => validateDateRange(startDate, endDate)).toThrow(DateValidationError);
        expect(() => validateDateRange(startDate, endDate)).toThrow(/must be after/);
    });

    test('should reject when dates are the same', () => {
        const startDate = validateISODateString('2024-01-01');
        const endDate = validateISODateString('2024-01-01');
        expect(() => validateDateRange(startDate, endDate)).toThrow(DateValidationError);
        expect(() => validateDateRange(startDate, endDate)).toThrow(/must be after/);
    });

    test('should provide helpful error message with date values', () => {
        const startDate = validateISODateString('2024-12-31');
        const endDate = validateISODateString('2024-01-01');
        expect(() => validateDateRange(startDate, endDate)).toThrow(/2024-01-01.*2024-12-31/);
    });
});

describe('validateProjectDates', () => {
    describe('both dates undefined', () => {
        test('should return undefined for both dates', () => {
            const result = validateProjectDates(undefined, undefined);
            expect(result.startDate).toBeUndefined();
            expect(result.endDate).toBeUndefined();
        });
    });

    describe('only startDate defined', () => {
        test('should validate and return only startDate', () => {
            const result = validateProjectDates('2024-01-01', undefined);
            expect(result.startDate).toBe('2024-01-01');
            expect(result.endDate).toBeUndefined();
        });

        test('should throw on invalid startDate', () => {
            expect(() => validateProjectDates('invalid-date', undefined)).toThrow(DateValidationError);
            expect(() => validateProjectDates('invalid-date', undefined)).toThrow(/Invalid startDate/);
        });
    });

    describe('only endDate defined', () => {
        test('should validate and return only endDate', () => {
            const result = validateProjectDates(undefined, '2024-12-31');
            expect(result.startDate).toBeUndefined();
            expect(result.endDate).toBe('2024-12-31');
        });

        test('should throw on invalid endDate', () => {
            expect(() => validateProjectDates(undefined, 'invalid-date')).toThrow(DateValidationError);
            expect(() => validateProjectDates(undefined, 'invalid-date')).toThrow(/Invalid endDate/);
        });
    });

    describe('both dates defined', () => {
        test('should validate and return both dates when valid range', () => {
            const result = validateProjectDates('2024-01-01', '2024-12-31');
            expect(result.startDate).toBe('2024-01-01');
            expect(result.endDate).toBe('2024-12-31');
        });

        test('should throw when startDate format is invalid', () => {
            expect(() => validateProjectDates('invalid', '2024-12-31')).toThrow(DateValidationError);
            expect(() => validateProjectDates('invalid', '2024-12-31')).toThrow(/Invalid startDate/);
        });

        test('should throw when endDate format is invalid', () => {
            expect(() => validateProjectDates('2024-01-01', 'invalid')).toThrow(DateValidationError);
            expect(() => validateProjectDates('2024-01-01', 'invalid')).toThrow(/Invalid endDate/);
        });

        test('should throw when dates are in wrong order', () => {
            expect(() => validateProjectDates('2024-12-31', '2024-01-01')).toThrow(DateValidationError);
            expect(() => validateProjectDates('2024-12-31', '2024-01-01')).toThrow(/must be after/);
        });

        test('should throw when dates are equal', () => {
            expect(() => validateProjectDates('2024-01-01', '2024-01-01')).toThrow(DateValidationError);
        });
    });
});

describe('date range comparison using DateTimeUtils', () => {
    test('start of day should be before end of day for same date', () => {
        const isoDate = validateISODateString('2024-06-15');
        const startOfDay = parseISODateToStartOfDay(isoDate);
        const endOfDay = parseISODateToEndOfDay(isoDate);
        expect(startOfDay < endOfDay).toBe(true);
    });

    test('should correctly compare across date boundaries', () => {
        const startDate = validateISODateString('2024-06-15');
        const endDate = validateISODateString('2024-06-16');

        const startOfFirstDay = parseISODateToStartOfDay(startDate);
        const endOfFirstDay = parseISODateToEndOfDay(startDate);
        const startOfSecondDay = parseISODateToStartOfDay(endDate);

        expect(startOfFirstDay < endOfFirstDay).toBe(true);
        expect(endOfFirstDay < startOfSecondDay).toBe(true);
    });
});

describe('DateValidationError', () => {
    test('should be instanceof Error', () => {
        const error = new DateValidationError('test message');
        expect(error).toBeInstanceOf(Error);
    });

    test('should have correct name', () => {
        const error = new DateValidationError('test message');
        expect(error.name).toBe('DateValidationError');
    });

    test('should preserve message', () => {
        const message = 'test error message';
        const error = new DateValidationError(message);
        expect(error.message).toBe(message);
    });
});

