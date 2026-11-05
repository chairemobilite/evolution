/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { surveyObjectToCsvRow } from '../surveyObjectToCsvRow';

class Weight {
    weight: number;
    constructor(weight: number) {
        this.weight = weight;
    }
}

describe('surveyObjectToCsvRow', () => {
    test.each([
        {
            description: 'primitive attributes',
            attributes: { _uuid: 'abc', age: 30, isProxy: false, nickname: 'Al\n"ex"' },
            customAttributes: {},
            prefix: undefined,
            expected: { _uuid: 'abc', age: 30, isProxy: false, nickname: 'Al ex' }
        },
        {
            description: 'custom attributes at the same level as attributes',
            attributes: { age: 30 },
            customAttributes: { customQuestion: 'yes' },
            prefix: undefined,
            expected: { age: 30, customQuestion: 'yes' }
        },
        {
            description: 'nested plain objects flattened',
            attributes: { preData: { a: 1, b: { c: 'd' } } },
            customAttributes: {},
            prefix: undefined,
            expected: { 'preData.a': 1, 'preData.b.c': 'd' }
        },
        {
            description: 'point geography split in lat and lon',
            attributes: {
                geography: { type: 'Feature', geometry: { type: 'Point', coordinates: [-73.5, 45.5] }, properties: {} }
            },
            customAttributes: {},
            prefix: undefined,
            expected: {
                'geography.type': 'Feature',
                'geography.geometry.type': 'Point',
                'geography.geometry.lon': -73.5,
                'geography.geometry.lat': 45.5
            }
        },
        {
            description: 'coordinates rounded to 6 decimals',
            attributes: {
                geography: { geometry: { type: 'Point', coordinates: [-73.123456789, 45.5000004] } }
            },
            customAttributes: {},
            prefix: undefined,
            expected: {
                'geography.geometry.type': 'Point',
                'geography.geometry.lon': -73.123457,
                'geography.geometry.lat': 45.5
            }
        },
        {
            description: 'arrays of primitives joined, arrays of objects as JSON',
            attributes: { busLines: ['a', 'b'], _weights: [new Weight(1.5)] },
            customAttributes: {},
            prefix: undefined,
            expected: { busLines: 'a|b', _weights: '[{"weight":1.5}]' }
        },
        {
            description: 'prefixed columns',
            attributes: { name: 'Home' },
            customAttributes: { custom: 2 },
            prefix: 'place',
            expected: { 'place.name': 'Home', 'place.custom': 2 }
        }
    ])('$description', ({ attributes, customAttributes, prefix, expected }) => {
        expect(surveyObjectToCsvRow({ attributes, customAttributes }, prefix)).toEqual(expected);
    });
});
