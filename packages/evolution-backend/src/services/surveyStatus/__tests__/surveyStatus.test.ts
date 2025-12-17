/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import moment from 'moment';
import { isSurveyEnded } from '../surveyStatus';
import projectConfig from 'evolution-common/lib/config/project.config';

// Mock the project config
jest.mock('evolution-common/lib/config/project.config', () => ({
    __esModule: true,
    default: {
        endDateTimeWithTimezoneOffset: undefined
    }
}));

describe('isSurveyEnded', () => {
    // Store original console methods
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;

    beforeEach(() => {
        // Mock console to avoid cluttering test output
        console.log = jest.fn();
        console.error = jest.fn();
        // Reset the config before each test
        (projectConfig as any).endDateTimeWithTimezoneOffset = undefined;
    });

    afterEach(() => {
        // Restore console
        console.log = originalConsoleLog;
        console.error = originalConsoleError;
        jest.clearAllMocks();
    });

    describe('when no end date is configured', () => {
        test('should return false', () => {
            expect(isSurveyEnded()).toBe(false);
        });

        test('should not log any errors', () => {
            isSurveyEnded();
            expect(console.error).not.toHaveBeenCalled();
        });
    });

    describe('when end date is in the past', () => {
        test('should return true for a date one day ago', () => {
            const yesterday = moment().subtract(1, 'day').format('YYYY-MM-DDTHH:mm:ssZ');
            (projectConfig as any).endDateTimeWithTimezoneOffset = yesterday;
            
            expect(isSurveyEnded()).toBe(true);
        });

        test('should return true for a date one hour ago', () => {
            const oneHourAgo = moment().subtract(1, 'hour').format('YYYY-MM-DDTHH:mm:ssZ');
            (projectConfig as any).endDateTimeWithTimezoneOffset = oneHourAgo;
            
            expect(isSurveyEnded()).toBe(true);
        });

        test('should return true for a date one minute ago', () => {
            const oneMinuteAgo = moment().subtract(1, 'minute').format('YYYY-MM-DDTHH:mm:ssZ');
            (projectConfig as any).endDateTimeWithTimezoneOffset = oneMinuteAgo;
            
            expect(isSurveyEnded()).toBe(true);
        });

        test('should return true for a specific past date with timezone', () => {
            (projectConfig as any).endDateTimeWithTimezoneOffset = '2024-12-31T23:59:59-05:00';
            
            expect(isSurveyEnded()).toBe(true);
        });
    });

    describe('when end date is in the future', () => {
        test('should return false for a date one day from now', () => {
            const tomorrow = moment().add(1, 'day').format('YYYY-MM-DDTHH:mm:ssZ');
            (projectConfig as any).endDateTimeWithTimezoneOffset = tomorrow;
            
            expect(isSurveyEnded()).toBe(false);
        });

        test('should return false for a date one hour from now', () => {
            const oneHourLater = moment().add(1, 'hour').format('YYYY-MM-DDTHH:mm:ssZ');
            (projectConfig as any).endDateTimeWithTimezoneOffset = oneHourLater;
            
            expect(isSurveyEnded()).toBe(false);
        });

        test('should return false for a date one minute from now', () => {
            const oneMinuteLater = moment().add(1, 'minute').format('YYYY-MM-DDTHH:mm:ssZ');
            (projectConfig as any).endDateTimeWithTimezoneOffset = oneMinuteLater;
            
            expect(isSurveyEnded()).toBe(false);
        });
    });

    describe('with different timezone offsets', () => {
        test('should correctly handle positive timezone offset', () => {
            const pastDateWithPositiveOffset = moment().subtract(1, 'day').format('YYYY-MM-DDTHH:mm:ss+09:00');
            (projectConfig as any).endDateTimeWithTimezoneOffset = pastDateWithPositiveOffset;
            
            expect(isSurveyEnded()).toBe(true);
        });

        test('should correctly handle negative timezone offset', () => {
            const pastDateWithNegativeOffset = moment().subtract(1, 'day').format('YYYY-MM-DDTHH:mm:ss-08:00');
            (projectConfig as any).endDateTimeWithTimezoneOffset = pastDateWithNegativeOffset;
            
            expect(isSurveyEnded()).toBe(true);
        });

        test('should correctly handle UTC timezone', () => {
            const pastDateUTC = moment().subtract(1, 'day').utc().format('YYYY-MM-DDTHH:mm:ss+00:00');
            (projectConfig as any).endDateTimeWithTimezoneOffset = pastDateUTC;
            
            expect(isSurveyEnded()).toBe(true);
        });

        test('should correctly compare times across different timezones', () => {
            // Set end date to yesterday at 5 PM EST (UTC-5)
            (projectConfig as any).endDateTimeWithTimezoneOffset = '2024-12-15T17:00:00-05:00';
            
            // This should be true as the date is in the past regardless of current timezone
            expect(isSurveyEnded()).toBe(true);
        });

        test('should return true when end time is 1 hour earlier but in timezone 2 hours ahead (where HH:mm:ss is 1 hour ahead in our time zone, survey is ended)', () => {
            // End time is 1 hour ago in local time, but represented in a timezone that's 2 hours ahead
            // This means the actual moment is still 1 hour in the past
            const oneHourAgo = moment().subtract(1, 'hour');
            const currentOffset = moment().utcOffset();
            const endTimeInFutureTimezone = oneHourAgo.clone().utcOffset(currentOffset + 120).format('YYYY-MM-DDTHH:mm:ssZZ');
            (projectConfig as any).endDateTimeWithTimezoneOffset = endTimeInFutureTimezone;
            
            expect(isSurveyEnded()).toBe(true);
        });

        test('should return false when end time is 1 hour later but in timezone 2 hours behind (survey is not finished)', () => {
            // End time is 1 hour in the future in local time, but represented in a timezone that's 2 hours in the future
            // This means the actual moment is 1 hour in the past
            const oneHourLater = moment().add(1, 'hour');
            const currentOffset = moment().utcOffset();
            const endTimeInPastTimezone = oneHourLater.clone().utcOffset(currentOffset - 120).format('YYYY-MM-DDTHH:mm:ssZZ');
            (projectConfig as any).endDateTimeWithTimezoneOffset = endTimeInPastTimezone;
            
            expect(isSurveyEnded()).toBe(false);
        });
    });

    describe('with invalid date formats', () => {
        test('should return false for invalid date string', () => {
            (projectConfig as any).endDateTimeWithTimezoneOffset = 'not-a-valid-date';
            
            expect(isSurveyEnded()).toBe(false);
        });

        test('should log an error for invalid date string', () => {
            (projectConfig as any).endDateTimeWithTimezoneOffset = 'invalid-date';
            
            expect(isSurveyEnded()).toBe(false);
            
            expect(console.error).toHaveBeenCalledWith(
                'Invalid endDateTimeWithTimezoneOffset configured: invalid-date'
            );
        });

        test('should return true for date without timezone', () => {
            (projectConfig as any).endDateTimeWithTimezoneOffset = '2024-12-31T23:59:59';
            
            // Moment will still parse this, but it's not in the correct format
            // The function should still work but we're testing that it handles it
            const result = isSurveyEnded();
            expect(result).toBe(true);
        });

        test('should return false for empty string', () => {
            (projectConfig as any).endDateTimeWithTimezoneOffset = '';
            
            // Empty string should be falsy and return false early
            expect(isSurveyEnded()).toBe(false);
        });
    });

});
