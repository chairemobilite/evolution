/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { VisitedPlace } from '../VisitedPlace';

type CustomVisitedPlace = {
    category?: string;
};

type CustomPlace = {
    accessibility?: string;
};

describe('VisitedPlace type tests', () => {
    test('Basic VisitedPlace object with custom types', () => {
        const visitedPlace: VisitedPlace<CustomVisitedPlace, CustomPlace> = {
            _uuid: 'visitedPlace1',
            personId: 'person1',
            householdId: 'household1',
            arrivalTime: 36000,
            departureTime: 39600,
            category: 'Park',
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

        expect(visitedPlace.personId).toBe('person1');
        expect(visitedPlace.householdId).toBe('household1');
        expect(visitedPlace.arrivalTime).toBe(36000);
        expect(visitedPlace.departureTime).toBe(39600);
        expect(visitedPlace.category).toBe('Park');
        expect(visitedPlace.name).toBe('Central Park');
        expect(visitedPlace.accessibility).toBe('Wheelchair accessible');
        expect(visitedPlace.geography).toEqual<GeoJSON.Feature<GeoJSON.Point>>({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [-73.974187, 40.783661],
            },
            properties: {},
        });
    });
});
