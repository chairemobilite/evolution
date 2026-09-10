/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { tripAuditChecks } from '../../TripAuditChecks';
import { createContextWithTrip } from './testHelper';

describe('T_L_TripSegmentsNotClosed audit check', () => {
    const validUuid = uuidV4();

    test.each([
        {
            description: 'chain is closed',
            isSegmentChainClosed: true,
            shouldError: false
        },
        {
            description: 'no segment answered hasNextMode',
            isSegmentChainClosed: undefined,
            shouldError: false
        },
        {
            description: 'chain is not closed',
            isSegmentChainClosed: false,
            shouldError: true
        }
    ])('$description', ({ isSegmentChainClosed, shouldError }) => {
        const context = createContextWithTrip({ isSegmentChainClosed }, validUuid);

        const result = tripAuditChecks.T_L_TripSegmentsNotClosed(context);

        if (!shouldError) {
            expect(result).toBeUndefined();
            return;
        }

        expect(result).toMatchObject({
            objectType: 'trip',
            objectUuid: validUuid,
            errorCode: 'T_L_TripSegmentsNotClosed',
            version: 1,
            level: 'error',
            message: 'Trip segment chain is not closed',
            ignore: false
        });
    });
});
