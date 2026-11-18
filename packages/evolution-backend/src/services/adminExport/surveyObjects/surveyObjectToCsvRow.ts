/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _isPlainObject from 'lodash/isPlainObject';
import { roundToDecimals } from 'chaire-lib-common/lib/utils/MathUtils';
import { formatValue, handleCoordinates } from '../csvValueFormatters';

/** Row of a CSV file, by column name */
export type CsvRow = { [column: string]: unknown };

/** The parts of a survey object that are exported */
export type ExportableSurveyObject = {
    attributes: object;
    customAttributes: { [key: string]: unknown };
};

/**
 * Number of decimals of the exported coordinates, in degrees. 6 decimals are
 * about 0.1 m (1e-6 degree of latitude is 0.111 m), finer than the precision
 * of the locations given by participants or by geocoding.
 */
const coordinatesDecimals = 6;

const isPrimitive = (value: unknown): boolean => value === null || typeof value !== 'object';

/**
 * Add a value to the row. Plain objects are flattened to one column per
 * nested attribute (`parent.child`), point coordinates are rounded and split
 * in lat and lon columns and arrays of primitives are joined. Any other
 * object (class instances, arrays of objects) is exported as JSON in a single
 * column.
 *
 * @param {CsvRow} row - The row to add the value to
 * @param {string} column - The column name of the value
 * @param {unknown} value - The value to add
 */
const addValueToRow = (row: CsvRow, column: string, value: unknown): void => {
    if (_isPlainObject(value)) {
        for (const [key, nestedValue] of Object.entries(value as object)) {
            addValueToRow(row, `${column}.${key}`, nestedValue);
        }
    } else if (column.endsWith('.geometry.coordinates')) {
        handleCoordinates(
            row,
            column,
            Array.isArray(value)
                ? value.map((coordinate) =>
                    typeof coordinate === 'number' ? roundToDecimals(coordinate, coordinatesDecimals) : coordinate
                )
                : value
        );
    } else if (isPrimitive(value) || (Array.isArray(value) && value.every(isPrimitive))) {
        row[column] = formatValue(value);
    } else {
        row[column] = JSON.stringify(value);
    }
};

/**
 * Convert the attributes and custom attributes of a survey object to a CSV
 * row. Custom attributes are exported as columns at the same level as the
 * declared attributes.
 *
 * @param {ExportableSurveyObject} surveyObject - The survey object to convert
 * @param {string} [prefix] - Prefix of the columns, used to export a composed
 * object in its parent's row (e.g. `place` for the place of a visited place)
 * @returns {CsvRow} The row, by column name
 */
export const surveyObjectToCsvRow = (surveyObject: ExportableSurveyObject, prefix?: string): CsvRow => {
    const row: CsvRow = {};
    for (const [key, value] of Object.entries({ ...surveyObject.attributes, ...surveyObject.customAttributes })) {
        addValueToRow(row, prefix ? `${prefix}.${key}` : key, value);
    }
    return row;
};
