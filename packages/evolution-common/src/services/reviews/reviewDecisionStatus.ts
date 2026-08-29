/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type {
    ReviewDecisionEffectiveStatus,
    ReviewDecisionStatusByObject,
    ReviewDecisionStatusForObject
} from './types';

/**
 * Resolves export-gate status from reviewer counts and optional admin force-approve.
 *
 * This is the single source of truth for the review status, used both for the
 * per-object status computed in memory and for the interview-level status
 * aggregated by the database for the admin interview list.
 * @param approvalCount - Number of approve decisions
 * @param rejectionCount - Number of reject decisions
 * @param isForceApproved - Whether an admin force-approved the object
 * @returns Effective review status for the object
 */
export const getReviewDecisionEffectiveStatus = (
    approvalCount: number,
    rejectionCount: number,
    isForceApproved: boolean
): ReviewDecisionEffectiveStatus => {
    if (isForceApproved) {
        return 'forceApproved';
    }
    if (approvalCount > 0 && rejectionCount > 0) {
        return 'conflict';
    }
    if (approvalCount > 0) {
        return 'approved';
    }
    if (rejectionCount > 0) {
        return 'rejected';
    }
    return 'notReviewed';
};

/**
 * Whether a status stands in the way of approving the object, or the interview containing it.
 * A rejection and an unsettled disagreement both do; a force approve already settled one.
 * @param effectiveStatus - Effective review status of the object
 * @returns True when the status must be settled before an approval makes sense
 */
export const blocksApproval = (effectiveStatus: ReviewDecisionEffectiveStatus): boolean =>
    effectiveStatus === 'rejected' || effectiveStatus === 'conflict';

/**
 * Whether an object of the interview, the interview itself excepted, blocks its approval.
 * Approving an interview means accepting everything it contains, so a reviewer may not
 * approve it while an object below is rejected or disagreed upon; only a force approve can.
 * Shared by the admin UI, which stops offering to approve, keeping the action only to withdraw
 * an approval taken before the rejection, and by the server, which refuses a new approval.
 * @param reviewDecisionStatusByObject - Review status grouped by object type
 * @returns True when at least one object below the interview blocks its approval
 */
export const hasObjectBlockingInterviewApproval = (
    reviewDecisionStatusByObject: ReviewDecisionStatusByObject | undefined
): boolean =>
    Object.entries(reviewDecisionStatusByObject || {}).some(([objectTypeKey, bucket]) => {
        if (objectTypeKey === 'interview' || !bucket) {
            return false;
        }
        // Singleton object types hold a single status, the other ones a status per uuid.
        const statuses: ReviewDecisionStatusForObject[] =
            typeof (bucket as ReviewDecisionStatusForObject).effectiveStatus === 'string'
                ? [bucket as ReviewDecisionStatusForObject]
                : Object.values(bucket as { [uuid: string]: ReviewDecisionStatusForObject });
        return statuses.some((status) => blocksApproval(status.effectiveStatus));
    });
