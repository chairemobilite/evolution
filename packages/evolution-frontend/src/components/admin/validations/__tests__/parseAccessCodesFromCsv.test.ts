/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { parseAccessCodesFromCsv } from '../parseAccessCodesFromCsv';
import projectConfig from 'evolution-common/lib/config/project.config';

describe('parseAccessCodesFromCsv', () => {
    // Validation follows the configured `accessCodeFormat`. These tests use the
    // default format '0000-0000' (eight digits, optional dash/space in the middle).
    test.each([
        ['empty content', '', []],
        ['single code', '1111-1111', ['1111-1111']],
        ['one code per line', '1111-1111\n2222-2222\n3333-3333', ['1111-1111', '2222-2222', '3333-3333']],
        ['windows line endings', '1111-1111\r\n2222-2222', ['1111-1111', '2222-2222']],
        ['trailing newline and blank lines', '1111-1111\n\n2222-2222\n', ['1111-1111', '2222-2222']],
        ['surrounding whitespace', '  1111-1111  \n\t2222-2222\t', ['1111-1111', '2222-2222']],
        ['quoted cells', '"1111-1111"\n"2222-2222"', ['1111-1111', '2222-2222']],
        ['only first column of a multi-column row', '1111-1111,extra,data\n2222-2222,more', ['1111-1111', '2222-2222']],
        ['duplicate codes removed, order preserved', '1111-1111\n2222-2222\n1111-1111', ['1111-1111', '2222-2222']],
        ['header row is dropped', 'accessCode\n1111-1111\n2222-2222', ['1111-1111', '2222-2222']],
        ['invalid codes are dropped', '1111-1111\nnot-a-code\n2222-2222', ['1111-1111', '2222-2222']]
    ])('%s', (_label, content, expected) => {
        expect(parseAccessCodesFromCsv(content)).toEqual(expected);
    });
});

describe('parseAccessCodesFromCsv follows the configured accessCodeFormat', () => {
    const defaultFormat = projectConfig.accessCodeFormat;
    afterEach(() => {
        projectConfig.accessCodeFormat = defaultFormat;
    });

    // The same mixed content is filtered differently depending on the configured
    // format: only codes matching the configured number of digits are kept.
    const mixedContent = '1234-5678\n123-456-789\nABC-123-456';
    test.each([
        ['eight-digits format 0000-0000', '0000-0000', ['1234-5678']],
        ['nine-digits format 000-000-000', '000-000-000', ['123-456-789']],
        ['alphanumeric format ABC-000-000', 'ABC-000-000', ['ABC-123-456']]
    ])('%s keeps only matching codes', (_label, format, expected) => {
        projectConfig.accessCodeFormat = format as typeof projectConfig.accessCodeFormat;
        expect(parseAccessCodesFromCsv(mixedContent)).toEqual(expected);
    });

    test('normalizes accepted variants to the canonical stored form and de-duplicates them', () => {
        // All three are valid variants of the same 8-digit code and must collapse to one canonical value
        expect(parseAccessCodesFromCsv('12345678\n1234 5678\n1234-5678')).toEqual(['1234-5678']);
    });
});
