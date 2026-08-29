/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import {
    buildReviewDecisions,
    computeReviewDecisionStatusForObject,
    reviewDecisionsArrayToReviewDecisionsByObject
} from '../ReviewDecisionUtils';
import type { ReviewDecision } from 'evolution-common/lib/services/reviews/types';

const personUuid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const tripUuid = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const interviewUuid = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const householdUuid = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const homeUuid = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

const reviewDecisions: ReviewDecision[] = [
    { objectType: 'person', objectUuid: personUuid, userId: 1, decision: 'approve' },
    { objectType: 'person', objectUuid: personUuid, userId: 2, decision: 'reject' },
    { objectType: 'trip', objectUuid: tripUuid, userId: 1, decision: 'approve' }
];

describe('ReviewDecisionUtils', () => {
    test('reviewDecisionsArrayToReviewDecisionsByObject groups review decisions by object type and uuid', () => {
        const grouped = reviewDecisionsArrayToReviewDecisionsByObject(reviewDecisions);

        expect(grouped.persons[personUuid]).toHaveLength(2);
        expect(grouped.trips[tripUuid]).toHaveLength(1);
        expect(grouped.household).toHaveLength(0);
    });

    test('reviewDecisionsArrayToReviewDecisionsByObject uses null-prototype uuid buckets', () => {
        const grouped = reviewDecisionsArrayToReviewDecisionsByObject([
            { objectType: 'person', objectUuid: '__proto__', userId: 1, decision: 'approve' }
        ]);

        expect(Object.getPrototypeOf(grouped.persons)).toBeNull();
        expect(grouped.persons['__proto__']).toHaveLength(1);
    });

    test.each([
        ['reviewDecisionsArrayToReviewDecisionsByObject', () =>
            reviewDecisionsArrayToReviewDecisionsByObject([
                {
                    objectType: 'unsupportedType' as ReviewDecision['objectType'],
                    objectUuid: personUuid,
                    userId: 1,
                    decision: 'approve'
                }
            ])],
        ['buildReviewDecisions', () =>
            buildReviewDecisions([
                {
                    objectType: 'unsupportedType' as ReviewDecision['objectType'],
                    objectUuid: personUuid,
                    userId: 1,
                    decision: 'approve'
                }
            ])]
    ])('%s throws on unsupported objectType', (_label, run) => {
        expect(run).toThrow('Unknown review object type: unsupportedType');
    });

    it.each([
        ['reviewDecisionsArrayToReviewDecisionsByObject', 'constructor'],
        ['reviewDecisionsArrayToReviewDecisionsByObject', 'toString'],
        ['buildReviewDecisions', 'constructor'],
        ['buildReviewDecisions', 'toString']
    ] as const)('%s throws on inherited objectType %s', (label, objectType) => {
        const reviewDecision = {
            objectType: objectType as ReviewDecision['objectType'],
            objectUuid: personUuid,
            userId: 1,
            decision: 'approve' as const
        };
        const run =
            label === 'buildReviewDecisions'
                ? () => buildReviewDecisions([reviewDecision])
                : () => reviewDecisionsArrayToReviewDecisionsByObject([reviewDecision]);
        expect(run).toThrow(`Unknown review object type: ${objectType}`);
    });

    const additionalObjectTypeCases: [ReviewDecision['objectType'], keyof ReturnType<typeof reviewDecisionsArrayToReviewDecisionsByObject>][] = [
        ['organization', 'organizations'],
        ['vehicle', 'vehicles'],
        ['tripChain', 'tripChains'],
        ['junction', 'junctions'],
        ['workPlace', 'workPlaces'],
        ['schoolPlace', 'schoolPlaces']
    ];

    it.each(additionalObjectTypeCases)(
        'reviewDecisionsArrayToReviewDecisionsByObject groups %s review decisions',
        (objectType, collectionKey) => {
            const objectUuid = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
            const grouped = reviewDecisionsArrayToReviewDecisionsByObject([
                { objectType, objectUuid, userId: 1, decision: 'approve' }
            ]);

            expect(grouped[collectionKey][objectUuid]).toHaveLength(1);
        }
    );

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

    test('current user id 0 is a valid reviewer', () => {
        const reviewDecisionsWithUser0: ReviewDecision[] = [
            { objectType: 'person', objectUuid: personUuid, userId: 0, decision: 'approve', forceApproved: true }
        ];

        const status = computeReviewDecisionStatusForObject(reviewDecisionsWithUser0, 'person', personUuid, 0);

        expect(status).toMatchObject({
            currentUserDecision: 'approve',
            currentUserForceApproved: true,
            approvalCount: 0,
            rejectionCount: 0,
            isForceApproved: true,
            effectiveStatus: 'forceApproved',
            isReviewed: false
        });
    });

    test('force-approve-only object has no reviewer votes', () => {
        const reviewDecisionsWithForceOnly: ReviewDecision[] = [
            {
                objectType: 'person',
                objectUuid: personUuid,
                userId: 3,
                decision: 'approve',
                forceApproved: true,
                forceApproveComment: 'admin override'
            }
        ];

        const status = computeReviewDecisionStatusForObject(reviewDecisionsWithForceOnly, 'person', personUuid, 3);

        expect(status).toMatchObject({
            approvalCount: 0,
            rejectionCount: 0,
            isForceApproved: true,
            effectiveStatus: 'forceApproved',
            isReviewed: false
        });
    });

    test('flags reviewers asked to re-review an object', () => {
        const reviewDecisionsWithReReview: ReviewDecision[] = [
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

        const status = computeReviewDecisionStatusForObject(reviewDecisionsWithReReview, 'person', personUuid, 2);

        expect(status).toMatchObject({
            rejectionCount: 1,
            reReviewRequestedOfCurrentUser: true,
            reReviewRequestedUserIds: [2]
        });
    });

    // reReviewRequestedByCurrentUser is true only for the user who initiated the request,
    // not for the reviewers being asked (reReviewRequestedOfCurrentUser) or bystanders.
    test.each([
        ['the requester', 3, true],
        ['the asked reviewer', 2, false],
        ['a bystander reviewer', 4, false]
    ] as const)('reReviewRequestedByCurrentUser is %s-specific (user %i → %s)', (_label, currentUserId, expected) => {
        const reviewDecisionsWithReReview: ReviewDecision[] = [
            {
                objectType: 'person',
                objectUuid: personUuid,
                userId: 2,
                decision: 'reject',
                reReviewRequested: true,
                reReviewRequestedByUserId: 3
            }
        ];

        const status = computeReviewDecisionStatusForObject(
            reviewDecisionsWithReReview,
            'person',
            personUuid,
            currentUserId
        );

        expect(status.reReviewRequestedByCurrentUser).toBe(expected);
    });

    test.each([
        ['interview', interviewUuid, 'interview'],
        ['household', householdUuid, 'household'],
        ['home', homeUuid, 'home']
    ] as const)(
        'buildReviewDecisions stores singleton %s status',
        (objectType, objectUuid, expectedKey) => {
            const singletonDecisions: ReviewDecision[] = [
                { objectType, objectUuid, userId: 1, decision: 'approve' }
            ];
            const grouped = reviewDecisionsArrayToReviewDecisionsByObject(singletonDecisions);
            const statusByObject = buildReviewDecisions(singletonDecisions).reviewDecisionStatusByObject;

            expect(grouped[expectedKey]).toHaveLength(1);
            expect(statusByObject[expectedKey]).toMatchObject({
                objectType,
                objectUuid,
                approvalCount: 1,
                effectiveStatus: 'approved'
            });
        }
    );

    test('buildReviewDecisions returns grouped review decisions and status', () => {
        const payload = buildReviewDecisions(reviewDecisions, 1);

        expect(payload.reviewDecisions).toEqual(reviewDecisions);
        expect(payload.reviewDecisionsByObject.persons[personUuid]).toHaveLength(2);
        expect(payload.reviewDecisionStatusByObject.persons[personUuid]).toMatchObject({
            hasConflict: true,
            currentUserDecision: 'approve',
            effectiveStatus: 'conflict'
        });
        expect(payload.reviewDecisionStatusByObject.trips[tripUuid]).toMatchObject({
            approvalCount: 1,
            rejectionCount: 0,
            hasConflict: false,
            effectiveStatus: 'approved'
        });
    });

    test('buildReviewDecisions groups objects with dots in objectUuid', () => {
        const dottedObjectUuid = 'legacy.id.with.dots';
        const reviewDecisionsWithDottedUuid: ReviewDecision[] = [
            { objectType: 'person', objectUuid: dottedObjectUuid, userId: 1, decision: 'approve' },
            { objectType: 'person', objectUuid: dottedObjectUuid, userId: 2, decision: 'reject' }
        ];

        const statusByObject = buildReviewDecisions(reviewDecisionsWithDottedUuid).reviewDecisionStatusByObject;

        expect(statusByObject.persons[dottedObjectUuid]).toMatchObject({
            objectType: 'person',
            objectUuid: dottedObjectUuid,
            hasConflict: true,
            effectiveStatus: 'conflict'
        });
        expect(Object.getPrototypeOf(statusByObject.persons)).toBeNull();
    });

    test('picks the first force-approve row (decisions are sorted newest first by the db query)', () => {
        const reviewDecisionsWithForce: ReviewDecision[] = [
            {
                objectType: 'person',
                objectUuid: personUuid,
                userId: 2,
                decision: 'approve',
                forceApproved: true,
                forceApproveComment: 'newer override',
                updatedAt: '2024-06-01T14:00:00+00:00' // 14:00 UTC, newer than the row below (13:00 UTC)
            },
            {
                objectType: 'person',
                objectUuid: personUuid,
                userId: 1,
                decision: 'approve',
                forceApproved: true,
                forceApproveComment: 'older override',
                updatedAt: '2024-06-01T18:00:00+05:00' // 18:00 UTC+5 = 13:00 UTC, older despite the later local time
            }
        ];

        const status = computeReviewDecisionStatusForObject(reviewDecisionsWithForce, 'person', personUuid);

        expect(status).toMatchObject({
            isForceApproved: true,
            forceApprovedByUserId: 2,
            forceApproveComment: 'newer override'
        });
    });

    test('picks the first force-approve row when updatedAt is missing (stable insertion order)', () => {
        const reviewDecisionsWithForce: ReviewDecision[] = [
            {
                objectType: 'person',
                objectUuid: personUuid,
                userId: 1,
                decision: 'approve',
                forceApproved: true,
                forceApproveComment: 'first override'
            },
            {
                objectType: 'person',
                objectUuid: personUuid,
                userId: 2,
                decision: 'approve',
                forceApproved: true,
                forceApproveComment: 'second override'
            }
        ];

        const status = computeReviewDecisionStatusForObject(reviewDecisionsWithForce, 'person', personUuid);

        expect(status).toMatchObject({
            isForceApproved: true,
            forceApprovedByUserId: 1,
            forceApproveComment: 'first override'
        });
    });

    test('force approve on admin row overrides conflict but keeps their decision', () => {
        const reviewDecisionsWithForce: ReviewDecision[] = [
            { objectType: 'person', objectUuid: personUuid, userId: 1, decision: 'approve' },
            { objectType: 'person', objectUuid: personUuid, userId: 2, decision: 'reject' },
            {
                objectType: 'person',
                objectUuid: personUuid,
                userId: 3,
                decision: 'reject',
                forceApproved: true,
                forceApproveComment: 'admin override'
            }
        ];
        const status = computeReviewDecisionStatusForObject(reviewDecisionsWithForce, 'person', personUuid, 3);

        expect(status).toMatchObject({
            approvalCount: 1,
            rejectionCount: 1,
            hasConflict: true,
            isForceApproved: true,
            forceApprovedByUserId: 3,
            forceApproveComment: 'admin override',
            currentUserDecision: 'reject',
            currentUserForceApproved: true,
            effectiveStatus: 'forceApproved'
        });
    });
});
