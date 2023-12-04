/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * Sort the array in a specified count of groups.
 * @param arr - Array to be sorted.
 * @param count - Target number of group.
 * @returns A 2 dimension array containing the data as columns to be displayed.
 *
 * @example
 * // Prints [[0,1,2],[3,4,5]]
 * console.log(splitSort([0,1,2,3,4,5], 2));
 */
const splitSort = function <Value>(arr: Value[], count: number): Value[][] {
    const len = arr.length;
    const out: any[] = [];
    let index = 0;
    let columnIndex = 0;
    let countPerColumn = Math.ceil(len / count);
    while (index + countPerColumn < len) {
        out.push(arr.slice(index, (index += countPerColumn)));
        columnIndex++;
        countPerColumn = Math.ceil((len - index) / (count - columnIndex));
    }
    out.push(arr.slice(index));

    return out;
};

/**
 * Sort the array in groups of specified length.
 * @param arr - Array to be sorted
 * @param length - Target number of item in group.
 * @returns A 2 dimension array containing the data as columns to be displayed.
 *
 * @example
 * // Prints [[0,1],[2,3],[4,5]]
 * console.log(subsequentSort([0,1,2,3,4,5], 2));
 */
const subsequentSort = function <Value>(arr: Value[], length: number): Value[][] {
    const len = arr.length;
    const out: any[] = [];
    let index = 0;
    while (index + length < len) {
        out.push(arr.slice(index, (index += length)));
    }
    out.push(arr.slice(index));

    return out;
};

/**
 * Sort the array in groups of custom lengths.
 * @param arr - Array to be sorted.
 * @param custom - Array containing the dedired length of each group.
 * @returns A 2 dimension array containing the data as columns to be displayed.
 *
 * @example
 * // Prints [[0,1,2],[3,4],[5]]
 * console.log(cusotmSort([0,1,2,3,4,5], [3,2,1]));
 */
const customSort = function <Value>(arr: Value[], custom: number[]): Value[][] {
    const len = arr.length;
    const out: any[] = [];
    let index = 0;
    let columnIndex = 0;
    while (index + custom[columnIndex] < len) {
        out.push(arr.slice(index, (index += custom[columnIndex])));
        columnIndex++;
    }
    out.push(arr.slice(index));

    return out;
};

/**
 * Sorts the array based on the specified parameters.
 *
 * @remarks
 * The return array will always contain the data sorted in columns.
 *
 * @param arr - Array to be sorted.
 * @param alignement - In wich way should the array be sorted? Top to bottom or left to right.
 * @param columns - Target amount of columns, if columns and rows are specified, columns is used.
 * @param rows - target amount of rows, if columns and rows are specified, columns is used.
 * @param customAlignmentLengths - Specify the lengths of each row or column individually, if alignement is horizontal, the first specified row must be the longuest.
 * @returns A 2 dimension array containing the input array sorted into columns for display or the original array in case of invalid parameters.
 */
const sortByParameters = function <Value>(
    arr: Value[],
    alignment?: 'vertical' | 'horizontal' | 'auto',
    columns?: number,
    rows?: number,
    customAlignmentLengths?: number[]
): Value[][] {
    if (customAlignmentLengths && customAlignmentLengths.length > 0) {
        return customSort(arr, customAlignmentLengths);
    } else if (columns && columns > 0) {
        switch (alignment) {
        case 'vertical':
            return splitSort(arr, columns);
        case 'horizontal':
            return subsequentSort(arr, columns);
        default:
            return splitSort(arr, columns);
        }
    } else if (rows && rows > 0) {
        switch (alignment) {
        case 'vertical':
            return subsequentSort(arr, rows);
        case 'horizontal':
            return splitSort(arr, rows);
        default:
            return subsequentSort(arr, rows);
        }
    } else {
        return splitSort(arr, 2);
    }
};

export { sortByParameters };
