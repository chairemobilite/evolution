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
    getTimeZoneOffsetMinutes,
    dateTimeWithTimezoneOffsetToEpoch,
    ISODateTimeStringWithTimezoneOffset,
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

    describe('getTimeZoneOffsetMinutes', () => {
        describe('standard time zones', () => {
            test.each([
                [new Date('2024-01-15T12:00:00.000Z'), 'UTC', 0],
                [new Date('2024-01-15T12:00:00.000Z'), 'America/St_Johns', -210], // NST: UTC-3.5
                [new Date('2024-01-15T12:00:00.000Z'), 'America/Los_Angeles', -480], // PST: UTC-8
                [new Date('2024-01-15T12:00:00.000Z'), 'America/Toronto', -300], // EST: UTC-5
                [new Date('2024-01-15T12:00:00.000Z'), 'Europe/Paris', 60], // CET: UTC+1
                [new Date('2024-01-15T12:00:00.000Z'), 'Asia/Tokyo', 540], // JST: UTC+9
                [new Date('2024-01-15T12:00:00.000Z'), 'Australia/Sydney', 660] // AEDT: UTC+11 (summer)
            ])('should return offset %i minutes for %s at %s', (date, timezone, expectedOffset) => {
                const offset = getTimeZoneOffsetMinutes(date, timezone as Timezone);
                expect(offset).toBe(expectedOffset);
            });
        });

        describe('daylight saving time transitions', () => {
            test.each([
                // Winter (NST)
                [new Date('2024-01-15T12:00:00.000Z'), 'America/St_Johns', -210],
                // Summer (NST)
                [new Date('2024-07-15T12:00:00.000Z'), 'America/St_Johns', -150],
                // Winter (PST)
                [new Date('2024-01-15T12:00:00.000Z'), 'America/Los_Angeles', -480],
                // Summer (PDT)
                [new Date('2024-07-15T12:00:00.000Z'), 'America/Los_Angeles', -420],
                // Winter (EST)
                [new Date('2024-01-15T12:00:00.000Z'), 'America/Toronto', -300],
                // Summer (EDT)
                [new Date('2024-07-15T12:00:00.000Z'), 'America/Toronto', -240]
            ])('should handle DST for %s in %s: %i minutes', (date, timezone, expectedOffset) => {
                const offset = getTimeZoneOffsetMinutes(date, timezone as Timezone);
                expect(offset).toBe(expectedOffset);
            });
        });

        describe('edge cases', () => {
            test('should handle epoch zero', () => {
                const epochZero = new Date(0);
                const offset = getTimeZoneOffsetMinutes(epochZero, 'UTC' as Timezone);
                expect(offset).toBe(0);
            });

            test('should handle negative offsets correctly', () => {
                const date = new Date('2024-01-15T12:00:00.000Z');
                const offset = getTimeZoneOffsetMinutes(date, 'America/New_York' as Timezone);
                expect(offset).toBe(-300); // -5 hours = -300 minutes
            });

            test('should handle positive offsets correctly', () => {
                const date = new Date('2024-01-15T12:00:00.000Z');
                const offset = getTimeZoneOffsetMinutes(date, 'Asia/Tokyo' as Timezone);
                expect(offset).toBe(540); // +9 hours = 540 minutes
            });

            test('should handle fractional hour offsets', () => {
                const date = new Date('2024-01-15T12:00:00.000Z');
                const offset = getTimeZoneOffsetMinutes(date, 'Asia/Kolkata' as Timezone); // UTC+5:30
                expect(offset).toBe(330); // 5.5 hours = 330 minutes
            });

            test('should return undefined for invalid timezone', () => {
                const date = new Date('2024-01-15T12:00:00.000Z');
                const offset = getTimeZoneOffsetMinutes(date, 'Invalid/Timezone' as Timezone);
                expect(offset).toBeUndefined();
            });
        });

        describe('DST transition moments', () => {
            test('should handle spring forward in North America', () => {
                // March 10, 2024 - DST starts
                const beforeDST = new Date('2024-03-10T06:59:00.000Z'); // 1:59 AM EST
                const afterDST = new Date('2024-03-10T07:01:00.000Z'); // 3:01 AM EDT
                expect(getTimeZoneOffsetMinutes(beforeDST, 'America/New_York' as Timezone)).toBe(-300);
                expect(getTimeZoneOffsetMinutes(afterDST, 'America/New_York' as Timezone)).toBe(-240);
            });

            test('should handle fall back in North America', () => {
                // November 3, 2024 - DST ends
                const beforeDST = new Date('2024-11-03T05:59:00.000Z'); // 1:59 AM EDT
                const afterDST = new Date('2024-11-03T06:01:00.000Z'); // 1:01 AM EST
                expect(getTimeZoneOffsetMinutes(beforeDST, 'America/New_York' as Timezone)).toBe(-240);
                expect(getTimeZoneOffsetMinutes(afterDST, 'America/New_York' as Timezone)).toBe(-300);
            });
        });

        describe('timezone format variations and invalid input', () => {
            test.each([
                // Format with padded zeros (should now succeed without parsing)
                ['America/New_York', -300],
                // Abbreviation without space (should now succeed)
                ['Europe/Paris', 60],
                // Lowercase GMT (should now succeed)
                ['UTC', 0],
                // Bracketed format (should now succeed)
                ['America/Los_Angeles', -480],
                // Invalid timezone (should return undefined)
                ['Invalid/Timezone', undefined]
            ])('should handle timezone %s returning %i', (timezone, expectedOffset) => {
                const date = new Date('2024-01-15T12:00:00.000Z');
                const offset = getTimeZoneOffsetMinutes(date, timezone as Timezone);
                if (expectedOffset === undefined) {
                    expect(offset).toBeUndefined();
                } else {
                    expect(offset).toBe(expectedOffset);
                }
            });
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

    describe('dateTimeWithTimezoneOffsetToEpoch', () => {
        describe('UTC timezone', () => {
            test('should convert UTC datetime with Z notation', () => {
                const dateTime = '2025-01-01T00:00:00Z' as ISODateTimeStringWithTimezoneOffset;
                const epoch = dateTimeWithTimezoneOffsetToEpoch(dateTime);
                const expectedDate = new Date('2025-01-01T00:00:00.000Z');
                expect(epoch).toBe(expectedDate.getTime() / 1000);
            });

            test('should convert UTC datetime with +00:00 offset', () => {
                const dateTime = '2025-01-01T00:00:00+00:00' as ISODateTimeStringWithTimezoneOffset;
                const epoch = dateTimeWithTimezoneOffsetToEpoch(dateTime);
                const expectedDate = new Date('2025-01-01T00:00:00.000Z');
                expect(epoch).toBe(expectedDate.getTime() / 1000);
            });
        });

        describe('negative timezone offsets', () => {
            test('should convert datetime with -05:00 offset (EST)', () => {
                const dateTime = '2025-01-01T00:00:00-05:00' as ISODateTimeStringWithTimezoneOffset;
                const epoch = dateTimeWithTimezoneOffsetToEpoch(dateTime);
                // 2025-01-01 00:00:00 EST is 2025-01-01 05:00:00 UTC
                const expectedDate = new Date('2025-01-01T05:00:00.000Z');
                expect(epoch).toBe(expectedDate.getTime() / 1000);
            });

            test('should convert datetime with -04:00 offset (EDT)', () => {
                const dateTime = '2025-07-01T00:00:00-04:00' as ISODateTimeStringWithTimezoneOffset;
                const epoch = dateTimeWithTimezoneOffsetToEpoch(dateTime);
                // 2025-07-01 00:00:00 EDT is 2025-07-01 04:00:00 UTC
                const expectedDate = new Date('2025-07-01T04:00:00.000Z');
                expect(epoch).toBe(expectedDate.getTime() / 1000);
            });

            test('should convert datetime with -08:00 offset (PST)', () => {
                const dateTime = '2025-01-15T12:00:00-08:00' as ISODateTimeStringWithTimezoneOffset;
                const epoch = dateTimeWithTimezoneOffsetToEpoch(dateTime);
                // 2025-01-15 12:00:00 PST is 2025-01-15 20:00:00 UTC
                const expectedDate = new Date('2025-01-15T20:00:00.000Z');
                expect(epoch).toBe(expectedDate.getTime() / 1000);
            });
        });

        describe('positive timezone offsets', () => {
            test('should convert datetime with +09:00 offset (JST)', () => {
                const dateTime = '2025-01-15T12:00:00+09:00' as ISODateTimeStringWithTimezoneOffset;
                const epoch = dateTimeWithTimezoneOffsetToEpoch(dateTime);
                // 2025-01-15 12:00:00 JST is 2025-01-15 03:00:00 UTC
                const expectedDate = new Date('2025-01-15T03:00:00.000Z');
                expect(epoch).toBe(expectedDate.getTime() / 1000);
            });

            test('should convert datetime with +01:00 offset (CET)', () => {
                const dateTime = '2025-01-15T12:00:00+01:00' as ISODateTimeStringWithTimezoneOffset;
                const epoch = dateTimeWithTimezoneOffsetToEpoch(dateTime);
                // 2025-01-15 12:00:00 CET is 2025-01-15 11:00:00 UTC
                const expectedDate = new Date('2025-01-15T11:00:00.000Z');
                expect(epoch).toBe(expectedDate.getTime() / 1000);
            });

            test('should convert datetime with +02:00 offset (CEST)', () => {
                const dateTime = '2025-07-15T12:00:00+02:00' as ISODateTimeStringWithTimezoneOffset;
                const epoch = dateTimeWithTimezoneOffsetToEpoch(dateTime);
                // 2025-07-15 12:00:00 CEST is 2025-07-15 10:00:00 UTC
                const expectedDate = new Date('2025-07-15T10:00:00.000Z');
                expect(epoch).toBe(expectedDate.getTime() / 1000);
            });
        });

        describe('fractional timezone offsets', () => {
            test('should convert datetime with +05:30 offset (IST)', () => {
                const dateTime = '2025-01-15T12:00:00+05:30' as ISODateTimeStringWithTimezoneOffset;
                const epoch = dateTimeWithTimezoneOffsetToEpoch(dateTime);
                // 2025-01-15 12:00:00 IST is 2025-01-15 06:30:00 UTC
                const expectedDate = new Date('2025-01-15T06:30:00.000Z');
                expect(epoch).toBe(expectedDate.getTime() / 1000);
            });

            test('should convert datetime with -03:30 offset (NST)', () => {
                const dateTime = '2025-01-15T12:00:00-03:30' as ISODateTimeStringWithTimezoneOffset;
                const epoch = dateTimeWithTimezoneOffsetToEpoch(dateTime);
                // 2025-01-15 12:00:00 NST is 2025-01-15 15:30:00 UTC
                const expectedDate = new Date('2025-01-15T15:30:00.000Z');
                expect(epoch).toBe(expectedDate.getTime() / 1000);
            });

            test('should convert datetime with +09:30 offset (ACST)', () => {
                const dateTime = '2025-01-15T12:00:00+09:30' as ISODateTimeStringWithTimezoneOffset;
                const epoch = dateTimeWithTimezoneOffsetToEpoch(dateTime);
                // 2025-01-15 12:00:00 ACST is 2025-01-15 02:30:00 UTC
                const expectedDate = new Date('2025-01-15T02:30:00.000Z');
                expect(epoch).toBe(expectedDate.getTime() / 1000);
            });
        });

        describe('edge cases', () => {
            test('should handle epoch zero', () => {
                const dateTime = '1970-01-01T00:00:00Z' as ISODateTimeStringWithTimezoneOffset;
                const epoch = dateTimeWithTimezoneOffsetToEpoch(dateTime);
                expect(epoch).toBe(0);
            });

            test('should handle dates far in the future', () => {
                const dateTime = '2100-12-31T23:59:59Z' as ISODateTimeStringWithTimezoneOffset;
                const epoch = dateTimeWithTimezoneOffsetToEpoch(dateTime);
                const expectedDate = new Date('2100-12-31T23:59:59.000Z');
                expect(epoch).toBe(expectedDate.getTime() / 1000);
            });

            test('should handle dates far in the past', () => {
                const dateTime = '1900-01-01T00:00:00Z' as ISODateTimeStringWithTimezoneOffset;
                const epoch = dateTimeWithTimezoneOffsetToEpoch(dateTime);
                const expectedDate = new Date('1900-01-01T00:00:00.000Z');
                expect(epoch).toBe(expectedDate.getTime() / 1000);
            });

            test('should handle midnight', () => {
                const dateTime = '2025-10-15T00:00:00-04:00' as ISODateTimeStringWithTimezoneOffset;
                const epoch = dateTimeWithTimezoneOffsetToEpoch(dateTime);
                const expectedDate = new Date('2025-10-15T04:00:00.000Z');
                expect(epoch).toBe(expectedDate.getTime() / 1000);
            });

            test('should handle end of day', () => {
                const dateTime = '2025-10-15T23:59:59-04:00' as ISODateTimeStringWithTimezoneOffset;
                const epoch = dateTimeWithTimezoneOffsetToEpoch(dateTime);
                const expectedDate = new Date('2025-10-16T03:59:59.000Z');
                expect(epoch).toBe(expectedDate.getTime() / 1000);
            });
        });

        describe('DST transitions', () => {
            test('should handle DST start date (spring forward)', () => {
                // March 9, 2025 - DST starts in North America
                const dateTime = '2025-03-09T02:00:00-05:00' as ISODateTimeStringWithTimezoneOffset;
                const epoch = dateTimeWithTimezoneOffsetToEpoch(dateTime);
                const expectedDate = new Date('2025-03-09T07:00:00.000Z');
                expect(epoch).toBe(expectedDate.getTime() / 1000);
            });

            test('should handle DST end date (fall back)', () => {
                // November 2, 2025 - DST ends in North America
                const dateTime = '2025-11-02T02:00:00-04:00' as ISODateTimeStringWithTimezoneOffset;
                const epoch = dateTimeWithTimezoneOffsetToEpoch(dateTime);
                const expectedDate = new Date('2025-11-02T06:00:00.000Z');
                expect(epoch).toBe(expectedDate.getTime() / 1000);
            });
        });

        describe('round-trip conversion', () => {
            test('should round-trip with epochToDate', () => {
                const dateTime = '2025-10-15T14:30:00-04:00' as ISODateTimeStringWithTimezoneOffset;
                const epoch = dateTimeWithTimezoneOffsetToEpoch(dateTime);
                const date = epochToDate(epoch);

                // The date should represent the same moment in time
                expect(date.toISOString()).toBe('2025-10-15T18:30:00.000Z');
            });

            test('should work with multiple timezones for same moment', () => {
                // These represent the same moment in time
                const dateTimeEST = '2025-01-15T12:00:00-05:00' as ISODateTimeStringWithTimezoneOffset;
                const dateTimeUTC = '2025-01-15T17:00:00Z' as ISODateTimeStringWithTimezoneOffset;
                const dateTimeJST = '2025-01-16T02:00:00+09:00' as ISODateTimeStringWithTimezoneOffset;

                const epochEST = dateTimeWithTimezoneOffsetToEpoch(dateTimeEST);
                const epochUTC = dateTimeWithTimezoneOffsetToEpoch(dateTimeUTC);
                const epochJST = dateTimeWithTimezoneOffsetToEpoch(dateTimeJST);

                // All should produce the same epoch
                expect(epochEST).toBe(epochUTC);
                expect(epochUTC).toBe(epochJST);
            });
        });

        describe('real-world examples', () => {
            test('should handle survey start time in Toronto winter', () => {
                const dateTime = '2025-01-01T00:00:00-05:00' as ISODateTimeStringWithTimezoneOffset;
                const epoch = dateTimeWithTimezoneOffsetToEpoch(dateTime);
                const expectedDate = new Date('2025-01-01T05:00:00.000Z');
                expect(epoch).toBe(expectedDate.getTime() / 1000);
            });

            test('should handle survey end time in Toronto summer', () => {
                const dateTime = '2025-10-31T23:59:59-04:00' as ISODateTimeStringWithTimezoneOffset;
                const epoch = dateTimeWithTimezoneOffsetToEpoch(dateTime);
                const expectedDate = new Date('2025-11-01T03:59:59.000Z');
                expect(epoch).toBe(expectedDate.getTime() / 1000);
            });
        });
    });

});
