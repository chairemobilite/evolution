/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { parseAccessCodesFromCsv } from '../parseAccessCodesFromCsv';

describe('parseAccessCodesFromCsv', () => {
    // Access codes use the default format (eight digits, optional dash/space in the middle).
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
