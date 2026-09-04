/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { v4 as uuidV4 } from 'uuid';
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import { create, truncate } from 'chaire-lib-backend/lib/models/db/default.db.queries';
import { _removeBlankFields } from 'chaire-lib-common/lib/utils/LodashExtensions';
import config from 'chaire-lib-common/lib/config/shared/project.config';

import dbQueries from '../interviews.db.queries';
import { INTERVIEWER_PARTICIPANT_PREFIX } from 'evolution-common/lib/services/interviews/interview';
import moment from 'moment';
import slugify from 'slugify';
import { InterviewAttributes, InterviewListAttributes, InterviewResponse } from 'evolution-common/lib/services/questionnaire/types';
import { type InterviewReviewStatusFilter, type ReviewDecisionEffectiveStatus } from 'evolution-common/lib/services/reviews/types';

const surveysTable = 'sv_surveys';
const localSurvey = {
    id: 1,
    shortname: config.projectShortname
};

const permission1 = 'role1';
const permission2 = 'role2';
const localUser = {
    id: 1,
    email: 'test@transition.city',
    is_valid: true
};

const localUserWithPermission = {
    ...localUser,
    uuid: uuidV4(),
    permissions: {
        [permission1]: true
    }
};

const facebookParticipant = {
    id: 2,
    facebook_id: 'facebookId',
    is_valid: true
};

const googleParticipant = {
    id: 3,
    google_id: 'googleId',
    is_valid: true
};

const googleParticipant2 = {
    id: 300,
    google_id: 'googleId2',
    is_valid: true
};

const googleParticipant3 = {
    id: 310,
    google_id: 'googleId3',
    is_valid: true
};

const googleParticipant4 = {
    id: 320,
    google_id: 'googleId4',
    is_valid: true
};

const localUser2 = {
    id: 4,
    email: 'test2@transition.city',
    is_valid: true
};

const localUser2WithPermission = {
    ...localUser2,
    uuid: uuidV4(),
    permissions: {
        [permission1]: true,
        [permission2]: true
    }
};

const interviewerParticipant = {
    id: 330,
    username: `${INTERVIEWER_PARTICIPANT_PREFIX}_1234`,
    is_valid: true
};

const localUserInterviewAttributes = {
    uuid: uuidV4(),
    participant_id: localUser.id,
    is_valid: false,
    is_active: true,
    is_frozen: false,
    is_completed: undefined,
    response: {
        accessCode: '11111',
        booleanField: true
    },
    validations: {},
} as any;

const facebookUserInterviewAttributes = {
    uuid: uuidV4(),
    participant_id: facebookParticipant.id,
    is_valid: undefined,
    is_active: false,
    is_completed: false,
    response: {
        accessCode: '22222',
        home: {
            someField: 'somewhere',
            otherField: '1234 Test Street West'
        }
    },
    validations: {},
} as any;

const googleUserInterviewAttributes = {
    uuid: uuidV4(),
    participant_id: googleParticipant.id,
    is_valid: true,
    is_completed: true,
    is_active: true,
    response: {
        accessCode: '33333',
        home: {
            someField: 'somewhere',
            otherField: 'Third stop on the right',
            arrayField: ['foo', 'bar']
        }
    },
    validations: {},
    corrected_response: {
        accessCode: '2222',
        home: {
            someField: 'corrected',
            otherField: 'changed',
            arrayField: ['foo', 'bar']
        }
    },
} as any;

/**
 * Records an interview-level review decision, the modern replacement for the
 * legacy `is_valid` column.
 * @param interviewUuid - Uuid of the reviewed interview
 * @param userId - Reviewer user id
 * @param decision - Decision to record
 */
const setInterviewReviewDecision = async (
    interviewUuid: string,
    userId: number,
    decision: 'approve' | 'reject'
): Promise<void> => {
    const interview = await knex('sv_interviews').select('id').where('uuid', interviewUuid).first();
    await knex('sv_review_decisions').insert({
        interview_id: interview.id,
        user_id: userId,
        object_type: 'interview',
        object_uuid: interviewUuid,
        decision_value: decision
    });
};

/**
 * Records an interview-level force approve, which overrides the decisions of the other reviewers.
 * @param interviewUuid - Uuid of the interview to force approve
 * @param userId - Id of the admin overriding the reviewers, who has no vote of their own
 */
const setInterviewForceApprove = async (interviewUuid: string, userId: number): Promise<void> => {
    const interview = await knex('sv_interviews').select('id').where('uuid', interviewUuid).first();
    await knex('sv_review_decisions').insert({
        interview_id: interview.id,
        user_id: userId,
        object_type: 'interview',
        object_uuid: interviewUuid,
        decision_value: null,
        force_approved: true
    });
};

beforeAll(async () => {
    jest.setTimeout(10000);
    await truncate(knex, 'sv_review_decisions');
    await truncate(knex, 'sv_audits');
    await truncate(knex, 'sv_interviews');
    await truncate(knex, surveysTable);
    await knex(surveysTable).insert(localSurvey);
    await truncate(knex, 'sv_participants');
    await create(knex, 'sv_participants', undefined, localUser as any);
    await create(knex, 'sv_participants', undefined, facebookParticipant as any);
    await create(knex, 'sv_participants', undefined, googleParticipant as any);
    await create(knex, 'sv_participants', undefined, googleParticipant2 as any);
    await create(knex, 'sv_participants', undefined, googleParticipant3 as any);
    await create(knex, 'sv_participants', undefined, googleParticipant4 as any);
    await create(knex, 'sv_participants', undefined, localUser2 as any);
    await create(knex, 'sv_participants', undefined, interviewerParticipant as any);
    await truncate(knex, 'users');
    await create(knex, 'users', undefined, localUserWithPermission as any);
    await create(knex, 'users', undefined, localUser2WithPermission as any);
    await dbQueries.create(localUserInterviewAttributes);
    await dbQueries.create(facebookUserInterviewAttributes);
    await dbQueries.create(googleUserInterviewAttributes);
});

afterAll(async () => {
    await truncate(knex, 'sv_review_decisions');
    await truncate(knex, 'sv_audits');
    await truncate(knex, 'sv_interviews');
    await truncate(knex, surveysTable);
    await truncate(knex, 'users');
    await truncate(knex, 'sv_participants');
    await knex.destroy();
});

describe('create new interviews', () => {

    test('create new interview, default returning fields', async () => {
        const newInterviewAttributes = {
            participant_id: googleParticipant4.id,
            response: {},
            validations: {},
            is_active: true
        };
        const returning = await dbQueries.create(newInterviewAttributes);
        expect(returning).toEqual({
            id: expect.anything()
        });
    });

    test('create new interview, returning a few fields', async () => {
        const newInterviewAttributes = {
            participant_id: googleParticipant2.id,
            response: {},
            validations: {},
            is_active: true
        };
        const returning = await dbQueries.create(newInterviewAttributes, ['uuid', 'id', 'response', 'participant_id']);
        expect(returning).toEqual({
            uuid: expect.anything(),
            id: expect.anything(),
            response: {},
            participant_id: newInterviewAttributes.participant_id
        });
    });

    test('create new interview, returning single field', async () => {
        const newInterviewAttributes = {
            participant_id: googleParticipant3.id,
            response: { foo: 'bar' },
            validations: {},
            is_active: true
        };
        const returning = await dbQueries.create(newInterviewAttributes as any, 'response');
        expect(returning).toEqual({
            response: newInterviewAttributes.response
        });
    });

});

