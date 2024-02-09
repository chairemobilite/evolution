/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
/**
 * This file provides a router with the routes to validate interviews
 * */

// can return invalid dates: use isNaN on date.getTime() to check if it's valid
export const parseDate = function (date: string | Date | undefined | null, showErrorOnValidate = false): Date | undefined {
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
