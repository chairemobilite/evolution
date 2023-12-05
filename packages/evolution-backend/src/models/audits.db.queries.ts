/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import TrError from 'chaire-lib-common/lib/utils/TrError';
import _pickBy from 'lodash/pickBy';
import _identity from 'lodash/identity';
import { AuditForObject } from 'evolution-common/lib/services/audits/types';
import { Knex } from 'knex';
import * as AuditUtils from 'evolution-common/lib/services/audits/AuditUtils';
import { mergeWithExisting } from '../services/audits/AuditUtils';

const tableName = 'sv_audits';

type DbObject = {
    interview_id: number;
    error_code: string;
    object_type: string;
    object_uuid: string;
    ignore?: boolean;
    message: string | null;
    version: number;
    is_warning: boolean | null;
};

const dbObjectToAudit = (dbObject: DbObject): AuditForObject => ({
    objectType: dbObject.object_type,
    objectUuid: dbObject.object_uuid,
    version: dbObject.version,
    isWarning: dbObject.is_warning === null ? undefined : dbObject.is_warning,
    errorCode: dbObject.error_code,
    message: dbObject.message === null ? undefined : dbObject.message,
    ignore: dbObject.ignore
});

const auditToDbObject = (interviewId: number, audit: AuditForObject): DbObject => ({
    interview_id: interviewId,
    object_type: audit.objectType,
    object_uuid: audit.objectUuid,
    version: audit.version,
    is_warning: audit.isWarning || null,
    error_code: audit.errorCode,
    message: audit.message || null,
    ignore: audit.ignore
});

const getAuditsForInterview = async (interviewId: number): Promise<AuditForObject[]> => {
    try {
        const audits = await knex(tableName).where('interview_id', interviewId);

        return audits.map(dbObjectToAudit);
    } catch (error) {
        throw new TrError(
            `Error getting audits for interview ${interviewId} in database (knex error: ${error})`,
            'DBSVAUD0001',
            'CannotGetAuditsForInterviewBecauseDatabaseError'
        );
    }
};

const deleteAuditsForInterview = async (interviewId: number, transaction?: Knex.Transaction): Promise<boolean> => {
    try {
        const query = knex(tableName).where('interview_id', interviewId).del();
        if (transaction !== undefined) {
            query.transacting(transaction);
        }
        await query;

        return true;
    } catch (error) {
        throw new TrError(
            `Error delete audits for interview ${interviewId} in database (knex error: ${error})`,
            'DBSVAUD0002',
            'CannotDeleteAuditsForInterviewBecauseDatabaseError'
        );
    }
};

const mergeOldWithNew = (newAudits: AuditForObject[], oldAudits: AuditForObject[]): AuditForObject[] => {
    const oldAuditsPerObject = AuditUtils.auditArrayToAudits(oldAudits);
    const newAuditsPerObject = AuditUtils.auditArrayToAudits(newAudits);

    const audits: AuditForObject[] = [];
    for (const objectKey in newAuditsPerObject) {
        const [objectType, objectUuid] = objectKey.split('.');
        const mergedAudits = oldAuditsPerObject[objectKey]
            ? mergeWithExisting(oldAuditsPerObject[objectKey], newAuditsPerObject[objectKey])
            : newAuditsPerObject[objectKey];
        audits.push(...AuditUtils.auditsToAuditArray(mergedAudits, { objectType, objectUuid }));
    }

    return audits;
};

const setAuditsForInterview = async (interviewId: number, audits: AuditForObject[]): Promise<AuditForObject[]> => {
    try {
        // First we need to merge old audits with new ones for the ignored audits
        const oldAudits = await getAuditsForInterview(interviewId);
        const auditsToInsert = oldAudits.length > 0 && audits.length > 0 ? mergeOldWithNew(audits, oldAudits) : audits;

        await knex.transaction(async (trx) => {
            await deleteAuditsForInterview(interviewId, trx);

            const _newObjects = auditsToInsert.map((audit) => auditToDbObject(interviewId, audit));

            const chunkSize = 200;

            await knex.batchInsert(tableName, _newObjects, chunkSize).transacting(trx);
        });

        return auditsToInsert;
    } catch (error) {
        throw new TrError(
            `Error setting audits for interview ${interviewId} in database (knex error: ${error})`,
            'DBSVAUD0003',
            'CannotSetAuditsForInterviewBecauseDatabaseError'
        );
    }
};

const updateAudit = async (interviewId: number, audit: AuditForObject) => {
    try {
        await knex.transaction(async (trx) => {
            // Only keep undefined fields
            const object = _pickBy(auditToDbObject(interviewId, audit), _identity);
            await knex(tableName)
                .update(object)
                .where('interview_id', interviewId)
                .andWhere('error_code', object.error_code)
                .andWhere('object_type', object.object_type)
                .andWhere('object_uuid', object.object_uuid)
                .transacting(trx);
        });

        return true;
    } catch (error) {
        throw new TrError(
            `Error setting audits for interview ${interviewId} in database (knex error: ${error})`,
            'DBSVAUD0003',
            'CannotSetAuditsForInterviewBecauseDatabaseError'
        );
    }
};

export default {
    getAuditsForInterview,
    setAuditsForInterview,
    updateAudit
};
