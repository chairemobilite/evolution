/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * A predefined access code format. It is the single source of truth for a given
 * format:
 * - `regex` validates a full access code (case-insensitive, dashes/spaces
 *   optional, so `12345678`, `1234-5678` and `1234 5678` are all accepted for
 *   `'0000-0000'`);
 * - `placeholder` is the example shown in the input and also drives the
 *   normalization/live dash placement: each dash-separated group describes its
 *   length and type (digits if it contains `0-9`, otherwise letters), e.g.
 *   `'ABC-000-000'` is a letter group then two digit groups of length 3.
 *
 * Note: each group is homogeneous (all digits or all letters). Mixed groups
 * (e.g. a postal-code-like `A0A 0A0`) are not supported yet.
 */
export type AccessCodeFormat = {
    /** Validation regex for a full access code. */
    regex: RegExp;
    /** Example access code, used as input placeholder and to derive the groups. */
    placeholder: string;
};

/** A single group of an access code, derived from the placeholder: its `length` and whether it is made of digits. */
type AccessCodeGroup = { length: number; isDigit: boolean };

/**
 * Derive the successive groups of an access code from its placeholder. Groups
 * are the dash-separated segments; a group is a digit group if its first
 * character is a digit, otherwise a letter group.
 * @param placeholder The format placeholder (e.g. `'ABC-000-000'`)
 * @returns The successive groups
 */
const getGroupsFromPlaceholder = (placeholder: string): AccessCodeGroup[] =>
    placeholder.split('-').map((segment) => ({ length: segment.length, isDigit: /\d/.test(segment[0]) }));

/** Whether a character is valid for the given group type. Letters are case-insensitive. */
const charMatchesGroup = (char: string, isDigit: boolean): boolean => (isDigit ? /\d/.test(char) : /[a-z]/i.test(char));

/**
 * Catalogue of supported access code formats, keyed by a pattern-like name that
 * matches the placeholder (e.g. `'000-000-000'`). Each format gives its
 * validation `regex` and `placeholder` (which also drives normalization, see
 * {@link AccessCodeFormat}). In the regex, the dash and spaces between groups
 * are optional so input variants are accepted; it is case-insensitive so letter
 * groups accept both cases. To add a new format, add an entry here (and ideally
 * open an issue/PR on evolution so it is shared).
 */
export const accessCodeFormats = {
    '0000-0000': { regex: /^\d{4}-? *\d{4}$/i, placeholder: '0000-0000' },
    '000-000-000': { regex: /^\d{3}-? *\d{3}-? *\d{3}$/i, placeholder: '000-000-000' },
    'ABCD-ABCD': { regex: /^[a-z]{4}-? *[a-z]{4}$/i, placeholder: 'ABCD-ABCD' },
    'ABC-ABC-ABC': { regex: /^[a-z]{3}-? *[a-z]{3}-? *[a-z]{3}$/i, placeholder: 'ABC-ABC-ABC' },
    'ABCD-0000': { regex: /^[a-z]{4}-? *\d{4}$/i, placeholder: 'ABCD-0000' },
    'ABC-000-000': { regex: /^[a-z]{3}-? *\d{3}-? *\d{3}$/i, placeholder: 'ABC-000-000' }
} as const satisfies Record<string, AccessCodeFormat>;

/** Name of a supported access code format (key of {@link accessCodeFormats}). */
export type AccessCodeFormatName = keyof typeof accessCodeFormats;

/** The default access code format name, kept for backward compatibility. */
export const defaultAccessCodeFormatName: AccessCodeFormatName = '0000-0000';

/**
 * Get the access code format for the given name, falling back to the default
 * format if the name is unknown.
 * @param name The access code format name (see {@link accessCodeFormats})
 * @returns The matching access code format
 */
export const getAccessCodeFormat = (name: AccessCodeFormatName): AccessCodeFormat =>
    accessCodeFormats[name] ?? accessCodeFormats[defaultAccessCodeFormatName];

/**
 * Whether an access code matches the given format (using its regex). Accepted
 * input variants (missing dash, spaces, letter case) are considered valid; use
 * {@link normalizeAccessCode} to get the canonical stored form.
 * @param accessCode The access code to check
 * @param format The access code format to validate against
 * @returns Whether the access code matches the format
 */
export const matchesAccessCodeFormat = (accessCode: string, format: AccessCodeFormat): boolean =>
    format.regex.test(accessCode);

/**
 * Normalize an access code to its canonical form for the given format: groups
 * separated by a dash, letters upper-cased, characters not belonging to the
 * current group (wrong type or extra) dropped. This is the form that should be
 * stored and searched, so that accepted input variants (e.g. `12345678`,
 * `1234 5678`, lower-cased letters) always match the stored value.
 *
 * Partial input is normalized as far as it goes (e.g. an incomplete first group
 * is returned without a trailing dash), which also makes it suitable as the
 * live input formatter. As a result the returned canonical code may still be
 * invalid (incomplete or too short); validate it with {@link matchesAccessCodeFormat}
 * if needed.
 * @param input The raw access code input
 * @param format The access code format
 * @returns The canonical access code (possibly still invalid)
 */
export const normalizeAccessCode = (input: string, format: AccessCodeFormat): string => {
    const chars = input.toUpperCase().replace(/[^A-Z0-9]/g, ''); // Keep only letters and digits
    const result: string[] = [];
    let offset = 0;
    for (const group of getGroupsFromPlaceholder(format.placeholder)) {
        let current = '';
        // Take the next valid characters for this group, skipping invalid ones
        while (offset < chars.length && current.length < group.length) {
            if (charMatchesGroup(chars[offset], group.isDigit)) {
                current += chars[offset];
            }
            offset += 1;
        }
        if (current.length === 0) {
            break;
        }
        result.push(current);
    }
    return result.join('-');
};
