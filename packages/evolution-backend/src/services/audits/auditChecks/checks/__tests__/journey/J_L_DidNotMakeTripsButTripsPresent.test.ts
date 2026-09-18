/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import type { VisitedPlace } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import type { Trip } from 'evolution-common/lib/services/baseObjects/Trip';
import { journeyAuditChecks } from '../../JourneyAuditChecks';
import { createContextWithJourney, didTripsDontKnow, didTripsNo, didTripsYes } from './testHelper';

describe('J_L_DidNotMakeTripsButTripsPresent audit check', () => {
    const validUuid = uuidV4();

    const onePlace = [{ _uuid: 'vp-1' }] as VisitedPlace[];
    const oneTrip = [{ _uuid: 'trip-1' }] as Trip[];

    const expectedError = {
        objectType: 'journey',
        objectUuid: validUuid,
        errorCode: 'J_L_DidNotMakeTripsButTripsPresent',
        version: 1,
        level: 'error',
        message: 'The person did not make trips, but the journey has trips or visited places',
        ignore: false
    };

    test.each([
        {
            description: 'didTrips is no with an empty journey',
            journey: { didTrips: didTripsNo, visitedPlaces: [], trips: [] },
            shouldError: false
        },
        {
            description: 'didTrips is yes with a visited place',
            journey: { didTrips: didTripsYes, visitedPlaces: onePlace, trips: [] },
            shouldError: false
        },
        {
            description: 'didTrips is dontKnow with a visited place',
            journey: { didTrips: didTripsDontKnow, visitedPlaces: onePlace, trips: [] },
            shouldError: false
        },
        {
            description: 'unanswered with a visited place',
            journey: { didTrips: undefined, visitedPlaces: onePlace, trips: [] },
            shouldError: false
        },
        {
            description: 'didTrips is no with a visited place but _skipTripDiary',
            journey: { didTrips: didTripsNo, visitedPlaces: onePlace, trips: [], _skipTripDiary: true },
            shouldError: false
        },
        {
            description: 'didTrips is no with a visited place',
            journey: { didTrips: didTripsNo, visitedPlaces: onePlace, trips: [] },
            shouldError: true
        },
        {
            description: 'didTrips is no with a trip',
            journey: { didTrips: didTripsNo, visitedPlaces: [], trips: oneTrip },
            shouldError: true
        }
    ])('$description', ({ journey, shouldError }) => {
        const context = createContextWithJourney(journey, validUuid);
        const result = journeyAuditChecks.J_L_DidNotMakeTripsButTripsPresent(context);

        if (shouldError) {
            expect(result).toMatchObject(expectedError);
        } else {
            expect(result).toBeUndefined();
        }
    });
});
