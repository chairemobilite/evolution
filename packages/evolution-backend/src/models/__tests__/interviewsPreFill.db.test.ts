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
    await knex.destroy();
});

describe('set/get pre-filled answers', () => {
    const response = { ['home.address']: { value: 'address' } };
    const otherResponse = {
        ['home.address']: { value: 'new address', actionIfPresent: 'force' as const },
        ['home.city']: { value: 'Montreal', actionIfPresent: 'doNothing' as const }
    };

    test('Get unexisting response', async() => {
        expect(await dbQueries.getByReferenceValue('data')).toBeUndefined();
    });

    test('Add new response for reference field', async () => {
        await dbQueries.setPreFilledResponseForRef('data', response);
        const preFilledResponse = await dbQueries.getByReferenceValue('data');
        expect(preFilledResponse).toEqual(response);
    });

    test('Add new response for the same reference field', async () => {
        await dbQueries.setPreFilledResponseForRef('data', otherResponse);
        const preFilledResponse = await dbQueries.getByReferenceValue('data');
        expect(preFilledResponse).toEqual(otherResponse);
    });

    test('Add response for another reference field', async () => {
        await dbQueries.setPreFilledResponseForRef('foo', response);
        const preFilledResponse = await dbQueries.getByReferenceValue('data');
        expect(preFilledResponse).toEqual(otherResponse);

        const newPreFilledResponse = await dbQueries.getByReferenceValue('foo');
        expect(newPreFilledResponse).toEqual(response);
    });

});
