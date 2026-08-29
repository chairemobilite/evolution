/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import type { ReviewDecisionStatusForObject } from 'evolution-common/lib/services/reviews/types';
import { getReviewDecisionButtonsState } from '../reviewDecisionButtonsState';

const objectUuid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const buildStatus = (overrides: Partial<ReviewDecisionStatusForObject>): ReviewDecisionStatusForObject => ({
    objectType: 'person',
    objectUuid,
    approvalCount: 0,
    rejectionCount: 0,
    hasConflict: false,
    isForceApproved: false,
    effectiveStatus: 'notReviewed',
    reReviewRequestedUserIds: [],
    isReviewed: false,
    ...overrides
});

describe('getReviewDecisionButtonsState', () => {
    // [case name, status, expected subset of the state]
    const cases: [string, ReviewDecisionStatusForObject | undefined, Partial<ReturnType<typeof getReviewDecisionButtonsState>>][] = [
        [
            'never reviewed',
            undefined,
            {
                rejectPressed: false,
                approvePressed: false,
                canClearDecision: true,
                showForceApprove: false,
                showRequestReReview: false
            }
        ],
        [
            'approved by the current user alone',
            buildStatus({ approvalCount: 1, effectiveStatus: 'approved', currentUserDecision: 'approve' }),
            { approvePressed: true, rejectPressed: false, showRequestReReview: false }
        ],
        [
            'rejected by the current user alone',
            buildStatus({ rejectionCount: 1, effectiveStatus: 'rejected', currentUserDecision: 'reject' }),
            { rejectPressed: true, approvePressed: false, showRequestReReview: false }
        ],
        [
            'decided by another reviewer only',
            buildStatus({ approvalCount: 1, effectiveStatus: 'approved' }),
            { approvePressed: false, showRequestReReview: true }
        ],
        [
            'reviewers disagree',
            buildStatus({
                approvalCount: 1,
                rejectionCount: 1,
                hasConflict: true,
                effectiveStatus: 'conflict',
                currentUserDecision: 'approve'
            }),
            { showConflictWarning: true, showForceApprove: true, showRequestReReview: true }
        ],
        [
            'force-approved by the current user',
            buildStatus({
                isForceApproved: true,
                effectiveStatus: 'forceApproved',
                currentUserForceApproved: true,
                currentUserDecision: 'approve'
            }),
            { forceApprovePressed: true, canClearDecision: false, showForceApprove: true }
        ],
        [
            'the current user was asked to review again',
            buildStatus({ approvalCount: 1, effectiveStatus: 'approved', reReviewRequestedOfCurrentUser: true }),
            { askedToReReview: true, reReviewPressed: false }
        ],
        [
            'the current user asked the others to review again',
            buildStatus({
                approvalCount: 2,
                effectiveStatus: 'approved',
                currentUserDecision: 'approve',
                reReviewRequestedByCurrentUser: true
            }),
            { reReviewPressed: true, showRequestReReview: true }
        ]
    ];

    test.each(cases)('%s', (_name, status, expected) => {
        expect(getReviewDecisionButtonsState(status)).toEqual(expect.objectContaining(expected));
    });
});
