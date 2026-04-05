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
     * Check if household size is invalid.
     * Validates an integer in [1, 18], consistent with the participant form rule.
     *
     * @see {@link import('evolution-common/lib/services/widgets/validations/validations').householdSizeValidation}
     * @param context - HouseholdAuditCheckContext
     * @returns AuditForObject
     */
    HH_I_Size: (context: HouseholdAuditCheckContext): AuditForObject | undefined => {
        const { household } = context;
        const size = household.size;

        // Upper bound 18 must stay in sync with householdSizeValidation (same module as @see above).
        if (size !== undefined && (!Number.isInteger(size) || size < 1 || size > 18)) {
            return {
                objectType: 'household',
                objectUuid: household._uuid!,
                errorCode: 'HH_I_Size',
                version: 1,
                level: 'error',
                message: 'Household size is out of range (should be an integer between 1 and 18)',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check if home is missing
     * @param context - HouseholdAuditCheckContext
     * @returns AuditForObject
     */
    HH_M_Home: (context: HouseholdAuditCheckContext): AuditForObject | undefined => {
        const { home, household } = context;

        if (!home) {
            return {
                objectType: 'household',
                objectUuid: household._uuid!,
                errorCode: 'HH_M_Home',
                version: 1,
                level: 'error',
                message: 'Home is missing',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check if size and members count mismatch
     * validate size is equal to members count
     * @param context - HouseholdAuditCheckContext
     * @returns AuditForObject
     */
    HH_L_SizeMembersCountMismatch: (context: HouseholdAuditCheckContext): AuditForObject | undefined => {
        const { household } = context;
        const size = household.size;
        const membersCount = household.members?.length;

        if (size !== undefined && membersCount !== undefined && size !== membersCount) {
            return {
                objectType: 'household',
                objectUuid: household._uuid!,
                errorCode: 'HH_L_SizeMembersCountMismatch',
                version: 1,
                level: 'error',
                message: 'Size and members count mismatch',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check if car number is missing
     * @param context - HouseholdAuditCheckContext
     * @returns AuditForObject
     */
    HH_M_CarNumber: (context: HouseholdAuditCheckContext): AuditForObject | undefined => {
        const { household } = context;
        const carNumber = household.carNumber;

        if (carNumber === undefined) {
            return {
                objectType: 'household',
                objectUuid: household._uuid!,
                errorCode: 'HH_M_CarNumber',
                version: 1,
                level: 'error',
                message: 'Car number is missing',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check if car number is invalid.
     * Validates an integer in [0, 13] so audits stay consistent with the participant form rule.
     * TODO: make max/min values configurable per survey with default values from project config.
     *
     * @see {@link import('evolution-common/lib/services/widgets/validations/validations').carNumberValidation}
     * @param context - HouseholdAuditCheckContext
     * @returns AuditForObject
     */
    HH_I_CarNumber: (context: HouseholdAuditCheckContext): AuditForObject | undefined => {
        const { household } = context;
        const carNumber = household.carNumber;

        // Upper bound 13 must stay in sync with carNumberValidation (same module as @see above).
        if (carNumber !== undefined && (!Number.isInteger(carNumber) || carNumber < 0 || carNumber > 13)) {
            return {
                objectType: 'household',
                objectUuid: household._uuid!,
                errorCode: 'HH_I_CarNumber',
                version: 1,
                level: 'error',
                message: 'Car number is out of range (should be an integer between 0 and 13)',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check if car number and vehicles count mismatch
     * validate car number is equal to vehicles count
     * @param context - HouseholdAuditCheckContext
     * @returns AuditForObject
     */
    HH_L_CarNumberVehiclesCountMismatch: (context: HouseholdAuditCheckContext): AuditForObject | undefined => {
        const { household } = context;
        const carNumber = household.carNumber;
        const vehiclesCount = household.vehicles?.length;

        if (carNumber !== undefined && vehiclesCount !== undefined && carNumber !== vehiclesCount) {
            return {
                objectType: 'household',
                objectUuid: household._uuid!,
                errorCode: 'HH_L_CarNumberVehiclesCountMismatch',
                version: 1,
                level: 'error',
                message: 'Car number and vehicles count mismatch',
                ignore: false
            };
        }

        return undefined; // No audit needed
    }
};
