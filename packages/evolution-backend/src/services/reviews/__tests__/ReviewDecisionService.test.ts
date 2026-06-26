/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { ReviewDecisionService } from '../ReviewDecisionService';
import reviewDecisionsDbQueries from '../../../models/reviewDecisions.db.queries';

jest.mock('../../../models/reviewDecisions.db.queries', () => ({
    getReviewDecisionsForInterview: jest.fn(),
    setReview: jest.fn()
}));

const mockedReviewsDbQueries = reviewDecisionsDbQueries as jest.Mocked<typeof reviewDecisionsDbQueries>;

describe('ReviewDecisionService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('getInterviewReview aggregates reviewDecisions from the database', async () => {
        mockedReviewsDbQueries.getReviewDecisionsForInterview.mockResolvedValue([
            {
                objectType: 'person',
                objectUuid: 'person-uuid',
                userId: 1,
                decision: 'approve'
            }
        ]);

        const result = await ReviewDecisionService.getInterviewReview(10, 1);

        expect(mockedReviewsDbQueries.getReviewDecisionsForInterview).toHaveBeenCalledWith(10);
        expect(result.reviewDecisions).toHaveLength(1);
        expect(result.reviewDecisionStatusByObject.persons['person-uuid']).toMatchObject({
            currentUserDecision: 'approve'
        });
    });

    test('setReviewAndGetInterviewReview upserts then reloads reviewDecisions', async () => {
        mockedReviewsDbQueries.setReviewDecision.mockResolvedValue({
            objectType: 'trip',
            objectUuid: 'trip-uuid',
            userId: 2,
            decision: 'reject'
        });
        mockedReviewsDbQueries.getReviewDecisionsForInterview.mockResolvedValue([
            {
                objectType: 'trip',
                objectUuid: 'trip-uuid',
                userId: 2,
                decision: 'reject'
            }
        ]);

        const result = await ReviewDecisionService.setReviewDecisionAndGetInterviewReview(
            10,
            2,
            { objectType: 'trip', objectUuid: 'trip-uuid', decision: 'reject' },
            2
        );

        expect(mockedReviewsDbQueries.setReviewDecision).toHaveBeenCalledWith(10, 2, {
            objectType: 'trip',
            objectUuid: 'trip-uuid',
            decision: 'reject'
        });
        expect(result.reviewDecisionStatusByObject.trips['trip-uuid']).toMatchObject({
            rejectionCount: 1,
            currentUserDecision: 'reject'
        });
    });
});
