import * as Knex from 'knex';
import { onUpdateTrigger } from '../../config/knexfile';

const tableName = 'sv_participants';

export async function up(knex: Knex): Promise<unknown> {
    if (await knex.schema.hasTable(tableName)) {
        return;
    }
    await knex.schema.createTable(tableName, (table: Knex.TableBuilder) => {
        table.increments();
        table.uuid('uuid').notNullable().defaultTo(knex.raw('gen_random_uuid()'));
        table.integer('user_id').index();
        table.foreign('user_id').references('users.id').onDelete('SET NULL');
        table.string('email').unique();
        table.string('phone_number').unique();
        table.string('first_name');
        table.string('last_name');
        table.boolean('is_valid');
        table.boolean('is_active');
        table.timestamp('start_at');
        table.timestamp('end_at');
        table.json('profile');
        table.timestamps();
    });
    return knex.raw(onUpdateTrigger(tableName));
}

export async function down(knex: Knex): Promise<unknown> {
    return knex.schema.dropTable(tableName);
}
