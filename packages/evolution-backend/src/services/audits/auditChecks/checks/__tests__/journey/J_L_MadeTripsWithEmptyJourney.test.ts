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

describe('J_L_MadeTripsWithEmptyJourney audit check', () => {
    const validUuid = uuidV4();

    const onePlace = [{ _uuid: 'vp-1' }] as VisitedPlace[];
    const oneTrip = [{ _uuid: 'trip-1' }] as Trip[];

    const expectedError = {
        objectType: 'journey',
        objectUuid: validUuid,
        errorCode: 'J_L_MadeTripsWithEmptyJourney',
        version: 1,
        level: 'error',
        message: 'The person made trips, but the journey has no trips or visited places',
        ignore: false
    };

    test.each([
        {
            description: 'didTrips is yes with a visited place',
            journey: { didTrips: didTripsYes, visitedPlaces: onePlace, trips: [] },
            shouldError: false
        },
        {
            description: 'didTrips is yes with a trip',
            journey: { didTrips: didTripsYes, visitedPlaces: [], trips: oneTrip },
            shouldError: false
        },
        {
            description: 'didTrips is no with an empty journey',
            journey: { didTrips: didTripsNo, visitedPlaces: [], trips: [] },
            shouldError: false
        },
        {
            description: 'didTrips is dontKnow with an empty journey',
            journey: { didTrips: didTripsDontKnow, visitedPlaces: [], trips: [] },
            shouldError: false
        },
        {
            description: 'unanswered with an empty journey',
            journey: { didTrips: undefined, visitedPlaces: [], trips: [] },
            shouldError: false
        },
        {
            description: 'didTrips is yes with an empty journey but _skipTripDiary',
            journey: { didTrips: didTripsYes, visitedPlaces: [], trips: [], _skipTripDiary: true },
            shouldError: false
        },
        {
            description: 'didTrips is yes with no visited places or trips',
            journey: { didTrips: didTripsYes, visitedPlaces: [], trips: [] },
            shouldError: true
        }
    ])('$description', ({ journey, shouldError }) => {
        const context = createContextWithJourney(journey, validUuid);
        const result = journeyAuditChecks.J_L_MadeTripsWithEmptyJourney(context);

        if (shouldError) {
            expect(result).toMatchObject(expectedError);
        } else {
            expect(result).toBeUndefined();
        }
    });
});
