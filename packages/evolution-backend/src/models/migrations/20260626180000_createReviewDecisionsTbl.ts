/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Knex } from 'knex';
import { onUpdateTrigger } from '../../config/knexfile';

const tableName = 'sv_reviews';

export async function up(knex: Knex): Promise<unknown> {
    await knex.schema.createTable(tableName, (table: Knex.TableBuilder) => {
        table.integer('interview_id').notNullable();
        table.foreign('interview_id').references('sv_interviews.id').onDelete('CASCADE');
        table.integer('user_id').notNullable().index();
        table.foreign('user_id').references('users.id').onDelete('CASCADE');
        table.string('object_type').notNullable();
        table.uuid('object_uuid').notNullable();
        table.enu('decision_value', ['approve', 'reject']).notNullable();
        table.text('comment').nullable();
        table.boolean('re_review_requested').notNullable().defaultTo(false);
        table.integer('re_review_requested_by_user_id').nullable().index();
        table.foreign('re_review_requested_by_user_id').references('users.id').onDelete('SET NULL');
        table.timestamp('re_review_requested_at').nullable();
        table.text('re_review_request_comment').nullable();
        table.timestamps(true, true);
        table.primary(['interview_id', 'object_type', 'object_uuid', 'user_id']);
    });
    return knex.raw(onUpdateTrigger(tableName));
}

export async function down(knex: Knex): Promise<unknown> {
    return knex.schema.dropTable(tableName);
}
