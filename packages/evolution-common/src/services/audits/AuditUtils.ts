/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { AuditForObject, Audits } from './types';
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
            ignore: false, // params errors should never be ignored
            ...objectData
        });
    }
    return audits;
};

export const auditArrayToAudits = (auditsArr: AuditForObject[]): { [objectKey: string]: Audits } => {
    const audits: { [objectKey: string]: Audits } = {};

    auditsArr.forEach((audit) => {
        const objectKey = `${audit.objectType}.${audit.objectUuid}`;
        const objectAudits = audits[objectKey] || {};
        objectAudits[audit.errorCode] = {
            version: audit.version,
            errorCode: audit.errorCode,
            message: audit.message,
            isWarning: audit.isWarning,
            ignore: audit.ignore
        };
        audits[objectKey] = objectAudits;
    });

    return audits;
};

export const auditsToAuditArray = (
    audits: Audits,
    objectData: Pick<AuditForObject, 'objectType' | 'objectUuid'>
): AuditForObject[] =>
    Object.keys(audits).map((errorCode) => ({
        ...objectData,
        ...audits[errorCode]
    }));
