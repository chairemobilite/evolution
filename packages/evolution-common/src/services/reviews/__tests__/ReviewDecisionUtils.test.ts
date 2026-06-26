/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import {
    buildInterviewReview,
    computeReviewDecisionStatusForObject,
    reviewDecisionsArrayToReviewDecisionsByObject
} from '../ReviewDecisionUtils';
import type { ReviewDecision } from '../types';

const personUuid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const tripUuid = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const reviewDecisions: ReviewDecision[] = [
    { objectType: 'person', objectUuid: personUuid, userId: 1, decision: 'approve' },
    { objectType: 'person', objectUuid: personUuid, userId: 2, decision: 'reject' },
    { objectType: 'trip', objectUuid: tripUuid, userId: 1, decision: 'approve' }
];

describe('ReviewDecisionUtils', () => {
    test('reviewDecisionsArrayToReviewDecisionsByObject groups reviewDecisions by object type and uuid', () => {
        const grouped = reviewDecisionsArrayToReviewDecisionsByObject(reviewDecisions);

        expect(grouped.persons[personUuid]).toHaveLength(2);
        expect(grouped.trips[tripUuid]).toHaveLength(1);
        expect(grouped.household).toHaveLength(0);
    });

    test('different reviewers can approve and reject the same object', () => {
        const status = computeReviewDecisionStatusForObject(reviewDecisions, 'person', personUuid);

        expect(status).toMatchObject({
            approvalCount: 1,
            rejectionCount: 1,
            hasConflict: true,
            isReviewed: true
        });
    });

    // [title, currentUserId, expectedConflict, expectedCurrentDecision, expectedIsReviewed]
    const statusCases: [string, number | undefined, boolean, 'approve' | 'reject' | undefined, boolean][] = [
        ['conflict when reviewers disagree', 1, true, 'approve', true],
        ['current user decision for second reviewer', 2, true, 'reject', true],
        ['no current user decision when user id omitted', undefined, true, undefined, true],
        ['unknown user has no current decision', 99, true, undefined, true]
    ];

    it.each(statusCases)('%s', (_title, currentUserId, expectedConflict, expectedCurrentDecision, expectedIsReviewed) => {
        const status = computeReviewDecisionStatusForObject(reviewDecisions, 'person', personUuid, currentUserId);

        expect(status).toMatchObject({
            objectType: 'person',
            objectUuid: personUuid,
            approvalCount: 1,
            rejectionCount: 1,
            hasConflict: expectedConflict,
            currentUserDecision: expectedCurrentDecision,
            isReviewed: expectedIsReviewed
        });
    });

    test('flags reviewers asked to re-review an object', () => {
        const reviewsWithReReview: ReviewDecision[] = [
            {
                objectType: 'person',
                objectUuid: personUuid,
                userId: 2,
                decision: 'reject',
                comment: 'fix age',
                reReviewRequested: true,
                reReviewRequestedByUserId: 3,
                reReviewRequestComment: 'age was corrected'
            }
        ];

        const status = computeReviewDecisionStatusForObject(reviewsWithReReview, 'person', personUuid, 2);

        expect(status).toMatchObject({
            rejectionCount: 1,
            currentUserReReviewRequested: true,
            reReviewRequestedUserIds: [2]
        });
    });

    test('buildInterviewReview returns grouped reviewDecisions and status', () => {
        const payload = buildInterviewReview(reviewDecisions, 1);

        expect(payload.reviewDecisions).toEqual(reviewDecisions);
        expect(payload.reviewDecisionsByObject.persons[personUuid]).toHaveLength(2);
        expect(payload.reviewDecisionStatusByObject.persons[personUuid]).toMatchObject({
            hasConflict: true,
            currentUserDecision: 'approve'
        });
        expect(payload.reviewDecisionStatusByObject.trips[tripUuid]).toMatchObject({
            approvalCount: 1,
            rejectionCount: 0,
            hasConflict: false
        });
    });
});
