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
});
