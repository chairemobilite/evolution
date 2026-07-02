/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { buildReviewDecisions } from './ReviewDecisionUtils';
import type { ReviewDecisions, ReviewDecision } from 'evolution-common/lib/services/reviews/types';
import reviewDecisionsDbQueries from '../../models/reviewDecisions.db.queries';

/**
 * Orchestrates reviewer decision reads and writes for an interview: loads and
 * aggregates decisions for the admin UI and persists set/clear, re-review request,
 * and force-approve mutations before returning refreshed payloads.
 */
export class ReviewDecisionService {
    // A mutation always acts on the actor's own review row, so the reloaded payload is
    // aggregated from the actor's point of view.
    private static async mutateAndReloadReviewDecisions(
        interviewId: number,
        actorUserId: number,
        mutate: () => Promise<unknown>
    ): Promise<ReviewDecisions> {
        await mutate();
        return ReviewDecisionService.getReviewDecisions(interviewId, actorUserId);
    }

    /**
     * Builds the review decisions payload for the admin review UI.
     * @param interviewId - Interview database id
     * @param currentUserId - Optional current reviewer user id used to aggregate the
     * per-user fields (currentUserDecision, re-review flags) in the status payload
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
     * @returns Updated review decisions payload for the interview
     */
    static async setReviewDecision(
        interviewId: number,
        userId: number,
        reviewDecision: Pick<ReviewDecision, 'objectType' | 'objectUuid' | 'decision' | 'comment'>
    ): Promise<ReviewDecisions> {
        return ReviewDecisionService.mutateAndReloadReviewDecisions(interviewId, userId, () =>
            reviewDecisionsDbQueries.setReviewDecision(interviewId, userId, reviewDecision)
        );
    }

    /**
     * Ask every other reviewer who already decided on an object to look at it
     * again (GitHub-style re-request review after corrections). The requester is
     * never asked, and reviewers without a prior decision are skipped.
     * @param interviewId - Interview database id
     * @param requestedByUserId - User requesting the re-review (excluded from the request)
     * @param reviewDecision - Object type, uuid and optional re-review comment
     * @returns Updated review decisions payload for the interview
     */
    static async requestReReview(
        interviewId: number,
        requestedByUserId: number,
        reviewDecision: Pick<ReviewDecision, 'objectType' | 'objectUuid' | 'reReviewRequestComment'>
    ): Promise<ReviewDecisions> {
        return ReviewDecisionService.mutateAndReloadReviewDecisions(interviewId, requestedByUserId, () =>
            reviewDecisionsDbQueries.requestReReviewFromOtherReviewers(interviewId, requestedByUserId, reviewDecision)
        );
    }

    /**
     * Admin force-approve when reviewers disagree on an object. Upserts the admin's review row,
     * preserving an existing approve/reject decision when present, or creating an approve row
     * when the admin has no prior decision.
     * @param interviewId - Interview database id
     * @param userId - Admin user id
     * @param reviewDecision - Object type, uuid and optional force-approve comment
     * @returns Updated review decisions payload for the interview
     */
    static async setForceApprove(
        interviewId: number,
        userId: number,
        reviewDecision: Pick<ReviewDecision, 'objectType' | 'objectUuid' | 'forceApproveComment'>
    ): Promise<ReviewDecisions> {
        return ReviewDecisionService.mutateAndReloadReviewDecisions(interviewId, userId, () =>
            reviewDecisionsDbQueries.setForceApproveWhenConflictExists(interviewId, userId, reviewDecision)
        );
    }

    /**
     * Removes the current reviewer's approve/reject decision when it is not a force-approve row.
     * @param interviewId - Interview database id
     * @param userId - Reviewer user id
     * @param reviewDecision - Object type and uuid
     * @returns Updated review decisions payload for the interview
     */
    static async clearReviewDecision(
        interviewId: number,
        userId: number,
        reviewDecision: Pick<ReviewDecision, 'objectType' | 'objectUuid'>
    ): Promise<ReviewDecisions> {
        return ReviewDecisionService.mutateAndReloadReviewDecisions(interviewId, userId, () =>
            reviewDecisionsDbQueries.clearReviewDecision(interviewId, userId, reviewDecision)
        );
    }

    /**
     * Clears force-approve on the admin's review row.
     * @param interviewId - Interview database id
     * @param userId - Admin user id
     * @param reviewDecision - Object type and uuid
     * @returns Updated review decisions payload for the interview
     */
    static async clearForceApprove(
        interviewId: number,
        userId: number,
        reviewDecision: Pick<ReviewDecision, 'objectType' | 'objectUuid'>
    ): Promise<ReviewDecisions> {
        return ReviewDecisionService.mutateAndReloadReviewDecisions(interviewId, userId, () =>
            reviewDecisionsDbQueries.clearForceApprove(interviewId, userId, reviewDecision)
        );
    }
}
