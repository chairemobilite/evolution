/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { AuditForObject } from 'evolution-common/lib/services/audits/types';
import { JourneyAuditCheckContext, JourneyAuditCheckFunction } from '../infrastructure/AuditCheckContexts';

/**
 * Journey-specific audit check functions
 */
export const journeyAuditChecks: { [errorCode: string]: JourneyAuditCheckFunction } = {
    /**
     * Check if journey has missing UUID
     */
    J_M_Uuid: (context: JourneyAuditCheckContext): Partial<AuditForObject> | undefined => {
        const { journey } = context;
        const hasUuid = !!journey._uuid;

        if (!hasUuid) {
            return {
                version: 1,
                level: 'error',
                message: 'Journey UUID is missing',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check if journey has missing start time
     */
    J_M_StartTime: (context: JourneyAuditCheckContext): Partial<AuditForObject> | undefined => {
        const { journey } = context;
        const hasStartTime = journey.startTime !== undefined && journey.startTime !== null;

        if (!hasStartTime) {
            return {
                version: 1,
                level: 'warning',
                message: 'Journey start time is missing',
                ignore: false
            };
        }

        return undefined; // No audit needed
    }
};
