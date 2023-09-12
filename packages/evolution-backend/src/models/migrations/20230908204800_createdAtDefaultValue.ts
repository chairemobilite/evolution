/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Knex } from 'knex';

const interviewsTbl = 'sv_interviews';
const participantsTbl = 'sv_participants';

export async function up(knex: Knex): Promise<unknown> {
    await knex.schema.alterTable(interviewsTbl, (table: Knex.TableBuilder) => {
        table.timestamp('created_at').defaultTo(knex.fn.now()).alter({ alterType: false });
    });
    await knex.schema.alterTable(participantsTbl, (table: Knex.TableBuilder) => {
        table.timestamp('created_at').defaultTo(knex.fn.now()).alter({ alterType: false });
    });
    return await knex(interviewsTbl)
        .update({ created_at: knex.raw('to_timestamp((responses->>\'_startedAt\')::integer)') })
        .whereNull('created_at')
        .andWhereRaw('responses->>\'_startedAt\' is not null');
}

export async function down(knex: Knex): Promise<unknown> {
    await knex.schema.alterTable(participantsTbl, (table: Knex.TableBuilder) => {
        table.timestamp('created_at').defaultTo(null).alter({ alterType: false });
    });
    return knex.schema.alterTable(interviewsTbl, (table: Knex.TableBuilder) => {
        table.timestamp('created_at').defaultTo(null).alter({ alterType: false });
    });
}
