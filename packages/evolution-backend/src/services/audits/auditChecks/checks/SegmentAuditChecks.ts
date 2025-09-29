/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { AuditForObject } from 'evolution-common/lib/services/audits/types';
import { SegmentAuditCheckContext, SegmentAuditCheckFunction } from '../AuditCheckContexts';

export const segmentAuditChecks: { [errorCode: string]: SegmentAuditCheckFunction } = {
    /**
     * Check if segment mode is missing
     * @param context - SegmentAuditCheckContext
     * @returns AuditForObject
     */
    S_M_Mode: (context: SegmentAuditCheckContext): AuditForObject | undefined => {
        const { segment } = context;
        const hasMode = !!segment.mode;

        if (!hasMode) {
            return {
                objectType: 'segment',
                objectUuid: segment._uuid!,
                errorCode: 'S_M_Mode',
                version: 1,
                level: 'error',
                message: 'Segment mode is missing',
                ignore: false
            };
        }

        return undefined;
    }
};
