/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import type { Knex } from 'knex';

const tableName = 'sv_review_decisions';

/**
 * Lets a review decision row carry a force approve without a reviewer vote.
 * A force approve is an admin override, not an approval: storing a synthetic `approve`
 * alongside it made the object look approved once the override was cleared.
 * @param knex - Knex instance
 */
export async function up(knex: Knex): Promise<unknown> {
    // Raw SQL keeps the enum check constraint that an `alter` through the table builder would drop.
    await knex.raw('alter table ?? alter column decision_value drop not null', [tableName]);
    // Clears the approvals stored alongside an override. A row belongs to a single reviewer, and
    // `force_approved` marks the one who overrode, so this only ever touches the row of that
    // reviewer, never the vote of another one. Nothing tells apart the approval the old code
    // invented from one that reviewer had really taken before overriding, and the invented ones
    // are the reason for this migration: the policy is to drop both, the override saying enough on
    // its own. A reviewer who clears their override afterwards votes again if they still want to.
    return knex(tableName).where({ force_approved: true, decision_value: 'approve' }).update({
        decision_value: null
    });
}

/**
 * Restores the not null constraint, the rows without a vote falling back to an approval.
 * @param knex - Knex instance
 */
export async function down(knex: Knex): Promise<unknown> {
    await knex(tableName).whereNull('decision_value').update({ decision_value: 'approve' });
    return knex.raw('alter table ?? alter column decision_value set not null', [tableName]);
}
