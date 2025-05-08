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
    id: 1,
    email: 'test@test.org',
    username: 'p1',
    preferences: { lang: 'fr' },
    first_name: 'Toto'
};

const participant2 = {
    id: 2,
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

beforeAll(async () => {
    jest.setTimeout(10000);
    await truncate(knex, 'sv_participants');
    await knex('sv_participants').insert(participant1);
    await knex('sv_participants').insert(participant2);
});

afterAll(async() => {
    await truncate(knex, 'sv_participants');
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
    [participant1.id, participant1 ],
    [participant2.id, participant2],
    [50, undefined]
]).test('getById', async(id, expected) => {
    const user = await dbQueries.getById(id);
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
        .toThrowError(expect.anything());

});

test('Update participant', async () => {

    // Update the first name
    const newName = 'Newname';
    const { id, first_name, ...origUser } = await dbQueries.getById(participant1.id) as ParticipantAttributes;
    const updatedAttributes = _cloneDeep(origUser) as ParticipantAttributes;
    updatedAttributes.first_name = newName;
    expect(await dbQueries.update(participant1.id, updatedAttributes)).toEqual(true);
    const updatedUser = await dbQueries.getById(participant1.id) as ParticipantAttributes;
    expect(updatedUser.first_name).toEqual(newName);

    // Try to update id or email
    expect(await dbQueries.update(participant1.id, { email: 'new@test.org', id: participant1.id + 10 })).toEqual(false);
    const updatedUser2 = await dbQueries.getById(participant1.id) as ParticipantAttributes;
    expect(updatedUser2).toEqual(updatedUser);
});
