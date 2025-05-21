/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Knex } from 'knex';

const interviewTable = 'sv_interviews';

export async function up(knex: Knex): Promise<unknown> {
    return await knex.schema.alterTable(interviewTable, (table: Knex.TableBuilder) => {
        table.renameColumn('validated_data', 'corrected_response');
    });
}

export async function down(knex: Knex): Promise<void> {
    return await knex.schema.alterTable(interviewTable, (table: Knex.TableBuilder) => {
        table.renameColumn('corrected_response', 'validated_data');
    });
}