describe('find by response', () => {

    test('Get an existing interview by access code', async () => {

        const interviews = await dbQueries.findByResponse({ accessCode: localUserInterviewAttributes.response.accessCode });
        expect(interviews.length).toEqual(1);
        expect(interviews[0]).toEqual({
            id: expect.anything(),
            uuid: localUserInterviewAttributes.uuid,
            isCompleted: undefined,
            reviewStatus: 'notReviewed',
            surveyId: 1,
            home: {},
            isQuestionable: false,
            email: localUser.email,
            username: undefined,
            facebook: false,
            google: false
        });
    });

    test('Unexisting access code', async () => {

        const interviews = await dbQueries.findByResponse({ accessCode: 'wrong' });
        expect(interviews.length).toEqual(0);

    });

    test('Common deep field', async () => {

        const interviews = await dbQueries.findByResponse({ home: { someField: 'somewhere' } });
        expect(interviews.length).toEqual(2);
        expect(interviews[0]).toEqual({
            id: expect.anything(),
            uuid: facebookUserInterviewAttributes.uuid,
            isCompleted: facebookUserInterviewAttributes.is_completed,
            reviewStatus: 'notReviewed',
            surveyId: 1,
            isQuestionable: false,
            home: facebookUserInterviewAttributes.response.home,
            email: undefined,
            username: undefined,
            facebook: true,
            google: false
        });
        expect(interviews[1]).toEqual({
            id: expect.anything(),
            uuid: googleUserInterviewAttributes.uuid,
            isCompleted: googleUserInterviewAttributes.is_completed,
            reviewStatus: 'notReviewed',
            surveyId: 1,
            isQuestionable: false,
            home: googleUserInterviewAttributes.response.home,
            email: undefined,
            username: undefined,
            facebook: false,
            google: true
        });

    });

    test('Multiple fields', async () => {

        const interviews = await dbQueries.findByResponse({ accessCode: facebookUserInterviewAttributes.response.accessCode, home: { someField: 'somewhere' } });
        expect(interviews.length).toEqual(1);
        expect(interviews[0]).toEqual({
            id: expect.anything(),
            uuid: facebookUserInterviewAttributes.uuid,
            isCompleted: facebookUserInterviewAttributes.is_completed,
            reviewStatus: 'notReviewed',
            surveyId: 1,
            isQuestionable: false,
            home: facebookUserInterviewAttributes.response.home,
            email: undefined,
            username: undefined,
            facebook: true,
            google: false
        });

    });

    test('Unexisting fields', async () => {

        const interviews = await dbQueries.findByResponse({ unexisting: { field: 'somewhere' } });
        expect(interviews.length).toEqual(0);

    });

});

describe('Get interview and ID by interview uuid', () => {
    test('Valid interview', async () => {
        const interview = await dbQueries.getInterviewByUuid(localUserInterviewAttributes.uuid);
        expect(interview).toEqual(expect.objectContaining(_removeBlankFields({ ...localUserInterviewAttributes })));
        const interviewId = await dbQueries.getInterviewIdByUuid(localUserInterviewAttributes.uuid);
        expect(interviewId).toEqual((interview as any).id);
    });

    test('Invalid interview', async () => {
        const interview = await dbQueries.getInterviewByUuid(uuidV4());
        expect(interview).toBeUndefined();
        const interviewId = await dbQueries.getInterviewIdByUuid(uuidV4());
        expect(interviewId).toBeUndefined();
    });

    test('Not a valid uuid', async () => {
        await expect(dbQueries.getInterviewByUuid('not a valid uuid'))
            .rejects
            .toThrow();
        await expect(dbQueries.getInterviewIdByUuid('not a valid uuid'))
            .rejects
            .toThrow();
    });
});

describe('Get interview by user id', () => {
    test('Valid interview for user', async () => {
        const interview = await dbQueries.getUserInterview(localUser.id);
        expect(interview).toEqual({
            id: expect.anything(),
            uuid: localUserInterviewAttributes.uuid,
            participant_id: localUser.id,
            is_completed: localUserInterviewAttributes.is_completed,
            is_frozen: localUserInterviewAttributes.is_frozen,
            response: localUserInterviewAttributes.response,
            survey_id: 1,
            is_questionable: false,
            validations: localUserInterviewAttributes.validations
        });
    });

    test('Unexisting user', async () => {
        const interview = await dbQueries.getUserInterview(100);
        expect(interview).toBeUndefined();
    });

    test('Inactive interview', async () => {
        // Interview for facebook user is invalid
        const interview = await dbQueries.getUserInterview(facebookParticipant.id);
        expect(interview).toBeUndefined();
    });
});

describe('Update Interview', () => {

    test('Update response and validations', async () => {
        const addAttributes = { response: { foo: 'test' }, validations: { accessCode: true, other: 'data' } };
        const newAttributes = {
            response: Object.assign({}, localUserInterviewAttributes.response, addAttributes.response),
            validations: Object.assign({}, localUserInterviewAttributes.validations, addAttributes.validations)
        };
        const interview = await dbQueries.update(localUserInterviewAttributes.uuid, newAttributes, 'uuid');
        expect(interview.uuid).toEqual(localUserInterviewAttributes.uuid);

        // Re-read the interview
        const updateInterview = await dbQueries.getInterviewByUuid(localUserInterviewAttributes.uuid) as InterviewAttributes;
        expect(updateInterview.response).toEqual(newAttributes.response);
        expect(updateInterview.validations).toEqual(newAttributes.validations);
    });

    test('Update unexisting interview', async () => {
        const addAttributes = { response: { foo: 'test' }, validations: { accessCode: true, other: 'data' } };
        const newAttributes = {
            response: Object.assign({}, localUserInterviewAttributes.response, addAttributes.response),
            validations: Object.assign({}, localUserInterviewAttributes.validations, addAttributes.validations)
        };
        await expect(dbQueries.update('not a uuid', newAttributes, 'uuid'))
            .rejects
            .toThrow(expect.anything());
    });

    test('Invalid null unicode character in json data', async () => {
        const addAttributes = { response: { name: 'McDonald\u0000\u0000\u0007s' } };
        const newAttributes = {
            response: Object.assign({}, localUserInterviewAttributes.response, addAttributes.response),
        };
        const interview = await dbQueries.update(localUserInterviewAttributes.uuid, newAttributes, 'uuid');
        expect(interview.uuid).toEqual(localUserInterviewAttributes.uuid);

        // Re-read the interview and make sure it does not contain the null, but other unicode characters are ok
        const updateInterview = await dbQueries.getInterviewByUuid(localUserInterviewAttributes.uuid) as any;
        expect(updateInterview.response.name).not.toContain('\u0000');
        expect(updateInterview.response.name).toContain('\u0007');
    });

});

