/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Knex } from 'knex';

const interviewTable = 'sv_interviews';
const prefillTable = 'sv_interviews_prefill';

export async function up(knex: Knex): Promise<unknown> {
    await knex.schema.alterTable(interviewTable, (table: Knex.TableBuilder) => {
        table.renameColumn('responses', 'response');
    });
    return await knex.schema.alterTable(prefillTable, (table: Knex.TableBuilder) => {
        table.renameColumn('responses', 'response');
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable(interviewTable, (table: Knex.TableBuilder) => {
        table.renameColumn('response', 'responses');
    });
    return await knex.schema.alterTable(prefillTable, (table: Knex.TableBuilder) => {
        table.renameColumn('response', 'responses');
    });
}
