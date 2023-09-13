/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Knex } from 'knex';

const interviewsTbl = 'sv_interviews';

export async function up(knex: Knex): Promise<unknown> {
    // Unfreeze interviews that are frozen, but are not marked as valid or completed
    return await knex(interviewsTbl)
        .update({ is_frozen: false })
        .whereNull('is_valid')
        .whereNull('is_completed')
        .andWhere('is_frozen', true);
}

export async function down(knex: Knex): Promise<unknown> {
    // Freeze any unfrozen interview that has validated_data set
    return await knex(interviewsTbl)
        .update({ is_frozen: true })
        .whereNotNull('validated_data')
        .andWhere('is_frozen', false);
}
