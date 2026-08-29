/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { type ReviewDecisionEffectiveStatus } from './types';

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
