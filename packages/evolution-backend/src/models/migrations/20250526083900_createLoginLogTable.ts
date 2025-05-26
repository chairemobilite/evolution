/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Knex } from 'knex';

const participantLoginTbl = 'sv_participant_logins';
const participantTbl = 'sv_participants';

export async function up(knex: Knex): Promise<unknown> {
    return knex.schema.createTable(participantLoginTbl, (table: Knex.TableBuilder) => {
        table.integer('participant_id').notNullable();
        table.foreign('participant_id').references(`${participantTbl}.id`).onDelete('CASCADE');
        table.timestamp('timestamp', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable(participantLoginTbl);
}
