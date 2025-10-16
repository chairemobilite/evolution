/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * Branded type for ISO date time strings in YYYY-MM-DDTHH:MM:SS-/+HH:MM format with timezone offset.
 * This prevents passing arbitrary strings where validated date times with timezones are expected.
 */
export type ISODateTimeStringWithTimezoneOffset = string & { readonly __brand: 'ISODateTimeStringWithTimezoneOffset' };

/**
 * Branded type for timezones.
 * This prevents passing arbitrary strings where validated timezones are expected.
 */
export type Timezone = string & { readonly __brand: 'Timezone' };

/**
 * Converts a Unix epoch in seconds to a Date object.
 * @param epochSeconds - The Unix epoch in seconds.
 * @returns A Date object representing the given epoch time.
 */
export const epochToDate = (epochSeconds: number): Date => {
    // see https://stackoverflow.com/questions/4631928/convert-utc-epoch-to-local-date
    // to understand why we need to set Date to 0 (reset to UTC epoch)
    const utcDate = new Date(0);
    utcDate.setUTCSeconds(epochSeconds);
    return utcDate;
};

/**
 * Converts a date time string with timezone offset to a Unix epoch in seconds.
 * @param dateTimeWithTimezoneOffset - The date time string with timezone offset.
 * @returns A Unix epoch in seconds.
 */
export const dateTimeWithTimezoneOffsetToEpoch = (
    dateTimeWithTimezoneOffset: ISODateTimeStringWithTimezoneOffset
): number => {
    const date = new Date(dateTimeWithTimezoneOffset);
    return date.getTime() / 1000;
};

/**
 * Converts a Date object to a locale-specific string.
 * @param date - The Date object to convert.
 * @param locale - The locale to use for the string. Default is 'en-CA'.
 * @param timeZone - The time zone to use for the string. Default is 'UTC'.
 * @returns A formatted string in the specified locale and timezone.
 */
export const dateToString = (date: Date, locale: string = 'en-CA', timeZone: Timezone = 'UTC' as Timezone): string => {
    return date.toLocaleString(locale, { timeZone: timeZone });
};

/**
 * YYYY-MM-DD [HH:mm:ss] using the sv-SE locale since it produces the correct ISO8601 format
 * See https://stackoverflow.com/questions/25050034/get-iso-8601-using-intl-datetimeformat
 * @param date Date object
 * @param timeZone Time zone to use for the string. Default is 'UTC'.
 * @param withTime If true, the string will include the time. Default is false (only date).
 * @returns A string in the format YYYY-MM-DD [HH:mm:ss] in the specified timezone.
 */
export const dateToIsoWithTimezone = (
    date: Date,
    timeZone: Timezone = 'UTC' as Timezone,
    withTime: boolean = false
): string => {
    return new Intl.DateTimeFormat('sv-SE', {
        dateStyle: 'short',
        timeStyle: withTime ? 'medium' : undefined,
        timeZone
    }).format(date);
};

/**
 * Get the time zone offset in minutes for a given date and time zone.
 * @param date The date to get the time zone offset for.
 * @param timeZone The time zone to get the offset for.
 * @returns The time zone offset in minutes, or undefined on error (e.g., invalid timezone).
 */
export const getTimeZoneOffsetMinutes = (date: Date, timeZone: Timezone): number | undefined => {
    try {
        const formatOptions: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: false
        };

        // Helper to extract UTC timestamp from parts
        const partsToUTC = (parts: Intl.DateTimeFormatPart[]): number => {
            const getValue = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);
            return Date.UTC(
                getValue('year'),
                getValue('month') - 1,
                getValue('day'),
                getValue('hour'),
                getValue('minute'),
                getValue('second')
            );
        };

        // Get UTC timestamp
        const utcFormatter = new Intl.DateTimeFormat('en-CA', { ...formatOptions, timeZone: 'UTC' });
        const utcTime = partsToUTC(utcFormatter.formatToParts(date));

        // Get timezone-specific timestamp
        const tzFormatter = new Intl.DateTimeFormat('en-CA', { ...formatOptions, timeZone });
        const tzTime = partsToUTC(tzFormatter.formatToParts(date));

        // Calculate difference in milliseconds and convert to minutes
        const offsetMs = tzTime - utcTime;
        // Sign convention: positive = ahead of UTC, negative = behind (opposite of Date.getTimezoneOffset())
        // Examples: UTC+5 => 300, UTC-5 => -300
        return Math.round(offsetMs / 60000);
    } catch {
        return undefined;
    }
};

/**
 * Error thrown when date validation fails
 */
export class DateValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DateValidationError';
    }
}
