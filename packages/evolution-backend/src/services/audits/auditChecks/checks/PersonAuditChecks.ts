/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { AuditForObject } from 'evolution-common/lib/services/audits/types';
import type { PersonAuditCheckContext, PersonAuditCheckFunction } from '../AuditCheckContexts';
import { hasInvalidOrDuplicateSequences } from 'evolution-common/lib/services/baseObjects/sequenceUtils';

export const personAuditChecks: { [errorCode: string]: PersonAuditCheckFunction } = {
    /**
     * Check if person age is missing
     * @param context - PersonAuditCheckContext
     * @returns AuditForObject
     */
    P_M_Age: (context: PersonAuditCheckContext): AuditForObject | undefined => {
        const { person } = context;
        const age = person.age;

        if (age === undefined || age === null) {
            return {
                objectType: 'person',
                objectUuid: person._uuid!,
                errorCode: 'P_M_Age',
                version: 1,
                level: 'error',
                message: 'Person age is missing',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check for journey sequences that cannot be ordered: missing, non-positive integer,
     * or shared by two journeys.
     * @param context - PersonAuditCheckContext
     * @returns AuditForObject
     */
    P_L_InvalidJourneySequences: (context: PersonAuditCheckContext): AuditForObject | undefined => {
        const { person } = context;

        if (hasInvalidOrDuplicateSequences(person.journeys)) {
            return {
                objectType: 'person',
                objectUuid: person._uuid!,
                errorCode: 'P_L_InvalidJourneySequences',
                version: 1,
                level: 'error',
                message: 'At least one journey sequence is invalid or duplicated',
                ignore: false
            };
        }

        return undefined; // No audit needed
    }
};
