/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import { truncate } from 'chaire-lib-backend/lib/models/db/default.db.queries';

import dbQueries from '../interviewsPreFill.db.queries';

beforeAll(async () => {
    jest.setTimeout(10000);
    await truncate(knex, 'sv_interviews_prefill');
});

afterAll(async() => {
    await truncate(knex, 'sv_interviews_prefill');
});

describe('set/get pre-filled answers', () => {
    const responses = { ['home.address']: { value: 'address' } };
    const otherResponse = { 
        ['home.address']: { value: 'new address', actionIfPresent: 'force' as const }, 
        ['home.city']: { value: 'Montreal', actionIfPresent: 'doNothing' as const }
    };

    test('Get unexisting responses', async() => {
        expect(await dbQueries.getByReferenceValue('data')).toBeUndefined();
    });

    test('Add new responses for reference field', async () => {
        await dbQueries.setPreFilledResponsesForRef('data', responses);
        const preFilledResponses = await dbQueries.getByReferenceValue('data');
        expect(preFilledResponses).toEqual(responses);
    });
    
    test('Add new responses for the same reference field', async () => {
        await dbQueries.setPreFilledResponsesForRef('data', otherResponse);
        const preFilledResponses = await dbQueries.getByReferenceValue('data');
        expect(preFilledResponses).toEqual(otherResponse);
    });

    test('Add responses for another reference field', async () => {
        await dbQueries.setPreFilledResponsesForRef('foo', responses);
        const preFilledResponses = await dbQueries.getByReferenceValue('data');
        expect(preFilledResponses).toEqual(otherResponse);

        const newPreFilledResponses = await dbQueries.getByReferenceValue('foo');
        expect(newPreFilledResponses).toEqual(responses);
    });

});
