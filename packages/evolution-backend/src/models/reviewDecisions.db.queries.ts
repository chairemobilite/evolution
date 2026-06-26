/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import TrError from 'chaire-lib-common/lib/utils/TrError';
import { ReviewDecision } from 'evolution-common/lib/services/reviews/types';
import type { SurveyObjectNames } from 'evolution-common/lib/services/baseObjects/types';
import { Knex } from 'knex';

const tableName = 'sv_reviews';

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

const dbObjectToReviewDecision = (dbObject: DbObject): ReviewDecision => ({
    objectType: dbObject.object_type as SurveyObjectNames,
    objectUuid: dbObject.object_uuid,
    userId: dbObject.user_id,
    decision: dbObject.decision_value,
    comment: dbObject.comment === null ? undefined : dbObject.comment,
    forceApproved: dbObject.force_approved,
    forceApproveComment: dbObject.force_approve_comment === null ? undefined : dbObject.force_approve_comment,
    reReviewRequested: dbObject.re_review_requested,
    reReviewRequestedByUserId:
        dbObject.re_review_requested_by_user_id === null ? undefined : dbObject.re_review_requested_by_user_id,
    reReviewRequestedAt: dbObject.re_review_requested_at?.toISOString(),
    reReviewRequestComment:
        dbObject.re_review_request_comment === null ? undefined : dbObject.re_review_request_comment,
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
    comment: reviewDecision.comment || null,
    force_approved: false,
    force_approve_comment: null,
    re_review_requested: false,
    re_review_requested_by_user_id: null,
    re_review_requested_at: null,
    re_review_request_comment: null
});

const getReviewDecisionsForInterview = async (interviewId: number): Promise<ReviewDecision[]> => {
    try {
        const reviews = await knex(tableName).where('interview_id', interviewId);
        return reviews.map(dbObjectToReviewDecision);
    } catch (error) {
        throw new TrError(
            `Error getting reviews for interview ${interviewId} in database (knex error: ${error})`,
            'DBSVREV0001',
            'CannotGetReviewsForInterviewBecauseDatabaseError'
        );
    }
};

const getReviewDecisionForUserAndObject = async (
    interviewId: number,
    userId: number,
    objectType: SurveyObjectNames,
    objectUuid: string
): Promise<ReviewDecision | undefined> => {
    try {
        const row = await knex(tableName)
            .where({
                interview_id: interviewId,
                user_id: userId,
                object_type: objectType,
                object_uuid: objectUuid
            })
            .first();

        return row ? dbObjectToReviewDecision(row) : undefined;
    } catch (error) {
        throw new TrError(
            `Error getting review for interview ${interviewId} in database (knex error: ${error})`,
            'DBSVREV0005',
            'CannotGetReviewBecauseDatabaseError'
        );
    }
};

