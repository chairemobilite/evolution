/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Person } from '../Person';
import { VisitedPlace } from '../VisitedPlace';
import { Trip } from '../Trip';

type CustomPerson = {
    occupation?: string;
};

describe('Person type tests', () => {
    test('Basic Person object with custom types', () => {
        const person: Person<CustomPerson, unknown, unknown, unknown, unknown> = {
            _uuid: 'person1',
            age: 30,
            gender: 'male',
            occupation: 'engineer',
            visitedPlaces: {
                visitedPlace1: {
                    _uuid: 'visitedPlace1',
                    geography: {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [-73.6, 45.5],
                        },
                        properties: {},
                    },
                    personId: 'person1',
                    householdId: 'household1',
                } as VisitedPlace<unknown, unknown>,
            },
            trips: {
                trip1: {
                    _uuid: 'trip1',
                    personId: 'person1',
                    sequence: 1,
                    departureTime: 28800, // 8:00 AM
                    arrivalTime: 32400, // 9:00 AM
                    originId: 'visitedPlace1',
                    destinationId: 'visitedPlace2',
                } as Trip<unknown, unknown>,
            },
        };

        expect(person.age).toBe(30);
        expect(person.gender).toBe('male');
        expect(person.occupation).toBe('engineer');
        expect(person.visitedPlaces?.visitedPlace1.geography?.geometry.coordinates).toEqual([-73.6, 45.5]);
        expect(person.trips?.trip1.sequence).toBe(1);
        expect(person.trips?.trip1.departureTime).toBe(28800);
        expect(person.trips?.trip1.arrivalTime).toBe(32400);
    });
});
