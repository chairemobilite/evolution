/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import TrError from 'chaire-lib-common/lib/utils/TrError';
import { ReviewDecision }
import type { SurveyObjectNames } from 'evolution-common/lib/services/baseObjects/types' from 'evolution-common/lib/services/reviewDecisions/types';
import { Knex } from 'knex';

const tableName = 'sv_reviews';

type DbObject = {
    interview_id: number;
    user_id: number;
    object_type: string;
    object_uuid: string;
    decision_value: 'approve' | 'reject';
    comment: string | null;
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
    review: Pick<ReviewDecision, 'objectType' | 'objectUuid' | 'decision' | 'comment'>
): DbObject => ({
    interview_id: interviewId,
    user_id: userId,
    object_type: review.objectType,
    object_uuid: review.objectUuid,
    decision_value: review.decision,
    comment: review.comment || null,
    re_review_requested: false,
    re_review_requested_by_user_id: null,
    re_review_requested_at: null,
    re_review_request_comment: null
});

const getReviewDecisionsForInterview = async (interviewId: number): Promise<ReviewDecision[]> => {
    try {
        const reviewDecisions = await knex(tableName).where('interview_id', interviewId);
        return reviewDecisions.map(dbObjectToReviewDecision);
    } catch (error) {
        throw new TrError(
            `Error getting reviewDecisions for interview ${interviewId} in database (knex error: ${error})`,
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
            `Error deleting reviewDecisions for interview ${interviewId} in database (knex error: ${error})`,
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
 * @param review - Object type, uuid, decision and optional decision comment
 * @returns The persisted review row
 */
const setReview = async (
    interviewId: number,
    userId: number,
    review: Pick<ReviewDecision, 'objectType' | 'objectUuid' | 'decision' | 'comment'>
): Promise<ReviewDecision> => {
    try {
        const dbObject = reviewDecisionToDbObject(interviewId, userId, review);
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
 * @param review - Object type, uuid and optional re-review comment
 * @returns The updated review row
 */
const requestReReview = async (
    interviewId: number,
    targetUserId: number,
    requestedByUserId: number,
    review: Pick<ReviewDecision, 'objectType' | 'objectUuid' | 'reReviewRequestComment'>
): Promise<ReviewDecision> => {
    try {
        const existingReview = await getReviewDecisionForUserAndObject(
            interviewId,
            targetUserId,
            review.objectType,
            review.objectUuid
        );
        if (!existingReview) {
            throw new TrError(
                `No existing review for user ${targetUserId} on ${review.objectType}/${review.objectUuid}`,
                'DBSVREV0006',
                'CannotRequestReReviewWithoutExistingReview'
            );
        }

        const rows = await knex(tableName)
            .where({
                interview_id: interviewId,
                user_id: targetUserId,
                object_type: review.objectType,
                object_uuid: review.objectUuid
            })
            .update({
                re_review_requested: true,
                re_review_requested_by_user_id: requestedByUserId,
                re_review_requested_at: knex.fn.now(),
                re_review_request_comment: review.reReviewRequestComment || null,
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

export default {
    getReviewDecisionsForInterview,
    getReviewDecisionForUserAndObject,
    deleteReviewDecisionsForInterview,
    setReview,
    requestReReview
};
