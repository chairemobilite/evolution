/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Knex } from 'knex';

const interviewsTbl = 'sv_interviews';
const indexName = 'idx_sv_interviews_access_code';

export async function up(knex: Knex): Promise<unknown> {
    return knex.schema.table(interviewsTbl, (table: Knex.TableBuilder) => {
        table.index([knex.raw('("responses"->>\'accessCode\')')], indexName);
    });
}

export async function down(knex: Knex): Promise<unknown> {
    return knex.schema.table(interviewsTbl, (table: Knex.TableBuilder) => {
        table.dropIndex(indexName);
    });
}
