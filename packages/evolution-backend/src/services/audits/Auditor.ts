/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Audit, AuditForObject } from 'evolution-common/lib/services/audits/types';

export type ObjectValidation<T> = {
    [errorCode: string]: (object: T) => Partial<Audit> | undefined;
};

/**
 * Helper class for auditing objects
 */
export default class Auditor {
    static auditObject = <T>(
        object: T,
        validations: ObjectValidation<T>,
        objectData: Pick<AuditForObject, 'objectType' | 'objectUuid'>
    ): AuditForObject[] => {
        const audits: AuditForObject[] = [];

        for (const errorCode in validations) {
            const validationAudit = validations[errorCode](object);
            if (validationAudit) {
                audits.push({
                    ...objectData,
                    errorCode,
                    ...validationAudit,
                    version: validationAudit.version || 1
                });
            }
        }

        return audits;
    };
}
