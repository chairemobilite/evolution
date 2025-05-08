/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import { v4 as uuidV4 } from 'uuid';
import _cloneDeep from 'lodash/cloneDeep';
import { create, truncate } from 'chaire-lib-backend/lib/models/db/default.db.queries';

import dbQueries from '../adminViews.db.queries';
import interviewsDbQueries from '../interviews.db.queries';

const viewName = 'test_view';

const localParticipant = {
    id: 1,
    email: 'test@transition.city',
    is_valid: true
};

const otherParticipant = {
    id: 2,
    is_valid: true,
    google_id: '1234'
};

const participant3 = {
    id: 3,
    is_valid: true,
    email: 'test@example.org',
};

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
    await knex.schema.dropMaterializedViewIfExists(viewName);
    await truncate(knex, 'sv_materialized_views');
    await truncate(knex, 'sv_interviews');
    await truncate(knex, 'sv_participants');
    await create(knex, 'sv_participants', undefined, localParticipant as any);
    await create(knex, 'sv_participants', undefined, otherParticipant as any);
    await create(knex, 'sv_participants', undefined, participant3 as any);
    await truncate(knex, 'users');
    await interviewsDbQueries.create(localUserInterviewAttributes);
});

afterAll(async() => {
    await truncate(knex, 'sv_materialized_views');
    await truncate(knex, 'sv_interviews');
    await truncate(knex, 'users');
    await truncate(knex, 'sv_participants');
    await knex.schema.dropMaterializedViewIfExists(viewName);
    await knex.destroy();
});

describe('registerView', () => {

    const defaultViewQuery = `select i.id, 
        i.uuid,
        i.participant_id,
        i.is_valid,
        i.is_completed,
        CASE
            WHEN part.google_id is not null THEN 'google'
            WHEN part.email is null THEN 'anonymous'
            else 'email'
        END AS auth_method
    from sv_interviews i
    inner join sv_participants part on i.participant_id = part.id`;

    test('Register a new view', async() => {
        expect(await dbQueries.registerView(viewName, defaultViewQuery)).toEqual(true);
        const data = await knex(viewName).select('*');
        expect(data).toEqual([{
            uuid: localUserInterviewAttributes.uuid,
            id: expect.anything(),
            participant_id: localUserInterviewAttributes.participant_id,
            is_valid: localUserInterviewAttributes.is_valid,
            is_completed: null,
            auth_method: 'email'
        }]);
        expect(await dbQueries.viewExists(viewName)).toEqual(true);
    });

    test('Register a new view, with SQL error', async() => {
        const errorViewName = 'errorView';
        // Add a comma at the end of the view sql
        await expect(dbQueries.registerView(errorViewName, `${defaultViewQuery},`))
            .rejects
            .toThrowError(expect.anything());
        // The view should not exist in the database
        expect(await dbQueries.viewExists(errorViewName)).toEqual(false);
    });

    test('Register an existing view, with same query', async() => {
        const currentView = await knex('sv_materialized_views').where('view_name', viewName);
        expect(await dbQueries.registerView(viewName, defaultViewQuery)).toEqual(true);

        // Make sure the view was not updated
        const viewAfterRegister = await knex('sv_materialized_views').where('view_name', viewName);
        expect(viewAfterRegister[0].updated_at).toEqual(currentView[0].updated_at);

        expect(await knex(viewName).select('*')).toEqual([{
            uuid: localUserInterviewAttributes.uuid,
            id: expect.anything(),
            participant_id: localUserInterviewAttributes.participant_id,
            is_valid: localUserInterviewAttributes.is_valid,
            is_completed: null,
            auth_method: 'email'
        }]);
        expect(await dbQueries.viewExists(viewName)).toEqual(true);
    });

    test('Register an existing view, with a SQL error', async() => {
        // Add a comma at the end of the view sql
        await expect(dbQueries.registerView(viewName, `${defaultViewQuery},`))
            .rejects
            .toThrowError(expect.anything());

        // The view should still exist in the database and be equal to the previous
        expect(await dbQueries.viewExists(viewName)).toEqual(true);
        expect(await knex(viewName).select('*')).toEqual([{
            uuid: localUserInterviewAttributes.uuid,
            id: expect.anything(),
            participant_id: localUserInterviewAttributes.participant_id,
            is_valid: localUserInterviewAttributes.is_valid,
            is_completed: null,
            auth_method: 'email'
        }]);
    });

    test('Register an existing view, with a different query', async() => {
        // Use the same query, but rename the fields
        const defaultViewQuery = `select i.id, 
            i.uuid,
            i.participant_id as part_id,
            i.is_valid as valid,
            i.is_completed as completed,
            CASE
                WHEN part.google_id is not null THEN 'google'
                WHEN part.email is null THEN 'anonymous'
                else 'email'
            END AS auth
        from sv_interviews i
        inner join sv_participants part on i.participant_id = part.id`;

        expect(await dbQueries.registerView(viewName, defaultViewQuery)).toEqual(true);
        expect(await knex(viewName).select('*')).toEqual([{
            uuid: localUserInterviewAttributes.uuid,
            id: expect.anything(),
            part_id: localUserInterviewAttributes.participant_id,
            valid: localUserInterviewAttributes.is_valid,
            completed: null,
            auth: 'email'
        }]);
        expect(await dbQueries.viewExists(viewName)).toEqual(true);
    });

    test('Register an existing view, with a single unique field', async() => {
        // Use the same query, but rename the fields
        const defaultViewQuery = `select i.id, 
            i.uuid,
            i.participant_id as part_id,
            i.is_valid as valid,
            i.is_completed as completed,
            CASE
                WHEN part.google_id is not null THEN 'google'
                WHEN part.email is null THEN 'anonymous'
                else 'email'
            END AS auth
        from sv_interviews i
        inner join sv_participants part on i.participant_id = part.id`;

        expect(await dbQueries.registerView(viewName, defaultViewQuery, 'id')).toEqual(true);
        expect(await knex(viewName).select('*')).toEqual([{
            uuid: localUserInterviewAttributes.uuid,
            id: expect.anything(),
            part_id: localUserInterviewAttributes.participant_id,
            valid: localUserInterviewAttributes.is_valid,
            completed: null,
            auth: 'email'
        }]);
        expect(await knex('sv_materialized_views').select('*').where('view_name', viewName)).toEqual([expect.objectContaining({
            view_name: viewName,
            view_query: defaultViewQuery,
            unique_field: 'id',
        })]);

    });

    test('Register an existing view, with multiple unique fields', async() => {
        // Use the same query, but rename the fields
        const defaultViewQuery = `select i.id, 
            i.uuid,
            i.participant_id as part_id,
            i.is_valid as valid,
            i.is_completed as completed,
            CASE
                WHEN part.google_id is not null THEN 'google'
                WHEN part.email is null THEN 'anonymous'
                else 'email'
            END AS auth
        from sv_interviews i
        inner join sv_participants part on i.participant_id = part.id`;

        expect(await dbQueries.registerView(viewName, defaultViewQuery, ['id', 'uuid'])).toEqual(true);
        expect(await knex(viewName).select('*')).toEqual([{
            uuid: localUserInterviewAttributes.uuid,
            id: expect.anything(),
            part_id: localUserInterviewAttributes.participant_id,
            valid: localUserInterviewAttributes.is_valid,
            completed: null,
            auth: 'email'
        }]);
        expect(await knex('sv_materialized_views').select('*').where('view_name', viewName)).toEqual([expect.objectContaining({
            view_name: viewName,
            view_query: defaultViewQuery,
            unique_field: 'id, uuid'
        })]);

    });

});

