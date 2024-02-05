/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { AuditForObject, Audits } from './types';

export const auditArrayToAudits = (auditsArr: AuditForObject[]): { [objectKey: string]: Audits } => {
    const audits: { [objectKey: string]: Audits } = {};

    auditsArr.forEach((audit) => {
        const objectKey = `${audit.objectType}.${audit.objectUuid}`;
        const objectAudits = audits[objectKey] || {};
        objectAudits[audit.errorCode] = {
            version: audit.version,
            errorCode: audit.errorCode,
            message: audit.message,
            level: audit.level,
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
