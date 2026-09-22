/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { loopActivities } from 'evolution-common/lib/services/odSurvey/types';
import { tripAuditChecks } from '../../TripAuditChecks';
import { createContextWithTrip } from './testHelper';
import { createMockSegment } from '../segment/testHelper';
import { createMockVisitedPlace } from '../visitedPlace/testHelper';

describe('T_M_Segments audit check', () => {
    const validUuid = uuidV4();

    it('should pass when trip has segments', () => {
        const context = createContextWithTrip({ segments: [createMockSegment({ mode: 'walk' })] }, validUuid);

        const result = tripAuditChecks.T_M_Segments(context);

        expect(result).toBeUndefined();
    });

    it('should error when trip segments are missing', () => {
        const context = createContextWithTrip({ segments: undefined }, validUuid);

        const result = tripAuditChecks.T_M_Segments(context);

        expect(result).toMatchObject({
            objectType: 'trip',
            objectUuid: validUuid,
            errorCode: 'T_M_Segments',
            version: 1,
            level: 'error',
            message: 'Trip segments are missing',
            ignore: false
        });
    });

    it('should error when trip has empty segments array', () => {
        const context = createContextWithTrip({ segments: [] }, validUuid);

        const result = tripAuditChecks.T_M_Segments(context);

        expect(result).toMatchObject({
            objectType: 'trip',
            objectUuid: validUuid,
            errorCode: 'T_M_Segments',
            version: 1,
            level: 'error',
            message: 'Trip segments are missing',
            ignore: false
        });
    });

    test.each(loopActivities)('should pass when origin is %s and segments are missing', (activity) => {
        const context = createContextWithTrip(
            {
                origin: createMockVisitedPlace({ activity, geography: undefined }),
                segments: undefined
            },
            validUuid
        );

        const result = tripAuditChecks.T_M_Segments(context);

        expect(result).toBeUndefined();
    });

    it('should error when the destination is a loop activity and segments are missing', () => {
        const context = createContextWithTrip(
            {
                destination: createMockVisitedPlace({ activity: 'workOnTheRoad', geography: undefined }),
                segments: undefined
            },
            validUuid
        );

        const result = tripAuditChecks.T_M_Segments(context);

        expect(result).toMatchObject({
            objectType: 'trip',
            objectUuid: validUuid,
            errorCode: 'T_M_Segments',
            version: 1,
            level: 'error',
            message: 'Trip segments are missing',
            ignore: false
        });
    });
});

