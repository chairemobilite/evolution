/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Knex } from 'knex';

const interviewsTbl = 'sv_interviews';
const columnName = 'is_questionable';

export async function up(knex: Knex): Promise<unknown> {
    return knex.schema.alterTable(interviewsTbl, (table: Knex.TableBuilder) => {
        table.boolean(columnName).defaultTo(false).index();
    });
}

export async function down(knex: Knex): Promise<unknown> {
    return knex.schema.alterTable(interviewsTbl, (table: Knex.TableBuilder) => {
        table.dropColumn(columnName);
    });
}
