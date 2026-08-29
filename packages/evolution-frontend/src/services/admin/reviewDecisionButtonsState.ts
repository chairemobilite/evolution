/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import type { ReviewDecisionStatusForObject } from 'evolution-common/lib/services/reviews/types';
import { blocksApproval } from 'evolution-common/lib/services/reviews/reviewDecisionStatus';

export type ReviewDecisionButtonsState = {
    /** Whether the current user rejected this object. */
    rejectPressed: boolean;
    /** Whether the current user approved this object. */
    approvePressed: boolean;
    /** Whether the current user force-approved this object. */
    forceApprovePressed: boolean;
    /** Whether reviewers disagree on this object. */
    showConflictWarning: boolean;
    /** Whether clicking the pressed decision again may clear it. */
    canClearDecision: boolean;
    /** Whether there is something to override with a force approve, for a user allowed to do it. */
    showForceApprove: boolean;
    /** Whether other reviewers may be asked to look at this object again. */
    showRequestReReview: boolean;
    /** Whether the current user already asked the others to re-review. */
    reReviewPressed: boolean;
    /** Whether another reviewer asked the current user to look again. */
    askedToReReview: boolean;
};

/**
 * Derives the state of the review buttons of one survey object from its aggregated status.
 * Shared by the buttons of the object boxes and the interview links of the top menu, which
 * show the same decisions in two different visual styles.
 * @param status - Aggregated review status for the object, undefined when never reviewed
 * @returns Which buttons to show and which of them are pressed
 */
export const getReviewDecisionButtonsState = (
    status: ReviewDecisionStatusForObject | undefined
): ReviewDecisionButtonsState => {
    const currentDecision = status?.currentUserDecision;
    const forceApprovePressed = status?.currentUserForceApproved === true;
    // Number of reviewers other than the current user who already decided on this object.
    // approvalCount/rejectionCount exclude force-approved rows, so the current user's own
    // decision is counted in them only when it exists and is not force-approved.
    const reviewerCount = (status?.approvalCount ?? 0) + (status?.rejectionCount ?? 0);
    const currentUserCountedInReviewerTotals = currentDecision !== undefined && !forceApprovePressed;
    const otherReviewersCount = reviewerCount - (currentUserCountedInReviewerTotals ? 1 : 0);

    return {
        rejectPressed: currentDecision === 'reject',
        approvePressed: currentDecision === 'approve',
        forceApprovePressed,
        showConflictWarning: status?.effectiveStatus === 'conflict',
        canClearDecision: !forceApprovePressed,
        showForceApprove:
            status !== undefined && (blocksApproval(status.effectiveStatus) || status.isForceApproved === true),
        showRequestReReview: otherReviewersCount > 0,
        // Pressed state reflects only the current user's own re-review request, not other reviewers'.
        reReviewPressed: status?.reReviewRequestedByCurrentUser === true,
        askedToReReview: status?.reReviewRequestedOfCurrentUser === true
    };
};
