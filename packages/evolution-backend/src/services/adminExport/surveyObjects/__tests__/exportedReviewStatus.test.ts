/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { getExportedReviewStatus } from '../exportedReviewStatus';

describe('getExportedReviewStatus', () => {
    test.each([
        { status: 'notReviewed', parentStatus: undefined, expected: 'notReviewed' },
        { status: 'notReviewed', parentStatus: 'notReviewed', expected: 'notReviewed' },
        { status: 'notReviewed', parentStatus: 'approved', expected: 'approved' },
        { status: 'notReviewed', parentStatus: 'forceApproved', expected: 'forceApproved' },
        { status: 'notReviewed', parentStatus: 'rejected', expected: 'rejected' },
        { status: 'notReviewed', parentStatus: 'conflict', expected: 'notReviewed' },
        { status: 'rejected', parentStatus: 'approved', expected: 'rejected' },
        { status: 'conflict', parentStatus: 'approved', expected: 'conflict' },
        { status: 'approved', parentStatus: 'rejected', expected: 'approved' },
        { status: 'forceApproved', parentStatus: undefined, expected: 'forceApproved' }
    ] as const)('$status with parent $parentStatus: $expected', ({ status, parentStatus, expected }) => {
        expect(getExportedReviewStatus(status, parentStatus)).toEqual(expected);
    });
});
