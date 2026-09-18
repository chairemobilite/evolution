/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { StartEndable } from '../StartEndable';

describe('StartEndable Class', () => {

    it('should return errors for invalid params and accept empty or valid uuid', () => {
        expect(StartEndable.validateParams({
            startDate: 'invalid-date',
            endDate: 'invalid-date',
            startTime: -1,
            endTime: -1,
            startTimePeriod: 123,
            endTimePeriod: 123
        })).toEqual([
            new Error('StartEndable validateParams: startDate should be a valid date string'),
            new Error('StartEndable validateParams: startTime should be a positive integer'),
            new Error('StartEndable validateParams: startTimePeriod should be a string'),
            new Error('StartEndable validateParams: endDate should be a valid date string'),
            new Error('StartEndable validateParams: endTime should be a positive integer'),
            new Error('StartEndable validateParams: endTimePeriod should be a string')
        ]);
        expect(StartEndable.validateParams({
            startDate: 'invalid-date',
            endDate: 'invalid-date',
            startTime: -1,
            endTime: -1,
            startTimePeriod: 123,
            endTimePeriod: 123
        }, 'testName')).toEqual([
            new Error('testName StartEndable validateParams: startDate should be a valid date string'),
            new Error('testName StartEndable validateParams: startTime should be a positive integer'),
            new Error('testName StartEndable validateParams: startTimePeriod should be a string'),
            new Error('testName StartEndable validateParams: endDate should be a valid date string'),
            new Error('testName StartEndable validateParams: endTime should be a positive integer'),
            new Error('testName StartEndable validateParams: endTimePeriod should be a string')
        ]);
        expect(StartEndable.validateParams({})).toEqual([]);
        expect(StartEndable.validateParams({
            startDate: '2023-01-01',
            endDate: '2023-01-01',
            startTime: 10000,
            endTime: 10000,
            startTimePeriod: 'am',
            endTimePeriod: 'pm'
        })).toEqual([]);
    });

    describe('hasStart', () => {
        test.each([
            { description: 'undefined object', startEndable: undefined, expected: false },
            { description: 'empty object', startEndable: {}, expected: false },
            { description: 'startTime is midnight', startEndable: { startTime: 0 }, expected: true },
            { description: 'startTime is set', startEndable: { startTime: 3600 }, expected: true },
            { description: 'startTime is negative', startEndable: { startTime: -1 }, expected: false },
            { description: 'startTimePeriod is set', startEndable: { startTimePeriod: 'am' }, expected: true },
            { description: 'startTimePeriod is blank', startEndable: { startTimePeriod: '   ' }, expected: false },
            {
                description: 'startTime and startTimePeriod are set',
                startEndable: { startTime: 3600, startTimePeriod: 'am' },
                expected: true
            },
            {
                description: 'only endTime is set',
                startEndable: { endTime: 7200 },
                expected: false
            },
            {
                description: 'only endTimePeriod is set',
                startEndable: { endTimePeriod: 'pm' },
                expected: false
            }
        ])('$description', ({ startEndable, expected }) => {
            expect(StartEndable.hasStart(startEndable)).toBe(expected);
        });
    });

    describe('hasEnd', () => {
        test.each([
            { description: 'undefined object', startEndable: undefined, expected: false },
            { description: 'empty object', startEndable: {}, expected: false },
            { description: 'endTime is midnight', startEndable: { endTime: 0 }, expected: true },
            { description: 'endTime is set', startEndable: { endTime: 7200 }, expected: true },
            { description: 'endTime is negative', startEndable: { endTime: -1 }, expected: false },
            { description: 'endTimePeriod is set', startEndable: { endTimePeriod: 'pm' }, expected: true },
            { description: 'endTimePeriod is blank', startEndable: { endTimePeriod: '   ' }, expected: false },
            {
                description: 'endTime and endTimePeriod are set',
                startEndable: { endTime: 7200, endTimePeriod: 'pm' },
                expected: true
            },
            {
                description: 'only startTime is set',
                startEndable: { startTime: 3600 },
                expected: false
            },
            {
                description: 'only startTimePeriod is set',
                startEndable: { startTimePeriod: 'am' },
                expected: false
            }
        ])('$description', ({ startEndable, expected }) => {
            expect(StartEndable.hasEnd(startEndable)).toBe(expected);
        });
    });

    describe('timesAreValid', () => {
        it('should return true for valid times with no dates (10000,10000)', () => {
            expect(StartEndable.timesAreValid({
                startTime: 10000,
                endTime: 10000
            })).toBe(true);
        });
        it('should return true for valid times with only start date (10000,10000)', () => {
            expect(StartEndable.timesAreValid({
                startTime: 10000,
                endTime: 10000,
                startDate: '2023-01-01'
            })).toBe(true);
        });
        it('should return true for valid times with only end date (10000,10000)', () => {
            expect(StartEndable.timesAreValid({
                startTime: 10000,
                endTime: 10000,
                endDate: '2023-01-01'
            })).toBe(true);
        });
        it('should return true for valid times with no dates (10000,11000)', () => {
            expect(StartEndable.timesAreValid({
                startTime: 10000,
                endTime: 11000
            })).toBe(true);
        });
        it('should return true for valid times with no dates (0,10000)', () => {
            expect(StartEndable.timesAreValid({
                startTime: 0,
                endTime: 10000
            })).toBe(true);
        });
        it('should return true for valid times with no dates (0,0)', () => {
            expect(StartEndable.timesAreValid({
                startTime: 0,
                endTime: 0
            })).toBe(true);
        });
        it('should return false for invalid times with no dates (-1,10000)', () => {
            expect(StartEndable.timesAreValid({
                startTime: -1,
                endTime: 10000
            })).toBe(false);
        });
        it('should return false for invalid times with no dates (10000,-1)', () => {
            expect(StartEndable.timesAreValid({
                startTime: 10000,
                endTime: -1
            })).toBe(false);
        });
        it('should return false for invalid times with no dates (-1,-1)', () => {
            expect(StartEndable.timesAreValid({
                startTime: -1,
                endTime: -1
            })).toBe(false);
        });
        it('should return false for invalid times with dates (end date before start date)', () => {
            expect(StartEndable.timesAreValid({
                startTime: 10000,
                endTime: 10000,
                startDate: '2023-01-01',
                endDate: '2022-12-31'
            })).toBe(false);
        });
        it('should return true for valid times with dates (end date after start date, different times)', () => {
            expect(StartEndable.timesAreValid({
                startTime: 10000,
                endTime: 5000,
                startDate: '2023-01-01',
                endDate: '2023-01-02'
            })).toBe(true);
        });
        it('should return true for valid times with dates (end date after start date, different times 2)', () => {
            expect(StartEndable.timesAreValid({
                startTime: 10000,
                endTime: 10000,
                startDate: '2023-01-01',
                endDate: '2023-01-02'
            })).toBe(true);
        });
        it('should return true for valid times with dates (end date after start date, same time)', () => {
            expect(StartEndable.timesAreValid({
                startTime: 10000,
                endTime: 10000,
                startDate: '2023-01-01',
                endDate: '2023-01-02'
            })).toBe(true);
        });
        it('should return true for valid times with dates (same date)', () => {
            expect(StartEndable.timesAreValid({
                startTime: 10000,
                endTime: 15000,
                startDate: '2023-01-01',
                endDate: '2023-01-01'
            })).toBe(true);
        });
        it ('should return undefined for undefined times or dates', () => {
            expect(StartEndable.timesAreValid({
                startTime: undefined,
                endTime: 10000,
                startDate: '2023-01-01',
                endDate: '2022-12-31'
            })).toBe(undefined);
            expect(StartEndable.timesAreValid({
                startTime: 10000,
                endTime: undefined,
                startDate: '2023-01-01',
                endDate: '2022-12-31'
            })).toBe(undefined);
            expect(StartEndable.timesAreValid({
                startTime: undefined,
                endTime: undefined,
                startDate: '2023-01-01',
                endDate: '2022-12-31'
            })).toBe(undefined);
            expect(StartEndable.timesAreValid({
                startTime: undefined,
                endTime: undefined,
                startDate: undefined,
                endDate: '2022-12-31'
            })).toBe(undefined);
            expect(StartEndable.timesAreValid({
                startTime: undefined,
                endTime: undefined,
                startDate: undefined,
                endDate: undefined
            })).toBe(undefined);
        });
    });

    describe('getDurationSeconds', () => {
        it('should return the duration in seconds (same date, same time)', () => {
            expect(StartEndable.getDurationSeconds({
                startTime: 10000,
                endTime: 10000,
                startDate: '2023-01-01',
                endDate: '2023-01-01'
            })).toBe(0);
        });
        it('should return the duration in seconds (same date)', () => {
            expect(StartEndable.getDurationSeconds({
                startTime: 10000,
                endTime: 13600,
                startDate: '2023-01-01',
                endDate: '2023-01-01'
            })).toBe(3600);
        });
        it('should return the duration in seconds (different date)', () => {
            expect(StartEndable.getDurationSeconds({
                startTime: 10000,
                endTime: 10000,
                startDate: '2023-01-01',
                endDate: '2023-01-02'
            })).toBe(86400);
        });
        it('should return the duration in seconds (no date)', () => {
            expect(StartEndable.getDurationSeconds({
                startTime: 10000,
                endTime: 15000
            })).toBe(5000);
        });
        it('should return the duration in seconds (one date)', () => {
            expect(StartEndable.getDurationSeconds({
                startTime: 10000,
                endTime: 15000,
                startDate: '2023-01-01'
            })).toBe(5000);
            expect(StartEndable.getDurationSeconds({
                startTime: 10000,
                endTime: 15000,
                endDate: '2023-01-01'
            })).toBe(5000);
        });
        it('should return undefined for undefined start time', () => {
            expect(StartEndable.getDurationSeconds({
                startTime: undefined,
                endTime: 10000,
                startDate: '2023-01-01',
                endDate: '2022-12-31'
            })).toBe(undefined);
        });
        it('should return undefined for undefined end time', () => {
            expect(StartEndable.getDurationSeconds({
                startTime: 1000,
                endTime: undefined,
                startDate: '2023-01-01',
                endDate: '2022-12-31'
            })).toBe(undefined);
        });
        it('should return undefined for invalid time', () => {
            expect(StartEndable.getDurationSeconds({
                startTime: -1,
                endTime: 10000,
                startDate: '2023-01-01',
                endDate: '2023-01-02'
            })).toBe(undefined);
            expect(StartEndable.getDurationSeconds({
                startTime: '7200' as any,
                endTime: 10000,
                startDate: '2023-01-01',
                endDate: '2023-01-02'
            })).toBe(undefined);
            expect(StartEndable.getDurationSeconds({
                startTime: 10000 as any,
                endTime: '7200' as any,
                startDate: '2023-01-01',
                endDate: '2023-01-02'
            })).toBe(undefined);
        });
    });
});