describe('list interviews', () => {

    // There are 6 interviews in the DB, but one, facebookUserInterviewAttributes, is invalid
    const nbActiveInterviews = 5;

    // One interview is approved, one is rejected, the 3 others are left unreviewed
    beforeAll(async () => {
        await setInterviewReviewDecision(googleUserInterviewAttributes.uuid, localUserWithPermission.id, 'approve');
        await setInterviewReviewDecision(localUserInterviewAttributes.uuid, localUserWithPermission.id, 'reject');
    });

    afterAll(async () => {
        await truncate(knex, 'sv_review_decisions');
    });

    test('Get the complete list', async () => {
        const { interviews, totalCount } = await dbQueries.getList({ filters: {}, pageIndex: 0, pageSize: -1 });
        expect(totalCount).toEqual(nbActiveInterviews);
        expect(interviews.length).toEqual(totalCount);
    });

    test('Get paginated interviews list', async () => {
        // Expect 3 pages, the last one has only 1 element
        const pageSize = 2;
        // First page
        const { interviews: page1, totalCount: totalCount1 } = await dbQueries.getList({ filters: {}, pageIndex: 0, pageSize });
        expect(totalCount1).toEqual(nbActiveInterviews);
        expect(page1.length).toEqual(pageSize);
        // Second page
        const { interviews: page2, totalCount: totalCount2 } = await dbQueries.getList({ filters: {}, pageIndex: 1, pageSize });
        expect(totalCount2).toEqual(nbActiveInterviews);
        expect(page2.length).toEqual(pageSize);
        let inOtherPage = page2.find((interview) => page1.find((interview2) => interview2.id === interview.id) !== undefined);
        expect(inOtherPage).toBeUndefined();
        // Third page
        const { interviews: page3, totalCount: totalCount3 } = await dbQueries.getList({ filters: {}, pageIndex: 2, pageSize });
        expect(totalCount3).toEqual(nbActiveInterviews);
        expect(page3.length).toEqual(1);
        inOtherPage = page2.find((interview) => page3[0].id === interview.id) || page1.find((interview) => page3[0].id === interview.id);
        expect(inOtherPage).toBeUndefined();
        // There is no fourth page
        const { interviews: page4, totalCount: totalCount4 } = await dbQueries.getList({ filters: {}, pageIndex: 3, pageSize });
        expect(totalCount4).toEqual(nbActiveInterviews);
        expect(page4.length).toEqual(0);
    });

    // [review status filter, expected count, expected status of each returned interview]
    const reviewStatusFilterCases: [InterviewReviewStatusFilter, number, ReviewDecisionEffectiveStatus | undefined][] = [
        ['all', nbActiveInterviews, undefined],
        ['approved', 1, 'approved'],
        ['rejected', 1, 'rejected'],
        ['notReviewed', 3, 'notReviewed'],
        // Everything but the single rejected interview
        ['notRejected', 4, undefined],
        ['conflict', 0, undefined],
        ['forceApproved', 0, undefined]
    ];

    test.each(reviewStatusFilterCases)(
        'Get lists filtered on review status %s',
        async (reviewStatus, expectedCount, expectedStatus) => {
            const { interviews, totalCount } = await dbQueries.getList({
                filters: { review_status: { value: reviewStatus } },
                pageIndex: 0,
                pageSize: -1
            });
            expect(totalCount).toEqual(expectedCount);
            expect(interviews.length).toEqual(expectedCount);
            if (expectedStatus !== undefined) {
                interviews.forEach((interview) => expect(interview.review_status).toEqual(expectedStatus));
            }
        }
    );

    test('Get lists filtered on review status, the rejected interview is excluded from notRejected', async () => {
        const { interviews } = await dbQueries.getList({
            filters: { review_status: { value: 'notRejected' } },
            pageIndex: 0,
            pageSize: -1
        });
        expect(interviews.find((interview) => interview.uuid === localUserInterviewAttributes.uuid)).toBeUndefined();
        interviews.forEach((interview) => expect(interview.review_status).not.toEqual('rejected'));
    });

    test('An unknown review status filter value is ignored', async () => {
        const { totalCount } = await dbQueries.getList({
            filters: { review_status: { value: 'notAStatus' } },
            pageIndex: 0,
            pageSize: -1
        });
        expect(totalCount).toEqual(nbActiveInterviews);
    });

    test('Get lists with various filter combinations', async () => {

        // Query by updated time, most are null, 1 is 0
        const { interviews: filterUpdated0, totalCount: countUpdated0 } = await dbQueries.getList({ filters: { updated_at: { value: 0, op: 'gt' } }, pageIndex: 0, pageSize: -1 });
        expect(countUpdated0).toEqual(1);
        expect(filterUpdated0.length).toEqual(1);

        // Query by updated time, use now
        const updatedAt = moment().valueOf() / 1000;
        const { interviews: filterUpdatedAfterNow, totalCount: countUpdatedAfterNow } = await dbQueries.getList({ filters: { updated_at: { value: updatedAt, op: 'gt' } }, pageIndex: 0, pageSize: -1 });
        expect(countUpdatedAfterNow).toEqual(0);
        expect(filterUpdatedAfterNow.length).toEqual(0);

        // Query by creation time, use 0, sort by create data
        const { interviews: filterCreate, totalCount: countCreate } = await dbQueries.getList({ filters: { created_at: { value: 0, op: 'gt' } }, pageIndex: 0, pageSize: -1, sort: ['created_at'] });
        expect(countCreate).toEqual(5);
        expect(filterCreate.length).toEqual(5);

        // Pin created_at values so timestamp filter assertions are deterministic
        const pinnedCreatedAtBaseSeconds = 1_700_000_000;
        for (let index = 0; index < filterCreate.length; index++) {
            await knex('sv_interviews')
                .where('id', filterCreate[index].id)
                .update({ created_at: knex.raw(`to_timestamp(${pinnedCreatedAtBaseSeconds + index})`) });
        }

        // Query by creation time, use second value and offset otherwise test fails sometimes
        const createdAt = pinnedCreatedAtBaseSeconds + 1;
        const { interviews: filterCreate2, totalCount: countCreate2 } = await dbQueries.getList({ filters: { created_at: { value: createdAt, op: 'gt' } }, pageIndex: 0, pageSize: -1 });
        expect(countCreate2).toEqual(3);
        expect(filterCreate2.length).toEqual(3);

        // Query by creation time range
        const createdAtStart = pinnedCreatedAtBaseSeconds + 1;
        const createdAtEnd = pinnedCreatedAtBaseSeconds + 3;
        const { interviews: filterCreate3, totalCount: countCreate3 } = await dbQueries.getList({ filters: { created_at: { value: [createdAtStart, createdAtEnd] as any } }, pageIndex: 0, pageSize: -1 });
        expect(countCreate3).toEqual(3);
        expect(filterCreate3.length).toEqual(3);

        // Update one interview and query again by same updated time, it should return the udpated interview
        const databaseNowResult = await knex.raw('SELECT extract(epoch FROM now()) AS now_seconds');
        const updatedAtBeforeSingleUpdate = Number(databaseNowResult.rows[0].now_seconds);
        const addAttributes = { response: { foo: 'test' }, validations: { bar: true, other: 'data' } };
        const newAttributes = {
            response: Object.assign({}, googleUserInterviewAttributes.response, addAttributes.response)
        };
        await dbQueries.update(googleUserInterviewAttributes.uuid, newAttributes, 'uuid');
        const { interviews: filterUpdatedAfterNow2, totalCount: countUpdatedAfterNow2 } = await dbQueries.getList({ filters: { updated_at: { value: updatedAtBeforeSingleUpdate, op: 'gt' } }, pageIndex: 0, pageSize: -1 });
        expect(countUpdatedAfterNow2).toEqual(1);
        expect(filterUpdatedAfterNow2.length).toEqual(1);
        expect(filterUpdatedAfterNow2[0].uuid).toEqual(googleUserInterviewAttributes.uuid);

        // Query by access code not null
        const { interviews: filterAccessCodeNotNull, totalCount: countAccessCodeNotNull } =
            await dbQueries.getList({ filters: { 'response.accessCode': { value: null, op: 'not' } }, pageIndex: 0, pageSize: -1 });
        expect(countAccessCodeNotNull).toEqual(2);
        expect(filterAccessCodeNotNull.length).toEqual(2);
        for (let i = 0; i < 2; i++) {
            expect((filterAccessCodeNotNull[i].response as any).accessCode).toBeDefined();
        }

        // Query by access code not null
        const { interviews: filterAccessCodeNull, totalCount: countAccessCodeNull } =
            await dbQueries.getList({ filters: { 'response.accessCode': { value: null } }, pageIndex: 0, pageSize: -1 });
        expect(countAccessCodeNull).toEqual(3);
        expect(filterAccessCodeNull.length).toEqual(3);
        for (let i = 0; i < 2; i++) {
            expect((filterAccessCodeNull[i].response as any).accessCode).toBeUndefined();
        }

        // Query by access code not null
        const { interviews: filterAccessCodeGTE, totalCount: countAccessCodeGTE } =
            await dbQueries.getList({ filters: { 'response.accessCode': { value: googleUserInterviewAttributes.response.accessCode, op: 'eq' } }, pageIndex: 0, pageSize: -1 });
        expect(countAccessCodeGTE).toEqual(1);
        expect(filterAccessCodeGTE.length).toEqual(1);
        expect((filterAccessCodeGTE[0].response as any).accessCode).toEqual(googleUserInterviewAttributes.response.accessCode);

        // Query by access code with like
        const { interviews: filterAccessCodeLike, totalCount: countAccessCodeLike } =
            await dbQueries.getList({ filters: { 'response.accessCode': { value: localUserInterviewAttributes.response.accessCode.substring(0, 3), op: 'like' } }, pageIndex: 0, pageSize: -1 });
        expect(countAccessCodeLike).toEqual(1);
        expect(filterAccessCodeLike.length).toEqual(1);
        expect((filterAccessCodeLike[0].response as any).accessCode).toEqual(localUserInterviewAttributes.response.accessCode);

        // Query by response boolean
        const { interviews: filterResponseBoolean, totalCount: countResponseBoolean } =
            await dbQueries.getList({ filters: { 'response.booleanField': { value: 'true' } }, pageIndex: 0, pageSize: -1 });
        expect(countResponseBoolean).toEqual(1);
        expect(filterResponseBoolean.length).toEqual(1);
        expect((filterResponseBoolean[0].response as any).booleanField).toBeTruthy();

        // Query with array of values without results
        const { interviews: filterAccessCodeArray, totalCount: countAccessCodeArray } =
            await dbQueries.getList({ filters: { 'response.accessCode': { value: [localUserInterviewAttributes.response.accessCode.substring(0, 3), '222'], op: 'like' } }, pageIndex: 0, pageSize: -1 });
        expect(countAccessCodeArray).toEqual(0);
        expect(filterAccessCodeArray.length).toEqual(0);

        // Query with array of values with results
        const { interviews: filterAccessCodeArrayRes, totalCount: countAccessCodeArrayRes } =
            await dbQueries.getList({ filters: { 'response.accessCode': { value: [localUserInterviewAttributes.response.accessCode.substring(0, 3), localUserInterviewAttributes.response.accessCode.substring(0, 3)], op: 'like' } }, pageIndex: 0, pageSize: -1 });
        expect(countAccessCodeArrayRes).toEqual(1);
        expect(filterAccessCodeArrayRes.length).toEqual(1);
        expect((filterAccessCodeArrayRes[0].response as any).accessCode).toEqual(localUserInterviewAttributes.response.accessCode);

        // Query with the `in` operator: matches interviews whose access code is any of the
        // listed codes (e.g. a list imported from a CSV). Cannot use test.each here since
        // this runs inside a single test that relies on the seeded data above.
        const localAccessCode = localUserInterviewAttributes.response.accessCode;
        const googleAccessCode = googleUserInterviewAttributes.response.accessCode;
        const inCases: [string, string[], number][] = [
            ['both existing codes', [localAccessCode, googleAccessCode], 2],
            ['one existing and one unknown code', [localAccessCode, 'unknown-code'], 1],
            ['only unknown codes', ['unknown-1', 'unknown-2'], 0],
            ['empty list matches nothing', [], 0]
        ];
        for (const [, codes, expectedCount] of inCases) {
            const { interviews, totalCount } = await dbQueries.getList({
                filters: { 'response.accessCode': { value: codes, op: 'in' } },
                pageIndex: 0,
                pageSize: -1
            });
            expect(totalCount).toEqual(expectedCount);
            expect(interviews.length).toEqual(expectedCount);
        }

    });

    test('Combine filter and paging', async () => {

        // Get the interviews no reviewer rejected, with paging
        const filters = { review_status: { value: 'notRejected' } };
        const pageSize = 2;
        const { interviews: filterPage1, totalCount: totalCount1 } = await dbQueries.getList({ filters, pageIndex: 0, pageSize });
        expect(totalCount1).toEqual(4);
        expect(filterPage1.length).toEqual(pageSize);

        // Second page
        const { interviews: filterPage2, totalCount: totalCount2 } = await dbQueries.getList({ filters, pageIndex: 1, pageSize });
        expect(totalCount2).toEqual(4);
        expect(filterPage2.length).toEqual(pageSize);
        const inOtherPage = filterPage2.find((interview) => filterPage1.find((interview2) => interview2.id === interview.id) !== undefined);
        expect(inOtherPage).toBeUndefined();

        // There is no third page
        const { interviews: filterPage3, totalCount: totalCount3 } = await dbQueries.getList({ filters, pageIndex: 2, pageSize });
        expect(totalCount3).toEqual(4);
        expect(filterPage3.length).toEqual(0);

    });

    test('Page index, but page size is -1, should return all', async () => {
        const pageIndex = 3;
        const { interviews: page, totalCount: totalCount } = await dbQueries.getList({ filters: {}, pageIndex, pageSize: -1 });
        expect(totalCount).toEqual(nbActiveInterviews);
        expect(page.length).toEqual(nbActiveInterviews);
    });

    test('Sort data', async () => {
        // Sort by a top-level column
        const { interviews: page, totalCount: totalCount } = await dbQueries.getList({
            filters: {},
            pageIndex: 0,
            pageSize: -1,
            sort: ['is_completed']
        });
        expect(totalCount).toEqual(nbActiveInterviews);
        expect(page.length).toEqual(nbActiveInterviews);

        // Sort by accessCode response
        const { interviews: pageAsc, totalCount: totalCountAsc } = await dbQueries.getList({
            filters: {},
            pageIndex: 0,
            pageSize: -1,
            sort: ['response.accessCode']
        });
        expect(totalCountAsc).toEqual(nbActiveInterviews);
        expect(pageAsc.length).toEqual(nbActiveInterviews);

        // Sort by accessCode response descending
        const { interviews: pageDesc, totalCount: totalCountDesc } = await dbQueries.getList({
            filters: {},
            pageIndex: 0,
            pageSize: -1,
            sort: [{ field: 'response.accessCode', order: 'desc' }]
        });
        expect(totalCountDesc).toEqual(nbActiveInterviews);
        expect(pageDesc.length).toEqual(nbActiveInterviews);
        // Only the first 2 have values, first is now last
        for (let i = 0; i < 2; i++) {
            expect(pageAsc[i]).toEqual(pageDesc[nbActiveInterviews - 1 - i]);
        }
        // The remaining with undefined values will always show up in the same order
        for (let i = 2; i < nbActiveInterviews; i++) {
            expect(pageAsc[i]).toEqual(pageDesc[i - 2]);
        }

        // Sort by subfield
        const { interviews: page3, totalCount: totalCount3 } = await dbQueries.getList({
            filters: {},
            pageIndex: 0,
            pageSize: -1,
            sort: ['is_completed', { field: 'response.home.someField', order: 'desc' }]
        });
        expect(totalCount3).toEqual(nbActiveInterviews);
        expect(page3.length).toEqual(nbActiveInterviews);

    });

    // Parameters for list come from external, we cannot guarantee the types
    test('inject bad data', async () => {
        // Add invalid order by, should throw an error
        await expect(dbQueries.getList({
            filters: {},
            pageIndex: 0,
            pageSize: -1,
            sort: [{ field: 'response.accessCode', order: 'desc; select * from sv_interviews' as any }]
        }))
            .rejects
            .toThrow('Cannot get interview list in table sv_interviews database (knex error: Invalid sort order for interview query: desc; select * from sv_interviews (DBINTO0001))');

        // Inject bad where value
        await expect(dbQueries.getList({
            filters: { 'audits': { value: 'accessCode\'; delete from sv_interviews;' } },
            pageIndex: 0, pageSize: -1
        }))
            .rejects
            .toThrow('Cannot get interview list in table sv_interviews database (knex error: Invalid value for where clause in sv_interviews database (DBQCR0006))');

        // Inject bad where operator, should use =
        const { interviews: page2, totalCount: totalCount2 } = await dbQueries.getList({
            filters: { 'response.accessCode': { value: googleUserInterviewAttributes.response.accessCode, op: 'eq \'something\'; select * from sv_interviews;' as any } },
            pageIndex: 0, pageSize: -1
        });
        expect(totalCount2).toEqual(1);
        expect(page2.length).toEqual(1);
        expect((page2[0].response as any).accessCode).toEqual(googleUserInterviewAttributes.response.accessCode);

        // Inject bad where field, should throw an error
        await expect(dbQueries.getList({
            filters: { 'is_valid is true; delete from sv_interviews;': { value: 'accessCode\'; delete from sv_interviews;' } },
            pageIndex: 0, pageSize: -1
        }))
            .rejects
            .toThrow('Cannot get interview list in table sv_interviews database (knex error: Invalid field for where clause in sv_interviews database (DBQCR0005))');

        // The `in` operator is only allowed on response.* fields, should throw an error otherwise
        await expect(dbQueries.getList({
            filters: { uuid: { value: ['some-uuid'], op: 'in' } },
            pageIndex: 0, pageSize: -1
        }))
            .rejects
            .toThrow('Cannot get interview list in table sv_interviews database (knex error: The \'in\' operator is only supported for response fields in sv_interviews database (DBQCR0007))');

    });

    test('Get list by geographic filter', async () => {
        // Query home location on a polygon
        const polygon = {
            type: 'Feature' as const,
            geometry: {
                type: 'Polygon' as const,
                coordinates: [
                    [
                        [-74, 45],
                        [-73, 45],
                        [-73, 46],
                        [-74, 46],
                        [-74, 45]
                    ]
                ]
            },
            properties: {}
        };

        // Add home location in polygon for 2 interviews, and outside the polygon for 1 interview, ignore the others
        const { interviews, totalCount } = await dbQueries.getList({ filters: {}, pageIndex: 0, pageSize: -1 });
        expect(totalCount).toBeGreaterThan(3);
        const addHomeGeography = async (interview: InterviewListAttributes, homeGeography: Exclude<InterviewResponse['home'], undefined>['geography']) => {
            const response = { ...interview.response, home: { ...interview.response.home, geography: homeGeography } };
            await dbQueries.update(interview.uuid, { response }, 'uuid');
        };
        await addHomeGeography(interviews[0], {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [-73.572, 45.511] },
            properties: { lastAction: 'findPlace' }
        });
        await addHomeGeography(interviews[1], {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [-73.472, 45.202] },
            properties: { lastAction: 'findPlace' }
        });
        await addHomeGeography(interviews[2], {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [-100.472, 25.202] },
            properties: { lastAction: 'findPlace' }
        });
        const inPolygonUuids = [interviews[0].uuid, interviews[1].uuid];

        // Test filter on a valid geography field
        const filter =  { 'response.home.geography': { value: polygon } };
        const { interviews: inPolygonInterviews, totalCount: countInPolygon } = await dbQueries.getList({ filters: filter, pageIndex: 0, pageSize: -1 });
        expect(countInPolygon).toEqual(2);
        expect(inPolygonInterviews.length).toEqual(2);
        expect(inPolygonUuids.includes(inPolygonInterviews[0].uuid)).toBeTruthy();
        expect(inPolygonUuids.includes(inPolygonInterviews[1].uuid)).toBeTruthy();

        // Test filter on a non-geography field
        const filterInvalid =  { 'response.home': { value: polygon } };
        const { interviews: invalidGeoInterview, totalCount: invalidGeoCount } = await dbQueries.getList({ filters: filterInvalid, pageIndex: 0, pageSize: -1 });
        expect(invalidGeoCount).toEqual(0);
        expect(invalidGeoInterview.length).toEqual(0);
    });

    // Declared last, as the decisions of the second reviewer change the status of two of the
    // interviews the other tests of this block count on.
    describe('statuses taking a second reviewer', () => {

        beforeAll(async () => {
            // The second reviewer disagrees with the approval, and overrides the rejection
            await setInterviewReviewDecision(googleUserInterviewAttributes.uuid, localUser2WithPermission.id, 'reject');
            await setInterviewForceApprove(localUserInterviewAttributes.uuid, localUser2WithPermission.id);
        });

        afterAll(async () => {
            await knex('sv_review_decisions').where('user_id', localUser2WithPermission.id).delete();
        });

        // [review status filter, uuid of the only interview expected to match]
        const cases: [InterviewReviewStatusFilter, string][] = [
            ['conflict', googleUserInterviewAttributes.uuid],
            ['forceApproved', localUserInterviewAttributes.uuid]
        ];

        test.each(cases)('Get lists filtered on review status %s', async (reviewStatus, expectedUuid) => {
            const { interviews, totalCount } = await dbQueries.getList({
                filters: { review_status: { value: reviewStatus } },
                pageIndex: 0,
                pageSize: -1
            });
            expect(totalCount).toEqual(1);
            expect(interviews[0].uuid).toEqual(expectedUuid);
            expect(interviews[0].review_status).toEqual(reviewStatus);
        });

    });

});

