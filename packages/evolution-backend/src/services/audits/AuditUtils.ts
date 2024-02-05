/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { AuditForObject, Audits } from 'evolution-common/lib/services/audits/types';
import slugify from 'slugify';

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
            isWarning: false,
            isInfo: false,
            ignore: false, // params errors should never be ignored
            ...objectData
        });
    }
    return audits;
};

// Will ignore audits set to ignore except if overrideIgnoredAudits is true.
// Old existing audits not triggering errors in new version will be removed.
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
