/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { isSameMultiset } from '../ArrayUtils';

describe('isSameMultiset', () => {
    test.each([
        ['same order', ['a', 'b', 'a'], ['a', 'b', 'a'], true],
        ['different order', ['a', 'b', 'a'], ['a', 'a', 'b'], true],
        ['empty arrays', [], [], true],
        ['different length', ['a', 'b'], ['a'], false],
        ['different counts', ['a', 'a', 'b'], ['a', 'b', 'b'], false],
        ['missing element', ['a', 'b'], ['a', 'c'], false],
        ['numbers in a different order', [1, 2, 1], [1, 1, 2], true],
        ['numbers with a missing element', [1, 2], [1, 3], false],
        ['a number and its string', [1], ['1'], false]
    ])('%s', (_title, left, right, expected) => {
        expect(isSameMultiset(left, right)).toBe(expected);
    });
});
