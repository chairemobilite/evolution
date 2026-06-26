/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import { v4 as uuidV4 } from 'uuid';
import { create, truncate } from 'chaire-lib-backend/lib/models/db/default.db.queries';

import dbQueries from '../reviewDecisions.db.queries';
import interviewsDbQueries from '../interviews.db.queries';

const localParticipant = {
    id: 1,
    email: 'test@transition.city',
    is_valid: true
};

const reviewer1 = {
    id: 1,
    email: 'reviewer1@transition.city',
    is_valid: true,
    uuid: uuidV4()
};

const reviewer2 = {
    id: 2,
    email: 'reviewer2@transition.city',
    is_valid: true,
    uuid: uuidV4()
};

const localUserInterviewAttributes = {
    id: 1,
    uuid: uuidV4(),
    participant_id: localParticipant.id,
    is_valid: false,
    is_active: true,
    is_completed: undefined,
    response: {
        accessCode: '11111'
    },
    validations: {}
};

const personUuid = uuidV4();

beforeAll(async () => {
    jest.setTimeout(10000);
    await truncate(knex, 'sv_reviews');
    await truncate(knex, 'sv_interviews');
    await truncate(knex, 'users');
    await truncate(knex, 'sv_participants');
    await create(knex, 'sv_participants', undefined, localParticipant as any);
    await create(knex, 'users', undefined, reviewer1 as any);
    await create(knex, 'users', undefined, reviewer2 as any);
    await interviewsDbQueries.create(localUserInterviewAttributes as any);
});

afterAll(async () => {
    await truncate(knex, 'sv_reviews');
    await truncate(knex, 'sv_interviews');
    await truncate(knex, 'users');
    await truncate(knex, 'sv_participants');
    await knex.destroy();
});

describe('setReviewDecision and getReviewDecisionsForInterview', () => {
    beforeEach(async () => {
        await dbQueries.deleteReviewDecisionsForInterview(localUserInterviewAttributes.id);
    });

    test('setReviewDecision inserts a reviewer decision', async () => {
        const review = await dbQueries.setReviewDecision(localUserInterviewAttributes.id, reviewer1.id, {
            objectType: 'person',
            objectUuid: personUuid,
            decision: 'approve'
        });

        expect(review).toMatchObject({
            objectType: 'person',
            objectUuid: personUuid,
            userId: reviewer1.id,
            decision: 'approve'
        });
    });

    test('different reviewers can approve and reject the same object', async () => {
        await dbQueries.setReviewDecision(localUserInterviewAttributes.id, reviewer1.id, {
            objectType: 'person',
            objectUuid: personUuid,
            decision: 'approve'
        });
        await dbQueries.setReviewDecision(localUserInterviewAttributes.id, reviewer2.id, {
            objectType: 'person',
            objectUuid: personUuid,
            decision: 'reject'
        });

        const reviews = await dbQueries.getReviewDecisionsForInterview(localUserInterviewAttributes.id);
        expect(reviews).toHaveLength(2);
        expect(reviews.find((review) => review.userId === reviewer1.id)?.decision).toBe('approve');
        expect(reviews.find((review) => review.userId === reviewer2.id)?.decision).toBe('reject');
    });

    test('setReviewDecision upserts the decision for the same reviewer and object', async () => {
        await dbQueries.setReviewDecision(localUserInterviewAttributes.id, reviewer1.id, {
            objectType: 'person',
            objectUuid: personUuid,
            decision: 'approve'
        });

        await dbQueries.setReviewDecision(localUserInterviewAttributes.id, reviewer1.id, {
            objectType: 'person',
            objectUuid: personUuid,
            decision: 'reject',
            comment: 'needs correction'
        });

        const reviews = await dbQueries.getReviewDecisionsForInterview(localUserInterviewAttributes.id);
        expect(reviews).toHaveLength(1);
        expect(reviews[0]).toMatchObject({
            userId: reviewer1.id,
            decision: 'reject',
            comment: 'needs correction'
        });
    });

    test('getReviewDecisionsForInterview returns decisions from multiple reviewers', async () => {
        await dbQueries.setReviewDecision(localUserInterviewAttributes.id, reviewer1.id, {
            objectType: 'person',
            objectUuid: personUuid,
            decision: 'reject'
        });
        await dbQueries.setReviewDecision(localUserInterviewAttributes.id, reviewer2.id, {
            objectType: 'person',
            objectUuid: personUuid,
            decision: 'approve'
        });

        const reviews = await dbQueries.getReviewDecisionsForInterview(localUserInterviewAttributes.id);
        expect(reviews).toHaveLength(2);
        expect(reviews.map((review) => review.userId).sort()).toEqual([reviewer1.id, reviewer2.id]);
    });

    test('deleteReviewDecisionsForInterview removes all rows for the interview', async () => {
        await dbQueries.setReviewDecision(localUserInterviewAttributes.id, reviewer1.id, {
            objectType: 'person',
            objectUuid: personUuid,
            decision: 'approve'
        });

        await dbQueries.deleteReviewDecisionsForInterview(localUserInterviewAttributes.id);
        const reviews = await dbQueries.getReviewDecisionsForInterview(localUserInterviewAttributes.id);
        expect(reviews).toHaveLength(0);
    });
});

