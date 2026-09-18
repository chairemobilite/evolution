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

describe('P_L_MadeTripsUndefinedWithTrips audit check', () => {
    const validUuid = uuidV4();

    const twoPlaces = [{ _uuid: 'vp-1' }, { _uuid: 'vp-2' }] as VisitedPlace[];
    const onePlace = [{ _uuid: 'vp-1' }] as VisitedPlace[];
    const oneTrip = [{ _uuid: 'trip-1' }] as Trip[];

    const expectedError = {
        objectType: 'person',
        objectUuid: validUuid,
        errorCode: 'P_L_MadeTripsUndefinedWithTrips',
        version: 1,
        level: 'error',
        message: 'Whether the person made trips is unanswered, but the journey has trips or visited places',
        ignore: false
    };

    test.each([
        {
            description: 'didTrips is yes with VP and trips',
            journeys: [{ didTrips: didTripsYes, visitedPlaces: twoPlaces, trips: oneTrip }],
            shouldError: false
        },
        {
            description: 'didTrips is no with no VP or trips',
            journeys: [{ didTrips: didTripsNo, visitedPlaces: twoPlaces, trips: [] }],
            shouldError: false
        },
        {
            description: 'didTrips is dontKnow with VP and no trip',
            journeys: [{ didTrips: didTripsDontKnow, visitedPlaces: twoPlaces, trips: [] }],
            shouldError: false
        },
        {
            description: 'unanswered with a visited place but _skipTripDiary',
            journeys: [{ didTrips: undefined, visitedPlaces: onePlace, trips: [], _skipTripDiary: true }],
            shouldError: false
        },
        {
            description: 'unanswered with only the first visited place',
            journeys: [{ didTrips: undefined, visitedPlaces: onePlace, trips: [] }],
            shouldError: true
        },
        {
            description: 'unanswered with no journeys',
            journeys: undefined,
            shouldError: false
        },
        {
            description: 'unanswered with two visited places',
            journeys: [{ didTrips: undefined, visitedPlaces: twoPlaces, trips: [] }],
            shouldError: true
        },
        {
            description: 'unanswered with a trip',
            journeys: [{ didTrips: undefined, visitedPlaces: onePlace, trips: oneTrip }],
            shouldError: true
        },
        {
            description: 'another journey of the person has the inconsistency',
            journeys: [
                { didTrips: didTripsYes, visitedPlaces: twoPlaces, trips: [] },
                { didTrips: undefined, visitedPlaces: twoPlaces, trips: [] }
            ],
            shouldError: true
        }
    ])('$description', ({ journeys, shouldError }) => {
        const context = createContextWithPerson(
            { journeys: journeys as Journey[] | undefined },
            validUuid
        );
        const result = personAuditChecks.P_L_MadeTripsUndefinedWithTrips(context);

        if (shouldError) {
            expect(result).toMatchObject(expectedError);
        } else {
            expect(result).toBeUndefined();
        }
    });
});
