/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Trip } from '../Trip';
import { Segment } from '../Segment';

type CustomTrip = {
    tripPurpose?: string;
};

type CustomSegment = {
    distance?: number;
};

describe('Trip type tests', () => {
    test('Basic Trip object with custom types', () => {
        const trip: Trip<CustomTrip, CustomSegment> = {
            _uuid: 'trip1',
            personId: 'person1',
            sequence: 1,
            departureTime: 36000,
            arrivalTime: 39600,
            originId: 'visitedPlace1',
            destinationId: 'visitedPlace2',
            tripPurpose: 'Work',
            segments: {
                segment1: {
                    _uuid: 'segment1',
                    tripId: 'trip1',
                    sequence: 1,
                    mode: 'Car',
                    modeCategory: 'Private motorized',
                    distance: 10,
                } as Segment<CustomSegment>,
            },
        };

        expect(trip.personId).toBe('person1');
        expect(trip.sequence).toBe(1);
        expect(trip.departureTime).toBe(36000);
        expect(trip.arrivalTime).toBe(39600);
        expect(trip.originId).toBe('visitedPlace1');
        expect(trip.destinationId).toBe('visitedPlace2');
        expect(trip.tripPurpose).toBe('Work');
        expect(trip.segments?.segment1).toEqual<Segment<CustomSegment>>({
            _uuid: 'segment1',
            tripId: 'trip1',
            sequence: 1,
            mode: 'Car',
            modeCategory: 'Private motorized',
            distance: 10,
        });
    });
});
