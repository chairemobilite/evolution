/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { householdAuditChecks } from '../../HouseholdAuditChecks';
import { createContextWithHouseholdAndHome } from './testHelper';
import { Person } from 'evolution-common/lib/services/baseObjects/Person';
import { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import { Trip } from 'evolution-common/lib/services/baseObjects/Trip';
import { Segment } from 'evolution-common/lib/services/baseObjects/Segment';
import { VisitedPlace } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import { Place } from 'evolution-common/lib/services/baseObjects/Place';
import type { Mode } from 'evolution-common/lib/services/baseObjects/attributeTypes/SegmentAttributes';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';

const registry = new SurveyObjectsRegistry();
const here: [number, number] = [-73.57, 45.5];
const farAway: [number, number] = [-73.57, 46.5];

const point = (coordinates: [number, number]): GeoJSON.Feature<GeoJSON.Point> => ({
    type: 'Feature',
    properties: {},
    geometry: { type: 'Point', coordinates }
});

const placeAt = (coordinates: [number, number]): VisitedPlace => {
    const visitedPlace = new VisitedPlace({ _uuid: uuidV4() }, registry);
    const place = new Place({ _uuid: uuidV4() }, registry);
    place.geography = point(coordinates);
    visitedPlace.place = place;
    return visitedPlace;
};

const makeTrip = ({
    mode,
    driverUuid,
    startTime = 8 * 3600,
    endTime = 9 * 3600,
    origin = here,
    destination = here
}: {
    mode: Mode;
    driverUuid?: string;
    startTime?: number | null;
    endTime?: number | null;
    origin?: [number, number] | null;
    destination?: [number, number] | null;
}): Trip => {
    const trip = new Trip({
        _uuid: uuidV4(),
        startTime: startTime ?? undefined,
        endTime: endTime ?? undefined
    }, registry);
    trip.segments = [new Segment({ _uuid: uuidV4(), mode, driverUuid }, registry)];
    trip.origin = origin === null ? undefined : placeAt(origin);
    trip.destination = destination === null ? undefined : placeAt(destination);
    return trip;
};

const personWithTrip = (trip: Trip, uuid = uuidV4()): Person => {
    const journey = new Journey({ _uuid: uuidV4() }, registry);
    journey.trips = [trip];
    const person = new Person({ _uuid: uuid }, registry);
    person.journeys = [journey];
    return person;
};

describe('HH_L_missingCarDriverTrips audit check', () => {
    const householdUuid = uuidV4();

    const expectedError = {
        objectType: 'household',
        objectUuid: householdUuid,
        errorCode: 'HH_L_missingCarDriverTrips',
        version: 1,
        level: 'error',
        message: 'A car passenger trip has no matching car driver trip',
        ignore: false
    };

    const run = (members: Person[] | undefined) =>
        householdAuditChecks.HH_L_missingCarDriverTrips(
            createContextWithHouseholdAndHome({ members }, undefined, householdUuid)
        );

    test.each([
        {
            description: 'passenger trip matches the driver trip',
            shouldError: false,
            members: () => {
                const driver = personWithTrip(makeTrip({ mode: 'carDriver' }));
                const passenger = personWithTrip(makeTrip({ mode: 'carPassenger', driverUuid: driver._uuid }));
                return [passenger, driver];
            }
        },
        {
            description: 'times differ by exactly 30 minutes',
            shouldError: false,
            members: () => {
                const driver = personWithTrip(makeTrip({ mode: 'carDriver', startTime: 8 * 3600 + 30 * 60, endTime: 9 * 3600 + 30 * 60 }));
                const passenger = personWithTrip(makeTrip({ mode: 'carPassenger', driverUuid: driver._uuid }));
                return [passenger, driver];
            }
        },
        {
            description: 'departure differs by more than 30 minutes',
            shouldError: true,
            members: () => {
                const driver = personWithTrip(makeTrip({ mode: 'carDriver', startTime: 8 * 3600 + 30 * 60 + 1 }));
                const passenger = personWithTrip(makeTrip({ mode: 'carPassenger', driverUuid: driver._uuid }));
                return [passenger, driver];
            }
        },
        {
            description: 'origin is more than 100 m away',
            shouldError: true,
            members: () => {
                const driver = personWithTrip(makeTrip({ mode: 'carDriver', origin: farAway }));
                const passenger = personWithTrip(makeTrip({ mode: 'carPassenger', driverUuid: driver._uuid }));
                return [passenger, driver];
            }
        },
        {
            description: 'driver is not a household member',
            shouldError: false,
            members: () => [personWithTrip(makeTrip({ mode: 'carPassenger', driverUuid: uuidV4() }))]
        },
        {
            description: 'car passenger has no driver',
            shouldError: false,
            members: () => [personWithTrip(makeTrip({ mode: 'carPassenger' }))]
        },
        {
            description: 'no car passenger trip',
            shouldError: false,
            members: () => [personWithTrip(makeTrip({ mode: 'walk' }))]
        },
        {
            description: 'driver trip is not car driver',
            shouldError: true,
            members: () => {
                const driver = personWithTrip(makeTrip({ mode: 'walk' }));
                const passenger = personWithTrip(makeTrip({ mode: 'carPassenger', driverUuid: driver._uuid }));
                return [passenger, driver];
            }
        },
        {
            description: 'driver trip has no times',
            shouldError: true,
            members: () => {
                const driver = personWithTrip(makeTrip({ mode: 'carDriver', startTime: null, endTime: null }));
                const passenger = personWithTrip(makeTrip({ mode: 'carPassenger', driverUuid: driver._uuid }));
                return [passenger, driver];
            }
        },
        {
            description: 'driver trip has no geography',
            shouldError: true,
            members: () => {
                const driver = personWithTrip(makeTrip({ mode: 'carDriver', origin: null, destination: null }));
                const passenger = personWithTrip(makeTrip({ mode: 'carPassenger', driverUuid: driver._uuid }));
                return [passenger, driver];
            }
        },
        {
            description: 'household has no members',
            shouldError: false,
            members: () => undefined
        }
    ])('$description', ({ members, shouldError }) => {
        const result = run(members());

        if (shouldError) {
            expect(result).toEqual(expectedError);
        } else {
            expect(result).toBeUndefined();
        }
    });
});
