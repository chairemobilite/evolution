/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { Journey } from 'evolution-common/lib/services/baseObjects/Journey';
import type { Person } from 'evolution-common/lib/services/baseObjects/Person';
import type { Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import type { VisitedPlace } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import type { Trip } from 'evolution-common/lib/services/baseObjects/Trip';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';
import { isOk, unwrap } from 'evolution-common/lib/types/Result.type';
import { journeyAuditChecks } from '../../JourneyAuditChecks';
import { createContextWithJourney, didTripsDontKnow, didTripsNo, didTripsYes } from './testHelper';

describe('J_L_MadeTripsUndefinedWithTrips audit check', () => {
    const validUuid = uuidV4();

    const twoPlaces = [{ _uuid: 'vp-1' }, { _uuid: 'vp-2' }] as VisitedPlace[];
    const onePlace = [{ _uuid: 'vp-1' }] as VisitedPlace[];
    const oneTrip = [{ _uuid: 'trip-1' }] as Trip[];

    const expectedError = {
        objectType: 'journey',
        objectUuid: validUuid,
        errorCode: 'J_L_MadeTripsUndefinedWithTrips',
        version: 1,
        level: 'error',
        message: 'Whether the person made trips is unanswered, but the journey has trips or visited places',
        ignore: false
    };

    test.each([
        {
            description: 'didTrips is yes with visited places and a trip',
            journey: { didTrips: didTripsYes, visitedPlaces: twoPlaces, trips: oneTrip },
            shouldError: false
        },
        {
            description: 'didTrips is no with visited places',
            journey: { didTrips: didTripsNo, visitedPlaces: twoPlaces, trips: [] },
            shouldError: false
        },
        {
            description: 'didTrips is dontKnow with visited places',
            journey: { didTrips: didTripsDontKnow, visitedPlaces: twoPlaces, trips: [] },
            shouldError: false
        },
        {
            description: 'unanswered with a visited place but _skipTripDiary',
            journey: { didTrips: undefined, visitedPlaces: onePlace, trips: [], _skipTripDiary: true },
            shouldError: false
        },
        {
            description: 'unanswered with no visited places or trips',
            journey: { didTrips: undefined, visitedPlaces: [], trips: [] },
            shouldError: false
        },
        {
            description: 'unanswered with one visited place',
            journey: { didTrips: undefined, visitedPlaces: onePlace, trips: [] },
            shouldError: true
        },
        {
            description: 'unanswered with two visited places',
            journey: { didTrips: undefined, visitedPlaces: twoPlaces, trips: [] },
            shouldError: true
        },
        {
            description: 'unanswered with a trip',
            journey: { didTrips: undefined, visitedPlaces: onePlace, trips: oneTrip },
            shouldError: true
        }
    ])('$description', ({ journey, shouldError }) => {
        const context = createContextWithJourney(journey, validUuid);
        const result = journeyAuditChecks.J_L_MadeTripsUndefinedWithTrips(context);

        if (shouldError) {
            expect(result).toMatchObject(expectedError);
        } else {
            expect(result).toBeUndefined();
        }
    });

    test('fires when the journey exists and personDidTrips was left undefined', () => {
        const created = Journey.create({ _uuid: validUuid, _sequence: 1, _skipTripDiary: false }, new SurveyObjectsRegistry());
        expect(isOk(created)).toBe(true);
        const journey = unwrap(created) as Journey;
        expect(journey.didTrips).toBeUndefined();
        journey.visitedPlaces = onePlace;

        const result = journeyAuditChecks.J_L_MadeTripsUndefinedWithTrips({
            journey,
            person: { _uuid: uuidV4() } as unknown as Person,
            household: undefined,
            home: undefined,
            interview: { _uuid: uuidV4() } as unknown as Interview
        });

        expect(result).toMatchObject(expectedError);
    });
});
