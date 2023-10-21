/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { DESTRUCTION } from 'dns';
import {sortByParameters} from '../InputChoiceSorting';

const array = [0,1,2,3,4,5,6,7,8,9];

describe('Sort array with splitSort ', () => {
    const count = 3;

    test('SplitSort with count;', () => {
        const result = sortByParameters(array, undefined, count);

        expect(result).toEqual([[0,1,2,3],[4,5,6],[7,8,9]]);
    });
    test('SplitSort with no count;', () => {
        const result = sortByParameters(array);

        expect(result).toEqual([[0,1,2,3,4],[5,6,7,8,9]]);
    });
});

describe('Sort array with subsequentSort ', () => {
    const length = 3;

    test('SubsequentSort with length;', () => {
        const result = sortByParameters(array, undefined, undefined, length);

        expect(result).toEqual([[0,1,2],[3,4,5],[6,7,8],[9]]);
    });
    test('SubsequentSort with no length;', () => {
        const result = sortByParameters(array);

        expect(result).toEqual([[0,1,2,3,4],[5,6,7,8,9]]);
    });
});

describe('Sort array with customSort', () => {
    const sameAmount = [4,4,2];
    const moreParameters = [6,6,4];
    const lessParameters = [2,2];

    test('CustomSort with same amount of choices and parameters.', () => {
        const result = sortByParameters(array, undefined, undefined, undefined, sameAmount)

        expect(result).toEqual([[0,1,2,3],[4,5,6,7],[8,9]]);
    });
    test('CustomSort with less parameters than choices.', () => {
        const result = sortByParameters(array, undefined, undefined, undefined, lessParameters)

        expect(result).toEqual([[0,1],[2,3],[4,5,6,7,8,9]]);
    });
    test('CustomSort with more parameters than choices.', () => {
        const result = sortByParameters(array, undefined, undefined, undefined, moreParameters)

        expect(result).toEqual([[0,1,2,3,4,5],[6,7,8,9]]);
    });
});

describe('Sort array by parameters', () => {
    const columns = 2;
    const rows = -1;
    const alignment = 'vertical';

    test('with valid parameters.', () => {
        const result = sortByParameters(array, alignment, columns, undefined, undefined);

        expect(result).toEqual([[0,1,2,3,4],[5,6,7,8,9]]);
    });
    test('with invalid parameters.', () => {
        const result = sortByParameters(array, alignment, undefined, rows, undefined);

        expect(result).toEqual([[0,1,2,3,4],[5,6,7,8,9]]);
    });
    test('with valid columns but invalid rows', () => {
        const result = sortByParameters(array, alignment, columns, rows, undefined);

        expect(result).toEqual([[0,1,2,3,4],[5,6,7,8,9]]);
    })
});

describe('Sort array with no alignement', () => {
    const columns = 2;
    const rows = 2;

    test('with columns', () => {
        const result = sortByParameters(array, undefined, columns);

        expect(result).toEqual([[0,1,2,3,4],[5,6,7,8,9]]);
    });
    test('with rows', () => {
        const result = sortByParameters(array, undefined, undefined, rows);

        expect(result).toEqual([[0,1],[2,3],[4,5],[6,7],[8,9]]);
    });
    test('with columns & rows', () => {
        const result = sortByParameters(array, undefined, columns, rows);

        expect(result).toEqual([[0,1,2,3,4],[5,6,7,8,9]]);
    });
    test('with no columns & no rows', () => {
        const result = sortByParameters(array);

        expect(result).toEqual([[0,1,2,3,4],[5,6,7,8,9]]);
    });
});