/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import {
    epochToDate,
    dateToString,
    dateToIsoWithTimezone,
    Timezone
} from '../DateTimeUtils';

describe('DateTimeUtils', () => {
    describe('epochToDate', () => {
        test.each([
            [0, new Date('1970-01-01T00:00:00.000Z')],
            [1759948692000, new Date('2025-10-08T18:38:12.000Z')]
        ])('should convert epoch %i to date %s', (epochMilliseconds, expectedDate) => {
            const result = epochToDate(epochMilliseconds / 1000);
            expect(result.getTime()).toBe(expectedDate.getTime());
        });

        test('should handle negative epoch (before 1970)', () => {
            const epochMilliseconds = -86400000; // 1969-12-31
            const result = epochToDate(epochMilliseconds / 1000);
            expect(result.toISOString()).toBe('1969-12-31T00:00:00.000Z');
        });

        test('should handle fractional seconds by truncating', () => {
            const epochMilliseconds = 1609459200000.999;
            const result = epochToDate(epochMilliseconds / 1000);
            // Fractional seconds should be truncated to the nearest millisecond
            const expectedTimestamp = 1609459200000; // '2021-01-01T00:00:00.000Z'
            expect(result.getTime()).toBe(expectedTimestamp);
        });

        test('should handle milliseconds and truncate to the nearest second', () => {
            const epochMilliseconds = 1609459212345;
            const result = epochToDate(epochMilliseconds / 1000);
            expect(result.toISOString()).toBe('2021-01-01T00:00:12.000Z');
        });
    });

    describe('dateToString', () => {
        const testDate = new Date('2024-03-15T14:30:45.000Z');

        describe('timezone handling', () => {
            test.each([
                ['UTC', 'en-CA', '2024-03-15, 2:30:45 p.m.'],
                ['America/New_York', 'en-CA', '2024-03-15, 10:30:45 a.m.'],
                ['America/Los_Angeles', 'en-CA', '2024-03-15, 7:30:45 a.m.'],
                ['America/Toronto', 'en-CA', '2024-03-15, 10:30:45 a.m.'],
                ['Europe/Paris', 'en-CA', '2024-03-15, 3:30:45 p.m.'],
                ['Asia/Tokyo', 'en-CA', '2024-03-15, 11:30:45 p.m.']
            ])('should format date in timezone %s with locale %s as %s', (timeZone, locale, expected) => {
                const result = dateToString(testDate, locale, timeZone as Timezone);
                expect(result).toBe(expected);
            });
        });

        describe('daylight saving time transitions', () => {
            test('should handle spring forward (DST start)', () => {
                // March 10, 2024 2:00 AM - DST starts in North America
                const springForward = new Date('2024-03-10T07:00:00.000Z'); // 2 AM EST becomes 3 AM EDT
                const result = dateToString(springForward, 'en-CA', 'America/New_York' as Timezone);
                expect(result).toBe('2024-03-10, 3:00:00 a.m.'); // Verify time shifted to 3 AM EDT
            });

            test('should handle fall back (DST end)', () => {
                // November 3, 2024 2:00 AM - DST ends in North America
                const fallBack = new Date('2024-11-03T06:00:00.000Z'); // 2 AM EDT becomes 1 AM EST
                const result = dateToString(fallBack, 'en-CA', 'America/New_York' as Timezone);
                expect(result).toBe('2024-11-03, 1:00:00 a.m.'); // Verify time shifted to 1 AM EST
            });
        });

        describe('timezone handling change of day in Canada (daylight saving time, summer)', () => {
            const testDate = epochToDate(1759982399000 / 1000);
            test('should format date 23:59:59 local to not be on the following day even if UTC is in the next day', () => {
                const result = dateToString(testDate, 'fr-CA', 'America/Toronto' as Timezone);
                expect(result).toBe('2025-10-08 23 h 59 min 59 s');
                expect(testDate.toISOString()).toBe('2025-10-09T03:59:59.000Z');
            });
        });

        describe('timezone handling change of day in Canada (not daylight saving time, winter)', () => {
            const testDate = epochToDate(1765256399000 / 1000);
            test('should format date 23:59:59 local to not be on the following day even if UTC is in the next day', () => {
                const result = dateToString(testDate, 'fr-CA', 'America/Toronto' as Timezone);
                expect(result).toBe('2025-12-08 23 h 59 min 59 s');
                expect(testDate.toISOString()).toBe('2025-12-09T04:59:59.000Z');
            });
        });

        describe('locale handling', () => {
            test.each([
                ['en-CA', 'UTC', '2024-03-15, 2:30:45 p.m.'],
                ['fr-CA', 'UTC', '2024-03-15 14 h 30 min 45 s'],
                ['en-US', 'UTC', '3/15/2024, 2:30:45 PM'],
                ['fr-FR', 'UTC', '15/03/2024 14:30:45']
            ])('should format date with locale %s in timezone %s as %s', (locale, timeZone, expected) => {
                const result = dateToString(testDate, locale, timeZone as Timezone);
                expect(result).toBe(expected);
            });
        });

        describe('default parameters', () => {
            test('should use en-CA locale by default', () => {
                const result = dateToString(testDate);
                expect(result).toBe('2024-03-15, 2:30:45 p.m.');
            });

            test('should use UTC timezone by default', () => {
                const result = dateToString(testDate, 'en-CA');
                expect(result).toBe('2024-03-15, 2:30:45 p.m.');
            });
        });

        describe('edge cases', () => {
            test('should handle epoch zero', () => {
                const epochZero = new Date(0);
                const result = dateToString(epochZero, 'en-CA', 'UTC' as Timezone);
                expect(result).toBe('1970-01-01, 12:00:00 a.m.');
            });

            test('should handle dates far in the future', () => {
                const futureDate = new Date('2100-12-31T23:59:59.000Z');
                const result = dateToString(futureDate, 'en-CA', 'UTC' as Timezone);
                expect(result).toBe('2100-12-31, 11:59:59 p.m.');
            });

            test('should handle dates far in the past', () => {
                const pastDate = new Date('1900-01-01T00:00:00.000Z');
                const result = dateToString(pastDate, 'en-CA', 'UTC' as Timezone);
                expect(result).toBe('1900-01-01, 12:00:00 a.m.');
            });
        });
    });

    describe('dateToIsoWithTimezone', () => {
        test.each([
            [1765256399000 / 1000, 'America/Toronto', true, '2025-12-08 23:59:59'],
            [1765256399000 / 1000, 'America/Toronto', false, '2025-12-08'],
            [1765256399000 / 1000, 'UTC', true, '2025-12-09 04:59:59'],
            [1765256399000 / 1000, 'UTC', false, '2025-12-09']
        ])('should format epoch %i in timezone %s with time=%s as %s', (epochSeconds, timezone, withTime, expected) => {
            const testDate = epochToDate(epochSeconds);
            expect(dateToIsoWithTimezone(testDate, timezone as Timezone, withTime)).toBe(expected);
        });
    });

    describe('integration tests', () => {
        test('should convert epoch to date and format it correctly', () => {
            const epochMilliseconds = 1710512445000; // 2024-03-15T14:20:45Z
            const date = epochToDate(epochMilliseconds / 1000);
            const formatted = dateToString(date, 'en-CA', 'UTC' as Timezone);
            expect(formatted).toBe('2024-03-15, 2:20:45 p.m.');
        });

        test('should handle round-trip conversion', () => {
            const originalEpochMilliseconds = 1704067200000; // 2024-01-01T00:00:00Z
            const date = epochToDate(originalEpochMilliseconds / 1000);
            const epochMillisecondsFromDate = Math.floor(date.getTime());
            expect(epochMillisecondsFromDate).toBe(originalEpochMilliseconds);
        });

        test('should handle timezone-aware formatting after epoch conversion', () => {
            const epochMilliseconds = 1704067200000; // 2024-01-01T00:00:00Z
            const date = epochToDate(epochMilliseconds / 1000);
            const utcFormatted = dateToString(date, 'en-CA', 'UTC' as Timezone);
            const nyFormatted = dateToString(date, 'en-CA', 'America/New_York' as Timezone);

            expect(utcFormatted).toBe('2024-01-01, 12:00:00 a.m.');
            expect(nyFormatted).toBe('2023-12-31, 7:00:00 p.m.'); // 5 hours behind UTC
        });
    });

});