describe('Queries with audits', () => {

    const errorOneCode = 'errorOne';
    const errorTwoCode = 'errorTwo';
    const errorThreeCode = 'errorThree';

    beforeAll(async () => {
        // Add 3 errors per person of type one, and one of type three for one of the interviews
        const firstInterview = await dbQueries.getInterviewByUuid(localUserInterviewAttributes.uuid);
        if (firstInterview === undefined) {
            throw 'error getting interview 1 for audits';
        }
        await create(knex, 'sv_audits', undefined, { interview_id: firstInterview.id, error_code: errorOneCode, object_type: 'person', object_uuid: uuidV4(), version: 2 } as any, { returning: 'interview_id' });
        await create(knex, 'sv_audits', undefined, { interview_id: firstInterview.id, error_code: errorOneCode, object_type: 'person', object_uuid: uuidV4(), version: 2 } as any, { returning: 'interview_id' });
        await create(knex, 'sv_audits', undefined, { interview_id: firstInterview.id, error_code: errorOneCode, object_type: 'person', object_uuid: uuidV4(), version: 2 } as any, { returning: 'interview_id' });
        await create(knex, 'sv_audits', undefined, { interview_id: firstInterview.id, error_code: errorThreeCode, object_type: 'interview', object_uuid: firstInterview.uuid, version: 2 } as any, { returning: 'interview_id' });

        // Add 3 errors per of type one, and one of type two for another interview
        const secondInterview = await dbQueries.getInterviewByUuid(googleUserInterviewAttributes.uuid);
        if (secondInterview === undefined) {
            throw 'error getting interview 2 for audits';
        }
        await create(knex, 'sv_audits', undefined, { interview_id: secondInterview.id, error_code: errorOneCode, object_type: 'person', object_uuid: uuidV4(), version: 2 } as any, { returning: 'interview_id' });
        await create(knex, 'sv_audits', undefined, { interview_id: secondInterview.id, error_code: errorOneCode, object_type: 'person', object_uuid: uuidV4(), version: 2 } as any, { returning: 'interview_id' });
        await create(knex, 'sv_audits', undefined, { interview_id: secondInterview.id, error_code: errorOneCode, object_type: 'person', object_uuid: uuidV4(), version: 2 } as any, { returning: 'interview_id' });
        await create(knex, 'sv_audits', undefined, { interview_id: secondInterview.id, error_code: errorTwoCode, object_type: 'household', object_uuid: uuidV4(), version: 2 } as any, { returning: 'interview_id' });

        // Only the second interview is approved, so a review status filter narrows the stats to its audits
        await setInterviewReviewDecision(googleUserInterviewAttributes.uuid, localUserWithPermission.id, 'approve');
    });

    afterAll(async () => {
        await truncate(knex, 'sv_audits');
        await truncate(knex, 'sv_review_decisions');
    });

    test('Get the complete list of validation errors', async () => {
        const { auditStats } = await dbQueries.getValidationAuditStats({ filters: {} });
        expect(auditStats.error).toEqual({
            person: [
                {
                    errorCode: 'errorOne',
                    count: 6
                }
            ],
            interview: [
                {
                    errorCode: 'errorThree',
                    count: 1
                }
            ],
            household: [
                {
                    errorCode: 'errorTwo',
                    count: 1
                }
            ]
        });
    });

    test('Get validation errors with a review status filter', async () => {
        const { auditStats } = await dbQueries.getValidationAuditStats({
            filters: { review_status: { value: 'approved' } }
        });
        expect(auditStats.error).toEqual({
            person: [
                {
                    errorCode: 'errorOne',
                    count: 3
                }
            ],
            household: [
                {
                    errorCode: 'errorTwo',
                    count: 1
                }
            ]
        });
    });

    test('List interviews with audit filter', async () => {

        // Query by audit
        const { interviews: filterAudit, totalCount: countAudit } =
            await dbQueries.getList({ filters: { 'audits': { value: 'errorThree' } }, pageIndex: 0, pageSize: -1 });
        expect(countAudit).toEqual(1);
        expect(filterAudit.length).toEqual(1);
        expect(filterAudit[0].uuid).toEqual(localUserInterviewAttributes.uuid);

    });

    test('List interviews with audit filter, no result', async () => {

        // Query by audit
        const { interviews: filterAudit, totalCount: countAudit } =
            await dbQueries.getList({ filters: { 'audits': { value: 'errorFour' } }, pageIndex: 0, pageSize: -1 });
        expect(countAudit).toEqual(0);
        expect(filterAudit.length).toEqual(0);

    });

    test('List interviews with multiple audit filters', async () => {

        // Query for errorThree and errorOne
        const { interviews: filterAudit, totalCount: countAudit } =
            await dbQueries.getList({ filters: { 'audits': { value: ['errorThree', 'errorOne'] } }, pageIndex: 0, pageSize: -1 });
        expect(countAudit).toEqual(1);
        expect(filterAudit.length).toEqual(1);
        expect(filterAudit[0].uuid).toEqual(localUserInterviewAttributes.uuid);

        // Query for errorThree and errorTwo, no result expected
        const { interviews: filterAudit2, totalCount: countAudit2 } =
            await dbQueries.getList({ filters: { 'audits': { value: ['errorThree', 'errorTwo'] } }, pageIndex: 0, pageSize: -1 });
        expect(countAudit2).toEqual(0);
        expect(filterAudit2.length).toEqual(0);

    });

    test('List interviews, validate audits', async () => {

        // Query by audit
        const { interviews, totalCount } = await dbQueries.getList({ filters: {}, pageIndex: 0, pageSize: -1 });
        expect(totalCount).toEqual(5);
        expect(interviews.length).toEqual(5);
        for (const interview of interviews) {
            if (interview.uuid === localUserInterviewAttributes.uuid) {
                const audits = interview.audits;
                expect(audits).toBeDefined();
                expect(Object.keys(audits as any).length).toEqual(2);
                expect(audits).toMatchObject({
                    [errorOneCode]: 3,
                    [errorThreeCode]: 1
                });
            } else if (interview.uuid === googleUserInterviewAttributes.uuid) {
                const audits = interview.audits;
                expect(audits).toBeDefined();
                expect(Object.keys(audits as any).length).toEqual(2);
                expect(audits).toMatchObject({
                    [errorOneCode]: 3,
                    [errorTwoCode]: 1
                });
            } else {
                const audits = interview.audits;
                expect(audits).toBeUndefined();
            }
        }

    });

});

