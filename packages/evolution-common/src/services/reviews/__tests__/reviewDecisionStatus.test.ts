/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { blocksApproval, getReviewDecisionEffectiveStatus } from '../reviewDecisionStatus';
import type { ReviewDecisionEffectiveStatus } from '../types';

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

// [effective status, blocks a force approve]
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
