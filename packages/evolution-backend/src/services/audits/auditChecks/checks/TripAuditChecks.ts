/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { AuditForObject } from 'evolution-common/lib/services/audits/types';
import { TripAuditCheckContext, TripAuditCheckFunction } from '../infrastructure/AuditCheckContexts';

/**
 * Trip-specific audit check functions
 */
export const tripAuditChecks: { [errorCode: string]: TripAuditCheckFunction } = {
    /**
     * Check if trip has missing UUID
     */
    T_M_Uuid: (context: TripAuditCheckContext): Partial<AuditForObject> | undefined => {
        const { trip } = context;
        const hasUuid = !!trip._uuid;

        if (!hasUuid) {
            return {
                version: 1,
                level: 'error',
                message: 'Trip UUID is missing',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check if trip has missing start date
     */
    T_M_StartDate: (context: TripAuditCheckContext): Partial<AuditForObject> | undefined => {
        const { trip } = context;
        const hasStartDate = !!trip.startDate;

        if (!hasStartDate) {
            return {
                version: 1,
                level: 'warning',
                message: 'Trip start date is missing',
                ignore: false
            };
        }

        return undefined; // No audit needed
    }
};
