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
    clearReviewDecision: jest.fn(),
    clearForceApprove: jest.fn(),
    setForceApproveWhenApprovalBlocked: jest.fn(),
    requestReReviewFromOtherReviewers: jest.fn()
}));

const mockedReviewDecisionsDbQueries = reviewDecisionsDbQueries as jest.Mocked<typeof reviewDecisionsDbQueries>;

describe('ReviewDecisionService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('getReviewDecisions builds the review decisions payload from the database rows', async () => {
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

    test('setReviewDecision upserts then reloads review decisions', async () => {
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

        const result = await ReviewDecisionService.setReviewDecision(10, 2, {
            objectType: 'trip',
            objectUuid: 'trip-uuid',
            decision: 'reject'
        });

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

    test('requestReReview flags every other reviewer of the object', async () => {
        mockedReviewDecisionsDbQueries.requestReReviewFromOtherReviewers.mockResolvedValue(undefined);
        mockedReviewDecisionsDbQueries.getReviewDecisionsForInterview.mockResolvedValue([]);

        await ReviewDecisionService.requestReReview(10, 1, {
            objectType: 'person',
            objectUuid: 'person-uuid',
            reReviewRequestComment: 'please verify'
        });

        const expectedReviewDecision = {
            objectType: 'person',
            objectUuid: 'person-uuid',
            reReviewRequestComment: 'please verify'
        };
        expect(mockedReviewDecisionsDbQueries.requestReReviewFromOtherReviewers).toHaveBeenCalledTimes(1);
        expect(mockedReviewDecisionsDbQueries.requestReReviewFromOtherReviewers).toHaveBeenCalledWith(
            10,
            1,
            expectedReviewDecision
        );
        expect(mockedReviewDecisionsDbQueries.getReviewDecisionsForInterview).toHaveBeenCalledTimes(1);
    });

    test('setForceApprove upserts then reloads review decisions with force approve', async () => {
        mockedReviewDecisionsDbQueries.setForceApproveWhenApprovalBlocked.mockResolvedValue({
            objectType: 'person',
            objectUuid: 'person-uuid',
            userId: 3,
            decision: 'reject',
            forceApproved: true,
            forceApproveComment: 'override'
        });
        mockedReviewDecisionsDbQueries.getReviewDecisionsForInterview.mockResolvedValue([
            { objectType: 'person', objectUuid: 'person-uuid', userId: 1, decision: 'approve' },
            { objectType: 'person', objectUuid: 'person-uuid', userId: 2, decision: 'reject' },
            {
                objectType: 'person',
                objectUuid: 'person-uuid',
                userId: 3,
                decision: 'reject',
                forceApproved: true,
                forceApproveComment: 'override'
            }
        ]);

        const result = await ReviewDecisionService.setForceApprove(10, 3, {
            objectType: 'person',
            objectUuid: 'person-uuid',
            forceApproveComment: 'override'
        });

        expect(mockedReviewDecisionsDbQueries.setForceApproveWhenApprovalBlocked).toHaveBeenCalledWith(10, 3, {
            objectType: 'person',
            objectUuid: 'person-uuid',
            forceApproveComment: 'override'
        });
        expect(mockedReviewDecisionsDbQueries.getReviewDecisionsForInterview).toHaveBeenCalledTimes(1);
        expect(result.reviewDecisionStatusByObject.persons['person-uuid']).toMatchObject({
            hasConflict: true,
            isForceApproved: true,
            currentUserForceApproved: true,
            effectiveStatus: 'forceApproved'
        });
    });

    test('setForceApprove allows admin without a prior decision when reviewers conflict', async () => {
        mockedReviewDecisionsDbQueries.setForceApproveWhenApprovalBlocked.mockResolvedValue({
            objectType: 'person',
            objectUuid: 'person-uuid',
            userId: 3,
            decision: 'approve',
            forceApproved: true,
            forceApproveComment: 'override'
        });
        mockedReviewDecisionsDbQueries.getReviewDecisionsForInterview.mockResolvedValue([
            { objectType: 'person', objectUuid: 'person-uuid', userId: 1, decision: 'approve' },
            { objectType: 'person', objectUuid: 'person-uuid', userId: 2, decision: 'reject' },
            {
                objectType: 'person',
                objectUuid: 'person-uuid',
                userId: 3,
                decision: 'approve',
                forceApproved: true,
                forceApproveComment: 'override'
            }
        ]);

        const result = await ReviewDecisionService.setForceApprove(10, 3, {
            objectType: 'person',
            objectUuid: 'person-uuid',
            forceApproveComment: 'override'
        });

        expect(mockedReviewDecisionsDbQueries.setForceApproveWhenApprovalBlocked).toHaveBeenCalledWith(10, 3, {
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

    test('setForceApprove rejects when reviewers agree', async () => {
        mockedReviewDecisionsDbQueries.setForceApproveWhenApprovalBlocked.mockRejectedValue(
            new Error('Cannot force-approve person/person-uuid without reviewer conflict')
        );

        await expect(
            ReviewDecisionService.setForceApprove(10, 3, {
                objectType: 'person',
                objectUuid: 'person-uuid',
                forceApproveComment: 'override'
            })
        ).rejects.toThrow('Cannot force-approve person/person-uuid without reviewer conflict');
    });

    test('clearReviewDecision clears then reloads review decisions', async () => {
        mockedReviewDecisionsDbQueries.getReviewDecisionsForInterview.mockResolvedValue([]);

        const result = await ReviewDecisionService.clearReviewDecision(10, 2, {
            objectType: 'trip',
            objectUuid: 'trip-uuid'
        });

        expect(mockedReviewDecisionsDbQueries.clearReviewDecision).toHaveBeenCalledWith(10, 2, {
            objectType: 'trip',
            objectUuid: 'trip-uuid'
        });
        expect(result.reviewDecisions).toEqual([]);
    });

    test('clearForceApprove clears force-approve then reloads review decisions', async () => {
        mockedReviewDecisionsDbQueries.getReviewDecisionsForInterview.mockResolvedValue([
            {
                objectType: 'person',
                objectUuid: 'person-uuid',
                userId: 3,
                decision: 'reject',
                forceApproved: false
            }
        ]);

        const result = await ReviewDecisionService.clearForceApprove(10, 3, {
            objectType: 'person',
            objectUuid: 'person-uuid'
        });

        expect(mockedReviewDecisionsDbQueries.clearForceApprove).toHaveBeenCalledWith(10, 3, {
            objectType: 'person',
            objectUuid: 'person-uuid'
        });
        expect(result.reviewDecisions[0]).toMatchObject({ forceApproved: false });
    });
});
