/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { AuditForObject } from 'evolution-common/lib/services/audits/types';
import { JourneyAuditCheckContext, JourneyAuditCheckFunction } from '../AuditCheckContexts';

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
    }
};
