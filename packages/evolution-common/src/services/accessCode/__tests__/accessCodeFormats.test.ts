/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import {
    accessCodeFormats,
    getAccessCodeFormat,
    matchesAccessCodeFormat,
    normalizeAccessCode,
    defaultAccessCodeFormatName,
    type AccessCodeFormatName
} from '../accessCodeFormats';

describe('getAccessCodeFormat', () => {
    test('returns the requested format', () => {
        expect(getAccessCodeFormat('000-000-000')).toBe(accessCodeFormats['000-000-000']);
    });

    test('falls back to the default format for an unknown name', () => {
        expect(getAccessCodeFormat('unknown' as AccessCodeFormatName)).toBe(
            accessCodeFormats[defaultAccessCodeFormatName]
        );
    });
});

describe('each format carries a regex and a placeholder', () => {
    test.each(Object.keys(accessCodeFormats) as AccessCodeFormatName[])('format %s is well-formed', (formatName) => {
        const format = accessCodeFormats[formatName];
        expect(format.regex).toBeInstanceOf(RegExp);
        // The placeholder is itself a valid code for the format (it drives normalization)
        expect(matchesAccessCodeFormat(format.placeholder, format)).toBe(true);
    });
});

describe('matchesAccessCodeFormat validates against the format regex', () => {
    // Test case format: [format name, value, isValid]
    test.each([
        ['0000-0000', '1234-5678', true],
        ['0000-0000', '12345678', true],
        ['0000-0000', '1234 5678', true],
        ['0000-0000', '1234567', false],
        ['0000-0000', 'abcd-efgh', false],
        ['0000-0000', '123-456-789', false],
        ['000-000-000', '123-456-789', true],
        ['000-000-000', '123456789', true],
        ['000-000-000', '1234-5678', false],
        ['000-000-000', 'abc-def-ghi', false],
        ['ABCD-ABCD', 'ABCD-EFGH', true],
        ['ABCD-ABCD', 'abcd-efgh', true], // case-insensitive
        ['ABCD-ABCD', 'ABC1-EFGH', false],
        ['ABC-ABC-ABC', 'ABC-DEF-GHI', true],
        ['ABC-ABC-ABC', 'abcdefghi', true],
        ['ABC-ABC-ABC', 'ABC-12C-GHI', false],
        ['ABCD-0000', 'ABCD-1234', true],
        ['ABCD-0000', 'abcd1234', true],
        ['ABCD-0000', '1234-1234', false],
        ['ABC-000-000', 'ABC-123-456', true],
        ['ABC-000-000', 'abc123456', true],
        ['ABC-000-000', 'ABC-ABC-456', false],
        ['ABC-000-000', '123-123-456', false]
    ] as [AccessCodeFormatName, string, boolean][])(
        'format %s validates %s as %s',
        (formatName, value, isValid) => {
            expect(matchesAccessCodeFormat(value, getAccessCodeFormat(formatName))).toBe(isValid);
        }
    );
});

describe('normalizeAccessCode returns the canonical stored form', () => {
    // Test case format: [format name, input, canonical output]
    test.each([
        ['0000-0000', '1234-5678', '1234-5678'],
        ['0000-0000', '12345678', '1234-5678'], // missing dash
        ['0000-0000', '1234 5678', '1234-5678'], // spaces
        ['0000-0000', '  1234-5678  ', '1234-5678'], // surrounding whitespace
        ['0000-0000', '12-345678', '1234-5678'], // dash at the wrong place
        ['0000-0000', '123-45678', '1234-5678'], // dash at the wrong place
        ['000-000-000', '1234-56789', '123-456-789'], // dashes at the wrong place
        ['000-000-000', '123456789', '123-456-789'],
        ['ABCD-ABCD', 'abcdefgh', 'ABCD-EFGH'], // lower-cased
        ['ABCD-ABCD', 'abcd-efgh', 'ABCD-EFGH'],
        ['ABC-000-000', 'abc123456', 'ABC-123-456'],
        ['ABC-000-000', 'ABC-123-456', 'ABC-123-456'],
        ['0000-0000', '123', '123'] // partial input keeps no trailing dash
    ] as [AccessCodeFormatName, string, string][])(
        'format %s normalizes %s to %s',
        (formatName, input, expected) => {
            expect(normalizeAccessCode(input, getAccessCodeFormat(formatName))).toBe(expected);
        }
    );
});
