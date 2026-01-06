/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Knex } from 'knex';

const paradataTbl = 'paradata_events';
const columnName = 'for_correction';

export async function up(knex: Knex): Promise<unknown> {
    return knex.schema.alterTable(paradataTbl, (table: Knex.TableBuilder) => {
        // Adding the column as nullable to avoid issues with existing rows, as we do not know what it should be set to
        table.boolean(columnName).nullable();
    });
}

export async function down(knex: Knex): Promise<unknown> {
    return knex.schema.alterTable(paradataTbl, (table: Knex.TableBuilder) => {
        table.dropColumn(columnName);
    });
}
