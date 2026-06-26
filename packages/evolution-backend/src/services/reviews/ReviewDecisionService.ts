/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { buildInterviewReview } from 'evolution-common/lib/services/reviewDecisions/ReviewDecisionUtils';
import type { ReviewDecisionValue, InterviewReview } from 'evolution-common/lib/services/reviewDecisions/types';
import reviewDecisionsDbQueries from '../../models/reviewDecisions.db.queries';

/**
 * Loads and aggregates reviewer decisions for an interview.
 */
export class ReviewDecisionService {
    /**
     * Builds the review payload for the admin review UI.
     * @param interviewId - Interview database id
     * @param currentUserId - Optional current reviewer user id
     * @returns Review lists and aggregated status by object
     */
    static async getInterviewReview(interviewId: number, currentUserId?: number): Promise<InterviewReview> {
        const reviewDecisions = await reviewDecisionsDbQueries.getReviewDecisionsForInterview(interviewId);
        return buildInterviewReview(reviewDecisions, currentUserId);
    }

    /**
     * Persists a reviewer decision and returns the updated review payload.
     * @param interviewId - Interview database id
     * @param userId - Reviewer user id
     * @param review - Object type, uuid and decision
     * @param currentUserId - Optional current reviewer user id for status aggregation
     * @returns Updated review payload for the interview
     */
    static async setReviewAndGetInterviewReview(
        interviewId: number,
        userId: number,
        review: Pick<ReviewDecision, 'objectType' | 'objectUuid' | 'decision' | 'comment'>,
        currentUserId?: number
    ): Promise<InterviewReview> {
        await reviewDecisionsDbQueries.setReviewDecisionDecision(interviewId, userId, review);
        return ReviewDecisionService.getInterviewReview(interviewId, currentUserId ?? userId);
    }
}
