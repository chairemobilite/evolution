/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { AuditForObject, Audits } from 'evolution-common/lib/services/audits/types';
import slugify from 'slugify';

/**
 * Convert parameter validation errors to audit objects
 * Transforms validation errors into audit format for consistent error reporting
 * @param {Error[]} errors - Array of validation errors to convert
 * @param {Object} objectData - Context information for the audit
 * @param {string} objectData.objectType - Type of object that failed validation
 * @param {string} objectData.objectUuid - UUID of the object that failed validation
 * @returns {AuditForObject[]} Array of audit objects representing the errors
 */
export const convertParamsErrorsToAudits = (
    errors: Error[],
    objectData: Pick<AuditForObject, 'objectType' | 'objectUuid'>
): AuditForObject[] => {
    const audits: AuditForObject[] = [];
    for (let i = 0, countI = errors.length; i < countI; i++) {
        const error = errors[i];
        const errorCode = slugify(error.message);
        audits.push({
            version: 1,
            errorCode,
            message: error.message,
            level: 'error',
            ignore: false, // params errors should never be ignored
            ...objectData
        });
    }
    return audits;
};

/**
 * Merge new audits with existing audits, preserving ignored status when appropriate
 *
 * @param {Audits} existingAudits existing audits to merge with new audits
 * @param {Audits} newAudits new audits to merge with existing audits
 * @param {boolean} [overrideIgnoredAudits=false] will ignore audits set to ignore except if overrideIgnoredAudits is true.
 * @returns {Audits} merged audits
 */
export const mergeWithExisting = (existingAudits: Audits, newAudits: Audits, overrideIgnoredAudits = false): Audits => {
    for (const errorCode in existingAudits) {
        if (!newAudits[errorCode]) {
            continue;
        }
        const existingAudit = existingAudits[errorCode];
        const existingVersion = existingAudit.version || 1;
        // check if the audit was ignored by an admin/validator:
        if (
            !overrideIgnoredAudits &&
            existingVersion === newAudits[errorCode].version &&
            existingAudit.ignore === true
        ) {
            newAudits[errorCode].ignore = true;
        }
    }
    return newAudits;
};
