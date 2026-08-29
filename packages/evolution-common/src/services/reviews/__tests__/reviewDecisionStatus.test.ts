/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import {
    blocksApproval,
    getReviewDecisionEffectiveStatus,
    hasObjectBlockingInterviewApproval
} from '../reviewDecisionStatus';
import type {
    ReviewDecisionEffectiveStatus,
    ReviewDecisionStatusByObject,
    ReviewDecisionStatusForObject
} from '../types';
import type { SurveyObjectName } from '../../baseObjects/types';

// [title, approvalCount, rejectionCount, isForceApproved, expected]
const effectiveStatusCases: [string, number, number, boolean, ReviewDecisionEffectiveStatus][] = [
    ['force approve wins over conflict', 1, 1, true, 'forceApproved'],
    ['force approve wins over rejection', 0, 2, true, 'forceApproved'],
    ['conflict when reviewers disagree', 1, 1, false, 'conflict'],
    ['approved when only approvals', 2, 0, false, 'approved'],
    ['rejected when only rejections', 0, 2, false, 'rejected'],
    ['not reviewed when no decisions', 0, 0, false, 'notReviewed']
];

test.each(effectiveStatusCases)(
    'getReviewDecisionEffectiveStatus: %s',
    (_title, approvalCount, rejectionCount, isForceApproved, expected) => {
        expect(getReviewDecisionEffectiveStatus(approvalCount, rejectionCount, isForceApproved)).toBe(expected);
    }
);

// [effective status, blocks an approval]
const blocksApprovalCases: [ReviewDecisionEffectiveStatus, boolean][] = [
    ['rejected', true],
    ['conflict', true],
    ['approved', false],
    ['forceApproved', false],
    ['notReviewed', false]
];

test.each(blocksApprovalCases)('blocksApproval: %s', (effectiveStatus, expected) => {
    expect(blocksApproval(effectiveStatus)).toBe(expected);
});

const personUuid = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const householdUuid = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const interviewUuid = '11111111-1111-4111-8111-111111111111';

const statusOf = (
    objectType: SurveyObjectName,
    objectUuid: string,
    effectiveStatus: ReviewDecisionEffectiveStatus
): ReviewDecisionStatusForObject => ({
    objectType,
    objectUuid,
    approvalCount: 0,
    rejectionCount: 0,
    hasConflict: effectiveStatus === 'conflict',
    isForceApproved: effectiveStatus === 'forceApproved',
    effectiveStatus,
    reReviewRequestedUserIds: [],
    isReviewed: true
});

// [title, statuses by object, expected]
const blockingObjectCases: [string, ReviewDecisionStatusByObject | undefined, boolean][] = [
    ['no decision at all', undefined, false],
    [
        'only the interview is rejected',
        { interview: statusOf('interview', interviewUuid, 'rejected') } as unknown as ReviewDecisionStatusByObject,
        false
    ],
    [
        'a singleton object is rejected',
        { household: statusOf('household', householdUuid, 'rejected') } as unknown as ReviewDecisionStatusByObject,
        true
    ],
    [
        'a uuid-keyed object is in conflict',
        { persons: { [personUuid]: statusOf('person', personUuid, 'conflict') } } as unknown as ReviewDecisionStatusByObject,
        true
    ],
    [
        'every object is approved or force approved',
        {
            household: statusOf('household', householdUuid, 'forceApproved'),
            persons: { [personUuid]: statusOf('person', personUuid, 'approved') }
        } as unknown as ReviewDecisionStatusByObject,
        false
    ]
];

test.each(blockingObjectCases)('hasObjectBlockingInterviewApproval: %s', (_title, statuses, expected) => {
    expect(hasObjectBlockingInterviewApproval(statuses)).toBe(expected);
});
