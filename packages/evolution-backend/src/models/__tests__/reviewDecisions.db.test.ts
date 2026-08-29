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
const interviewUuid = uuidV4();

let participantId: number;
let reviewer1Id: number;
let reviewer2Id: number;
let interviewId: number;
const extraUserIds: number[] = [];
const extraParticipantIds: number[] = [];

/** Creates a user allowed to force approve, cleaned up with the other test fixtures. */
const createAdmin = async (): Promise<number> => {
    const adminId = (await create(knex, 'users', undefined, {
        email: `review-decisions-admin-${uuidV4()}@test.local`,
        is_valid: true,
        uuid: uuidV4()
    } as any)) as number;
    extraUserIds.push(adminId);
    return adminId;
};

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
        uuid: interviewUuid,
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
    if (extraParticipantIds.length > 0) {
        await knex('sv_participants').whereIn('id', extraParticipantIds).del();
    }
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

    test('clearReviewDecision removes a reviewer row when it is not force-approved', async () => {
        await dbQueries.setReviewDecision(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: personUuid,
            decision: 'approve'
        });

        await dbQueries.clearReviewDecision(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: personUuid
        });

        const reviews = await dbQueries.getReviewDecisionsForInterview(interviewId);
        expect(reviews).toHaveLength(0);
    });

    test('clearReviewDecision leaves a force-approved row intact', async () => {
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
        await dbQueries.setForceApproveWhenApprovalBlocked(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: personUuid
        });

        await dbQueries.clearReviewDecision(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: personUuid
        });

        const reviews = await dbQueries.getReviewDecisionsForInterview(interviewId);
        expect(reviews).toHaveLength(2);
        expect(reviews.find((review) => review.userId === reviewer1Id)).toMatchObject({
            forceApproved: true,
            decision: 'reject'
        });
    });

    test('clearReviewDecision removes another reviewer decision while force-approve remains', async () => {
        const clearWhileForceUuid = uuidV4();
        await dbQueries.setReviewDecision(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: clearWhileForceUuid,
            decision: 'reject'
        });
        await dbQueries.setReviewDecision(interviewId, reviewer2Id, {
            objectType: 'person',
            objectUuid: clearWhileForceUuid,
            decision: 'approve'
        });
        await dbQueries.setForceApproveWhenApprovalBlocked(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: clearWhileForceUuid
        });

        await dbQueries.clearReviewDecision(interviewId, reviewer2Id, {
            objectType: 'person',
            objectUuid: clearWhileForceUuid
        });

        const reviews = await dbQueries.getReviewDecisionsForInterview(interviewId);
        expect(reviews).toHaveLength(1);
        expect(reviews[0]).toMatchObject({
            userId: reviewer1Id,
            forceApproved: true,
            decision: 'reject'
        });
    });
});

