/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import TrError from 'chaire-lib-common/lib/utils/TrError';
import { ReviewDecision } from 'evolution-common/lib/services/reviews/types';
import { computeReviewDecisionStatusForObject } from '../services/reviews/ReviewDecisionUtils';
import { CANNOT_FORCE_APPROVE_WITHOUT_CONFLICT_ERROR_CODE } from '../services/reviews/reviewDecisionErrors';
import type { SurveyObjectName } from 'evolution-common/lib/services/baseObjects/types';
import { Knex } from 'knex';

const tableName = 'sv_review_decisions';

type DbObject = {
    interview_id: number;
    user_id: number;
    object_type: string;
    object_uuid: string;
    decision_value: 'approve' | 'reject';
    comment: string | null;
    force_approved: boolean;
    force_approve_comment: string | null;
    re_review_requested: boolean;
    re_review_requested_by_user_id: number | null;
    re_review_requested_at: Date | null;
    re_review_request_comment: string | null;
    updated_at?: Date;
};

/** Maps nullable DB strings to optional domain fields. */
const nullToUndefined = <T>(value: T | null | undefined): T | undefined => (value === null ? undefined : value);

/** Maps optional domain strings to nullable DB columns. */
const optionalStringToDb = (value: string | null | undefined): string | null => value ?? null;

const dbObjectToReviewDecision = (dbObject: DbObject): ReviewDecision => ({
    objectType: dbObject.object_type as SurveyObjectName,
    objectUuid: dbObject.object_uuid,
    userId: dbObject.user_id,
    decision: dbObject.decision_value,
    comment: nullToUndefined(dbObject.comment),
    forceApproved: dbObject.force_approved,
    forceApproveComment: nullToUndefined(dbObject.force_approve_comment),
    reReviewRequested: dbObject.re_review_requested,
    reReviewRequestedByUserId: nullToUndefined(dbObject.re_review_requested_by_user_id),
    reReviewRequestedAt: dbObject.re_review_requested_at?.toISOString(),
    reReviewRequestComment: nullToUndefined(dbObject.re_review_request_comment),
    updatedAt: dbObject.updated_at?.toISOString()
});

const reviewDecisionToDbObject = (
    interviewId: number,
    userId: number,
    reviewDecision: Pick<ReviewDecision, 'objectType' | 'objectUuid' | 'decision' | 'comment'>
): DbObject => ({
    interview_id: interviewId,
    user_id: userId,
    object_type: reviewDecision.objectType,
    object_uuid: reviewDecision.objectUuid,
    decision_value: reviewDecision.decision,
    comment: optionalStringToDb(reviewDecision.comment),
    force_approved: false,
    force_approve_comment: null,
    re_review_requested: false,
    re_review_requested_by_user_id: null,
    re_review_requested_at: null,
    re_review_request_comment: null
});

const getReviewDecisionsForInterviewObject = async (
    interviewId: number,
    objectType: SurveyObjectName,
    objectUuid: string,
    transaction: Knex.Transaction,
    forUpdate = false
): Promise<ReviewDecision[]> => {
    try {
        // Newest first: aggregation helpers rely on this order (e.g. most recent force-approve wins)
        const query = transaction(tableName)
            .where({
                interview_id: interviewId,
                object_type: objectType,
                object_uuid: objectUuid
            })
            .orderBy('updated_at', 'desc');
        if (forUpdate) {
            query.forUpdate();
        }
        const rows = await query;
        return rows.map(dbObjectToReviewDecision);
    } catch (error) {
        throw new TrError(
            `Error getting reviews for interview ${interviewId} object ${objectType}/${objectUuid} in database (knex error: ${error})`,
            'DBSVREV0005',
            'CannotGetReviewsForInterviewObjectBecauseDatabaseError'
        );
    }
};

const getReviewDecisionsForInterview = async (
    interviewId: number,
    transaction?: Knex.Transaction
): Promise<ReviewDecision[]> => {
    try {
        // Newest first: aggregation helpers rely on this order (e.g. most recent force-approve wins)
        const query = (transaction ?? knex)(tableName).where('interview_id', interviewId).orderBy('updated_at', 'desc');
        const reviews = await query;
        return reviews.map(dbObjectToReviewDecision);
    } catch (error) {
        throw new TrError(
            `Error getting reviews for interview ${interviewId} in database (knex error: ${error})`,
            'DBSVREV0001',
            'CannotGetReviewsForInterviewBecauseDatabaseError'
        );
    }
};

