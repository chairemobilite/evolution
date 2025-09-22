/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { AuditForObject } from 'evolution-common/lib/services/audits/types';
import { PersonAuditCheckContext, PersonAuditCheckFunction } from '../infrastructure/AuditCheckContexts';

/**
 * Person-specific audit check functions
 */
export const personAuditChecks: { [errorCode: string]: PersonAuditCheckFunction } = {
    /**
     * Check if person has missing UUID
     */
    P_M_Uuid: (context: PersonAuditCheckContext): Partial<AuditForObject> | undefined => {
        const { person } = context;
        const hasUuid = !!person._uuid;

        if (!hasUuid) {
            return {
                version: 1,
                level: 'error',
                message: 'Person UUID is missing',
                ignore: false
            };
        }

        return undefined; // No audit needed
    },

    /**
     * Check if person has missing age
     */
    P_M_Age: (context: PersonAuditCheckContext): Partial<AuditForObject> | undefined => {
        const { person } = context;
        const age = person.age;

        if (age === undefined || age === null) {
            return {
                version: 1,
                level: 'warning',
                message: 'Person age is missing',
                ignore: false
            };
        }

        return undefined; // No audit needed
    }
};
