/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import {sortByParameters} from '../InputChoiceSorting';

const array = [0,1,2,3,4,5,6,7,8,9];

describe('Sort array in vertical fashion ', () =>{
    const columns = 3;
    const rows = 3;
    const alignment = 'vertical';

    test('Vertical By columns', () => {
        const result = sortByParameters(array, alignment, columns);

        expect(result).toEqual([[0,1,2,3],[4,5,6],[7,8,9]]);
    });
    test('Vertical By rows', () => {
        const result = sortByParameters(array, alignment, undefined, rows);

        expect(result).toEqual([[0,1,2],[3,4,5],[6,7,8],[9]]);
    });
    test('Vertical By columns & rows', () => {
        const result = sortByParameters(array, alignment, columns, rows);

        expect(result).toEqual([[0,1,2,3],[4,5,6],[7,8,9]]);
    });
    test('Vertical By no columns & no rows', () => {
        const result = sortByParameters(array, alignment);

        expect(result).toEqual([0,1,2,3,4,5,6,7,8,9]);
    });
});

describe('Sort array in horizontal fashion', () =>{
    const columns = 3;
    const rows = 3;
    const alignment = 'horizontal';

    test('horizontal By columns', () => {
        const result = sortByParameters(array, alignment, columns);

        expect(result).toEqual([[0,3,6,9],[1,4,7],[2,5,8]]);
    });
    test('horizontal By rows', () => {
        const result = sortByParameters(array, alignment, undefined, rows);

        expect(result).toEqual([[0,4,8],[1,5,9],[2,6],[3,7]]);
    });
    test('horizontal By columns & rows', () => {
        const result = sortByParameters(array, alignment, columns, rows);

        expect(result).toEqual([[0,3,6,9],[1,4,7],[2,5,8]]);
    });
    test('horizontal By no columns & no rows', () => {
        const result = sortByParameters(array, alignment);

        expect(result).toEqual([0,1,2,3,4,5,6,7,8,9]);
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

        expect(result).toEqual([0,1,2,3,4,5,6,7,8,9]);
    });
    test('with valid columns but invalid rows', () => {
        const result = sortByParameters(array, alignment, columns, rows, undefined);

        expect(result).toEqual([[0,1,2,3,4],[5,6,7,8,9]]);
    })
});

describe('Sort array by custom parameters', () => {
    const sameAmount = [4,4,2];
    const moreParameters = [6,6,4];
    const lessParameters = [2,2];
    const invalidHorizontalParameters = [3,5,2];
    const vertical = 'vertical';
    const horizontal = 'horizontal';

    test('Vertical with same amount of choices and parameters.', () => {
        const result = sortByParameters(array, vertical, undefined, undefined, sameAmount)

        expect(result).toEqual([[0,1,2,3],[4,5,6,7],[8,9]]);
    });
    test('Vertical with less parameters than choices.', () => {
        const result = sortByParameters(array, vertical, undefined, undefined, lessParameters)

        expect(result).toEqual([[0,1],[2,3],[4,5,6,7,8,9]]);
    });
    test('Vertical with more parameters than choices.', () => {
        const result = sortByParameters(array, vertical, undefined, undefined, moreParameters)

        expect(result).toEqual([[0,1,2,3,4,5],[6,7,8,9]]);
    });

    test('Horizontal with same amount of choices and parameters.', () => {
        const result = sortByParameters(array, horizontal, undefined, undefined, sameAmount)

        expect(result).toEqual([[0,4,8],[1,5,9],[2,6],[3,7]]);
    });
    test('Horizontal with less parameters than choices.', () => {
        const result = sortByParameters(array, horizontal, undefined, undefined, lessParameters)

        expect(result).toEqual([[0,2],[1,3]]);
    });
    test('Horizontal with more parameters than choices.', () => {
        const result = sortByParameters(array, horizontal, undefined, undefined, moreParameters)

        expect(result).toEqual([[0,6],[1,7],[2,8],[3,9],[4],[5]]);
    });
    test('Horizontal with invalid parameters', () => {
        const result = sortByParameters(array, horizontal, undefined, undefined, invalidHorizontalParameters);

        expect(result).toEqual([[0,3,8],[1,4,9],[2,5]]);
    });
});