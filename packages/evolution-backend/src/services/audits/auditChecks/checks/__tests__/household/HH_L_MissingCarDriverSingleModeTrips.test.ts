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
    modes,
    driverUuid,
    startTime = 8 * 3600,
    endTime = 9 * 3600,
    origin = here,
    destination = here
}: {
    /** Segment modes, in trip order. More than one distinct mode makes the trip multimode. */
    modes: Mode[];
    driverUuid?: string;
    startTime?: number | null;
    endTime?: number | null;
    origin?: [number, number] | null;
    destination?: [number, number] | null;
}): Trip => {
    const trip = new Trip(
        {
            _uuid: uuidV4(),
            startTime: startTime ?? undefined,
            endTime: endTime ?? undefined
        },
        registry
    );
    trip.segments = modes.map(
        (segmentMode) =>
            new Segment(
                {
                    _uuid: uuidV4(),
                    mode: segmentMode,
                    driverUuid: segmentMode === 'carPassenger' ? driverUuid : undefined
                },
                registry
            )
    );
    trip.origin = origin === null ? undefined : placeAt(origin);
    trip.destination = destination === null ? undefined : placeAt(destination);
    return trip;
};

const personWithTrips = (trips: Trip[], uuid = uuidV4()): Person => {
    const journey = new Journey({ _uuid: uuidV4() }, registry);
    journey.trips = trips;
    const person = new Person({ _uuid: uuid }, registry);
    person.journeys = [journey];
    return person;
};

const personWithTrip = (trip: Trip, uuid = uuidV4()): Person => personWithTrips([trip], uuid);

