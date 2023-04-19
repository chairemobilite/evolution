/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Knex } from 'knex';

const tableName = 'sv_participants';

export async function up(knex: Knex): Promise<unknown> {
    return knex.schema.alterTable(tableName, (table: Knex.TableBuilder) => {
        // Drop unused columns
        table.dropColumn('uuid');
        table.dropColumn('user_id');
        table.dropColumn('start_at');
        table.dropColumn('end_at');

        // Add new columns
        table.string('username').unique().index();
        table.json('preferences').nullable();
        table.text('password').nullable();
        table.boolean('is_confirmed');
        table.boolean('is_test');
        table.text('confirmation_token').nullable();
        table.string('password_reset_token').nullable();
        table.timestamp('password_reset_expire_at').nullable();
        table.string('google_id').unique();
        table.string('facebook_id').unique();
    });
}

export async function down(knex: Knex): Promise<unknown> {
    return knex.schema.alterTable(tableName, (table: Knex.TableBuilder) => {
        table.dropColumn('username');
        table.dropColumn('preferences');
        table.dropColumn('password');
        table.dropColumn('is_confirmed');
        table.dropColumn('is_test');
        table.dropColumn('confirmation_token');
        table.dropColumn('password_reset_token');
        table.dropColumn('password_reset_expire_at');
        table.dropColumn('google_id');
        table.dropColumn('facebook_id');

        // bring back previous columns
        table.uuid('uuid').notNullable().defaultTo(knex.raw('gen_random_uuid()'));
        table.integer('user_id').nullable().index();
        table.foreign('user_id').references('users.id').onDelete('SET NULL');
        table.timestamp('start_at');
        table.timestamp('end_at');
    });
}