describe('requestReReview', () => {
    const reReviewPersonUuid = uuidV4();

    beforeEach(async () => {
        await dbQueries.deleteReviewDecisionsForInterview(localUserInterviewAttributes.id);
        await dbQueries.setReviewDecision(localUserInterviewAttributes.id, reviewer2.id, {
            objectType: 'person',
            objectUuid: reReviewPersonUuid,
            decision: 'reject',
            comment: 'fix household size'
        });
    });

    test('flags an existing reviewer to look at the object again', async () => {
        const review = await dbQueries.requestReReview(
            localUserInterviewAttributes.id,
            reviewer2.id,
            reviewer1.id,
            {
                objectType: 'person',
                objectUuid: reReviewPersonUuid,
                reReviewRequestComment: 'size was corrected'
            }
        );

        expect(review).toMatchObject({
            userId: reviewer2.id,
            decision: 'reject',
            comment: 'fix household size',
            reReviewRequested: true,
            reReviewRequestedByUserId: reviewer1.id,
            reReviewRequestComment: 'size was corrected'
        });
    });

    test('clears the re-review flag when the reviewer submits a new decision', async () => {
        await dbQueries.requestReReview(localUserInterviewAttributes.id, reviewer2.id, reviewer1.id, {
            objectType: 'person',
            objectUuid: reReviewPersonUuid,
            reReviewRequestComment: 'please verify'
        });

        const updatedReview = await dbQueries.setReviewDecision(localUserInterviewAttributes.id, reviewer2.id, {
            objectType: 'person',
            objectUuid: reReviewPersonUuid,
            decision: 'approve',
            comment: 'looks good now'
        });

        expect(updatedReview).toMatchObject({
            decision: 'approve',
            comment: 'looks good now',
            reReviewRequested: false
        });
    });

    test('fails when the target reviewer has no existing decision', async () => {
        await expect(
            dbQueries.requestReReview(localUserInterviewAttributes.id, reviewer1.id, reviewer2.id, {
                objectType: 'person',
                objectUuid: reReviewPersonUuid
            })
        ).rejects.toThrow();
    });
});

describe('setForceApprove', () => {
    const forcePersonUuid = uuidV4();

    beforeEach(async () => {
        await dbQueries.deleteReviewDecisionsForInterview(localUserInterviewAttributes.id);
    });

    test('sets force_approved on the admin row while preserving reject decision', async () => {
        await dbQueries.setReviewDecision(localUserInterviewAttributes.id, reviewer1.id, {
            objectType: 'person',
            objectUuid: forcePersonUuid,
            decision: 'reject',
            comment: 'needs work'
        });

        const review = await dbQueries.setForceApprove(localUserInterviewAttributes.id, reviewer1.id, {
            objectType: 'person',
            objectUuid: forcePersonUuid,
            forceApproveComment: 'overriding anyway'
        });

        expect(review).toMatchObject({
            userId: reviewer1.id,
            decision: 'reject',
            comment: 'needs work',
            forceApproved: true,
            forceApproveComment: 'overriding anyway'
        });
    });

    test('creates an approve row when admin force-approves without a prior decision', async () => {
        const review = await dbQueries.setForceApprove(localUserInterviewAttributes.id, reviewer1.id, {
            objectType: 'person',
            objectUuid: forcePersonUuid
        });

        expect(review).toMatchObject({
            decision: 'approve',
            forceApproved: true
        });
    });

    test('setReviewDecision does not clear force_approved on the same row', async () => {
        await dbQueries.setForceApprove(localUserInterviewAttributes.id, reviewer1.id, {
            objectType: 'person',
            objectUuid: forcePersonUuid,
            forceApproveComment: 'forced'
        });

        const updatedReview = await dbQueries.setReviewDecision(localUserInterviewAttributes.id, reviewer1.id, {
            objectType: 'person',
            objectUuid: forcePersonUuid,
            decision: 'approve',
            comment: 'looks good'
        });

        expect(updatedReview).toMatchObject({
            decision: 'approve',
            comment: 'looks good',
            forceApproved: true,
            forceApproveComment: 'forced'
        });
    });
});
