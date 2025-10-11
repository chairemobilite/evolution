/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * Converts a Unix epoch in seconds to a Date object in the local timezone.
 * @param epochSeconds - The Unix epoch in seconds.
 * @returns A Date object in the local timezone.
 */
export const epochToDate = (epochSeconds: number): Date => {
    // see https://stackoverflow.com/questions/4631928/convert-utc-epoch-to-local-date
    // to understand why we need to set Date to 0 (reset to UTC epoch)
    const utcDate = new Date(0);
    utcDate.setUTCSeconds(epochSeconds);
    return utcDate;
};

/**
 * Converts a Date object to a string in the local timezone.
 * @param date - The Date object to convert.
 * @param locale - The locale to use for the string. Default is 'en-CA'.
 * @param timeZone - The time zone to use for the string.
 * @returns A string in the local timezone.
 */
export const dateToString = (date: Date, locale: string = 'en-CA', timeZone: string = 'UTC'): string => {
    return date.toLocaleString(locale, { timeZone: timeZone });
};

/**
 * YYYY-MM-DD [HH:mm:ss] using the sv-SE locale since it produces the correct ISO8601 format
 * See https://stackoverflow.com/questions/25050034/get-iso-8601-using-intl-datetimeformat
 * @param date Date object
 * @param timeZone Time zone to use for the string. Default is 'UTC'.
 * @param withTime If true, the string will include the time. Default is false (only date).
 * @returns A string in the format YYYY-MM-DD HH:mm:ss with local time zone.
 */
export const dateToIsoWithTimezone = (date: Date, timeZone: string = 'UTC', withTime: boolean = false): string => {
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
export const getTimeZoneOffsetMinutes = (date: Date, timeZone: string): number | undefined => {
    try {
        // Define format options for consistent 24-hour output (e.g., "2024/01/15 12:00:00")
        const formatOptions: Intl.DateTimeFormatOptions = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        };

        // Helper to parse formatted string (e.g., "15/01/2024 12:00:00" or "15-01-2024 12:00:00" or with comma like "15/01/2024, 12:00:00" for en-CA) to UTC timestamp
        const parseToUTC = (dateStr: string): number => {
            const [datePartRaw, timePart] = dateStr.split(' ');
            const datePart = datePartRaw.replace(/,/g, ''); // Remove any trailing comma
            const datePartClean = datePart.replace(/-/g, '/');
            const [day, month, year] = datePartClean.split('/').map(Number);
            const [hours, minutes, seconds] = timePart.split(':').map(Number);
            return Date.UTC(year, month - 1, day, hours, minutes, seconds);
        };

        // Get UTC timestamp
        const utcFormatter = new Intl.DateTimeFormat('en-CA', { ...formatOptions, timeZone: 'UTC' });
        const utcString = utcFormatter.format(date);
        const utcTime = parseToUTC(utcString);

        // Get timezone-specific timestamp
        const tzFormatter = new Intl.DateTimeFormat('en-CA', { ...formatOptions, timeZone });
        const tzString = tzFormatter.format(date);
        const tzTime = parseToUTC(tzString);

        // Calculate difference in milliseconds and convert to minutes
        const offsetMs = tzTime - utcTime;
        return Math.round(offsetMs / 60000);
    } catch {
        // Return undefined on any errors (e.g., invalid timezone or parsing failure)
        return undefined;
    }
};
