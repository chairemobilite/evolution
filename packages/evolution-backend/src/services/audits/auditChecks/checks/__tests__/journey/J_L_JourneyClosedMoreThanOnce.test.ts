/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { journeyAuditChecks } from '../../JourneyAuditChecks';
import { createContextWithJourney } from './testHelper';

describe('J_L_JourneyClosedMoreThanOnce audit check', () => {
    const validUuid = uuidV4();

    test.each([
        {
            description: 'closed at most once',
            isJourneyClosedMoreThanOnce: false,
            shouldError: false
        },
        {
            description: 'no place answered nextPlaceCategory',
            isJourneyClosedMoreThanOnce: undefined,
            shouldError: false
        },
        {
            description: 'closed more than once',
            isJourneyClosedMoreThanOnce: true,
            shouldError: true
        }
    ])('$description', ({ isJourneyClosedMoreThanOnce, shouldError }) => {
        const context = createContextWithJourney({ isJourneyClosedMoreThanOnce }, validUuid);

        const result = journeyAuditChecks.J_L_JourneyClosedMoreThanOnce(context);

        if (!shouldError) {
            expect(result).toBeUndefined();
            return;
        }

        expect(result).toMatchObject({
            objectType: 'journey',
            objectUuid: validUuid,
            errorCode: 'J_L_JourneyClosedMoreThanOnce',
            version: 1,
            level: 'error',
            message: 'Journey is closed more than once',
            ignore: false
        });
    });
});
