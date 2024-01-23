/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Knex } from 'knex';

const tableName = 'sv_surveys';

export async function up(knex: Knex): Promise<unknown> {
    if (await knex.schema.hasTable(tableName)) {
        return;
    }
    await knex.schema.createTable(tableName, (table: Knex.TableBuilder) => {
        table.increments();
        table.uuid('uuid').notNullable().defaultTo(knex.raw('gen_random_uuid()'));
        table.string('shortname').unique();
        table.date('start_date');
        table.date('end_date');
        table.json('config');
    });
}

export async function down(knex: Knex): Promise<unknown> {
    return knex.schema.dropTable(tableName);
}
