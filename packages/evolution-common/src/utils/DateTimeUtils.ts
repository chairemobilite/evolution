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
