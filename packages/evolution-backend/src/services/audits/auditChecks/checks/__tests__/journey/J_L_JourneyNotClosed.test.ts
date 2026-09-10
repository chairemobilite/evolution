/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { journeyAuditChecks } from '../../JourneyAuditChecks';
import { createContextWithJourney } from './testHelper';

describe('J_L_JourneyNotClosed audit check', () => {
    const validUuid = uuidV4();

    test.each([
        {
            description: 'journey is closed',
            isJourneyClosed: true,
            shouldError: false
        },
        {
            description: 'no place answered nextPlaceCategory',
            isJourneyClosed: undefined,
            shouldError: false
        },
        {
            description: 'journey is not closed',
            isJourneyClosed: false,
            shouldError: true
        }
    ])('$description', ({ isJourneyClosed, shouldError }) => {
        const context = createContextWithJourney({ isJourneyClosed }, validUuid);

        const result = journeyAuditChecks.J_L_JourneyNotClosed(context);

        if (!shouldError) {
            expect(result).toBeUndefined();
            return;
        }

        expect(result).toMatchObject({
            objectType: 'journey',
            objectUuid: validUuid,
            errorCode: 'J_L_JourneyNotClosed',
            version: 1,
            level: 'error',
            message: 'Journey is not closed',
            ignore: false
        });
    });
});