describe('Queries with parameter validation audits', () => {

    // The code of a parameter validation audit is its message run through
    // `slugify`, so it holds punctuation that an audit check code does not.
    // The codes are built here from real validation messages, the way the
    // audits build them, so that they cannot drift from the stored ones.
    const paramValidationCodes = [
        'Person validateParams: age should be a positive integer',
        'VisitedPlace validateParams: activityCategory should be a string',
        'Segment validateParams: modePre should be one of the valid mode values'
    ].map((message) => slugify(message));

    beforeAll(async () => {
        const interview = await dbQueries.getInterviewByUuid(localUserInterviewAttributes.uuid);
        if (interview === undefined) {
            throw 'error getting interview for parameter validation audits';
        }
        for (const errorCode of paramValidationCodes) {
            await create(knex, 'sv_audits', undefined, { interview_id: interview.id, error_code: errorCode, object_type: 'visitedPlace', object_uuid: uuidV4(), version: 2 } as any, { returning: 'interview_id' });
        }
    });

    afterAll(async () => {
        await truncate(knex, 'sv_audits');
    });

    test.each(paramValidationCodes)('List the interviews having the audit %s', async (errorCode) => {
        const { interviews, totalCount } = await dbQueries.getList({ filters: { 'audits': { value: errorCode } }, pageIndex: 0, pageSize: -1 });
        expect(totalCount).toEqual(1);
        expect(interviews.length).toEqual(1);
        expect(interviews[0].uuid).toEqual(localUserInterviewAttributes.uuid);
    });

    test.each(paramValidationCodes)('Get the audit stats filtered by the audit %s', async (errorCode) => {
        const { auditStats } = await dbQueries.getValidationAuditStats({ filters: { 'audits': { value: errorCode } } });
        expect(auditStats.error?.visitedPlace).toEqual(expect.arrayContaining([{ errorCode, count: 1 }]));
    });

    // A filter can hold many codes, each one adding its own condition, so the
    // interviews and the stats are those having all of them
    test('List the interviews having every audit of an array of codes', async () => {
        const { interviews, totalCount } = await dbQueries.getList({ filters: { 'audits': { value: paramValidationCodes } }, pageIndex: 0, pageSize: -1 });
        expect(totalCount).toEqual(1);
        expect(interviews.length).toEqual(1);
        expect(interviews[0].uuid).toEqual(localUserInterviewAttributes.uuid);
    });

    test('Get the audit stats filtered by an array of codes', async () => {
        const { auditStats } = await dbQueries.getValidationAuditStats({ filters: { 'audits': { value: paramValidationCodes } } });
        expect(auditStats.error?.visitedPlace).toEqual(expect.arrayContaining(paramValidationCodes.map((errorCode) => ({ errorCode, count: 1 }))));
    });

    // An error code is a slug and never holds whitespace, which is what
    // separates a legitimate code from a value that cannot be one.
    test.each([
        ['a value with whitespace', 'error code with spaces'],
        ['an injection attempt', 'accessCode\'; delete from sv_interviews;'],
        ['a list holding a value that is not a string', ['errorOne', true]]
    ])('Refuse an audit filter on %s', async (_description, value) => {
        await expect(dbQueries.getList({ filters: { 'audits': { value: value as any } }, pageIndex: 0, pageSize: -1 }))
            .rejects
            .toThrow('Cannot get interview list in table sv_interviews database (knex error: Invalid value for where clause in sv_interviews database (DBQCR0006))');
    });

});

