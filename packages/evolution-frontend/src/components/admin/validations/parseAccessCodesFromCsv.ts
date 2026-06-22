/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { accessCodeValidation } from 'evolution-common/lib/services/widgets/validations/validations';
import { type UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';

/**
 * Whether a value passes the access code validation. `accessCodeValidation`
 * returns one entry per validation rule, where `validation === true` means the
 * rule failed, so a value is valid only when no rule failed. It only depends on
 * the value, so the interview and path arguments are placeholders.
 *
 * @param value The candidate access code
 * @returns true if the value is a valid access code
 */
const isValidAccessCode = (value: string): boolean =>
    !accessCodeValidation(value, undefined, {} as UserInterviewAttributes, 'accessCode').some(
        (rule) => rule.validation === true
    );

/**
 * Parse a list of access codes from the raw text content of a CSV file.
 *
 * The expected format is intentionally lenient: one access code per line. If a
 * line contains multiple comma-separated values (a true CSV row), only the
 * first column is used, which lets validators export a single-column CSV from a
 * spreadsheet without extra formatting. Blank lines, surrounding whitespace and
 * quotes are ignored. Values that fail the access code validation are dropped
 * (this also discards a header row such as "accessCode"), and duplicates are
 * removed while preserving order.
 *
 * @param content The raw text content of the uploaded CSV file
 * @returns The de-duplicated list of valid access codes, in file order
 */
export const parseAccessCodesFromCsv = (content: string): string[] => {
    const codes = content
        .split(/\r?\n/)
        .map((line) => line.split(',')[0])
        .map((cell) => cell.trim().replace(/^"|"$/g, '').trim())
        .filter((code) => isValidAccessCode(code));
    return Array.from(new Set(codes));
};
