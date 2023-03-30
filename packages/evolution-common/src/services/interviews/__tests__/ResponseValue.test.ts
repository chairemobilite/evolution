/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { ResponseValue } from '../ResponseValue';
import { SingleGeoFeature } from 'chaire-lib-common/lib/services/geodata/GeoJSONUtils';
import { Vehicle } from '../../interviewObjects/Vehicle';

describe('ResponseValue type tests', () => {
    test('Valid ResponseValue values', () => {
        const numberValue: ResponseValue = 42;
        const stringValue: ResponseValue = 'test';
        const booleanValue: ResponseValue = true;
        const numberArray: ResponseValue = [1, 2, 3];
        const stringArray: ResponseValue = ['one', 'two', 'three'];
        const booleanArray: ResponseValue = [true, false, true];
        const singleGeoFeature: ResponseValue = {
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'Point',
                coordinates: [10, 20],
            },
        };
        const nestedResponseObject: ResponseValue = {
            vehicle1: {
                _uuid: 'vehicle1-uuid',
                year: 2018,
                make: 'Toyota',
                model: 'Camry',
            } as Vehicle<{ customAttribute: string }>,
            vehicle2: {
                _uuid: 'vehicle2-uuid',
                year: 2020,
                make: 'Honda',
                model: 'Civic',
                customAttribute: 'example',
            } as Vehicle<{ customAttribute: string }>,
        };

        expect(numberValue).toBe(42);
        expect(stringValue).toBe('test');
        expect(booleanValue).toBe(true);
        expect(numberArray).toEqual([1, 2, 3]);
        expect(stringArray).toEqual(['one', 'two', 'three']);
        expect(booleanArray).toEqual([true, false, true]);
        expect(singleGeoFeature).toMatchObject<SingleGeoFeature>({
            type: 'Feature',
            properties: {},
            geometry: {
                type: 'Point',
                coordinates: [10, 20],
            },
        });
        expect(nestedResponseObject).toMatchObject({
            vehicle1: {
                _uuid: 'vehicle1-uuid',
                year: 2018,
                make: 'Toyota',
                model: 'Camry',
            },
            vehicle2: {
                _uuid: 'vehicle2-uuid',
                year: 2020,
                make: 'Honda',
                model: 'Civic',
                customAttribute: 'example',
            },
        });
    });
});
