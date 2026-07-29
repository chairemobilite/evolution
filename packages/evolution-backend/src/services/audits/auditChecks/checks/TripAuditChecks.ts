/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { AuditForObject } from 'evolution-common/lib/services/audits/types';
import type { TripAuditCheckContext, TripAuditCheckFunction } from '../AuditCheckContexts';
import { hasInvalidOrDuplicateSequences } from 'evolution-common/lib/services/baseObjects/sequenceUtils';

export const tripAuditChecks: { [errorCode: string]: TripAuditCheckFunction } = {
    /**
     * Check if trip segments are missing
     * @param context - TripAuditCheckContext
     * @returns AuditForObject
     */
    T_M_Segments: (context: TripAuditCheckContext): AuditForObject | undefined => {
        const { trip } = context;
        const hasSegments = trip.segments !== undefined && trip.segments.length > 0;

        if (!hasSegments) {
            return {
                objectType: 'trip',
                objectUuid: trip._uuid!,
                errorCode: 'T_M_Segments',
                version: 1,
                level: 'error',
                message: 'Trip segments are missing',
                ignore: false
            };
        }

        return undefined;
    },

    /**
     * Check for segment sequences that cannot be ordered: missing, non-positive integer,
     * or shared by two segments.
     *
     * There is no matching gap warning for segments, unlike the other survey objects:
     * TripFactory drops the implicit walking segments of a multimode trip, so the segments
     * left on the trip legitimately have holes (`walk 1, bus 2, walk 3` keeps only `bus 2`).
     * TripFactory skips that filtering when this check would fail, so duplicate and invalid
     * raw sequences still reach us here.
     *
     * @param context - TripAuditCheckContext
     * @returns AuditForObject
     */
    T_L_InvalidSegmentSequences: (context: TripAuditCheckContext): AuditForObject | undefined => {
        const { trip } = context;

        if (hasInvalidOrDuplicateSequences(trip.segments)) {
            return {
                objectType: 'trip',
                objectUuid: trip._uuid!,
                errorCode: 'T_L_InvalidSegmentSequences',
                version: 1,
                level: 'error',
                message: 'At least one segment sequence is invalid or duplicated',
                ignore: false
            };
        }

        return undefined; // No audit needed
    }
};