describe('requestReReviewFromOtherReviewers', () => {
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
        await dbQueries.requestReReviewFromOtherReviewers(interviewId, reviewer1Id, {
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

    test('clears the re-review flag when the reviewer submits a new decision', async () => {
        await dbQueries.requestReReviewFromOtherReviewers(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: otherReviewersPersonUuid,
            reReviewRequestComment: 'please verify'
        });

        const updatedReview = await dbQueries.setReviewDecision(interviewId, reviewer2Id, {
            objectType: 'person',
            objectUuid: otherReviewersPersonUuid,
            decision: 'approve',
            comment: 'looks good now'
        });

        expect(updatedReview).toMatchObject({
            decision: 'approve',
            comment: 'looks good now',
            reReviewRequested: false
        });
    });
});

describe('setForceApproveWhenApprovalBlocked stores and clears force-approve state', () => {
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

        const review = await dbQueries.setForceApproveWhenApprovalBlocked(interviewId, reviewer1Id, {
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

    test('creates a row without reviewer vote when admin force-approves without a prior decision', async () => {
        await seedReviewerConflict();
        const adminId = await createAdmin();

        const review = await dbQueries.setForceApproveWhenApprovalBlocked(interviewId, adminId, {
            objectType: 'person',
            objectUuid: forcePersonUuid
        });

        expect(review).toMatchObject({ forceApproved: true });
        expect(review.decision).toBeUndefined();
    });

    test('clearForceApprove removes the row of an admin who never voted', async () => {
        await seedReviewerConflict();
        const adminId = await createAdmin();
        await dbQueries.setForceApproveWhenApprovalBlocked(interviewId, adminId, {
            objectType: 'person',
            objectUuid: forcePersonUuid
        });

        await dbQueries.clearForceApprove(interviewId, adminId, {
            objectType: 'person',
            objectUuid: forcePersonUuid
        });

        // No phantom approval is left behind: the object goes back to the reviewers' conflict.
        const reviews = await dbQueries.getReviewDecisionsForInterview(interviewId);
        expect(reviews.find((review) => review.userId === adminId)).toBeUndefined();
        expect(reviews).toHaveLength(2);
    });

    test('setReviewDecision clears force_approved on the same row', async () => {
        await seedReviewerConflict();
        await dbQueries.setForceApproveWhenApprovalBlocked(interviewId, reviewer1Id, {
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

    test('clearForceApprove removes force-approve while preserving the admin decision', async () => {
        await seedReviewerConflict();
        await dbQueries.setForceApproveWhenApprovalBlocked(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: forcePersonUuid,
            forceApproveComment: 'overriding anyway'
        });

        await dbQueries.clearForceApprove(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: forcePersonUuid
        });

        const reviews = await dbQueries.getReviewDecisionsForInterview(interviewId);
        expect(reviews.find((review) => review.userId === reviewer1Id)).toMatchObject({
            decision: 'reject',
            comment: 'needs work',
            forceApproved: false
        });
    });
});

describe('setForceApproveWhenApprovalBlocked requires a decision to override', () => {
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

        const review = await dbQueries.setForceApproveWhenApprovalBlocked(
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
            dbQueries.setForceApproveWhenApprovalBlocked(interviewId, reviewer1Id, {
                objectType: 'person',
                objectUuid: conflictPersonUuid,
                forceApproveComment: 'admin override'
            })
        ).rejects.toThrow(/Cannot force-approve person\/.+, no decision to override/);

        const reviews = await dbQueries.getReviewDecisionsForInterview(interviewId);
        expect(reviews).toHaveLength(2);
        expect(reviews.every((r) => !r.forceApproved)).toBe(true);
    });

    test('force-approves a rejected object even when no reviewer disagrees', async () => {
        await dbQueries.setReviewDecision(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: conflictPersonUuid,
            decision: 'reject'
        });

        const review = await dbQueries.setForceApproveWhenApprovalBlocked(interviewId, reviewer2Id, {
            objectType: 'person',
            objectUuid: conflictPersonUuid
        });

        expect(review).toMatchObject({ userId: reviewer2Id, forceApproved: true });
    });

    test('force-approves the interview over a rejection in an object it contains', async () => {
        await dbQueries.setReviewDecision(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: conflictPersonUuid,
            decision: 'reject'
        });

        const review = await dbQueries.setForceApproveWhenApprovalBlocked(interviewId, reviewer2Id, {
            objectType: 'interview',
            objectUuid: interviewUuid
        });

        expect(review).toMatchObject({ objectType: 'interview', forceApproved: true });
    });
});

describe('setReviewDecision guards the approval of the interview', () => {
    const guardPersonUuid = uuidV4();

    beforeEach(async () => {
        await dbQueries.deleteReviewDecisionsForInterview(interviewId);
    });

    const approveInterview = () =>
        dbQueries.setReviewDecision(interviewId, reviewer1Id, {
            objectType: 'interview',
            objectUuid: interviewUuid,
            decision: 'approve'
        });

    // [title, decisions seeded on the person, one per reviewer, approval of the interview allowed]
    const containedObjectCases: [string, ('approve' | 'reject')[], boolean][] = [
        ['nothing was reviewed below', [], true],
        ['the object below is approved', ['approve'], true],
        ['the object below is rejected', ['reject'], false],
        ['the reviewers disagree on the object below', ['approve', 'reject'], false]
    ];

    test.each(containedObjectCases)('approving the interview when %s', async (_title, decisions, isAllowed) => {
        const reviewerIds = [reviewer1Id, reviewer2Id];
        for (const [index, decision] of decisions.entries()) {
            await dbQueries.setReviewDecision(interviewId, reviewerIds[index], {
                objectType: 'person',
                objectUuid: guardPersonUuid,
                decision
            });
        }

        if (isAllowed) {
            expect(await approveInterview()).toMatchObject({ objectType: 'interview', decision: 'approve' });
        } else {
            await expect(approveInterview()).rejects.toThrow(/Cannot approve interview \d+/);
        }
    });

    test('rejecting the interview stays possible over a rejected object', async () => {
        await dbQueries.setReviewDecision(interviewId, reviewer2Id, {
            objectType: 'person',
            objectUuid: guardPersonUuid,
            decision: 'reject'
        });

        const review = await dbQueries.setReviewDecision(interviewId, reviewer1Id, {
            objectType: 'interview',
            objectUuid: interviewUuid,
            decision: 'reject'
        });

        expect(review).toMatchObject({ objectType: 'interview', decision: 'reject' });
    });

    test('a force-approved object does not block the approval of the interview', async () => {
        await dbQueries.setReviewDecision(interviewId, reviewer2Id, {
            objectType: 'person',
            objectUuid: guardPersonUuid,
            decision: 'reject'
        });
        await dbQueries.setForceApproveWhenApprovalBlocked(interviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: guardPersonUuid
        });

        expect(await approveInterview()).toMatchObject({ objectType: 'interview', decision: 'approve' });
    });
});

