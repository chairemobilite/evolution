/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import {
    type AccessCodeFormat,
    getAccessCodeFormat,
    normalizeAccessCode
} from '../services/accessCode/accessCodeFormats';

/**
 * Format an access code while typing, following the provided format. For
 * example, `'0000-0000'` produces `1234-5678` and `'ABC-000-000'` produces
 * `ABC-123-456`. This is the canonical normalization (see
 * {@link normalizeAccessCode}): letters are upper-cased, invalid characters are
 * dropped and dashes are inserted at group boundaries.
 *
 * @param input The input to format
 * @param format The access code format describing the successive groups
 * @returns The formatted access code
 */
export const accessCodeFormatter = (input: string, format: AccessCodeFormat): string =>
    normalizeAccessCode(input, format);

/**
 * Format an access code to the format "0000-0000" (8 digits).
 *
 * @deprecated Prefer {@link accessCodeFormatter} with the survey's configured
 * `accessCodeFormat`, so the format stays consistent with validation. Kept for
 * backward compatibility with surveys explicitly wired to the 8-digit format.
 * @param input The input to format
 * @returns The formatted access code
 */
export const eightDigitsAccessCodeFormatter = (input: string): string =>
    accessCodeFormatter(input, getAccessCodeFormat('0000-0000'));

/**
 * Formats a canadian postal code as 2 blocks of 3 characters. Note that this
 * does not validate while writing, it just formats the input.
 * @param input The input to format
 * @returns The formatted canadian postal code
 */
export const canadianPostalCodeFormatter = (input: string): string => {
    // Remove everything but letters and numbers and spaces
    input = input.replace(/[^a-zA-Z0-9\s]/g, '');
    // Make it all uppercase
    input = input.toUpperCase();
    // Get only the numbers and letters. If we have 6 or if total input length more than 7, we can automatically format the access code.
    const digitsLetters = input.replace(/[^a-zA-Z0-9]/g, '');
    if (digitsLetters.length >= 6 || input.length === 7) {
        return digitsLetters.slice(0, 3) + (digitsLetters.length > 3 ? ' ' + digitsLetters.slice(3, 6) : '');
    }
    // Prevent entering more than 7 characters (2 blocks of 3 characters with a space)
    return input.slice(0, 7);
};
