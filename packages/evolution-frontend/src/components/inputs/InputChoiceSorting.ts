/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * Sort the array to be displayed to the target number of columns in vertical fashion.
 * @param arr - Array to be sorted.
 * @param columns - Target number of columns.
 * @returns A 2 dimension array containing the data as columns to be displayed.
 *
 * @example
 * // Prints [[0,1,2],[3,4,5]]
 * console.log(verticalByColumns([0,1,2,3,4,5], 2));
 */
const verticalByColumns = function<Value>(arr: Value[], columns: number): Value[][] {
    const len = arr.length;
    const out: any[] = [];
    let index = 0;
    let columnIndex = 0;
    let countPerColumn = Math.ceil(len / columns);
    while (index + countPerColumn < len) {
        out.push(arr.slice(index, (index += countPerColumn)))
        columnIndex++;
        countPerColumn = Math.ceil((len - index) / (columns - columnIndex));
    }
    out.push(arr.slice(index))

    return out;
}

/**
 * Sort the array to be displayed to the target number of rows in vertical fashion.
 * @param arr - Array to be sorted
 * @param rows - Target number of rows.
 * @returns A 2 dimension array containing the data as columns to be displayed.
 *
 * @example
 * // Prints [[0,1],[2,3],[4,5]]
 * console.log(verticalByRows([0,1,2,3,4,5], 2));
 */
const verticalByRows = function<Value>(arr: Value[], rows: number): Value[][] {
    const len = arr.length;
    const out: any[] = [];
    let index = 0;
    while (index + rows < len) {
        out.push(arr.slice(index, (index += rows)))
    }
    out.push(arr.slice(index))

    return out;
}

/**
 * Sort the array to be displayed to the target number of columns in horizontal fashion
 * @param arr - Array to be sorted.
 * @param columns - Target number of columns.
 * @returns A 2 dimension array containing the data as columns to be displayed.
 *
 * @example
 * // Prints [[0,2,4],[1,3,5]]
 * console.log(horizontalByColumns([0,1,2,3,4,5], 2));
 */
const horizontalByColumns = function<Value>(arr: Value[], columns: number ): Value[][] {
    const len = arr.length;
    const out: any[] = [];
    let index = 0;
    let columnIndex = 0;
    let newColumn: any[] = [];
    while(index < len)
    {
        newColumn.push(arr[index]);
        index += columns;
        if(index >= len && columnIndex < columns) {
            columnIndex++;
            index = columnIndex;
            out.push(newColumn);
            newColumn = [];
        }
    }

    return out;
}

/**
 * Sort the array to be displayed to the target number of rows in horizontal fashion.
 * @param arr - Array to be sorted.
 * @param rows - Target number of rows.
 * @returns A 2 dimension array containing the data as columns to be displayed.
 *
 * @example
 * // Prints [[0,3],[1,4],[2,5]]
 * console.log(horizontalByRows([0,1,2,3,4,5], 2));
 */
const horizontalByRows = function<Value>(arr: Value[], rows: number): Value[][] {
    const len = arr.length;
    const out: any[] = [];
    let index = 0;
    let columnIndex = 0;
    const columns = Math.ceil(arr.length / rows);
    let newColumn: any[] = [];
    while (index < len) {
        newColumn.push(arr[index]);
        index += columns;
        if(index >= len && columnIndex < columns) {
            columnIndex++;
            index = columnIndex;
            out.push(newColumn);
            newColumn = [];
        }
    }

    return out;
}

/**
 * Sort the array to be displayed in columns by the custom array information.
 * @param arr - Array to be sorted.
 * @param custom - Array containing the dedired length of each column.
 * @returns A 2 dimension array containing the data as columns to be displayed.
 *
 * @example
 * // Prints [[0,1,2],[3,4],[5]]
 * console.log(customVertical([0,1,2,3,4,5], [3,2,1]));
 */
const customVertical = function<Value>(arr: Value[], custom: number[]): Value[][] {
    const len = arr.length;
    const out: any[] = [];
    let index = 0;
    let columnIndex = 0;
    while (index + custom[columnIndex] < len) {
        out.push(arr.slice(index, index += custom[columnIndex]))
        columnIndex++;
    }
    out.push(arr.slice(index));

    return out;
}

/**
 * Sort the array to be displayed in rows by the custom array information.
 * @param arr - Array to be sorted.
 * @param custom - Array containing the desired legnths of each row.
 * @returns A 2 dimension array containing the data as columns to be displayed.
 *
 * @example
 * // Prints [[0,3,5],[1,4],[2]]
 * console.log(customHorizontal([0,1,2,3,4,5], [3,2,1]));
 */
const customHorizontal = function<Value>(arr: Value[], custom: number[]): Value[][] {
    console.log(custom);

    const len = arr.length;
    const out: any[] = [];
    let index = 0;
    let columnIndex = 0;
    let rowIndex = 0;
    let newColumn: any[] = [];
    while (index < len && columnIndex < custom[0]) {
        if (columnIndex >= custom[rowIndex]) {
            columnIndex++;
            rowIndex = 0;
            index = columnIndex;
            out.push(newColumn);
            newColumn = [];
            continue;
        }
        newColumn.push(arr[index]);
        index += custom[rowIndex];
        console.log(custom[rowIndex]);
        rowIndex++;
        if(index >= len || rowIndex >= custom[columnIndex]) {
            columnIndex++;
            rowIndex = 0;
            index = columnIndex;
            out.push(newColumn);
            newColumn = [];
        }
    }

    return out;
}

/**
   * Sorts the array based on the specified parameters.
   *
   * @remarks
   * The return array will always contain the data sorted in columns.
   *
   * @param arr - Array to be sorted.
   * @param alignement - In wich way should the array be sorted? Top to bottom or left to right.
   * @param colums - Target amount of columns, if columns and rows are specified, columns is used.
   * @param rows - target amount of rows, if columns and rows are specified, columns is used.
   * @param customAlignmentLengths - Specify the lengths of each row or column individually, if alignement is horizontal, the first specified row must be the longuest.
   * @returns A 2 dimension array containing the input array sorted into columns for display or the original array in case of invalid parameters.
   */
const sortByParameters = function<Value>(arr: Value[], alignment?: 'vertical' | 'horizontal' | 'auto', columns?: number, rows?: number, customAlignmentLengths?: number[]): Value[][] {
    if (customAlignmentLengths && customAlignmentLengths.length > 0) {
        switch (alignment) {
            case 'vertical':
                return customVertical(arr, customAlignmentLengths);
            case 'horizontal':
                return customHorizontal(arr, customAlignmentLengths);
            default:
                return customVertical(arr, customAlignmentLengths);
        }
    } else if (columns && columns > 0) {
        switch (alignment) {
            case 'vertical':
                return verticalByColumns(arr, columns);
            case 'horizontal':
                return horizontalByColumns(arr, columns);
            default:
                return verticalByColumns(arr, columns);
            }
    } else if (rows && rows > 0) {
        switch (alignment) {
            case 'vertical':
                return verticalByRows(arr, rows);
            case 'horizontal':
                return horizontalByRows(arr, rows);
            default:
                return verticalByRows(arr, rows);
            }
    } else {
        switch(alignment) {
            case 'vertical':
                return verticalByColumns(arr, 2);
            case 'horizontal':
                return horizontalByRows(arr, 2);
            default:
                return verticalByColumns(arr, 2);
            }
    }
}
export { sortByParameters };