const deleteReviewDecisionsForInterview = async (
    interviewId: number,
    transaction?: Knex.Transaction
): Promise<boolean> => {
    try {
        await (transaction ?? knex)(tableName).where('interview_id', interviewId).del();
        return true;
    } catch (error) {
        throw new TrError(
            `Error deleting reviews for interview ${interviewId} in database (knex error: ${error})`,
            'DBSVREV0002',
            'CannotDeleteReviewsForInterviewBecauseDatabaseError'
        );
    }
};

/**
 * Removes a reviewer's approve/reject row when it is not a force-approve row.
 * Rows with `force_approved` are left intact so an admin force-approve survives.
 * TODO: keep a soft-deleted audit history instead of hard-deleting rows.
 * See https://github.com/chairemobilite/evolution/issues/1714
 * @param interviewId - Interview database id
 * @param userId - Reviewer user id
 * @param reviewDecision - Object type and uuid
 * @param transaction - Optional knex transaction for atomic writes
 */
const clearReviewDecision = async (
    interviewId: number,
    userId: number,
    reviewDecision: Pick<ReviewDecision, 'objectType' | 'objectUuid'>,
    transaction?: Knex.Transaction
): Promise<void> => {
    try {
        await (transaction ?? knex)(tableName)
            .where({
                interview_id: interviewId,
                user_id: userId,
                object_type: reviewDecision.objectType,
                object_uuid: reviewDecision.objectUuid,
                force_approved: false
            })
            .del();
    } catch (error) {
        throw new TrError(
            `Error clearing review for interview ${interviewId} in database (knex error: ${error})`,
            'DBSVREV0010',
            'CannotClearReviewBecauseDatabaseError'
        );
    }
};

/**
 * Clears force-approve on the admin's review row without removing their approve/reject decision.
 * @param interviewId - Interview database id
 * @param userId - Admin user id who force-approved
 * @param reviewDecision - Object type and uuid
 * @param transaction - Optional knex transaction for atomic writes
 */
const clearForceApprove = async (
    interviewId: number,
    userId: number,
    reviewDecision: Pick<ReviewDecision, 'objectType' | 'objectUuid'>,
    transaction?: Knex.Transaction
): Promise<void> => {
    try {
        await (transaction ?? knex)(tableName)
            .where({
                interview_id: interviewId,
                user_id: userId,
                object_type: reviewDecision.objectType,
                object_uuid: reviewDecision.objectUuid,
                force_approved: true
            })
            .update({
                force_approved: false,
                force_approve_comment: null
            });
    } catch (error) {
        throw new TrError(
            `Error clearing force approve for interview ${interviewId} in database (knex error: ${error})`,
            'DBSVREV0011',
            'CannotClearForceApproveBecauseDatabaseError'
        );
    }
};

/**
 * Upserts a reviewer decision for one survey object in an interview.
 * Clears any pending re-review request and any prior force-approve override for that reviewer.
 * @param interviewId - Interview database id
 * @param userId - Reviewer user id
 * @param reviewDecision - Object type, uuid, decision and optional decision comment
 * @param transaction - Optional knex transaction for atomic writes
 * @returns The persisted review decision row
 */
const setReviewDecision = async (
    interviewId: number,
    userId: number,
    reviewDecision: Pick<ReviewDecision, 'objectType' | 'objectUuid' | 'decision' | 'comment'>,
    transaction?: Knex.Transaction
): Promise<ReviewDecision> => {
    try {
        const dbObject = reviewDecisionToDbObject(interviewId, userId, reviewDecision);
        const rows = await (transaction ?? knex)(tableName)
            .insert(dbObject)
            .onConflict(['interview_id', 'object_type', 'object_uuid', 'user_id'])
            .merge({
                decision_value: dbObject.decision_value,
                comment: dbObject.comment,
                force_approved: false,
                force_approve_comment: null,
                re_review_requested: false,
                re_review_requested_by_user_id: null,
                re_review_requested_at: null,
                re_review_request_comment: null
            })
            .returning('*');

        return dbObjectToReviewDecision(rows[0]);
    } catch (error) {
        throw new TrError(
            `Error setting review for interview ${interviewId} in database (knex error: ${error})`,
            'DBSVREV0003',
            'CannotSetReviewBecauseDatabaseError'
        );
    }
};

/**
 * Ask every other reviewer who already decided on an object to look at it again.
 * Target reviewers are selected atomically at write time (no prior snapshot).
 * @param interviewId - Interview database id
 * @param requestedByUserId - User requesting the re-review (excluded from targets)
 * @param reviewDecision - Object type, uuid and optional re-review comment
 * @param transaction - Optional knex transaction for atomic writes
 */
