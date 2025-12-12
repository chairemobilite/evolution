/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import each from 'jest-each';
import knex from 'chaire-lib-backend/lib/config/shared/db.config';

import dbQueries from '../participants.db.queries';
import { truncate } from 'chaire-lib-backend/lib/models/db/default.db.queries';
import { ParticipantAttributes } from '../../services/participants/participant';

const participant1 = {
    email: 'test@test.org',
    username: 'p1',
    preferences: { lang: 'fr' },
    first_name: 'Toto'
};

const participant2 = {
    email: 'test@example.org',
    username: 'p2',
    preferences: { lang: 'fr' },
    first_name: 'Toto',
};

const participantToInsert = {
    email: 'newUser@test.org',
    preferences: { lang: 'fr' },
    first_name: 'Foo'
};

// Keep participant IDs in an object as otherwise the parameterized test use
// values from before the participants are inserted in the `beforeAll` hook
const participantIds = {
    participantId1: -1,
    participantId2: -1
}

beforeAll(async () => {
    jest.setTimeout(10000);
    await truncate(knex, 'sv_participants');
    await truncate(knex, 'sv_participant_logins');
    // Insert 2 participants and keep their IDs
    const part1Ret = await knex('sv_participants').insert(participant1).returning('id');
    participantIds.participantId1 = part1Ret[0].id;
    const part2Ret = await knex('sv_participants').insert(participant2).returning('id');
    participantIds.participantId2 = part2Ret[0].id;
});

afterAll(async() => {
    await truncate(knex, 'sv_participants');
    await truncate(knex, 'sv_participant_logins');
    await knex.destroy();
});

each([
    [{ email: participant1.email }, participant1 ],
    [{}, undefined],
    [{ email: 'other' }, undefined],
    [{ email: participant1.email.toUpperCase() }, participant1 ],
    [{ usernameOrEmail: participant1.email }, participant1],
    [{ usernameOrEmail: participant1.username }, participant1],
    [{ username: participant2.username, email: 'arbitrary' }, undefined],
    [{ usernameOrEmail: participant2.email.toUpperCase() }, participant2],
    [{ usernameOrEmail: participant2.email.toUpperCase() }, participant2],
]).test('Find participant by %s', async(data, expected) => {
    const participant = await dbQueries.find(data);
    if (expected === undefined) {
        expect(participant).toBeUndefined();
    } else {
        expect(participant).toEqual(expect.objectContaining(expected));
    }
});

each([
    ['participantId1', participant1],
    ['participantId2', participant2],
    [50, undefined]
]).test('getById %s', async(id, expected) => {
    const participantId = typeof id === 'string' ? participantIds[id] : id;
    const user = await dbQueries.getById(participantId);
    if (expected === undefined) {
        expect(user).toBeUndefined();
    } else {
        expect(user).toEqual(expect.objectContaining(expected));
    }
});

test('Create new participant', async () => {

    const participantAttributes = await dbQueries.create(participantToInsert);
    expect(participantAttributes.id).toBeDefined();
    expect(typeof participantAttributes.id).toEqual('number');

});

test('Create new participant with duplicate key', async () => {

    await expect(dbQueries.create(participantToInsert))
        .rejects
        .toThrow(expect.anything());

});

test('Update participant', async () => {

    // Update the first name
    const newName = 'Newname';
    const { id, first_name, ...origUser } = await dbQueries.getById(participantIds.participantId1) as ParticipantAttributes;
    const updatedAttributes = _cloneDeep(origUser) as ParticipantAttributes;
    updatedAttributes.first_name = newName;
    expect(await dbQueries.update(participantIds.participantId1, updatedAttributes)).toEqual(true);
    const updatedUser = await dbQueries.getById(participantIds.participantId1) as ParticipantAttributes;
    expect(updatedUser.first_name).toEqual(newName);

    // Try to update id or email
    expect(await dbQueries.update(participantIds.participantId1, { email: 'new@test.org', id: participantIds.participantId1 + 10 })).toEqual(false);
    const updatedUser2 = await dbQueries.getById(participantIds.participantId1) as ParticipantAttributes;
    expect(updatedUser2).toEqual(updatedUser);
});

describe('logLastLogin', () => {

    test('Correctly log last login', async () => {
        // Save current timestamp
        const testStart = Date.now();
    
        // Validate there are no logins in the database
        const currentLastLogin = await knex.table('sv_participant_logins').select('*');
        expect(currentLastLogin.length).toEqual(0);
    
        // Log a first login
        await dbQueries.logLastLogin(participantIds.participantId1);
    
        // Validate that the login was logged
        const newLastLogin = await knex('sv_participant_logins').select(['*', knex.raw('EXTRACT(EPOCH FROM timestamp) as unix_timestamp')]).orderBy('timestamp');
        const afterFirstInsert = Date.now() + 1; // Add 1ms to make sure we are not equal to now at the ms precision (timestamps are at us precision)
        expect(newLastLogin.length).toEqual(1);
        expect(newLastLogin[0].participant_id).toEqual(participantIds.participantId1);
        expect(newLastLogin[0].timestamp).toBeDefined();
        expect(newLastLogin[0].timestamp instanceof Date).toBeTruthy();
        // Validate all timestamps are greater than previous or test start and less than now (at us precision, it should not be equal)
        expect(newLastLogin[0].unix_timestamp * 1000).toBeGreaterThan(testStart);
        expect(newLastLogin[0].unix_timestamp * 1000).toBeLessThan(afterFirstInsert);
    
    
        // Add other logs, one for same participant, one for other again
        await dbQueries.logLastLogin(participantIds.participantId1);
        await dbQueries.logLastLogin(participantIds.participantId2);
        const afterSecondInsert = Date.now() + 1; 

        // Validate that the logins were logged
        const newLastLogin2 = await knex('sv_participant_logins').select(['*', knex.raw('EXTRACT(EPOCH FROM timestamp) as unix_timestamp')]).orderBy('timestamp');
        expect(newLastLogin2.length).toEqual(3);
        // Validate the participant ID order
        expect(newLastLogin2[0].participant_id).toEqual(participantIds.participantId1);
        expect(newLastLogin2[1].participant_id).toEqual(participantIds.participantId1);
        expect(newLastLogin2[2].participant_id).toEqual(participantIds.participantId2);
        // Validate the timestamps of the logs
        for (let i = 0; i < newLastLogin2.length; i++) {
            expect(newLastLogin2[i].timestamp).toBeDefined();
            expect(newLastLogin2[i].timestamp instanceof Date).toBeTruthy();
            expect(newLastLogin2[i].unix_timestamp * 1000).toBeGreaterThan(testStart);
            expect(newLastLogin2[i].unix_timestamp * 1000).toBeLessThan(afterSecondInsert);
        }
    });

    test('Insert for an unexisting participant', async () => {
        await expect(dbQueries.logLastLogin(participantIds.participantId1 + 1000))
            .rejects
            .toThrow(expect.anything());
    });
});
