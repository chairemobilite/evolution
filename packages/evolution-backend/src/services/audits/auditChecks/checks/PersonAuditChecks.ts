/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import projectConfig from 'evolution-common/lib/config/project.config';
import type { AuditForObject } from 'evolution-common/lib/services/audits/types';
import type { PersonAuditCheckContext, PersonAuditCheckFunction } from '../AuditCheckContexts';
import {
    hasInvalidOrDuplicateSequences,
    hasSequenceGaps
} from 'evolution-common/lib/services/baseObjects/sequenceUtils';

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
    },

    /**
     * Check if person age exceeds the configured maximum
     * @param context - PersonAuditCheckContext
     * @returns AuditForObject
     */
    P_I_AgeTooHigh: (context: PersonAuditCheckContext): AuditForObject | undefined => {
        const { person } = context;
        const age = person.age;

        if (typeof age === 'number' && age > projectConfig.ages.maxPersonAge) {
            return {
                objectType: 'person',
                objectUuid: person._uuid!,
                errorCode: 'P_I_AgeTooHigh',
                version: 1,
                level: 'error',
                message: 'Person age is too high',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check for holes in the journey sequences (e.g. 1,2,3,5,6). The questionnaire keeps
     * them contiguous when a journey is added or deleted, so a hole points at a survey bug
     * worth investigating rather than at unusable data.
     * @param context - PersonAuditCheckContext
     * @returns AuditForObject
     */
    P_W_JourneySequenceGaps: (context: PersonAuditCheckContext): AuditForObject | undefined => {
        const { person } = context;

        if (hasSequenceGaps(person.journeys)) {
            return {
                objectType: 'person',
                objectUuid: person._uuid!,
                errorCode: 'P_W_JourneySequenceGaps',
                version: 1,
                level: 'warning',
                message: 'Journey sequences are not contiguous',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Warning when person age is at or above `addAuditWarningVeryOldAge` but still within
     * `maxPersonAge` (see project config). Intended for reviewer verification.
     * @param context - PersonAuditCheckContext
     * @returns AuditForObject
     */
    P_W_VeryOldAge: (context: PersonAuditCheckContext): AuditForObject | undefined => {
        const { person } = context;
        const age = person.age;
        const warningAge = projectConfig.ages.addAuditWarningVeryOldAge;

        if (
            typeof age === 'number' &&
            warningAge !== undefined &&
            age >= warningAge &&
            age <= projectConfig.ages.maxPersonAge
        ) {
            return {
                objectType: 'person',
                objectUuid: person._uuid!,
                errorCode: 'P_W_VeryOldAge',
                version: 1,
                level: 'warning',
                message: 'Person is very old, please validate',
                ignore: false
            };
        }

        return undefined; // No audit needed
    }
};