describe('stream interviews query', () => {

    // There are 6 interviews in the DB
    const nbInterviews = 7;
    let i = 0;

    const interviewerInterviewAttributes = {
        uuid: uuidV4(),
        participant_id: interviewerParticipant.id,
        is_valid: true,
        is_active: true,
        is_completed: undefined,
        response: {
            accessCode: '11111',
            booleanField: true
        },
        validations: {},
    } as any;

    beforeAll(async () => {
        // Add an interviewer from a phone interviewer, with some interview accesses
        const { id } = await dbQueries.create(interviewerInterviewAttributes, 'id');
        await knex('sv_interviews_accesses').insert({ interview_id: id, user_id: localUserWithPermission.id, for_validation: false, update_count: 3 });
    });

    beforeEach(() => {
        i = 0;
    });

    test('Get the complete list', (done) => {
        const queryStream = dbQueries.getInterviewsStream({ filters: {} });
        queryStream.on('error', (error) => {
            console.error(error);
            expect(true).toBe(false);
            done();
        })
            .on('data', (row) => {
                expect(row.audits).toBeDefined();
                expect(row.response).toBeDefined();
                expect(row.corrected_response).toBeDefined();
                if (row.corrected_response_available) {
                    expect(row.corrected_response).not.toBeNull();
                } else {
                    expect(row.corrected_response).toBeNull();
                }
                i++;
            })
            .on('end', () => {
                expect(i).toBe(nbInterviews);
                done();
            });
    });

    test('Stream without audits', (done) => {
        const queryStream = dbQueries.getInterviewsStream({ filters: {}, select: { includeAudits: false } });
        queryStream.on('error', (error) => {
            console.error(error);
            expect(true).toBe(false);
            done();
        })
            .on('data', (row) => {
                expect(row.audits).not.toBeDefined();
                expect(row.response).toBeDefined();
                expect(row.corrected_response).toBeDefined();
                if (row.corrected_response_available) {
                    expect(row.corrected_response).not.toBeNull();
                } else {
                    expect(row.corrected_response).toBeNull();
                }
                i++;
            })
            .on('end', () => {
                expect(i).toBe(nbInterviews);
                done();
            });
    });

    test('Stream with only response', (done) => {
        const queryStream = dbQueries.getInterviewsStream({ filters: {}, select: { responseType: 'participant' } });
        queryStream.on('error', (error) => {
            console.error(error);
            expect(true).toBe(false);
            done();
        })
            .on('data', (row) => {
                expect(row.audits).toBeDefined();
                expect(row.response).toBeDefined();
                expect(row.corrected_response).not.toBeDefined();
                i++;
            })
            .on('end', () => {
                expect(i).toBe(nbInterviews);
                done();
            });
    });

    test('Stream with only corrected_response', (done) => {
        const queryStream = dbQueries.getInterviewsStream({ filters: {}, select: { responseType: 'corrected' } });
        queryStream.on('error', (error) => {
            console.error(error);
            expect(true).toBe(false);
            done();
        })
            .on('data', (row) => {
                expect(row.audits).toBeDefined();
                expect(row.response).not.toBeDefined();
                expect(row.corrected_response).toBeDefined();
                i++;
            })
            .on('end', () => {
                expect(i).toBe(nbInterviews);
                done();
            });
    });

    test('Stream without response or corrected_response or audits', (done) => {
        const queryStream = dbQueries.getInterviewsStream({ filters: {}, select: { includeAudits: false, responseType: 'none' } });
        queryStream.on('error', (error) => {
            console.error(error);
            expect(true).toBe(false);
            done();
        })
            .on('data', (row) => {
                expect(row.audits).not.toBeDefined();
                expect(row.response).not.toBeDefined();
                expect(row.corrected_response).not.toBeDefined();
                i++;
            })
            .on('end', () => {
                expect(i).toBe(nbInterviews);
                done();
            });
    });

    test('Stream with both response and corrected_response', (done) => {
        const queryStream = dbQueries.getInterviewsStream({ filters: {}, select: { responseType: 'both' } });
        queryStream.on('error', (error) => {
            console.error(error);
            expect(true).toBe(false);
            done();
        })
            .on('data', (row) => {
                expect(row.audits).toBeDefined();
                expect(row.response).toBeDefined();
                expect(row.corrected_response).toBeDefined();
                i++;
            })
            .on('end', () => {
                expect(i).toBe(nbInterviews);
                done();
            });
    });

    test('Stream with corrected_response if available', (done) => {
        const queryStream = dbQueries.getInterviewsStream({ filters: {}, select: { responseType: 'correctedIfAvailable' } });
        queryStream.on('error', (error) => {
            console.error(error);
            expect(true).toBe(false);
            done();
        })
            .on('data', (row) => {
                expect(row.audits).toBeDefined();
                expect(row.response).toBeDefined();
                expect(row.corrected_response).not.toBeDefined();
                if (row.corrected_response_available) {
                    if (row.uuid === googleUserInterviewAttributes.uuid) {
                        expect(row.response).toEqual(googleUserInterviewAttributes.corrected_response);
                    } else {
                        expect('There is a unknown row with corrected_response').toEqual('Only the google participant interview should have corrected_response');
                    }
                } else {
                    expect(row.uuid).not.toEqual(googleUserInterviewAttributes.uuid);
                    if (row.uuid === facebookUserInterviewAttributes.uuid) {
                        expect(row.response).toEqual(facebookUserInterviewAttributes.response);
                    }
                }
                i++;
            })
            .on('end', () => {
                expect(i).toBe(nbInterviews);
                done();
            });
    });

    test('Get the interviewer data', (done) => {
        let foundInterviewerInterview = false;
        const queryStream = dbQueries.getInterviewsStream({ filters: {}, select: { includeInterviewerData: true } });
        queryStream.on('error', (error) => {
            console.error(error);
            expect(true).toBe(false);
            done();
        })
            .on('data', (row) => {
                expect(row.audits).toBeDefined();
                expect(row.response).toBeDefined();
                expect(row.corrected_response).toBeDefined();
                if (row.corrected_response_available) {
                    expect(row.corrected_response).not.toBeNull();
                } else {
                    expect(row.corrected_response).toBeNull();
                }
                if (row.uuid === interviewerInterviewAttributes.uuid) {
                    expect(row.interviewer_created).toEqual(true);
                    expect(row.interviewer_count).toEqual('1');
                    foundInterviewerInterview = true;
                } else {
                    expect(row.interviewer_created).toEqual(false);
                    expect(row.interviewer_count).toEqual(null);
                }
                i++;
            })
            .on('end', () => {
                expect(i).toBe(nbInterviews);
                expect(foundInterviewerInterview).toEqual(true);
                done();
            });
    });

});

