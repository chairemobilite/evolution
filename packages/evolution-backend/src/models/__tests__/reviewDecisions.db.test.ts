/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import { v4 as uuidV4 } from 'uuid';
import { create } from 'chaire-lib-backend/lib/models/db/default.db.queries';

import dbQueries from '../reviewDecisions.db.queries';
import interviewsDbQueries from '../interviews.db.queries';

const testFixtureSuffix = uuidV4();
const personUuid = uuidV4();

let participantId: number;
let reviewer1Id: number;
let reviewer2Id: number;
let interviewId: number;
const extraUserIds: number[] = [];

beforeAll(async () => {
    jest.setTimeout(10000);
    participantId = (await create(knex, 'sv_participants', undefined, {
        email: `review-decisions-participant-${testFixtureSuffix}@test.local`,
        is_valid: true
    } as any)) as number;
    reviewer1Id = (await create(knex, 'users', undefined, {
        email: `review-decisions-reviewer1-${testFixtureSuffix}@test.local`,
        is_valid: true,
        uuid: uuidV4()
    } as any)) as number;
    reviewer2Id = (await create(knex, 'users', undefined, {
        email: `review-decisions-reviewer2-${testFixtureSuffix}@test.local`,
        is_valid: true,
        uuid: uuidV4()
    } as any)) as number;
    const createdInterview = await interviewsDbQueries.create({
        uuid: uuidV4(),
        participant_id: participantId,
        is_valid: false,
        is_active: true,
        response: {
            accessCode: '11111'
        },
        validations: {}
    } as any);
    interviewId = createdInterview.id as number;
});

afterAll(async () => {
    // We need to keep knex.destroy() at the end of the test to ensure that the database is closed and the test can exit.
    await dbQueries.deleteReviewDecisionsForInterview(interviewId);
    await knex('sv_interviews').where('id', interviewId).del();
    await knex('users').whereIn('id', [reviewer1Id, reviewer2Id, ...extraUserIds]).del();
    await knex('sv_participants').where('id', participantId).del();
    await knex.destroy();
});

describe('setReviewDecision and getReviewDecisionsForInterview', () => {
    beforeEach(async () => {
        await dbQueries.deleteReviewDecisionsForInterview(interviewId);
    });

    test('setReviewDecision inserts a reviewer decision', async () => {
        const review = await dbQueries.setReviewDecision(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: personUuid,
            decision: 'approve'
        });

        expect(review).toMatchObject({
            objectType: 'person',
            objectUuid: personUuid,
            userId: reviewer1Id,
            decision: 'approve'
        });
    });

    test('different reviewers can approve and reject the same object', async () => {
        await dbQueries.setReviewDecision(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: personUuid,
            decision: 'approve'
        });
        await dbQueries.setReviewDecision(interviewId, reviewer2Id, {
            objectType: 'person',
            objectUuid: personUuid,
            decision: 'reject'
        });

        const reviews = await dbQueries.getReviewDecisionsForInterview(interviewId);
        expect(reviews).toHaveLength(2);
        expect(reviews.find((review) => review.userId === reviewer1Id)?.decision).toBe('approve');
        expect(reviews.find((review) => review.userId === reviewer2Id)?.decision).toBe('reject');
    });

    test('setReviewDecision upserts the decision for the same reviewer and object', async () => {
        await dbQueries.setReviewDecision(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: personUuid,
            decision: 'approve'
        });

        await dbQueries.setReviewDecision(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: personUuid,
            decision: 'reject',
            comment: 'needs correction'
        });

        const reviews = await dbQueries.getReviewDecisionsForInterview(interviewId);
        expect(reviews).toHaveLength(1);
        expect(reviews[0]).toMatchObject({
            userId: reviewer1Id,
            decision: 'reject',
            comment: 'needs correction'
        });
    });

    test('getReviewDecisionsForInterview returns decisions from multiple reviewers', async () => {
        await dbQueries.setReviewDecision(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: personUuid,
            decision: 'reject'
        });
        await dbQueries.setReviewDecision(interviewId, reviewer2Id, {
            objectType: 'person',
            objectUuid: personUuid,
            decision: 'approve'
        });

        const reviews = await dbQueries.getReviewDecisionsForInterview(interviewId);
        expect(reviews).toHaveLength(2);
        expect(reviews.map((review) => review.userId).sort()).toEqual([reviewer1Id, reviewer2Id]);
    });

    test('deleteReviewDecisionsForInterview removes all rows for the interview', async () => {
        await dbQueries.setReviewDecision(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: personUuid,
            decision: 'approve'
        });

        await dbQueries.deleteReviewDecisionsForInterview(interviewId);
        const reviews = await dbQueries.getReviewDecisionsForInterview(interviewId);
        expect(reviews).toHaveLength(0);
    });
});

