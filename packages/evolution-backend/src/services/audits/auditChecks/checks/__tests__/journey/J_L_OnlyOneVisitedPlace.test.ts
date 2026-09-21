/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import type { VisitedPlace } from 'evolution-common/lib/services/baseObjects/VisitedPlace';
import { journeyAuditChecks } from '../../JourneyAuditChecks';
import { createContextWithJourney } from './testHelper';

const place = (nextPlaceCategory?: string): VisitedPlace =>
    ({ _uuid: uuidV4(), nextPlaceCategory }) as unknown as VisitedPlace;

describe('J_L_OnlyOneVisitedPlace audit check', () => {
    const validUuid = uuidV4();

    test.each([
        {
            description: 'no visited places',
            visitedPlaces: undefined,
            shouldError: false
        },
        {
            description: 'empty visited places',
            visitedPlaces: [],
            shouldError: false
        },
        {
            description: 'two places, the last stayed there until the next day',
            visitedPlaces: [place('visitedAnotherPlace'), place('stayedThereUntilTheNextDay')],
            shouldError: false
        },
        {
            description: 'two places both stayed there until the next day',
            visitedPlaces: [place('stayedThereUntilTheNextDay'), place('stayedThereUntilTheNextDay')],
            shouldError: false
        },
        {
            description: 'one place with no nextPlaceCategory',
            visitedPlaces: [place()],
            shouldError: true
        },
        {
            description: 'one place going to another place',
            visitedPlaces: [place('visitedAnotherPlace')],
            shouldError: true
        },
        {
            description: 'one place stayed there until the next day',
            visitedPlaces: [place('stayedThereUntilTheNextDay')],
            shouldError: true
        }
    ])('$description', ({ visitedPlaces, shouldError }) => {
        const context = createContextWithJourney({ visitedPlaces }, validUuid);
        const result = journeyAuditChecks.J_L_OnlyOneVisitedPlace(context);

        if (!shouldError) {
            expect(result).toBeUndefined();
            return;
        }

        expect(result).toMatchObject({
            objectType: 'journey',
            objectUuid: validUuid,
            errorCode: 'J_L_OnlyOneVisitedPlace',
            version: 1,
            level: 'error',
            message: 'Journey has only one visited place',
            ignore: false
        });
    });
});