// Last of the file: this describe answers interviews again, which moves their `updated_at` and
// would throw off the tests above that count the interviews updated since a given time.
describe('list the interviews answered again after their review', () => {

    beforeAll(async () => {
        await setInterviewReviewDecision(googleUserInterviewAttributes.uuid, localUserWithPermission.id, 'approve');
        await setInterviewReviewDecision(localUserInterviewAttributes.uuid, localUserWithPermission.id, 'reject');
    });

    afterAll(async () => {
        await truncate(knex, 'sv_review_decisions');
    });

    const listModifiedSinceReview = async () =>
        await dbQueries.getList({ filters: { modified_since_review: { value: true } }, pageIndex: 0, pageSize: -1 });

    const answerAgain = async (interviewUuid: string, secondsFromNow: number) => {
        const interview = await dbQueries.getInterviewByUuid(interviewUuid) as any;
        await dbQueries.update(interviewUuid, {
            response: { ...interview.response, _updatedAt: Math.round(Date.now() / 1000) + secondsFromNow }
        });
    };

    test('An interview nobody answered again since its review does not match', async () => {
        const { totalCount } = await listModifiedSinceReview();
        expect(totalCount).toEqual(0);
    });

    test('An interview answered before its review does not match', async () => {
        await answerAgain(googleUserInterviewAttributes.uuid, -3600);

        const { totalCount } = await listModifiedSinceReview();
        expect(totalCount).toEqual(0);
    });

    test('An interview answered after its review matches, an unreviewed one never does', async () => {
        const { interviews: allInterviews } = await dbQueries.getList({ filters: {}, pageIndex: 0, pageSize: -1 });
        const unreviewed = allInterviews.find(
            (interview) =>
                interview.uuid !== googleUserInterviewAttributes.uuid &&
                interview.uuid !== localUserInterviewAttributes.uuid
        );

        await answerAgain(googleUserInterviewAttributes.uuid, 60);
        await answerAgain(unreviewed!.uuid, 60);

        const { interviews, totalCount } = await listModifiedSinceReview();
        expect(totalCount).toEqual(1);
        expect(interviews[0].uuid).toEqual(googleUserInterviewAttributes.uuid);
    });

});
