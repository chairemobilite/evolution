/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { AuditForObject } from 'evolution-common/lib/services/audits/types';
import { SegmentAuditCheckContext, SegmentAuditCheckFunction } from '../infrastructure/AuditCheckContexts';

/**
 * Segment-specific audit check functions
 */
export const segmentAuditChecks: { [errorCode: string]: SegmentAuditCheckFunction } = {
    /**
     * Check if segment has missing UUID
     */
    S_M_Uuid: (context: SegmentAuditCheckContext): Partial<AuditForObject> | undefined => {
        const { segment } = context;
        const hasUuid = !!segment._uuid;

        if (!hasUuid) {
            return {
                version: 1,
                level: 'error',
                message: 'Segment UUID is missing',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check if segment has missing mode
     */
    S_M_Mode: (context: SegmentAuditCheckContext): Partial<AuditForObject> | undefined => {
        const { segment } = context;
        const hasMode = !!segment.mode;

        if (!hasMode) {
            return {
                version: 1,
                level: 'warning',
                message: 'Segment mode is missing',
                ignore: false
            };
        }

        return undefined; // No audit needed
    }
};
