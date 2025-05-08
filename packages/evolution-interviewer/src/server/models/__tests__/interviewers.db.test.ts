/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import { v4 as uuidV4 } from 'uuid';
import moment from 'moment';
import { create, truncate } from 'chaire-lib-backend/lib/models/db/default.db.queries';

import interviewsDbQueries from 'evolution-backend/lib/models/interviews.db.queries';
import dbQueries from '../interviewers.db.queries';

const permission1 = 'role1';
const permission2 = 'role2';
const interviewCount = 10;

const localUser = {
    id: 1,
    email: 'test@transition.city',
    is_valid: true,
    uuid: uuidV4(),
    permissions: {
        [permission1]: true
    }
}

const anotherUser = {
    id: 2,
    email: 'test2@transition.city',
    is_valid: true,
    uuid: uuidV4(),
    permissions: {
        [permission2]: true
    }
}

const baseResponses = {
    accessCode: '11111',
    booleanField: true,
};



beforeAll(async () => {
    jest.setTimeout(10000);
    // create users, interviews and accesses
    await truncate(knex, 'sv_interviews_accesses');
    await truncate(knex, 'sv_interviews');
    await truncate(knex, 'sv_participants');
    // insert 10 interviews and participants
    for (let i = 0; i < interviewCount; i++) {
        const localParticipant = {
            id: i,
            email: `example${i}@transition.city`,
            is_valid: true
        }
        const localUserInterviewAttributes = {
            id: i,
            uuid: uuidV4(),
            participant_id: localParticipant.id,
            is_valid: false,
            is_active: true,
            is_completed: undefined,
            responses: baseResponses,
            validations: {},
            logs: [],
            audits: { errorOne: 3, errorThree: 1 }
        };
        await create(knex, 'sv_participants', undefined, localParticipant as any);
        await interviewsDbQueries.create(localUserInterviewAttributes);
    }
    // insert 2 users
    await truncate(knex, 'users');
    await create(knex, 'users', undefined, localUser as any);
    await create(knex, 'users', undefined, anotherUser as any);
    
});

afterAll(async() => {
    await truncate(knex, 'sv_interviews_accesses');
    await truncate(knex, 'sv_interviews');
    await truncate(knex, 'users');
    await truncate(knex, 'sv_participants');
    await knex.destroy();
});