const deleteReviewDecisionsForInterview = async (
    interviewId: number,
    transaction?: Knex.Transaction
): Promise<boolean> => {
    try {
        const query = knex(tableName).where('interview_id', interviewId).del();
        if (transaction !== undefined) {
            query.transacting(transaction);
        }
        await query;
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
 * Upserts a reviewer decision for one survey object in an interview.
 * Clears any pending re-review request for that reviewer once a new decision is submitted.
 * @param interviewId - Interview database id
 * @param userId - Reviewer user id
 * @param reviewDecision - Object type, uuid, decision and optional decision comment
 * @returns The persisted review decision row
 */
const setReviewDecision = async (
    interviewId: number,
    userId: number,
    reviewDecision: Pick<ReviewDecision, 'objectType' | 'objectUuid' | 'decision' | 'comment'>
): Promise<ReviewDecision> => {
    try {
        const dbObject = reviewDecisionToDbObject(interviewId, userId, reviewDecision);
        const rows = await knex(tableName)
            .insert(dbObject)
            .onConflict(['interview_id', 'object_type', 'object_uuid', 'user_id'])
            .merge({
                decision_value: dbObject.decision_value,
                comment: dbObject.comment,
                re_review_requested: false,
                re_review_requested_by_user_id: null,
                re_review_requested_at: null,
                re_review_request_comment: null,
                updated_at: knex.fn.now()
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
 * Ask a reviewer to look at an object again after corrections (GitHub-style re-request review).
 * The target reviewer must already have a decision on the object.
 * @param interviewId - Interview database id
 * @param targetUserId - Reviewer who should re-review the object
 * @param requestedByUserId - User requesting the re-review
 * @param reviewDecision - Object type, uuid and optional re-review comment
 * @returns The updated review decision row
 */
const requestReReview = async (
    interviewId: number,
    targetUserId: number,
    requestedByUserId: number,
    reviewDecision: Pick<ReviewDecision, 'objectType' | 'objectUuid' | 'reReviewRequestComment'>
): Promise<ReviewDecision> => {
    try {
        const existingReviewDecision = await getReviewDecisionForUserAndObject(
            interviewId,
            targetUserId,
            reviewDecision.objectType,
            reviewDecision.objectUuid
        );
        if (!existingReviewDecision) {
            throw new TrError(
                `No existing review decision for user ${targetUserId} on ${reviewDecision.objectType}/${reviewDecision.objectUuid}`,
                'DBSVREV0006',
                'CannotRequestReReviewWithoutExistingReview'
            );
        }

        const rows = await knex(tableName)
            .where({
                interview_id: interviewId,
                user_id: targetUserId,
                object_type: reviewDecision.objectType,
                object_uuid: reviewDecision.objectUuid
            })
            .update({
                re_review_requested: true,
                re_review_requested_by_user_id: requestedByUserId,
                re_review_requested_at: knex.fn.now(),
                re_review_request_comment: reviewDecision.reReviewRequestComment || null,
                updated_at: knex.fn.now()
            })
            .returning('*');

        return dbObjectToReviewDecision(rows[0]);
    } catch (error) {
        if (error instanceof TrError) {
            throw error;
        }
        throw new TrError(
            `Error requesting re-review for interview ${interviewId} in database (knex error: ${error})`,
            'DBSVREV0004',
            'CannotRequestReReviewBecauseDatabaseError'
        );
    }
};

/**
 * Sets force_approved on the admin's review row, preserving their approve/reject decision.
 * Creates a row with decision `approve` when the admin has not reviewed yet.
 * @param interviewId - Interview database id
 * @param userId - Admin user id
 * @param reviewDecision - Object type, uuid and optional force-approve comment
 * @returns The persisted review decision row
 */
const setForceApprove = async (
    interviewId: number,
    userId: number,
    reviewDecision: Pick<ReviewDecision, 'objectType' | 'objectUuid' | 'forceApproveComment'>
): Promise<ReviewDecision> => {
    try {
        const existingReviewDecision = await getReviewDecisionForUserAndObject(
            interviewId,
            userId,
            reviewDecision.objectType,
            reviewDecision.objectUuid
        );
        const dbObject: DbObject = {
            interview_id: interviewId,
            user_id: userId,
            object_type: reviewDecision.objectType,
            object_uuid: reviewDecision.objectUuid,
            decision_value: existingReviewDecision?.decision ?? 'approve',
            comment: existingReviewDecision?.comment ?? null,
            force_approved: true,
            force_approve_comment:
                reviewDecision.forceApproveComment !== undefined
                    ? reviewDecision.forceApproveComment || null
                    : (existingReviewDecision?.forceApproveComment ?? null),
            re_review_requested: false,
            re_review_requested_by_user_id: null,
            re_review_requested_at: null,
            re_review_request_comment: null
        };
        const mergeFields: Record<string, unknown> = {
            force_approved: true,
            updated_at: knex.fn.now()
        };
        if (reviewDecision.forceApproveComment !== undefined) {
            mergeFields.force_approve_comment = reviewDecision.forceApproveComment || null;
        }

        const rows = await knex(tableName)
            .insert(dbObject)
            .onConflict(['interview_id', 'object_type', 'object_uuid', 'user_id'])
            .merge(mergeFields)
            .returning('*');

        return dbObjectToReviewDecision(rows[0]);
    } catch (error) {
        throw new TrError(
            `Error setting force approve for interview ${interviewId} in database (knex error: ${error})`,
            'DBSVREV0008',
            'CannotSetForceApproveBecauseDatabaseError'
        );
    }
};

export default {
    getReviewDecisionsForInterview,
    getReviewDecisionForUserAndObject,
    deleteReviewDecisionsForInterview,
    setReviewDecision,
    setForceApprove,
    requestReReview
};
