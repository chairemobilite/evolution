/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { AuditForObject } from 'evolution-common/lib/services/audits/types';
import type { HouseholdAuditCheckContext, HouseholdAuditCheckFunction } from '../AuditCheckContexts';

export const householdAuditChecks: { [errorCode: string]: HouseholdAuditCheckFunction } = {
    /**
     * Check if household size is missing
     * @param context - HouseholdAuditCheckContext
     * @returns AuditForObject
     */
    HH_M_Size: (context: HouseholdAuditCheckContext): AuditForObject | undefined => {
        const { household } = context;
        const size = household.size;

        if (size === undefined) {
            return {
                objectType: 'household',
                objectUuid: household._uuid!,
                errorCode: 'HH_M_Size',
                version: 1,
                level: 'error',
                message: 'Household size is missing',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check if household size is invalid
     * validate size is between 1 and 20
     * @param context - HouseholdAuditCheckContext
     * @returns AuditForObject
     */
    HH_I_Size: (context: HouseholdAuditCheckContext): AuditForObject | undefined => {
        const { household } = context;
        const size = household.size;

        if (size !== undefined && (size < 1 || size > 20)) {
            return {
                objectType: 'household',
                objectUuid: household._uuid!,
                errorCode: 'HH_I_Size',
                version: 1,
                level: 'error',
                message: 'Household size is out of range (should be between 1 and 20)',
                ignore: false
            };
        }

        return undefined; // No audit needed
    }
};