describe('requestReReview', () => {
    const reReviewPersonUuid = uuidV4();

    beforeEach(async () => {
        await dbQueries.deleteReviewDecisionsForInterview(interviewId);
        await dbQueries.setReviewDecision(interviewId, reviewer2Id, {
            objectType: 'person',
            objectUuid: reReviewPersonUuid,
            decision: 'reject',
            comment: 'fix household size'
        });
    });

    test('flags an existing reviewer to look at the object again', async () => {
        const review = await dbQueries.requestReReview(
            interviewId,
            reviewer2Id,
            reviewer1Id,
            {
                objectType: 'person',
                objectUuid: reReviewPersonUuid,
                reReviewRequestComment: 'size was corrected'
            }
        );

        expect(review).toMatchObject({
            userId: reviewer2Id,
            decision: 'reject',
            comment: 'fix household size',
            reReviewRequested: true,
            reReviewRequestedByUserId: reviewer1Id,
            reReviewRequestComment: 'size was corrected'
        });
    });

    test('clears the re-review flag when the reviewer submits a new decision', async () => {
        await dbQueries.requestReReview(interviewId, reviewer2Id, reviewer1Id, {
            objectType: 'person',
            objectUuid: reReviewPersonUuid,
            reReviewRequestComment: 'please verify'
        });

        const updatedReview = await dbQueries.setReviewDecision(interviewId, reviewer2Id, {
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
            dbQueries.requestReReview(interviewId, reviewer1Id, reviewer2Id, {
                objectType: 'person',
                objectUuid: reReviewPersonUuid
            })
        ).rejects.toThrow();
    });

    test('fails when the requester targets themselves', async () => {
        await dbQueries.setReviewDecision(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: reReviewPersonUuid,
            decision: 'approve'
        });

        await expect(
            dbQueries.requestReReview(interviewId, reviewer1Id, reviewer1Id, {
                objectType: 'person',
                objectUuid: reReviewPersonUuid,
                reReviewRequestComment: 'self request'
            })
        ).rejects.toThrow(/cannot request a re-review from themselves/i);
    });
});

describe('requestReReviewForOtherReviewers', () => {
    const otherReviewersPersonUuid = uuidV4();

    beforeEach(async () => {
        await dbQueries.deleteReviewDecisionsForInterview(interviewId);
        await dbQueries.setReviewDecision(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: otherReviewersPersonUuid,
            decision: 'approve'
        });
        await dbQueries.setReviewDecision(interviewId, reviewer2Id, {
            objectType: 'person',
            objectUuid: otherReviewersPersonUuid,
            decision: 'reject'
        });
    });

    test('flags every other reviewer on the object and excludes the requester', async () => {
        await dbQueries.requestReReviewForOtherReviewers(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: otherReviewersPersonUuid,
            reReviewRequestComment: 'please verify'
        });

        const reviews = await dbQueries.getReviewDecisionsForInterview(interviewId);
        expect(reviews).toHaveLength(2);
        expect(reviews.find((review) => review.userId === reviewer1Id)).toMatchObject({
            reReviewRequested: false
        });
        expect(reviews.find((review) => review.userId === reviewer2Id)).toMatchObject({
            reReviewRequested: true,
            reReviewRequestedByUserId: reviewer1Id,
            reReviewRequestComment: 'please verify'
        });
    });
});

describe('requestReReviewForReviewers', () => {
    const batchReReviewPersonUuid = uuidV4();

    beforeEach(async () => {
        await dbQueries.deleteReviewDecisionsForInterview(interviewId);
        await dbQueries.setReviewDecision(interviewId, reviewer2Id, {
            objectType: 'person',
            objectUuid: batchReReviewPersonUuid,
            decision: 'reject',
            comment: 'fix household size'
        });
    });

    test('deduplicates target reviewer ids before counting updated rows', async () => {
        await dbQueries.requestReReviewForReviewers(
            interviewId,
            [reviewer2Id, reviewer2Id],
            reviewer1Id,
            {
                objectType: 'person',
                objectUuid: batchReReviewPersonUuid,
                reReviewRequestComment: 'please verify'
            }
        );

        const reviews = await dbQueries.getReviewDecisionsForInterview(interviewId);
        expect(reviews).toHaveLength(1);
        expect(reviews[0]).toMatchObject({
            userId: reviewer2Id,
            reReviewRequested: true,
            reReviewRequestedByUserId: reviewer1Id,
            reReviewRequestComment: 'please verify'
        });
    });

    test('excludes the requester from target reviewer ids', async () => {
        await dbQueries.setReviewDecision(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: batchReReviewPersonUuid,
            decision: 'approve'
        });

        await dbQueries.requestReReviewForReviewers(
            interviewId,
            [reviewer1Id, reviewer2Id],
            reviewer1Id,
            {
                objectType: 'person',
                objectUuid: batchReReviewPersonUuid,
                reReviewRequestComment: 'please verify'
            }
        );

        const reviews = await dbQueries.getReviewDecisionsForInterview(interviewId);
        expect(reviews).toHaveLength(2);
        expect(reviews.find((review) => review.userId === reviewer1Id)).toMatchObject({
            reReviewRequested: false
        });
        expect(reviews.find((review) => review.userId === reviewer2Id)).toMatchObject({
            reReviewRequested: true,
            reReviewRequestedByUserId: reviewer1Id,
            reReviewRequestComment: 'please verify'
        });
    });

    test('rolls back when one target reviewer has no existing decision', async () => {
        await expect(
            dbQueries.requestReReviewForReviewers(
                interviewId,
                [reviewer2Id, reviewer1Id],
                reviewer2Id,
                {
                    objectType: 'person',
                    objectUuid: batchReReviewPersonUuid,
                    reReviewRequestComment: 'please verify'
                }
            )
        ).rejects.toThrow();

        const reviews = await dbQueries.getReviewDecisionsForInterview(interviewId);
        expect(reviews).toHaveLength(1);
        expect(reviews[0]).toMatchObject({
            userId: reviewer2Id,
            reReviewRequested: false
        });
    });
});