describe('HH_L_MissingCarDriverSingleModeTrips audit check', () => {
    const householdUuid = uuidV4();

    const expectedError = {
        objectType: 'household',
        objectUuid: householdUuid,
        errorCode: 'HH_L_MissingCarDriverSingleModeTrips',
        version: 1,
        level: 'error',
        message: 'A car passenger trip has no matching car driver trip',
        ignore: false
    };

    test.each([
        {
            description: 'passenger trip matches the driver trip',
            shouldError: false,
            members: () => {
                const driver = personWithTrip(makeTrip({ modes: ['carDriver'] }));
                const passenger = personWithTrip(makeTrip({ modes: ['carPassenger'], driverUuid: driver._uuid }));
                return [passenger, driver];
            }
        },
        {
            description: 'times differ by exactly 15 minutes',
            shouldError: false,
            members: () => {
                const driver = personWithTrip(
                    makeTrip({ modes: ['carDriver'], startTime: 8 * 3600 + 15 * 60, endTime: 9 * 3600 + 15 * 60 })
                );
                const passenger = personWithTrip(makeTrip({ modes: ['carPassenger'], driverUuid: driver._uuid }));
                return [passenger, driver];
            }
        },
        {
            description: 'departure differs by more than 15 minutes',
            shouldError: true,
            members: () => {
                const driver = personWithTrip(makeTrip({ modes: ['carDriver'], startTime: 8 * 3600 + 15 * 60 + 1 }));
                const passenger = personWithTrip(makeTrip({ modes: ['carPassenger'], driverUuid: driver._uuid }));
                return [passenger, driver];
            }
        },
        {
            description: 'arrival differs by more than 15 minutes',
            shouldError: true,
            members: () => {
                const driver = personWithTrip(makeTrip({ modes: ['carDriver'], endTime: 9 * 3600 + 15 * 60 + 1 }));
                const passenger = personWithTrip(makeTrip({ modes: ['carPassenger'], driverUuid: driver._uuid }));
                return [passenger, driver];
            }
        },
        {
            description: 'origin is more than 100 m away',
            shouldError: true,
            members: () => {
                const driver = personWithTrip(makeTrip({ modes: ['carDriver'], origin: farAway }));
                const passenger = personWithTrip(makeTrip({ modes: ['carPassenger'], driverUuid: driver._uuid }));
                return [passenger, driver];
            }
        },
        {
            description: 'destination is more than 100 m away',
            shouldError: true,
            members: () => {
                const driver = personWithTrip(makeTrip({ modes: ['carDriver'], destination: farAway }));
                const passenger = personWithTrip(makeTrip({ modes: ['carPassenger'], driverUuid: driver._uuid }));
                return [passenger, driver];
            }
        },
        {
            description: 'driver is not a household member',
            shouldError: false,
            members: () => [personWithTrip(makeTrip({ modes: ['carPassenger'], driverUuid: uuidV4() }))]
        },
        {
            description: 'car passenger has no driver',
            shouldError: false,
            members: () => [personWithTrip(makeTrip({ modes: ['carPassenger'] }))]
        },
        {
            description: 'no car passenger trip',
            shouldError: false,
            members: () => [personWithTrip(makeTrip({ modes: ['walk'] }))]
        },
        {
            description: 'driver trip is not car driver',
            shouldError: true,
            members: () => {
                const driver = personWithTrip(makeTrip({ modes: ['walk'] }));
                const passenger = personWithTrip(makeTrip({ modes: ['carPassenger'], driverUuid: driver._uuid }));
                return [passenger, driver];
            }
        },
        {
            description: 'driver trip has no times',
            shouldError: true,
            members: () => {
                const driver = personWithTrip(makeTrip({ modes: ['carDriver'], startTime: null, endTime: null }));
                const passenger = personWithTrip(makeTrip({ modes: ['carPassenger'], driverUuid: driver._uuid }));
                return [passenger, driver];
            }
        },
        {
            description: 'driver trip has no geography',
            shouldError: true,
            members: () => {
                const driver = personWithTrip(makeTrip({ modes: ['carDriver'], origin: null, destination: null }));
                const passenger = personWithTrip(makeTrip({ modes: ['carPassenger'], driverUuid: driver._uuid }));
                return [passenger, driver];
            }
        },
        {
            description: 'household has no members',
            shouldError: false,
            members: () => undefined
        },
        {
            description: 'passenger trip has more than one mode',
            shouldError: false,
            members: () => {
                const driver = personWithTrip(makeTrip({ modes: ['walk'] }));
                const passenger = personWithTrip(
                    makeTrip({
                        modes: ['carPassenger', 'transitBus'],
                        driverUuid: driver._uuid
                    })
                );
                return [passenger, driver];
            }
        },
        {
            description: 'driver trip has more than one mode',
            shouldError: true,
            members: () => {
                const driver = personWithTrip(makeTrip({ modes: ['carDriver', 'bicycle'] }));
                const passenger = personWithTrip(makeTrip({ modes: ['carPassenger'], driverUuid: driver._uuid }));
                return [passenger, driver];
            }
        },
        {
            description: 'driver also has a single-mode car driver trip',
            shouldError: false,
            members: () => {
                const driver = personWithTrips([
                    makeTrip({ modes: ['carDriver', 'bicycle'] }),
                    makeTrip({ modes: ['carDriver'] })
                ]);
                const passenger = personWithTrip(makeTrip({ modes: ['carPassenger'], driverUuid: driver._uuid }));
                return [passenger, driver];
            }
        },
        {
            description: 'several segments of the same car driver mode still match',
            shouldError: false,
            members: () => {
                const driver = personWithTrip(makeTrip({ modes: ['carDriver', 'carDriver'] }));
                const passenger = personWithTrip(makeTrip({ modes: ['carPassenger'], driverUuid: driver._uuid }));
                return [passenger, driver];
            }
        }
    ])('$description', ({ members, shouldError }) => {
        const result = householdAuditChecks.HH_L_MissingCarDriverSingleModeTrips(
            createContextWithHouseholdAndHome({ members: members() }, undefined, householdUuid)
        );

        if (shouldError) {
            expect(result).toEqual(expectedError);
        } else {
            expect(result).toBeUndefined();
        }
    });
});
