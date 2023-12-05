/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Knex } from 'knex';
import { onUpdateTrigger } from '../../config/knexfile';

const viewsTbl = 'sv_materialized_views';

export async function up(knex: Knex): Promise<unknown> {
    await knex.schema.createTable(viewsTbl, (table: Knex.TableBuilder) => {
        table.increments();
        table.string('view_name').unique();
        table.text('view_query');
        table.timestamps(true, true);
    });
    return knex.raw(onUpdateTrigger(viewsTbl));
}

export async function down(knex: Knex): Promise<unknown> {
    const views = await knex(viewsTbl).select('view_name');
    for (let i = 0; i < views.length; i++) {
        await knex.schema.dropMaterializedViewIfExists(views[i].view_name);
    }
    return knex.schema.dropTable(viewsTbl);
}
