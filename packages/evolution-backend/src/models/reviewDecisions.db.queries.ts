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
    updated_at?: Date;
};

const dbObjectToReviewDecision = (dbObject: DbObject): ReviewDecision => ({
    objectType: dbObject.object_type as SurveyObjectNames,
    objectUuid: dbObject.object_uuid,
    userId: dbObject.user_id,
    decision: dbObject.decision_value,
    comment: dbObject.comment === null ? undefined : dbObject.comment,
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
    comment: review.comment || null
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
 * @param interviewId - Interview database id
 * @param userId - Reviewer user id
 * @param review - Object type, uuid and decision
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

export default {
    getReviewDecisionsForInterview,
    deleteReviewDecisionsForInterview,
    setReview
};
