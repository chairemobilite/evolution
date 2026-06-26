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
    setReviewDecision: jest.fn(),
    setForceApprove: jest.fn(),
    requestReReview: jest.fn()
}));

const mockedReviewDecisionsDbQueries = reviewDecisionsDbQueries as jest.Mocked<typeof reviewDecisionsDbQueries>;

describe('ReviewDecisionService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('getReviewDecisions aggregates review decisions from the database', async () => {
        mockedReviewDecisionsDbQueries.getReviewDecisionsForInterview.mockResolvedValue([
            {
                objectType: 'person',
                objectUuid: 'person-uuid',
                userId: 1,
                decision: 'approve'
            }
        ]);

        const result = await ReviewDecisionService.getReviewDecisions(10, 1);

        expect(mockedReviewDecisionsDbQueries.getReviewDecisionsForInterview).toHaveBeenCalledWith(10);
        expect(result.reviewDecisions).toHaveLength(1);
        expect(result.reviewDecisionStatusByObject.persons['person-uuid']).toMatchObject({
            currentUserDecision: 'approve'
        });
    });

    test('setReviewDecisionAndGetReviewDecisions upserts then reloads review decisions', async () => {
        mockedReviewDecisionsDbQueries.setReviewDecision.mockResolvedValue({
            objectType: 'trip',
            objectUuid: 'trip-uuid',
            userId: 2,
            decision: 'reject'
        });
        mockedReviewDecisionsDbQueries.getReviewDecisionsForInterview.mockResolvedValue([
            {
                objectType: 'trip',
                objectUuid: 'trip-uuid',
                userId: 2,
                decision: 'reject'
            }
        ]);

        const result = await ReviewDecisionService.setReviewDecisionAndGetReviewDecisions(
            10,
            2,
            { objectType: 'trip', objectUuid: 'trip-uuid', decision: 'reject' },
            2
        );

        expect(mockedReviewDecisionsDbQueries.setReviewDecision).toHaveBeenCalledWith(10, 2, {
            objectType: 'trip',
            objectUuid: 'trip-uuid',
            decision: 'reject'
        });
        expect(result.reviewDecisionStatusByObject.trips['trip-uuid']).toMatchObject({
            rejectionCount: 1,
            currentUserDecision: 'reject'
        });
    });

    test('requestReReviewAndGetReviewDecisions flags every other reviewer of the object', async () => {
        // Review decisions by the requester (1) and on other objects must be ignored
        mockedReviewDecisionsDbQueries.getReviewDecisionsForInterview.mockResolvedValue([
            { objectType: 'person', objectUuid: 'person-uuid', userId: 2, decision: 'reject' },
            { objectType: 'person', objectUuid: 'person-uuid', userId: 3, decision: 'approve' },
            { objectType: 'person', objectUuid: 'person-uuid', userId: 1, decision: 'approve' },
            { objectType: 'trip', objectUuid: 'trip-uuid', userId: 4, decision: 'approve' }
        ]);
        mockedReviewDecisionsDbQueries.requestReReview.mockResolvedValue({
            objectType: 'person',
            objectUuid: 'person-uuid',
            userId: 2,
            decision: 'reject',
            reReviewRequested: true
        });

        await ReviewDecisionService.requestReReviewAndGetReviewDecisions(
            10,
            1,
            { objectType: 'person', objectUuid: 'person-uuid', reReviewRequestComment: 'please verify' },
            1
        );

        const expectedReviewDecision = {
            objectType: 'person',
            objectUuid: 'person-uuid',
            reReviewRequestComment: 'please verify'
        };
        expect(mockedReviewDecisionsDbQueries.requestReReview).toHaveBeenCalledTimes(2);
        expect(mockedReviewDecisionsDbQueries.requestReReview).toHaveBeenCalledWith(10, 2, 1, expectedReviewDecision);
        expect(mockedReviewDecisionsDbQueries.requestReReview).toHaveBeenCalledWith(10, 3, 1, expectedReviewDecision);
    });

    test('setForceApproveAndGetReviewDecisions upserts then reloads review decisions with force approve', async () => {
        mockedReviewDecisionsDbQueries.setForceApprove.mockResolvedValue({
            objectType: 'person',
            objectUuid: 'person-uuid',
            userId: 3,
            decision: 'reject',
            forceApproved: true,
            forceApproveComment: 'override'
        });
        mockedReviewDecisionsDbQueries.getReviewDecisionsForInterview.mockResolvedValue([
            { objectType: 'person', objectUuid: 'person-uuid', userId: 1, decision: 'approve' },
            {
                objectType: 'person',
                objectUuid: 'person-uuid',
                userId: 3,
                decision: 'reject',
                forceApproved: true,
                forceApproveComment: 'override'
            }
        ]);

        const result = await ReviewDecisionService.setForceApproveAndGetReviewDecisions(
            10,
            3,
            { objectType: 'person', objectUuid: 'person-uuid', forceApproveComment: 'override' },
            3
        );

        expect(mockedReviewDecisionsDbQueries.setForceApprove).toHaveBeenCalledWith(10, 3, {
            objectType: 'person',
            objectUuid: 'person-uuid',
            forceApproveComment: 'override'
        });
        expect(result.reviewDecisionStatusByObject.persons['person-uuid']).toMatchObject({
            hasConflict: true,
            isForceApproved: true,
            currentUserForceApproved: true,
            effectiveStatus: 'forceApproved'
        });
    });
});
