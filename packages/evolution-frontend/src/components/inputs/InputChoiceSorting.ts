const verticalByColumns = function (arr: any[], columns: number) {
    const len = arr.length;
    const out: any[] = [];
    let index = 0, countPerColumn = Math.ceil(len / columns), columnIndex = 0;
    while (index + countPerColumn < len) {
        out.push(arr.slice(index, (index += countPerColumn)))
        columnIndex++;
        countPerColumn = Math.ceil((len - index) / (columns - columnIndex));
    }
    out.push(arr.slice(index))

    return out;
}
export { verticalByColumns };

const verticalByRows = function (arr: any[], rows: number) {
    const len = arr.length;
    const out: any[] = [];
    let index = 0;
    while (index + rows < len) {
        out.push(arr.slice(index, (index += rows)))
    }
    out.push(arr.slice(index))

    return out;
};
export { verticalByRows };

const horizontalByColumns = function (arr: any[], columns: number ) {
    const len = arr.length;
    const out: any[] = [];
    let index = 0, columnIndex = 0;
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
export { horizontalByColumns };

const horizontalByRows = function (arr: any[], rows: number) {
    const len = arr.length;
    const out: any[] = [];
    let index = 0, columnIndex = 0, columns = Math.ceil(arr.length / rows);
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
export { horizontalByRows };

const customVertical = function (arr: any[], custom: number[]) {
    const len = arr.length;
    const out: any[] = [];
    let index = 0, columnIndex = 0;
    while (index + custom[columnIndex] < len) {
        out.push(arr.slice(index, index += custom[columnIndex]))
        columnIndex++;
    }
    out.push(arr.slice(index));

    return out;
}
export { customVertical }

const customHorizontal = function (arr: any[], custom: number[]) {
    const len = arr.length, customLen = custom.length;
    const out: any[] = [];
    let index = 0, columnIndex = 0, rowIndex = 0;
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
        rowIndex++;
        if(index >= len) {
            columnIndex++;
            rowIndex = 0;
            index = columnIndex;
            out.push(newColumn);
            newColumn = [];
        }
    }

    return out;
}
export { customHorizontal };

const _sortByParameters = function (arr: any[], alignment: 'vertical' | 'horizontal' | 'auto', columns?: number, rows?: number, customAlignment?: boolean, customAlignmentLengths?: number[]) {
    if (customAlignment) {
        if (customAlignmentLengths && customAlignmentLengths.length > 0) {
            switch (alignment) {
                case 'vertical':
                    arr = customVertical(arr, customAlignmentLengths);
                    break;
                case 'horizontal':
                    arr = customHorizontal(arr, customAlignmentLengths);
                    break;
                default:
                    break;
            }
        }
    } else if (columns && columns > 0) {
        switch (alignment) {
            case 'vertical':
                arr = verticalByColumns(arr, columns);
                break;
            case 'horizontal':
                arr = horizontalByColumns(arr, columns);
                break;
            default:
                verticalByColumns(arr, columns);
                break;
            }
    } else if (rows && rows > 0) {
        switch (alignment) {
            case 'vertical':
                arr = verticalByRows(arr, rows);
                break;
            case 'horizontal':
                arr = horizontalByRows(arr, rows);
                break;
            default:
                verticalByRows(arr, rows);
                break;
            }
    }

    return arr;
}
export { _sortByParameters };