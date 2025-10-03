/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { AuditForObject } from 'evolution-common/lib/services/audits/types';
import { TripAuditCheckContext, TripAuditCheckFunction } from '../AuditCheckContexts';

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
    }
};