describe('review decision foreign keys', () => {
    const fkPersonUuid = uuidV4();

    beforeEach(async () => {
        await dbQueries.deleteReviewDecisionsForInterview(interviewId);
    });

    test('RESTRICT prevents deleting a reviewer referenced by review decisions', async () => {
        const disposableReviewerId = (await create(knex, 'users', undefined, {
            email: `review-decisions-fk-reviewer-${uuidV4()}@test.local`,
            is_valid: true,
            uuid: uuidV4()
        } as any)) as number;
        extraUserIds.push(disposableReviewerId);

        await dbQueries.setReviewDecision(interviewId, disposableReviewerId, {
            objectType: 'person',
            objectUuid: fkPersonUuid,
            decision: 'approve'
        });

        await expect(knex('users').where('id', disposableReviewerId).del()).rejects.toMatchObject({
            code: expect.stringMatching(/^(23001|23503)$/)
        });
    });

    test('CASCADE deletes review decisions when the interview is deleted', async () => {
        const cascadeParticipantId = (await create(knex, 'sv_participants', undefined, {
            email: `review-decisions-cascade-participant-${uuidV4()}@test.local`,
            is_valid: true
        } as any)) as number;
        extraParticipantIds.push(cascadeParticipantId);

        const createdInterview = await interviewsDbQueries.create({
            uuid: uuidV4(),
            participant_id: cascadeParticipantId,
            is_valid: false,
            is_active: true,
            response: {
                accessCode: '22222'
            },
            validations: {}
        } as any);
        const cascadeInterviewId = createdInterview.id as number;

        await dbQueries.setReviewDecision(cascadeInterviewId, reviewer1Id, {
            objectType: 'person',
            objectUuid: fkPersonUuid,
            decision: 'reject'
        });
        expect(await dbQueries.getReviewDecisionsForInterview(cascadeInterviewId)).toHaveLength(1);

        await knex('sv_interviews').where('id', cascadeInterviewId).del();

        expect(await dbQueries.getReviewDecisionsForInterview(cascadeInterviewId)).toHaveLength(0);
    });
});
