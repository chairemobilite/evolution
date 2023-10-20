/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Knex } from 'knex';
import { onUpdateTrigger } from '../../config/knexfile';

const tableName = 'sv_audits';

export async function up(knex: Knex): Promise<unknown> {
    await knex.schema.createTable(tableName, (table: Knex.TableBuilder) => {
        table.integer('interview_id').notNullable().index();
        table.foreign('interview_id').references('sv_interviews.id').onDelete('CASCADE');
        table.string('error_code').notNullable();
        table.string('object_type').notNullable();
        // uuid cannot be nullable if we want it as primary key. Code will fallback to using the interview's uuid for single objects so that it remains unique per interview/object_type
        table.uuid('object_uuid').notNullable();
        table.boolean('ignore').notNullable().defaultTo(false);
        table.string('message').nullable();
        table.integer('version').notNullable();
        table.boolean('is_warning');
        table.timestamps(true, true);
        table.primary(['interview_id', 'error_code', 'object_type', 'object_uuid']);
    });
    return knex.raw(onUpdateTrigger(tableName));
}

export async function down(knex: Knex): Promise<unknown> {
    return knex.schema.dropTable(tableName);
}