test('Update database view', async () => {
    const originalCount = 1;
    // Validate initial state, there should be 1 interview
    const data = await knex(viewName).select('*');
    expect(data.length).toEqual(originalCount);

    // Add an interview in the database
    const newInterview = Object.assign({}, _cloneDeep(localUserInterviewAttributes), {
        uuid: uuidV4(),
        participant_id: otherParticipant.id,
        is_completed: true
    });
    await interviewsDbQueries.create(newInterview);

    // Make sure the view still has only 1 interview
    const data2 = await knex(viewName).select('*');
    expect(data2.length).toEqual(originalCount);

    // Update the view, then make sure the new interview is now included
    await dbQueries.refreshView(viewName);
    const data3 = await knex(viewName).select('*');
    expect(data3.length).toEqual(originalCount + 1);

    // Add another interview in the database
    const newInterview2 = Object.assign({}, _cloneDeep(localUserInterviewAttributes), {
        uuid: uuidV4(),
        participant_id: participant3.id,
        is_completed: true
    });
    await interviewsDbQueries.create(newInterview2);

    // Update the view with the refreshAllViews function, then make sure the new interview is now included
    await dbQueries.refreshAllViews();
    const data4 = await knex(viewName).select('*');
    expect(data4.length).toEqual(originalCount + 2);

});

describe('Query view', () => {
    const dataCount = 3;

    test('Query all fields', async() => {
        const data = await dbQueries.queryView(viewName);
        expect(data).not.toEqual(false);
        expect((data as any[]).length).toEqual(dataCount);
        expect(data[0]).toEqual({
            uuid: localUserInterviewAttributes.uuid,
            id: expect.anything(),
            part_id: localUserInterviewAttributes.participant_id,
            valid: localUserInterviewAttributes.is_valid,
            completed: null,
            auth: 'email'
        });
    });

    test('Query only a subset of the fields', async() => {
        const data = await dbQueries.queryView(viewName, ['id', 'auth']);
        expect(data).not.toEqual(false);
        expect((data as any[]).length).toEqual(dataCount);
        expect(data[0]).toEqual({
            id: expect.anything(),
            auth: 'email'
        });
    });

    test('Query an unexisting view', async() => {
        const data = await dbQueries.queryView('unexistingView');
        expect(data).toEqual(false);
    });

    test('Query unexisting fields', async() => {
        const data = await dbQueries.queryView(viewName, ['id', 'unexisting']);
        expect(data).toEqual(false);
    });

});

describe('Count by', () => {

    const dataCount = 3;

    test('Count by one field', async() => {
        const data = await dbQueries.countByView(viewName, ['valid']);
        expect(data).not.toEqual(false);
        expect(data).toEqual([{
            valid: localUserInterviewAttributes.is_valid,
            count: dataCount
        }]);
    });

    test('Count by 2 fields', async() => {
        const data = await dbQueries.countByView(viewName, ['id', 'auth']);
        expect(data).not.toEqual(false);
        expect((data as any[]).length).toEqual(dataCount);
        for (let i = 0; i < (data as any[]).length; i++) {
            switch(data[i].auth) {
            case 'email': expect(data[i]).toEqual({
                id: expect.anything(),
                auth: 'email',
                count: 1
            });
                break;
            case 'google': expect(data[i]).toEqual({
                id: expect.anything(),
                auth: 'google',
                count: 1
            });
                break;
            default:
                // Unexpected data
                expect(data[i]).toEqual(false);
            }
        }
    });

    test('Count on an unexisting view', async() => {
        const data = await dbQueries.countByView('unexistingView', ['valid']);
        expect(data).toEqual(false);
    });

    test('Count on unexisting fields', async() => {
        const data = await dbQueries.countByView(viewName, ['id', 'unexisting']);
        expect(data).toEqual(false);
    });

});
