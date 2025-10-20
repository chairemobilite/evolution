/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { segmentAuditChecks } from '../../SegmentAuditChecks';
import { createContextWithSegment } from './testHelper';

describe('S_M_Mode audit check', () => {
    const validUuid = uuidV4();

    it('should pass when segment has mode', () => {
        const context = createContextWithSegment({ mode: 'walk' });

        const result = segmentAuditChecks.S_M_Mode(context);

        expect(result).toBeUndefined();
    });

    it('should error when segment mode is missing', () => {
        const context = createContextWithSegment({ mode: undefined }, validUuid);

        const result = segmentAuditChecks.S_M_Mode(context);

        expect(result).toMatchObject({
            objectType: 'segment',
            objectUuid: validUuid,
            errorCode: 'S_M_Mode',
            version: 1,
            level: 'error',
            message: 'Segment mode is missing',
            ignore: false
        });
    });

});

