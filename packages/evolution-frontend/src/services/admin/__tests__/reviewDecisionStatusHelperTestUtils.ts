/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import type { ReviewDecisionStatusForObject } from 'evolution-common/lib/services/reviews/types';

/**
 * Builds a rejected review status fixture for admin component tests.
 * @param objectType - Survey object type key
 * @param objectUuid - Survey object uuid
 * @returns Rejected review status for display assertions
 */
export const createRejectedReviewDecisionStatus = (
    objectType: ReviewDecisionStatusForObject['objectType'],
    objectUuid: string
): ReviewDecisionStatusForObject => ({
    objectType,
    objectUuid,
    approvalCount: 0,
    rejectionCount: 1,
    hasConflict: false,
    isForceApproved: false,
    effectiveStatus: 'rejected',
    reReviewRequestedUserIds: [],
    isReviewed: true
});

/**
 * Builds an approved review status fixture for admin component tests.
 * @param objectType - Survey object type key
 * @param objectUuid - Survey object uuid
 * @returns Approved review status for display assertions
 */
export const createApprovedReviewDecisionStatus = (
    objectType: ReviewDecisionStatusForObject['objectType'],
    objectUuid: string
): ReviewDecisionStatusForObject => ({
    objectType,
    objectUuid,
    approvalCount: 1,
    rejectionCount: 0,
    hasConflict: false,
    isForceApproved: false,
    effectiveStatus: 'approved',
    reReviewRequestedUserIds: [],
    isReviewed: true
});
