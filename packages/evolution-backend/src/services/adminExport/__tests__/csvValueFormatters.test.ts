/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { formatValue, handleCoordinates } from '../csvValueFormatters';

describe('formatValue', () => {
    test.each([
        { description: 'undefined', value: undefined, expected: undefined },
        { description: 'number', value: 3, expected: 3 },
        { description: 'boolean', value: false, expected: false },
        { description: 'array', value: ['a', 'b', 3], expected: 'a|b|3' },
        { description: 'newlines and quotes', value: 'a\r\nb "c"', expected: 'a b c' }
    ])('$description', ({ value, expected }) => {
        expect(formatValue(value)).toEqual(expected);
    });
});

describe('handleCoordinates', () => {
    test.each([
        { description: 'coordinates', value: [-73.5, 45.5], expected: { 'geography.lon': -73.5, 'geography.lat': 45.5 } },
        { description: 'no coordinates', value: undefined, expected: { 'geography.lon': undefined, 'geography.lat': undefined } }
    ])('$description', ({ value, expected }) => {
        const container = {};
        handleCoordinates(container, 'geography.coordinates', value);
        expect(container).toEqual(expected);
    });
});
