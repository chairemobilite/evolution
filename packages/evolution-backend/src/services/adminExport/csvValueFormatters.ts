/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import isString from 'lodash/isString';

/**
 * Handle the coordinates to be exported to CSV as separate lat and lon columns
 * @param container The object to add the coordinates to
 * @param pathKey The path key to use to add the coordinates to
 * @param value The value to add to the coordinates
 */
export const handleCoordinates = (container: any, pathKey: string, value: unknown) => {
    // force create the fields even if empty otherwise you may end up with an empty header for the lat/lon column if the first row has an empty geometry:
    container[pathKey.replace('.coordinates', '') + '.lon'] = undefined;
    container[pathKey.replace('.coordinates', '') + '.lat'] = undefined;

    if (Array.isArray(value)) {
        container[pathKey.replace('.coordinates', '') + '.lon'] = value[0];
        container[pathKey.replace('.coordinates', '') + '.lat'] = value[1];
    }
};

/**
 * Format the value to be exported to CSV (remove newlines and quotes)
 * @param value The value to format
 * @returns The formatted value
 */
export const formatValue = (value: unknown): unknown => {
    let valueString = value;
    if (Array.isArray(valueString)) {
        valueString = valueString.join('|');
    }
    return valueString && isString(valueString)
        ? valueString.replaceAll('\n', ' ').replaceAll('\r', '').replaceAll('"', '')
        : valueString;
};
