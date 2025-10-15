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
            const [year, month, day] = datePartClean.split('/').map(Number);
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

/**
 * Parses an ISO date string (YYYY-MM-DD) to a Date object at the start of the day (00:00:00 UTC).
 * Note: This function does not validate the format. Use with validateISODateString first for validation.
 *
 * @param isoDateString - The ISO date string in YYYY-MM-DD format
 * @returns A Date object representing the start of the day in UTC
 */
export const parseISODateToStartOfDay = (isoDateString: string): Date => {
    return new Date(`${isoDateString}T00:00:00Z`);
};

/**
 * Parses an ISO date string (YYYY-MM-DD) to a Date object at the end of the day (23:59:59 UTC).
 * Note: This function does not validate the format. Use with validateISODateString first for validation.
 *
 * @param isoDateString - The ISO date string in YYYY-MM-DD format
 * @returns A Date object representing the end of the day in UTC
 */
export const parseISODateToEndOfDay = (isoDateString: string): Date => {
    return new Date(`${isoDateString}T23:59:59Z`);
};

/**
 * Regular expression to match YYYY-MM-DD format
 */
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Branded type for ISO date strings in YYYY-MM-DD format.
 * This prevents passing arbitrary strings where validated dates are expected.
 */
export type ISODateString = string & { readonly __brand: 'ISODateString' };

/**
 * Error thrown when date validation fails
 */
export class DateValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'DateValidationError';
    }
}

/**
 * Validates a string is in YYYY-MM-DD format and represents a valid date.
 *
 * @param dateString - The string to validate
 * @returns The validated date string as ISODateString
 * @throws DateValidationError if the string is not a valid YYYY-MM-DD date
 */
export function validateISODateString(dateString: string): ISODateString {
    // Check format
    if (!ISO_DATE_REGEX.test(dateString)) {
        throw new DateValidationError(`Invalid date format: "${dateString}". Expected YYYY-MM-DD format.`);
    }

    // Parse and validate the date is valid
    const date = parseISODateToStartOfDay(dateString);

    // Check if date is valid (not NaN)
    if (isNaN(date.getTime())) {
        throw new DateValidationError(`Invalid date: "${dateString}". The date components do not form a valid date.`);
    }

    // Verify the parsed date matches the input (catches issues like 2024-02-30)
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const reconstructed = `${year}-${month}-${day}`;

    if (reconstructed !== dateString) {
        throw new DateValidationError(
            `Invalid date: "${dateString}". The date components do not form a valid date (parsed as ${reconstructed}).`
        );
    }

    return dateString as ISODateString;
}

/**
 * Validates a date range where both dates are defined.
 * Ensures endDate is strictly after startDate.
 *
 * @param startDate - The start date
 * @param endDate - The end date
 * @throws DateValidationError if endDate is not after startDate
 */
export function validateDateRange(startDate: ISODateString, endDate: ISODateString): void {
    const start = parseISODateToStartOfDay(startDate);
    const end = parseISODateToStartOfDay(endDate);

    if (end <= start) {
        throw new DateValidationError(
            `Invalid date range: endDate (${endDate}) must be after startDate (${startDate}).`
        );
    }
}

/**
 * Validates project configuration dates (startDate and endDate).
 * If both dates are provided, ensures they form a valid range.
 *
 * @param startDate - Optional start date string
 * @param endDate - Optional end date string
 * @returns An object with validated dates (or undefined if not provided)
 * @throws DateValidationError if any date is invalid or if the range is invalid
 */
export function validateProjectDates(
    startDate: string | undefined,
    endDate: string | undefined
): {
    startDate: ISODateString | undefined;
    endDate: ISODateString | undefined;
} {
    let validatedStartDate: ISODateString | undefined;
    let validatedEndDate: ISODateString | undefined;

    // Validate startDate if provided
    if (startDate !== undefined) {
        try {
            validatedStartDate = validateISODateString(startDate);
        } catch (error) {
            if (error instanceof DateValidationError) {
                throw new DateValidationError(`Invalid startDate: ${error.message}`);
            }
            throw error;
        }
    }

    // Validate endDate if provided
    if (endDate !== undefined) {
        try {
            validatedEndDate = validateISODateString(endDate);
        } catch (error) {
            if (error instanceof DateValidationError) {
                throw new DateValidationError(`Invalid endDate: ${error.message}`);
            }
            throw error;
        }
    }

    // Validate range if both dates are provided
    if (validatedStartDate !== undefined && validatedEndDate !== undefined) {
        validateDateRange(validatedStartDate, validatedEndDate);
    }

    return {
        startDate: validatedStartDate,
        endDate: validatedEndDate
    };
}
