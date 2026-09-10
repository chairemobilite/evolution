/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { segmentAuditChecks } from '../../SegmentAuditChecks';
import { createContextWithSegment } from './testHelper';

describe('S_M_HasNextMode audit check', () => {
    const validUuid = uuidV4();

    test.each([
        {
            description: 'hasNextMode is true',
            hasNextMode: true,
            shouldError: false
        },
        {
            description: 'hasNextMode is false',
            hasNextMode: false,
            shouldError: false
        },
        {
            description: 'hasNextMode is missing',
            hasNextMode: undefined,
            shouldError: true
        }
    ])('$description', ({ hasNextMode, shouldError }) => {
        const context = createContextWithSegment({ hasNextMode }, validUuid);

        const result = segmentAuditChecks.S_M_HasNextMode(context);

        if (!shouldError) {
            expect(result).toBeUndefined();
            return;
        }

        expect(result).toMatchObject({
            objectType: 'segment',
            objectUuid: validUuid,
            errorCode: 'S_M_HasNextMode',
            version: 1,
            level: 'error',
            message: 'Segment hasNextMode is missing',
            ignore: false
        });
    });
});