describe('getInterviewerDataBatch', () => {

    beforeEach(async () => {
        await truncate(knex, 'sv_interviews_accesses');
    })

    test('Return only interviews for edition, not validation', async() => {
        // localUser edited 4 interviews and validated 2, one which overlaps the edition
        for (let i = 0; i < 4; i++) {
            await create(knex, 'sv_interviews_accesses', undefined, {
                interview_id: i,
                user_id: localUser.id,
                for_validation: false,
                update_count: (i + 1) * 4,
                created_at: moment('2023-08-24 22:57:00'),
                updated_at: moment('2023-08-24 22:59:00')
            } as any, { returning: 'interview_id'});
        }
        for (let i = 3; i < 5; i++) {
            await create(knex, 'sv_interviews_accesses', undefined, {
                interview_id: i,
                user_id: localUser.id,
                for_validation: true,
                update_count: (i + 1) * 4,
                created_at: moment('2023-08-24 22:57:00'),
                updated_at: moment('2023-08-24 22:59:00')
            } as any, { returning: 'interview_id'});
        }

        // Test
        const data = await dbQueries.getInterviewerDataBatch({ offset: 0, limit: 10, start: 0, end: moment('2025-08-24').unix() });
        expect(data.length).toEqual(4);
    });

    test('Validate start/end', async() => {
        // localUser edited 4 interviews sequentially (from august 24 to 27)
        const interviewerData: { localUser: any[], anotherUser: any[]} = {
            localUser: [],
            anotherUser: []
        }
        for (let i = 0; i < 4; i++) {
            const data = {
                interview_id: i,
                user_id: localUser.id,
                for_validation: false,
                update_count: (i + 1) * 4,
                created_at: moment(`2023-08-${24 + i} 22:57:00`),
                updated_at: moment(`2023-08-${24 + i} 22:59:00`)
            };
            interviewerData.localUser.push(data);
            await create(knex, 'sv_interviews_accesses', undefined, data as any, { returning: 'interview_id'});
        }
        // anotherUser edited 4 interviews, embedded within a week (from august 21 to 27)
        for (let i = 0; i < 4; i++) {
            const data = {
                interview_id: i,
                user_id: anotherUser.id,
                for_validation: false,
                update_count: (i + 1) * 4,
                created_at: moment(`2023-08-${24 - i} 22:57:00`),
                updated_at: moment(`2023-08-${24 + i} 22:59:00`)
            };
            interviewerData.anotherUser.push(data);
            await create(knex, 'sv_interviews_accesses', undefined, data as any, { returning: 'interview_id'});
        }

        const findData = (dbData, toFind) => dbData.findIndex(data => toFind.interview_id === data.interview_id && toFind.user_id === data.user_id) !== -1;

        // august 18 to 23 should return 3 interviews, for anotherUser
        let data = await dbQueries.getInterviewerDataBatch({ offset: 0, limit: 20, start: moment('2023-08-18 00:00:00').unix(), end: moment('2023-08-23 23:59:59').unix() });
        expect(data.length).toEqual(3);
        expect(findData(data, interviewerData.anotherUser[1])).toEqual(true);
        expect(findData(data, interviewerData.anotherUser[2])).toEqual(true);
        expect(findData(data, interviewerData.anotherUser[3])).toEqual(true);

        // august 21 to 27 should return them all
        data = await dbQueries.getInterviewerDataBatch({ offset: 0, limit: 20, start: moment('2023-08-21 00:00:00').unix(), end: moment('2023-08-27 23:59:59').unix() });
        expect(data.length).toEqual(8);
        expect(findData(data, interviewerData.anotherUser[0])).toEqual(true);
        expect(findData(data, interviewerData.anotherUser[1])).toEqual(true);
        expect(findData(data, interviewerData.anotherUser[2])).toEqual(true);
        expect(findData(data, interviewerData.anotherUser[3])).toEqual(true);
        expect(findData(data, interviewerData.localUser[0])).toEqual(true);
        expect(findData(data, interviewerData.localUser[1])).toEqual(true);
        expect(findData(data, interviewerData.localUser[2])).toEqual(true);
        expect(findData(data, interviewerData.localUser[3])).toEqual(true);

        // august 23 to 25 should return 6 interviews (2 for localUser, 4 for anotherUser)
        data = await dbQueries.getInterviewerDataBatch({ offset: 0, limit: 20, start: moment('2023-08-23 00:00:00').unix(), end: moment('2023-08-25 23:59:59').unix() });
        expect(data.length).toEqual(6);
        expect(findData(data, interviewerData.anotherUser[0])).toEqual(true);
        expect(findData(data, interviewerData.anotherUser[1])).toEqual(true);
        expect(findData(data, interviewerData.anotherUser[2])).toEqual(true);
        expect(findData(data, interviewerData.anotherUser[3])).toEqual(true);
        expect(findData(data, interviewerData.localUser[0])).toEqual(true);
        expect(findData(data, interviewerData.localUser[1])).toEqual(true);

        // august 26 to 31 should return 4 interviews (2 for localUser, 2 for anotherUser)
        data = await dbQueries.getInterviewerDataBatch({ offset: 0, limit: 20, start: moment('2023-08-26 00:00:00').unix(), end: moment('2023-08-31 23:59:59').unix() });
        expect(data.length).toEqual(4);
        expect(findData(data, interviewerData.anotherUser[2])).toEqual(true);
        expect(findData(data, interviewerData.anotherUser[3])).toEqual(true);
        expect(findData(data, interviewerData.localUser[2])).toEqual(true);
        expect(findData(data, interviewerData.localUser[3])).toEqual(true);
    });

    test('Pagination', async() => {
        // create unsorted data, localUser edited interviews whose id divide by 3, anotherUser by 2
        const expectedResults: any[] = [];
        for (let i = 0; i < interviewCount; i++) {
            if (i % 3 === 0) {
                await create(knex, 'sv_interviews_accesses', undefined, {
                    interview_id: i,
                    user_id: localUser.id,
                    for_validation: false,
                    update_count: (i + 1) * 4,
                    created_at: moment('2023-08-24 22:57:00'),
                    updated_at: moment('2023-08-24 22:59:00')
                } as any, { returning: 'interview_id'});
                expectedResults.push({
                    email: localUser.email, 
                    interview_id: i
                });
            }
            if (i % 2 === 0) {
                await create(knex, 'sv_interviews_accesses', undefined, {
                    interview_id: i,
                    user_id: anotherUser.id,
                    for_validation: false,
                    update_count: (i + 1) * 4,
                    created_at: moment('2023-08-24 22:57:00'),
                    updated_at: moment('2023-08-24 22:59:00')
                } as any, { returning: 'interview_id'});
                expectedResults.push({
                    email: anotherUser.email, 
                    interview_id: i
                });
            }
        }
        
        // Return by pages of 3, make sure there are no duplicates and that they are sorted
        const pageSize = 3;
        const expectedPageCount = Math.ceil(expectedResults.length / pageSize);
        const allResults: any[] = [];
        for (let i = 0; i < expectedPageCount; i++) {
            const currentPage = await dbQueries.getInterviewerDataBatch({ offset: i * pageSize, limit: pageSize, start: 0, end: moment('2025-08-24').unix() });
            allResults.push(...currentPage);
        }
        expect(allResults.length).toEqual(expectedResults.length);
        // Find all the interviews that were inserted
        for (let i = 0; i < expectedResults.length; i++) {
            const expected = expectedResults[i];
            expect(allResults.findIndex((result => result.interview_id === expected.interview_id && result.email === expected.email))).toBeGreaterThanOrEqual(0);
        }

        // Make sure they are sorted
        for (let i = 0; i < Math.floor(interviewCount / 3) + 1; i++) {
            expect(allResults[i].email).toEqual(localUser.email);
        }
        for (let i = Math.floor(interviewCount / 3) + 1; i < expectedResults.length; i++) {
            expect(allResults[i].email).toEqual(anotherUser.email);
        }

        // Make sure the next page is empty
        const currentPage = await dbQueries.getInterviewerDataBatch({ offset: expectedPageCount * pageSize, limit: pageSize, start: 0, end: moment('2025-08-24').unix() });
        expect(currentPage).toEqual([]);
    });

});
