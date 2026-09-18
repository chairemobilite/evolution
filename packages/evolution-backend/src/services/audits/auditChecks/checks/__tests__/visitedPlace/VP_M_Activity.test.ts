/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { visitedPlaceAuditChecks } from '../../VisitedPlaceAuditChecks';
import { createContextWithVisitedPlace } from './testHelper';

describe('VP_M_Activity audit check', () => {
    const validUuid = uuidV4();

    const expectedError = {
        objectType: 'visitedPlace',
        objectUuid: validUuid,
        errorCode: 'VP_M_Activity',
        version: 1,
        level: 'error',
        message: 'Visited place activity is missing',
        ignore: false
    };

    test.each([
        { description: 'has activity', activity: 'work', activityCategory: undefined, shouldError: false },
        { description: 'activity is undefined', activity: undefined, activityCategory: undefined, shouldError: true },
        { description: 'activity is empty', activity: '', activityCategory: undefined, shouldError: true },
        { description: 'activity is whitespace', activity: '   ', activityCategory: undefined, shouldError: true },
        {
            description: 'only activityCategory is set',
            activity: undefined,
            activityCategory: 'work',
            shouldError: true
        }
    ])('$description', ({ activity, activityCategory, shouldError }) => {
        const context = createContextWithVisitedPlace({ activity, activityCategory }, validUuid);
        const result = visitedPlaceAuditChecks.VP_M_Activity(context);

        if (shouldError) {
            expect(result).toMatchObject(expectedError);
        } else {
            expect(result).toBeUndefined();
        }
    });
});
