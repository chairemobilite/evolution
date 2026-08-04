/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { AuditForObject } from 'evolution-common/lib/services/audits/types';
import projectConfig from 'evolution-common/lib/config/project.config';
import type { HouseholdAuditCheckContext, HouseholdAuditCheckFunction } from '../AuditCheckContexts';
import { isCarNumberInvalid } from 'evolution-common/lib/services/widgets/validations/householdAssetCountValidation';
import {
    hasInvalidOrDuplicateSequences,
    hasSequenceGaps
} from 'evolution-common/lib/services/baseObjects/sequenceUtils';

// Above this number of cars per potential driving license holder, the car number
// is considered suspiciously high and flagged for validation (warning only, not an error).
// Stricter than the participant form bound (household.size × maxCarsPerHouseholdMember)
// because driving license counts are not known when carNumber is asked.
export const MAX_CAR_NUMBER_PER_POTENTIAL_DRIVING_LICENSE = projectConfig.vehicles.maxCarsPerHouseholdMember;

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
     * Validates an integer in [1, maxHouseholdSize], consistent with the participant form rule.
     *
     * @see {@link import('evolution-common/lib/services/widgets/validations/validations').householdSizeValidation}
     * @param context - HouseholdAuditCheckContext
     * @returns AuditForObject
     */
    HH_I_Size: (context: HouseholdAuditCheckContext): AuditForObject | undefined => {
        const { household } = context;
        const size = household.size;

        // Upper bound must stay in sync with householdSizeValidation (same module as @see above).
        if (size !== undefined && (!Number.isInteger(size) || size < 1 || size > projectConfig.maxHouseholdSize)) {
            return {
                objectType: 'household',
                objectUuid: household._uuid!,
                errorCode: 'HH_I_Size',
                version: 1,
                level: 'error',
                message: 'Household size is out of range',
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
     * Validates a non-negative integer up to household.size × maxCarsPerHouseholdMember.
     *
     * @see {@link import('evolution-common/lib/services/widgets/validations/validations').carNumberValidation}
     * @param context - HouseholdAuditCheckContext
     * @returns AuditForObject
     */
    HH_I_CarNumber: (context: HouseholdAuditCheckContext): AuditForObject | undefined => {
        const { household } = context;
        const carNumber = household.carNumber;

        if (isCarNumberInvalid(carNumber, household.size)) {
            return {
                objectType: 'household',
                objectUuid: household._uuid!,
                errorCode: 'HH_I_CarNumber',
                version: 1,
                level: 'error',
                message: 'Car number is out of range',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check for person sequences that cannot be ordered: missing, non-positive integer,
     * or shared by two household members.
     * @param context - HouseholdAuditCheckContext
     * @returns AuditForObject
     */
    HH_L_InvalidPersonSequences: (context: HouseholdAuditCheckContext): AuditForObject | undefined => {
        const { household } = context;

        if (hasInvalidOrDuplicateSequences(household.members)) {
            return {
                objectType: 'household',
                objectUuid: household._uuid!,
                errorCode: 'HH_L_InvalidPersonSequences',
                version: 1,
                level: 'error',
                message: 'At least one person sequence is invalid or duplicated',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check for holes in the household member sequences (e.g. 1,2,3,5,6). The questionnaire
     * keeps them contiguous when a person is added or deleted, so a hole points at a survey
     * bug worth investigating rather than at unusable data.
     * @param context - HouseholdAuditCheckContext
     * @returns AuditForObject
     */
    HH_W_PersonSequenceGaps: (context: HouseholdAuditCheckContext): AuditForObject | undefined => {
        const { household } = context;

        if (hasSequenceGaps(household.members)) {
            return {
                objectType: 'household',
                objectUuid: household._uuid!,
                errorCode: 'HH_W_PersonSequenceGaps',
                version: 1,
                level: 'warning',
                message: 'Person sequences are not contiguous',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check if atLeastOnePersonWithDisability is missing for multi-person households.
     * For single-person households, disability is asked per person instead.
     * @param context - HouseholdAuditCheckContext
     * @returns AuditForObject
     */
    HH_M_AtLeastOnePersonWithDisability: (context: HouseholdAuditCheckContext): AuditForObject | undefined => {
        const { household } = context;
        const size = household.size;
        const atLeastOnePersonWithDisability = household.atLeastOnePersonWithDisability;

        if (size !== undefined && size > 1 && atLeastOnePersonWithDisability === undefined) {
            return {
                objectType: 'household',
                objectUuid: household._uuid!,
                errorCode: 'HH_M_AtLeastOnePersonWithDisability',
                version: 1,
                level: 'error',
                message: 'At least one person with disability is missing',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check if the number of cars is suspiciously high compared to the number of potential
     * driving license holders. This ratio is not validated live during the interview, so it
     * is audited here. Two situations are flagged:
     * - cars but no potential driver at all (nobody can legally drive them), or
     * - more than MAX_CAR_NUMBER_PER_POTENTIAL_DRIVING_LICENSE cars per potential driver.
     * Warning only: both are unusual but not necessarily errors.
     * @param context - HouseholdAuditCheckContext
     * @returns AuditForObject
     */
    HH_W_CarNumberPerPotentialDrivingLicenseTooHigh: (
        context: HouseholdAuditCheckContext
    ): AuditForObject | undefined => {
        const { household } = context;
        const carNumber = household.carNumber;
        const potentialDrivingLicenseCount = (household.members ?? []).filter((person) =>
            person.hasOrUnknownDrivingLicense()
        ).length;

        // No cars: nothing to flag. With cars, flag when there is no potential driver,
        // or when the cars-per-potential-driver ratio exceeds the threshold.
        if (carNumber === undefined || !Number.isInteger(carNumber) || carNumber <= 0) {
            return undefined;
        }

        const ratioTooHigh =
            potentialDrivingLicenseCount === 0 ||
            carNumber / potentialDrivingLicenseCount > MAX_CAR_NUMBER_PER_POTENTIAL_DRIVING_LICENSE;

        if (ratioTooHigh) {
            return {
                objectType: 'household',
                objectUuid: household._uuid!,
                errorCode: 'HH_W_CarNumberPerPotentialDrivingLicenseTooHigh',
                version: 1,
                level: 'warning',
                message: 'Car number per potential driving license holder is very high, please validate',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Info flag when the household has at least one transit segment in any trip.
     * @param context - HouseholdAuditCheckContext
     * @returns AuditForObject
     */
    HH_F_AtLeastOneTransitSegmentInHousehold: (context: HouseholdAuditCheckContext): AuditForObject | undefined => {
        const { household } = context;

        const hasTransitSegment = (household.members ?? []).some((person) =>
            (person.journeys ?? []).some((journey) => (journey.trips ?? []).some((trip) => trip.hasTransit()))
        );

        if (hasTransitSegment) {
            return {
                objectType: 'household',
                objectUuid: household.uuid!,
                errorCode: 'HH_F_AtLeastOneTransitSegmentInHousehold',
                version: 1,
                level: 'info',
                message: 'At least one transit trip in household',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check if car number and vehicles count mismatch
     * validate car number is equal to vehicles count
     * Only check if household has vehicles and car number is defined
     * @param _context - HouseholdAuditCheckContext (unused until vehicles exist as objects; see TODO below)
     * @returns AuditForObject
     */
    HH_L_CarNumberVehiclesCountMismatch: (_context: HouseholdAuditCheckContext): AuditForObject | undefined => {
        // TODO: This check should only be run when we will have implemented vehicles as objects.
        // For now, we skip it. When implementing below, you may rename `_context` to `context` for
        // readability; keeping `_context` is fine too once it is used (either name is valid).

        /*const { household } = _context;
        const carNumber = household.carNumber;
        const hasVehicles = household.vehicles !== undefined && Array.isArray(household.vehicles);

        if (carNumber !== undefined && hasVehicles && carNumber !== household.vehicles!.length) {
            return {
                objectType: 'household',
                objectUuid: household._uuid!,
                errorCode: 'HH_L_CarNumberVehiclesCountMismatch',
                version: 1,
                level: 'error',
                message: 'Car number and vehicles count mismatch',
                ignore: false
            };
        }*/

        return undefined; // No audit needed
    }
};
