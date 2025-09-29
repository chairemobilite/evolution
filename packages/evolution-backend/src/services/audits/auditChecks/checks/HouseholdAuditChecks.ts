/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { AuditForObject } from 'evolution-common/lib/services/audits/types';
import { HouseholdAuditCheckContext, HouseholdAuditCheckFunction } from '../infrastructure/AuditCheckContexts';

/**
 * Household-specific audit check functions
 */
export const householdAuditChecks: { [errorCode: string]: HouseholdAuditCheckFunction } = {
    /**
     * Check if household has a valid size (invalid range or missing)
     */
    HH_I_Size: (context: HouseholdAuditCheckContext): Partial<AuditForObject> | undefined => {
        const { household, interviewAttributes } = context;
        const size = household.size;
        const responseHouseholdSize = interviewAttributes.response?.household?.size;

        if (size === undefined || size === null) {
            return {
                version: 1,
                level: 'warning',
                message: 'Household size is not specified',
                ignore: false
            };
        }

        if (size < 1 || size > 20) {
            return {
                version: 1,
                level: 'error',
                message: 'Household size is out of range (should be between 1 and 20)',
                ignore: false
            };
        }

        // Check consistency between generated object and response data
        if (responseHouseholdSize && responseHouseholdSize !== size) {
            return {
                version: 1,
                level: 'warning',
                message: 'Household size differs between generated object and response data',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check if household has missing UUID
     */
    HH_M_Uuid: (context: HouseholdAuditCheckContext): Partial<AuditForObject> | undefined => {
        const { household } = context;
        const hasUuid = !!household._uuid;

        if (!hasUuid) {
            return {
                version: 1,
                level: 'error',
                message: 'Household UUID is missing',
                ignore: false
            };
        }

        return undefined; // No audit needed
    }
};
