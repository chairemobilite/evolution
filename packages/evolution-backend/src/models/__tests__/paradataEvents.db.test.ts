/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { v4 as uuidV4 } from 'uuid';
import each from 'jest-each';
import _isEqual from 'lodash/isEqual'

import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import { create, truncate } from 'chaire-lib-backend/lib/models/db/default.db.queries';

import dbQueries from '../paradataEvents.db.queries';
import interviewsDbQueries from '../interviews.db.queries';

// Mock data
const localParticipant = {
    id: 1,
    email: 'test@transition.city',
    is_valid: true
};

const localUser = {
    ...localParticipant,
    id: 2,
    uuid: uuidV4()
}

const localUserInterviewAttributes = {
    id: 100,
    uuid: uuidV4(),
    participant_id: localParticipant.id,
    is_valid: false,
    is_active: true,
    is_completed: undefined,
    responses: {
        accessCode: '11111',
        booleanField: true,
    },
    validations: {}
} as any;


beforeAll(async () => {
    jest.setTimeout(10000);
    await truncate(knex, 'paradata_events');
    await truncate(knex, 'sv_interviews');
    await truncate(knex, 'sv_participants');
    await create(knex, 'sv_participants', undefined, localParticipant as any);
    await truncate(knex, 'users');
    await create(knex, 'users', undefined, localUser as any);
    await interviewsDbQueries.create(localUserInterviewAttributes);
});

afterAll(async() => {
    await truncate(knex, 'paradata_events');
    await truncate(knex, 'sv_interviews');
    await truncate(knex, 'users');
    await truncate(knex, 'sv_participants');
    await knex.destroy();
});

const testStart = Date.now();


describe('paradata log', () => {

    beforeEach(async () => {
        await truncate(knex, 'paradata_events');
    });

    const defaultEventData = { someData: 'value', anotherData: 'value' };

    const validateLogData = async (expected: { userId: number | null, eventData: any }[]) => {
        const now = Date.now();
        const events = await knex('paradata_events').select(['*', knex.raw('EXTRACT(EPOCH FROM timestamp) as unix_timestamp')]).orderBy('timestamp');
        expect(events.length).toEqual(expected.length);

        let lastTimestamp = testStart;
        for (let i = 0; i < events.length; i++) {
            const event = events[i];

            // Validate all timestamps are greater than previous or test start and less than now (at us precision, it should not be equal)
            expect(event.unix_timestamp * 1000).toBeGreaterThan(lastTimestamp);
            expect(event.unix_timestamp * 1000).toBeLessThan(now);
            lastTimestamp = event.unix_timestamp * 1000;

            // Validate interview ID, event type, user_id and event data
            expect(event.interview_id).toEqual(localUserInterviewAttributes.id);
            expect(event.event_type).toEqual('button_click');
        }
        // For each expected data, make sure there's a log
        for (let i = 0; i < expected.length; i++) {
            const expectedData = expected[i];
            const event = events.find((event) => expectedData.userId === event.user_id && _isEqual(expectedData.eventData, event.event_data));
            expect(event).toEqual(expect.objectContaining({
                event_data: expectedData.eventData,
                user_id: expectedData.userId
            }));
        }
    }

    test('Log for a participant (no user id)', async() => {
        expect(await dbQueries.log({
            interviewId: localUserInterviewAttributes.id,
            eventType: 'button_click',
            eventData: defaultEventData
        })).toEqual(true);
        await validateLogData([{ userId: null, eventData: defaultEventData }]);
    });

    test('Log with user ID', async () => {
        expect(await dbQueries.log({
            interviewId: localUserInterviewAttributes.id,
            eventType: 'button_click',
            eventData: defaultEventData,
            userId: localUser.id
        })).toEqual(true);
        await validateLogData([{ userId: localUser.id, eventData: defaultEventData}]);
    });

    test('Log multiple data', async() => {
        const secondEventData = { someData: 'value2', anotherData: 'value2', something: 'test' };
        // Save a log for user and a log for participant
        const promises = [
            dbQueries.log({
                interviewId: localUserInterviewAttributes.id,
                eventType: 'button_click',
                eventData: defaultEventData,
                userId: localUser.id
            }),
            dbQueries.log({
                interviewId: localUserInterviewAttributes.id,
                eventType: 'button_click',
                eventData: secondEventData
            })
        ];
        await Promise.all(promises);
        await validateLogData([
            { userId: localUser.id, eventData: defaultEventData},
            { userId: null, eventData: secondEventData }
        ]);
    });
    
    each([
        ['Invalid event type', { eventType: 'invalid_event_type' }],
        ['Unknown user', { userId: localUser.id + 1 } ],
        ['Unknown interview ID', { interviewId: localUserInterviewAttributes.id + 1 }],
    ]).test('Log with errors: %s', async (_desc, changedData) => {
        const invalidParadataLog = Object.assign({
            interviewId: localUserInterviewAttributes.id,
            eventType: 'button_click',
            eventData: defaultEventData
        }, changedData);
        await expect(dbQueries.log(invalidParadataLog)).rejects.toThrow(expect.anything());
        const data = await knex('paradata_events').select();
        expect(data.length).toEqual(0);
    });

});
