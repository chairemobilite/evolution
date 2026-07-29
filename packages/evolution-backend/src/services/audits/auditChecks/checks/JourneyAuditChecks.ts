/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { AuditForObject } from 'evolution-common/lib/services/audits/types';
import type { JourneyAuditCheckContext, JourneyAuditCheckFunction } from '../AuditCheckContexts';
import {
    hasInvalidOrDuplicateSequences,
    hasSequenceGaps
} from 'evolution-common/lib/services/baseObjects/sequenceUtils';

export const journeyAuditChecks: { [errorCode: string]: JourneyAuditCheckFunction } = {
    /**
     * Check if journey start date is missing. The start date is taken from assignedDate
     * @param context - JourneyAuditCheckContext
     * @returns AuditForObject
     */
    J_M_StartDate: (context: JourneyAuditCheckContext): AuditForObject | undefined => {
        const { journey } = context;
        const hasStartDate = !!journey.startDate;

        if (!hasStartDate) {
            return {
                objectType: 'journey',
                objectUuid: journey._uuid!,
                errorCode: 'J_M_StartDate',
                version: 1,
                level: 'error',
                message: 'Journey start date is missing',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check for visited place sequences that cannot be ordered: missing, non-positive
     * integer, or shared by two visited places.
     * @param context - JourneyAuditCheckContext
     * @returns AuditForObject
     */
    J_L_InvalidVisitedPlaceSequences: (context: JourneyAuditCheckContext): AuditForObject | undefined => {
        const { journey } = context;

        if (hasInvalidOrDuplicateSequences(journey.visitedPlaces)) {
            return {
                objectType: 'journey',
                objectUuid: journey._uuid!,
                errorCode: 'J_L_InvalidVisitedPlaceSequences',
                version: 1,
                level: 'error',
                message: 'At least one visited place sequence is invalid or duplicated',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check for holes in the visited place sequences (e.g. 1,2,3,5,6). The questionnaire
     * keeps them contiguous when a visited place is added or deleted, so a hole points at
     * a survey bug worth investigating rather than at unusable data.
     * @param context - JourneyAuditCheckContext
     * @returns AuditForObject
     */
    J_W_VisitedPlaceSequenceGaps: (context: JourneyAuditCheckContext): AuditForObject | undefined => {
        const { journey } = context;

        if (hasSequenceGaps(journey.visitedPlaces)) {
            return {
                objectType: 'journey',
                objectUuid: journey._uuid!,
                errorCode: 'J_W_VisitedPlaceSequenceGaps',
                version: 1,
                level: 'warning',
                message: 'Visited place sequences are not contiguous',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check for trip sequences that cannot be ordered: missing, non-positive integer,
     * or shared by two trips.
     * @param context - JourneyAuditCheckContext
     * @returns AuditForObject
     */
    J_L_InvalidTripSequences: (context: JourneyAuditCheckContext): AuditForObject | undefined => {
        const { journey } = context;

        if (hasInvalidOrDuplicateSequences(journey.trips)) {
            return {
                objectType: 'journey',
                objectUuid: journey._uuid!,
                errorCode: 'J_L_InvalidTripSequences',
                version: 1,
                level: 'error',
                message: 'At least one trip sequence is invalid or duplicated',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check for holes in the trip sequences (e.g. 1,2,3,5,6). Trips are generated from
     * consecutive visited places, so a hole points at a survey bug worth investigating.
     * @param context - JourneyAuditCheckContext
     * @returns AuditForObject
     */
    J_W_TripSequenceGaps: (context: JourneyAuditCheckContext): AuditForObject | undefined => {
        const { journey } = context;

        if (hasSequenceGaps(journey.trips)) {
            return {
                objectType: 'journey',
                objectUuid: journey._uuid!,
                errorCode: 'J_W_TripSequenceGaps',
                version: 1,
                level: 'warning',
                message: 'Trip sequences are not contiguous',
                ignore: false
            };
        }

        return undefined; // No audit needed
    }
};
