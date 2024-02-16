/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Knex } from 'knex';

const interviewsTbl = 'sv_interviews';
const indexNameSize = 'idx_sv_interviews_household_size';
const indexNameCarNumber = 'idx_sv_interviews_household_car_number';

export async function up(knex: Knex): Promise<unknown> {
    return knex.schema.table(interviewsTbl, (table: Knex.TableBuilder) => {
        table.index([knex.raw('("responses"->\'household\'->>\'size\')')], indexNameSize);
        table.index([knex.raw('("responses"->\'household\'->>\'carNumber\')')], indexNameCarNumber);
    });
}

export async function down(knex: Knex): Promise<unknown> {
    return knex.schema.table(interviewsTbl, (table: Knex.TableBuilder) => {
        table.dropIndex(indexNameSize);
        table.dropIndex(indexNameCarNumber);
    });
}
