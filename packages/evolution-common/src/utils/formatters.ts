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
export const eightDigitsAccessCodeFormatter = (input: string): string =>
    formatGeneral(input, {
        blocks: [4, 4],
        delimiter: '-',
        numericOnly: true
    });

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
        numericOnly: false,
        uppercase: true
    });
};