describe('setForceApproveWhenConflictExists persistence', () => {
    const forcePersonUuid = uuidV4();

    beforeEach(async () => {
        await dbQueries.deleteReviewDecisionsForInterview(interviewId);
    });

    const seedReviewerConflict = async () => {
        await dbQueries.setReviewDecision(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: forcePersonUuid,
            decision: 'reject',
            comment: 'needs work'
        });
        await dbQueries.setReviewDecision(interviewId, reviewer2Id, {
            objectType: 'person',
            objectUuid: forcePersonUuid,
            decision: 'approve'
        });
    };

    test('sets force_approved on the admin row while preserving reject decision', async () => {
        await seedReviewerConflict();

        const review = await dbQueries.setForceApproveWhenConflictExists(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: forcePersonUuid,
            forceApproveComment: 'overriding anyway'
        });

        expect(review).toMatchObject({
            userId: reviewer1Id,
            decision: 'reject',
            comment: 'needs work',
            forceApproved: true,
            forceApproveComment: 'overriding anyway'
        });
    });

    test('creates an approve row when admin force-approves without a prior decision', async () => {
        await seedReviewerConflict();
        const adminId = (await create(knex, 'users', undefined, {
            email: `review-decisions-admin-${uuidV4()}@test.local`,
            is_valid: true,
            uuid: uuidV4()
        } as any)) as number;
        extraUserIds.push(adminId);

        const review = await dbQueries.setForceApproveWhenConflictExists(interviewId, adminId, {
            objectType: 'person',
            objectUuid: forcePersonUuid
        });

        expect(review).toMatchObject({
            decision: 'approve',
            forceApproved: true
        });
    });

    test('setReviewDecision clears force_approved on the same row', async () => {
        await seedReviewerConflict();
        await dbQueries.setForceApproveWhenConflictExists(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: forcePersonUuid,
            forceApproveComment: 'forced'
        });

        const updatedReview = await dbQueries.setReviewDecision(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: forcePersonUuid,
            decision: 'approve',
            comment: 'looks good'
        });

        expect(updatedReview).toMatchObject({
            decision: 'approve',
            comment: 'looks good',
            forceApproved: false,
            forceApproveComment: undefined
        });
    });
});

describe('setForceApproveWhenConflictExists', () => {
    const conflictPersonUuid = uuidV4();

    beforeEach(async () => {
        await dbQueries.deleteReviewDecisionsForInterview(interviewId);
    });

    test('force-approves when reviewers conflict, preserving prior rows', async () => {
        await dbQueries.setReviewDecision(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: conflictPersonUuid,
            decision: 'approve'
        });
        await dbQueries.setReviewDecision(interviewId, reviewer2Id, {
            objectType: 'person',
            objectUuid: conflictPersonUuid,
            decision: 'reject',
            comment: 'needs work'
        });

        const review = await dbQueries.setForceApproveWhenConflictExists(
            interviewId,
            reviewer1Id,
            {
                objectType: 'person',
                objectUuid: conflictPersonUuid,
                forceApproveComment: 'admin override'
            }
        );

        expect(review).toMatchObject({
            userId: reviewer1Id,
            decision: 'approve',
            forceApproved: true,
            forceApproveComment: 'admin override'
        });

        const reviews = await dbQueries.getReviewDecisionsForInterview(interviewId);
        expect(reviews).toHaveLength(2);
        expect(reviews.find((r) => r.userId === reviewer2Id)).toMatchObject({
            decision: 'reject',
            comment: 'needs work',
            forceApproved: false
        });
    });

    test('rejects when reviewers agree', async () => {
        await dbQueries.setReviewDecision(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: conflictPersonUuid,
            decision: 'approve'
        });
        await dbQueries.setReviewDecision(interviewId, reviewer2Id, {
            objectType: 'person',
            objectUuid: conflictPersonUuid,
            decision: 'approve'
        });

        await expect(
            dbQueries.setForceApproveWhenConflictExists(interviewId, reviewer1Id, {
                objectType: 'person',
                objectUuid: conflictPersonUuid,
                forceApproveComment: 'admin override'
            })
        ).rejects.toThrow(/Cannot force-approve person\/.+ without reviewer conflict/);

        const reviews = await dbQueries.getReviewDecisionsForInterview(interviewId);
        expect(reviews).toHaveLength(2);
        expect(reviews.every((r) => !r.forceApproved)).toBe(true);
    });
});
