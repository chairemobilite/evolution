/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Optional } from '../types/Optional.type';

/**
 * This functions will parse a date string or date object and return a date object if valid.
 * Will no logner be needed once we switch to the new function getDateFromDateString
 * Can return invalid dates: use isNaN on date.getTime() to check if it's valid
 * @deprecated use getDateFromDateString instead
 * @param date the date string or date object
 * @param showErrorOnValidate whether to show an error in the console if the date is invalid
 * @returns date object | undefined if invalid or undefined or null
 */
export const parseDate = function (
    date: string | Date | undefined | null,
    showErrorOnValidate = false
): Date | undefined {
    if (date === undefined || date === '' || date === null) {
        return undefined;
    }
    if (date instanceof Date) {
        return date;
    }
    const parsedDate = new Date(date);
    if (showErrorOnValidate && isNaN(parsedDate.getDate())) {
        console.error('DateUtils parseDate: invalid date');
    }
    return parsedDate;
};

/**
 * Parse a date string and returns a Date object, checking validity.
 * @param dateString the date in string or Date format
 * @param showErrorOnValidate Whether to show an error in the console if the date is invalid
 * @returns Date or undefined if invalid
 */
export const getDateFromDateString = function (
    dateString: Optional<string>,
    showErrorOnValidate = false
): Optional<Date> {
    if (dateString === undefined || dateString === '' || dateString === null) {
        return undefined;
    }
    const parsedDate = new Date(dateString);
    if (isNaN(parsedDate.getDate())) {
        if (showErrorOnValidate) {
            console.error('DateUtils getDateFromDateString: invalid date string');
        }
        return undefined;
    }
    return parsedDate;
};

/**
 * Convert a date to a string with the format 'YYYY-MM-DD' (ignore timezone)
 * Does not convert from/ot utc time.
 * Make sure to use getUTCDateFromLocalDate to get the correct UTC date
 * ALWAYS use this function to get the date string from a date to avoid timezone issues
 * @param date Date object
 * @returns a new Date object with the same date and time as the input date, but in local time
 * or undefined if undefined or invalid date
 */
export const getDateStringFromDate = function (date: Optional<Date>): Optional<string> {
    if (date === undefined || isNaN(date.getDate())) {
        return undefined;
    }
    return [
        date.getUTCFullYear(),
        ('00' + (date.getUTCMonth() + 1).toString()).slice(-2),
        ('00' + date.getUTCDate().toString()).slice(-2)
    ].join('-');
};

/**
 * Get weekday from date (ignore timezone)
 * @param date Date object
 * @returns a number from 0 to 6 (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * or undefined if undefined or invalid date
 */
export const getWeekdayFromDate = function (date: Optional<Date>): Optional<number> {
    if (date === undefined || isNaN(date.getDate())) {
        return undefined;
    }
    return date.getUTCDay();
};

/**
 * Convert a date to a unix/epoch timestamp in seconds.
 * @param date Date object
 * @returns a timestamp in seconds or undefined if undefined or invalid date
 */
export const getUnixEpochFromDate = function (date: Optional<Date>): Optional<number> {
    if (date === undefined || isNaN(date.getDate())) {
        return undefined;
    }
    return date.valueOf() / 1000;
};
