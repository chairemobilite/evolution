/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import type { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import type { VisitedPlace } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import type { Trip } from 'evolution-common/lib/services/baseObjects/Trip';
import { personAuditChecks } from '../../PersonAuditChecks';
import { createContextWithPerson, didTripsDontKnow, didTripsNo, didTripsYes } from './testHelper';

describe('P_L_didNotMakeTripsButTripsPresent audit check', () => {
    const validUuid = uuidV4();

    const onePlace = [{ _uuid: 'vp-1' }] as VisitedPlace[];
    const oneTrip = [{ _uuid: 'trip-1' }] as Trip[];

    const expectedError = {
        objectType: 'person',
        objectUuid: validUuid,
        errorCode: 'P_L_didNotMakeTripsButTripsPresent',
        version: 1,
        level: 'error',
        message: 'The person did not make trips, but the journey has trips or visited places',
        ignore: false
    };

    test.each([
        {
            description: 'didTrips is no with an empty journey',
            journeys: [{ didTrips: didTripsNo, visitedPlaces: [], trips: [] }],
            shouldError: false
        },
        {
            description: 'didTrips is yes with a visited place',
            journeys: [{ didTrips: didTripsYes, visitedPlaces: onePlace, trips: [] }],
            shouldError: false
        },
        {
            description: 'didTrips is dontKnow with a visited place',
            journeys: [{ didTrips: didTripsDontKnow, visitedPlaces: onePlace, trips: [] }],
            shouldError: false
        },
        {
            description: 'unanswered with a visited place',
            journeys: [{ didTrips: undefined, visitedPlaces: onePlace, trips: [] }],
            shouldError: false
        },
        {
            description: 'no journeys',
            journeys: undefined,
            shouldError: false
        },
        {
            description: 'didTrips is no with a visited place but _skipTripDiary',
            journeys: [{ didTrips: didTripsNo, visitedPlaces: onePlace, trips: [], _skipTripDiary: true }],
            shouldError: false
        },
        {
            description: 'didTrips is no with a visited place',
            journeys: [{ didTrips: didTripsNo, visitedPlaces: onePlace, trips: [] }],
            shouldError: true
        },
        {
            description: 'didTrips is no with a trip',
            journeys: [{ didTrips: didTripsNo, visitedPlaces: [], trips: oneTrip }],
            shouldError: true
        },
        {
            description: 'another journey of the person has the inconsistency',
            journeys: [
                { didTrips: didTripsNo, visitedPlaces: [], trips: [] },
                { didTrips: didTripsNo, visitedPlaces: onePlace, trips: [] }
            ],
            shouldError: true
        }
    ])('$description', ({ journeys, shouldError }) => {
        const context = createContextWithPerson(
            { journeys: journeys as Journey[] | undefined },
            validUuid
        );
        const result = personAuditChecks.P_L_didNotMakeTripsButTripsPresent(context);

        if (shouldError) {
            expect(result).toMatchObject(expectedError);
        } else {
            expect(result).toBeUndefined();
        }
    });
});
