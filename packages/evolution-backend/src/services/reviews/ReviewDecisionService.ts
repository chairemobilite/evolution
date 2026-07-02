/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { buildReviewDecisions } from 'evolution-common/lib/services/reviews/ReviewDecisionUtils';
import type { ReviewDecisions, ReviewDecision } from 'evolution-common/lib/services/reviews/types';
import reviewDecisionsDbQueries from '../../models/reviewDecisions.db.queries';

/**
 * Loads and aggregates reviewer decisions for an interview.
 */
export class ReviewDecisionService {
    /**
     * Builds the review decisions payload for the admin review UI.
     * @param interviewId - Interview database id
     * @param currentUserId - Optional current reviewer user id
     * @returns Review decision lists and aggregated status by object
     */
    static async getReviewDecisions(interviewId: number, currentUserId?: number): Promise<ReviewDecisions> {
        const reviewDecisions = await reviewDecisionsDbQueries.getReviewDecisionsForInterview(interviewId);
        return buildReviewDecisions(reviewDecisions, currentUserId);
    }

    /**
     * Persists a reviewer decision and returns the updated review decisions payload.
     * @param interviewId - Interview database id
     * @param userId - Reviewer user id
     * @param reviewDecision - Object type, uuid and decision
     * @param currentUserId - Optional current reviewer user id for status aggregation
     * @returns Updated review decisions payload for the interview
     */
    static async setReviewDecisionAndGetReviewDecisions(
        interviewId: number,
        userId: number,
        reviewDecision: Pick<ReviewDecision, 'objectType' | 'objectUuid' | 'decision' | 'comment'>,
        currentUserId?: number
    ): Promise<ReviewDecisions> {
        await reviewDecisionsDbQueries.setReviewDecision(interviewId, userId, reviewDecision);
        return ReviewDecisionService.getReviewDecisions(interviewId, currentUserId ?? userId);
    }

    /**
     * Ask every other reviewer who already decided on an object to look at it
     * again (GitHub-style re-request review after corrections). The requester is
     * never asked, and reviewers without a prior decision are skipped.
     * @param interviewId - Interview database id
     * @param requestedByUserId - User requesting the re-review (excluded from the request)
     * @param reviewDecision - Object type, uuid and optional re-review comment
     * @param currentUserId - Optional current reviewer user id for status aggregation
     * @returns Updated review decisions payload for the interview
     */
    static async requestReReviewAndGetReviewDecisions(
        interviewId: number,
        requestedByUserId: number,
        reviewDecision: Pick<ReviewDecision, 'objectType' | 'objectUuid' | 'reReviewRequestComment'>,
        currentUserId?: number
    ): Promise<ReviewDecisions> {
        await reviewDecisionsDbQueries.requestReReviewForOtherReviewers(interviewId, requestedByUserId, reviewDecision);
        return ReviewDecisionService.getReviewDecisions(interviewId, currentUserId ?? requestedByUserId);
    }

    /**
     * Admin force-approve on the admin's review row, preserving their approve/reject decision.
     * @param interviewId - Interview database id
     * @param userId - Admin user id
     * @param reviewDecision - Object type, uuid and optional force-approve comment
     * @param currentUserId - Optional current user id for status aggregation
     * @returns Updated review decisions payload for the interview
     */
    static async setForceApproveAndGetReviewDecisions(
        interviewId: number,
        userId: number,
        reviewDecision: Pick<ReviewDecision, 'objectType' | 'objectUuid' | 'forceApproveComment'>,
        currentUserId?: number
    ): Promise<ReviewDecisions> {
        await reviewDecisionsDbQueries.setForceApproveWhenConflictExists(interviewId, userId, reviewDecision);
        return ReviewDecisionService.getReviewDecisions(interviewId, currentUserId ?? userId);
    }
}
