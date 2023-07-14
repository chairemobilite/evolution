import * as inputChoiceSorting from '../InputChoiceSorting';

const array = [0,1,2,3,4,5,6,7,8,9];

describe('Sort array in vertical fashion ', () =>{
    test('by columns.', () => {
        const columnCount = 3;
        const result = inputChoiceSorting.verticalByColumns(array, columnCount);

        expect(result).toEqual([[0,1,2,3],[4,5,6],[7,8,9]]);
    });

    test('by rows.', () => {
        const rowCount = 4;
        const result = inputChoiceSorting.verticalByRows(array, rowCount);

        expect(result).toEqual([[0,1,2,3],[4,5,6,7],[8,9]]);
    });
});

describe('Sort array in horizontal fashion', () =>{
    test('by columns.', () => {
        const columnCount = 3;
        const result = inputChoiceSorting.horizontalByColumns(array, columnCount);

        expect(result).toEqual([[0,3,6,9],[1,4,7],[2,5,8]])
    });
    test('by rows.', () => {
        const rowCount = 5
        const result = inputChoiceSorting.horizontalByRows(array, rowCount);

        expect(result).toEqual([[0,2,4,6,8], [1,3,5,7,9]]);
    });
});

describe('Sort array by parameters ', () => {
    test('with valid parameters.', () => {
        const columns = 2;
        let rows: number | undefined;
        const alignment = "vertical";
        const result = inputChoiceSorting._sortByParameters(array, alignment, columns, rows);

        expect(result).toEqual([[0,1,2,3,4],[5,6,7,8,9]]);
    });
    test('with invalid parameters.', () => {
        const columns = -1;
        const alignment = "vertical";
        const result = inputChoiceSorting._sortByParameters(array, alignment, columns);

        expect(result).toEqual([0,1,2,3,4,5,6,7,8,9]);
    });
    test('with custom vertical parameters.', () => {
        const alignment = "vertical";
        const customAlignmentLengths = [4,4,2];
        const result = inputChoiceSorting._sortByParameters(array, alignment, undefined, undefined, customAlignmentLengths)

        expect(result).toEqual([[0,1,2,3],[4,5,6,7],[8,9]]);
    });
    test('with custom horizontal parameters.', () => {
        const alignment = "horizontal";
        const customAlignmentLengths = [4,4,2];
        const result = inputChoiceSorting._sortByParameters(array, alignment, undefined, undefined, customAlignmentLengths)

        expect(result).toEqual([[0,4,8],[1,5,9],[2,6],[3,7]]);
    });
});