/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { tripAuditChecks } from '../../TripAuditChecks';
import { createContextWithTrip } from './testHelper';

describe('T_L_TripSegmentsClosedMoreThanOnce audit check', () => {
    const validUuid = uuidV4();

    test.each([
        {
            description: 'closed at most once',
            isSegmentChainClosedMoreThanOnce: false,
            shouldError: false
        },
        {
            description: 'no segment answered hasNextMode',
            isSegmentChainClosedMoreThanOnce: undefined,
            shouldError: false
        },
        {
            description: 'closed more than once',
            isSegmentChainClosedMoreThanOnce: true,
            shouldError: true
        }
    ])('$description', ({ isSegmentChainClosedMoreThanOnce, shouldError }) => {
        const context = createContextWithTrip({ isSegmentChainClosedMoreThanOnce }, validUuid);

        const result = tripAuditChecks.T_L_TripSegmentsClosedMoreThanOnce(context);

        if (!shouldError) {
            expect(result).toBeUndefined();
            return;
        }

        expect(result).toMatchObject({
            objectType: 'trip',
            objectUuid: validUuid,
            errorCode: 'T_L_TripSegmentsClosedMoreThanOnce',
            version: 1,
            level: 'error',
            message: 'Trip segment chain is closed more than once',
            ignore: false
        });
    });
});
