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

    /**
     * Ask every other reviewer who already decided on an object to look at it
     * again (GitHub-style re-request review after corrections). The requester is
     * never asked, and reviewers without a prior decision are skipped.
     * @param interviewId - Interview database id
     * @param requestedByUserId - User requesting the re-review (excluded from the request)
     * @param review - Object type, uuid and optional re-review comment
     * @param currentUserId - Optional current reviewer user id for status aggregation
     * @returns Updated review payload for the interview
     */
    static async requestReReviewAndGetInterviewReview(
        interviewId: number,
        requestedByUserId: number,
        review: Pick<ReviewDecision, 'objectType' | 'objectUuid' | 'reReviewRequestComment'>,
        currentUserId?: number
    ): Promise<InterviewReview> {
        const reviewDecisions = await reviewDecisionsDbQueries.getReviewDecisionsForInterview(interviewId);
        const otherReviewerIds = [
            ...new Set(
                reviewDecisions
                    .filter(
                        (existing) =>
                            existing.objectType === review.objectType &&
                            existing.objectUuid === review.objectUuid &&
                            existing.userId !== requestedByUserId
                    )
                    .map((existing) => existing.userId)
            )
        ];
        await Promise.all(
            otherReviewerIds.map((targetUserId) =>
                reviewDecisionsDbQueries.requestReReview(interviewId, targetUserId, requestedByUserId, review)
            )
        );
        return ReviewDecisionService.getInterviewReview(interviewId, currentUserId ?? requestedByUserId);
    }
}
