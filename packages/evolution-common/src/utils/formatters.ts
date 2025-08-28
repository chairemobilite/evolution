/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { formatGeneral } from 'cleave-zen';

/**
 * Format an access code to the format "XXXX-XXXX" where X is a digit.
 * If the input contains less than 8 digits, it will return the code as is
 * If the input contains 8 or more digits, it will format the first 8 digits
 * as "XXXX-XXXX".
 * @param input The input to format
 * @returns The formatted access code
 */
export const eightDigitsAccessCodeFormatter = (input: string): string => {
    input = input.replace('_', '-'); // change _ to -
    input = input.replace(/[^-\d]/g, ''); // Remove everything but numbers and -
    // Get only the digits. If we have 8 or if total input length is 9, we can automatically format the access code.
    const digits = input.replace(/\D+/g, '');
    if (digits.length >= 8 || input.length === 9) {
        return digits.slice(0, 4) + (digits.length > 4 ? '-' + digits.slice(4, 8) : '');
    }
    // Prevent entering more than 9 characters (8 digit access code and a dash)
    return input.slice(0, 9);
};

/**
 * Formats a canadian postal code as 2 blocks of 3 characters. Note that this
 * does not validate while writing, it just formats the input.
 * @param input The input to format
 * @returns The formatted canadian postal code
 */
export const canadianPostalCodeFormatter = (input: string): string => {
    // Remove everything but letters and numbers
    const strippedInput = input.replace(/[^a-zA-Z0-9]/g, '');
    // Format with 2 blocks of 3 characters, with a space in between
    return formatGeneral(strippedInput, {
        blocks: [3, 3],
        delimiter: ' ',
        delimiterLazyShow: true,
        numericOnly: false,
        uppercase: true
    });
};
