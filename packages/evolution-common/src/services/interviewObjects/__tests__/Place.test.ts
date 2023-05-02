/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Place } from '../Place';

type CustomPlace = {
    accessibility?: string;
};

describe('Place type tests', () => {
    test('Basic Place object with custom types', () => {
        const place: Place<CustomPlace> = {
            _uuid: 'place1',
            name: 'Central Park',
            accessibility: 'Wheelchair accessible',
            geography: {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-73.974187, 40.783661],
                },
                properties: {},
            } as GeoJSON.Feature<GeoJSON.Point>,
        };

        expect(place.name).toBe('Central Park');
        expect(place.accessibility).toBe('Wheelchair accessible');
        expect(place.geography).toEqual<GeoJSON.Feature<GeoJSON.Point>>({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [-73.974187, 40.783661],
            },
            properties: {},
        });
    });
});
