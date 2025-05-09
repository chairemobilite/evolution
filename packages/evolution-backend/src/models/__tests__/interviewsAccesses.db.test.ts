/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import { v4 as uuidV4 } from 'uuid';
import { create, truncate } from 'chaire-lib-backend/lib/models/db/default.db.queries';

import dbQueries from '../interviewsAccesses.db.queries';
import interviewsDbQueries from '../interviews.db.queries';

const permission1 = 'role1';
const permission2 = 'role2';

const localParticipant = {
    id: 1,
    email: 'test@transition.city',
    is_valid: true
};

const localUser = {
    ...localParticipant,
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

const localUserInterviewAttributes = {
    uuid: uuidV4(),
    participant_id: localParticipant.id,
    is_valid: false,
    is_active: true,
    is_completed: undefined,
    responses: {
        accessCode: '11111',
        booleanField: true,
    },
    validations: {},
    audits: { errorOne: 3, errorThree: 1 }
} as any;

beforeAll(async () => {
    jest.setTimeout(10000);
    await truncate(knex, 'sv_interviews_accesses');
    await truncate(knex, 'sv_interviews');
    await truncate(knex, 'sv_participants');
    await create(knex, 'sv_participants', undefined, localParticipant as any);
    await truncate(knex, 'users');
    await create(knex, 'users', undefined, localUser as any);
    await create(knex, 'users', undefined, anotherUser as any);
    await interviewsDbQueries.create(localUserInterviewAttributes);
});

afterAll(async() => {
    await truncate(knex, 'sv_interviews_accesses');
    await truncate(knex, 'sv_interviews');
    await truncate(knex, 'users');
    await truncate(knex, 'sv_participants');
    await knex.destroy();
});

const assertAccessCounts = async (cnt: number) => {
    const data = await dbQueries.collection();
    expect(data.length).toEqual(cnt);
}

describe('userOpenedInterview', () => {

    test('User opened existing interview for the first time', async() => {
        expect(await dbQueries.userOpenedInterview({ interviewUuid: localUserInterviewAttributes.uuid, userId: localUser.id })).toEqual(true);
        await assertAccessCounts(1);
    });

    test('User opened existing interview once more', async() => {
        expect(await dbQueries.userOpenedInterview({ interviewUuid: localUserInterviewAttributes.uuid, userId: localUser.id })).toEqual(true);
        await assertAccessCounts(1);
    });

    test('Interview does not exist', async() => {
        let exception: any = undefined;
        try {
            await dbQueries.userOpenedInterview({ interviewUuid: uuidV4(), userId: localUser.id })
        } catch (error) {
            exception = error;
        }
        expect(exception).toBeDefined();
        expect((exception as any).message).toEqual(expect.stringContaining("cannot log the user opening the interview (knex error: The requested interview does not exist:"))
        await assertAccessCounts(1);
    });

    test('User does not exist', async() => {
        let exception: any = undefined;
        try {
            await dbQueries.userOpenedInterview({ interviewUuid:localUserInterviewAttributes.uuid, userId: localUser.id - 1 })
        } catch (error) {
            exception = error;
        }
        expect(exception).toBeDefined();
        expect((exception as any).message).toEqual(expect.stringContaining('violates foreign key constraint "sv_interviews_accesses_user_id_foreign")'))
        await assertAccessCounts(1);
    });

    test('Second user opened existing interview', async() => {
        expect(await dbQueries.userOpenedInterview({ interviewUuid: localUserInterviewAttributes.uuid, userId: anotherUser.id, validationMode: false })).toEqual(true);
        await assertAccessCounts(2);
    });

    test('Second user opened existing interview, for validation', async() => {
        expect(await dbQueries.userOpenedInterview({ interviewUuid: localUserInterviewAttributes.uuid, userId: anotherUser.id, validationMode: true })).toEqual(true);
        await assertAccessCounts(3);
    });

});

describe('userUpdatedInterview', () => {

    const assertUpdateCounts = async (userId: number, validationMode: boolean, updateCnt: number) => {
        const data = await dbQueries.collection();
        const record = data.find(access => access.user_id === userId && access.for_validation === validationMode)
        expect(record).toBeDefined();
        expect(record?.update_count).toEqual(updateCnt);
    }

    test('User updated interview in edit mode', async() => {
        expect(await dbQueries.userUpdatedInterview({ interviewUuid: localUserInterviewAttributes.uuid, userId: anotherUser.id })).toEqual(true);
        await assertAccessCounts(3);
        await assertUpdateCounts(anotherUser.id, false, 1);
    });

    test('User updated interview in edit mode, again', async() => {
        expect(await dbQueries.userUpdatedInterview({ interviewUuid: localUserInterviewAttributes.uuid, userId: anotherUser.id, validationMode: false })).toEqual(true);
        await assertAccessCounts(3);
        await assertUpdateCounts(anotherUser.id, false, 2);
    });

    test('User updated interview in validation mode', async() => {
        expect(await dbQueries.userUpdatedInterview({ interviewUuid: localUserInterviewAttributes.uuid, userId: anotherUser.id, validationMode: true })).toEqual(true);
        await assertAccessCounts(3);
        await assertUpdateCounts(anotherUser.id, true, 1);
    });

    test('User updated interview in validation mode, again', async() => {
        expect(await dbQueries.userUpdatedInterview({ interviewUuid: localUserInterviewAttributes.uuid, userId: anotherUser.id, validationMode: true })).toEqual(true);
        await assertAccessCounts(3);
        await assertUpdateCounts(anotherUser.id, true, 2);
    });

    test('New user updated interview in validation mode', async() => {
        expect(await dbQueries.userUpdatedInterview({ interviewUuid: localUserInterviewAttributes.uuid, userId: localUser.id, validationMode: true })).toEqual(true);
        await assertAccessCounts(4);
        await assertUpdateCounts(localUser.id, true, 1);
    });

    test('New user updated interview in validation mode, again', async() => {
        expect(await dbQueries.userUpdatedInterview({ interviewUuid: localUserInterviewAttributes.uuid, userId: localUser.id, validationMode: true })).toEqual(true);
        await assertAccessCounts(4);
        await assertUpdateCounts(localUser.id, true, 2);
    });

    test('Interview does not exist', async() => {
        let exception: any = undefined;
        try {
            await dbQueries.userUpdatedInterview({ interviewUuid: uuidV4(), userId: localUser.id })
        } catch (error) {
            exception = error;
        }
        expect(exception).toBeDefined();
        expect((exception as any).message).toEqual(expect.stringContaining("cannot log the user updating an interview (knex error: The requested interview does not exist:"))
        
    });

    test('User does not exist', async() => {
        let exception: any = undefined;
        try {
            await dbQueries.userUpdatedInterview({ interviewUuid:localUserInterviewAttributes.uuid, userId: localUser.id - 1 })
        } catch (error) {
            exception = error;
        }
        expect(exception).toBeDefined();
        expect((exception as any).message).toEqual(expect.stringContaining('violates foreign key constraint "sv_interviews_accesses_user_id_foreign")'))
    });

});

describe(`Stat editing users`, () => {

    test('Stat all users', async () => {
        const statUsers = await dbQueries.statEditingUsers({});
        expect(statUsers.length).toEqual(4);
        statUsers.forEach((statUser) => {
            switch(statUser.email) {
                case localUser.email: 
                    expect(statUser.update_count).toEqual(statUser.for_validation ? 2 : 0);
                    break;
                case anotherUser.email:
                    expect(statUser.update_count).toEqual(2);
                    break;
                default:
                    throw `Unexpected user email ${statUser.email}`;
            }
        })
    });

    test('Stat for specific permission', async () => {
        const statUsers = await dbQueries.statEditingUsers({ permissions: [permission2]});
        expect(statUsers.length).toEqual(2);
        statUsers.forEach((statUser) => {
            switch(statUser.email) {
                case anotherUser.email:
                    expect(statUser.update_count).toEqual(2);
                    break;
                default:
                    throw `Unexpected user email ${statUser.email}`;
            }
        })
    });

    test('Stat for multiple permission', async () => {
        const statUsers = await dbQueries.statEditingUsers({ permissions: [permission2, permission1]});
        expect(statUsers.length).toEqual(4);
        statUsers.forEach((statUser) => {
            switch(statUser.email) {
                case localUser.email: 
                    expect(statUser.update_count).toEqual(statUser.for_validation ? 2 : 0);
                    break;
                case anotherUser.email:
                    expect(statUser.update_count).toEqual(2);
                    break;
                default:
                    throw `Unexpected user email ${statUser.email}`;
            }
        })
    });

});