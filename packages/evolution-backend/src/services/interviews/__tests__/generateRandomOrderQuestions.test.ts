/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { generateRandomOrderQuestions } from '../generateRandomOrderQuestions';

describe('generateRandomOrderQuestions', () => {
    test('skips empty groups and returns a permutation of the others', () => {
        const result = generateRandomOrderQuestions({
            attitudes: ['q1', 'q2', 'q3'],
            empty: [],
            values: ['v1', 'v2']
        });
        expect(Object.keys(result).sort()).toEqual(['attitudes', 'values']);
        expect([...result.attitudes].sort()).toEqual(['q1', 'q2', 'q3']);
        expect([...result.values].sort()).toEqual(['v1', 'v2']);
    });
});
