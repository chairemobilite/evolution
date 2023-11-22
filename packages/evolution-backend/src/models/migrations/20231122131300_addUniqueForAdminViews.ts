/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Knex } from 'knex';

const viewsTbl = 'sv_materialized_views';

export async function up(knex: Knex): Promise<unknown> {
    return knex.schema.table(viewsTbl, (table: Knex.TableBuilder) => {
        table.string('unique_field').nullable();
    });
}

export async function down(knex: Knex): Promise<unknown> {
    return knex.schema.table(viewsTbl, (table: Knex.TableBuilder) => {
        table.dropColumn('unique_field');
    });
}
