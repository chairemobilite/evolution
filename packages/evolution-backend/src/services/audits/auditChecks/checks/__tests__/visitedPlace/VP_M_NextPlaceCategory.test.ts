/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { visitedPlaceAuditChecks } from '../../VisitedPlaceAuditChecks';
import { createContextWithVisitedPlace } from './testHelper';

describe('VP_M_NextPlaceCategory audit check', () => {
    const validUuid = uuidV4();

    test.each([
        {
            description: 'place has nextPlaceCategory',
            hasNextPlaceCategory: true,
            shouldError: false
        },
        {
            description: 'place is missing nextPlaceCategory',
            hasNextPlaceCategory: false,
            shouldError: true
        },
        {
            description: 'hasNextPlaceCategory is unset',
            hasNextPlaceCategory: undefined,
            shouldError: true
        }
    ])('$description', ({ hasNextPlaceCategory, shouldError }) => {
        const context = createContextWithVisitedPlace({ hasNextPlaceCategory }, validUuid);

        const result = visitedPlaceAuditChecks.VP_M_NextPlaceCategory(context);

        if (!shouldError) {
            expect(result).toBeUndefined();
            return;
        }

        expect(result).toMatchObject({
            objectType: 'visitedPlace',
            objectUuid: validUuid,
            errorCode: 'VP_M_NextPlaceCategory',
            version: 1,
            level: 'error',
            message: 'Visited place nextPlaceCategory is missing',
            ignore: false
        });
    });
});