const requestReReviewFromOtherReviewers = async (
    interviewId: number,
    requestedByUserId: number,
    reviewDecision: Pick<ReviewDecision, 'objectType' | 'objectUuid' | 'reReviewRequestComment'>,
    transaction?: Knex.Transaction
): Promise<void> => {
    try {
        const queryKnex = transaction ?? knex;
        await queryKnex(tableName)
            .where({
                interview_id: interviewId,
                object_type: reviewDecision.objectType,
                object_uuid: reviewDecision.objectUuid
            })
            .whereNot('user_id', requestedByUserId)
            .update({
                re_review_requested: true,
                re_review_requested_by_user_id: requestedByUserId,
                re_review_requested_at: queryKnex.fn.now(),
                re_review_request_comment: optionalStringToDb(reviewDecision.reReviewRequestComment)
            });
    } catch (error) {
        throw new TrError(
            `Error requesting re-review for interview ${interviewId} in database (knex error: ${error})`,
            'DBSVREV0004',
            'CannotRequestReReviewBecauseDatabaseError'
        );
    }
};

/**
 * Force-approves only when reviewer conflict still exists on the object.
 * Force-approve is an admin override of a reviewer disagreement; without a
 * conflict there is nothing to override, so the request is rejected to avoid
 * silently masking future conflicting reviews. The conflict check and the
 * upsert run in the same transaction (with row locks) so a concurrent review
 * cannot invalidate the check between read and write.
 * @param interviewId - Interview database id
 * @param userId - Admin user id
 * @param reviewDecision - Object type, uuid and optional force-approve comment
 * @param transaction - Optional knex transaction for atomic writes
 * @returns The persisted review decision row
 */
const setForceApproveWhenConflictExists = async (
    interviewId: number,
    userId: number,
    reviewDecision: Pick<ReviewDecision, 'objectType' | 'objectUuid' | 'forceApproveComment'>,
    transaction?: Knex.Transaction
): Promise<ReviewDecision> => {
    const runInTransaction = async (trx: Knex.Transaction): Promise<ReviewDecision> => {
        const reviewDecisions = await getReviewDecisionsForInterviewObject(
            interviewId,
            reviewDecision.objectType,
            reviewDecision.objectUuid,
            trx,
            true
        );
        const status = computeReviewDecisionStatusForObject(
            reviewDecisions,
            reviewDecision.objectType,
            reviewDecision.objectUuid,
            userId
        );
        if (!status.hasConflict) {
            throw new TrError(
                `Cannot force-approve ${reviewDecision.objectType}/${reviewDecision.objectUuid} without reviewer conflict`,
                CANNOT_FORCE_APPROVE_WITHOUT_CONFLICT_ERROR_CODE,
                'CannotForceApproveWithoutConflict'
            );
        }

        // Upsert force-approve on the admin's own row. Inserts use reviewer defaults;
        // conflicts merge only the force-approve fields so an existing decision is kept.
        const dbObject: DbObject = {
            interview_id: interviewId,
            user_id: userId,
            object_type: reviewDecision.objectType,
            object_uuid: reviewDecision.objectUuid,
            decision_value: 'approve',
            comment: null,
            force_approved: true,
            force_approve_comment: optionalStringToDb(reviewDecision.forceApproveComment),
            re_review_requested: false,
            re_review_requested_by_user_id: null,
            re_review_requested_at: null,
            re_review_request_comment: null
        };
        const mergeFields: Pick<
            DbObject,
            | 'force_approved'
            | 're_review_requested'
            | 're_review_requested_by_user_id'
            | 're_review_requested_at'
            | 're_review_request_comment'
        > &
            Partial<Pick<DbObject, 'force_approve_comment'>> = {
                force_approved: true,
                re_review_requested: false, // If force-approving, clear any pending re-review request
                re_review_requested_by_user_id: null,
                re_review_requested_at: null,
                re_review_request_comment: null
            };
        if (reviewDecision.forceApproveComment !== undefined) {
            mergeFields.force_approve_comment = optionalStringToDb(reviewDecision.forceApproveComment);
        }

        const rows = await trx(tableName)
            .insert(dbObject)
            .onConflict(['interview_id', 'object_type', 'object_uuid', 'user_id'])
            .merge(mergeFields)
            .returning('*');

        return dbObjectToReviewDecision(rows[0]);
    };

    try {
        if (transaction) {
            return await runInTransaction(transaction);
        }
        return await knex.transaction(runInTransaction);
    } catch (error) {
        if (error instanceof TrError) {
            throw error;
        }
        throw new TrError(
            `Error setting force approve for interview ${interviewId} in database (knex error: ${error})`,
            'DBSVREV0008',
            'CannotSetForceApproveBecauseDatabaseError'
        );
    }
};

export default {
    getReviewDecisionsForInterview,
    deleteReviewDecisionsForInterview,
    setReviewDecision,
    clearReviewDecision,
    clearForceApprove,
    setForceApproveWhenConflictExists,
    requestReReviewFromOtherReviewers
};
