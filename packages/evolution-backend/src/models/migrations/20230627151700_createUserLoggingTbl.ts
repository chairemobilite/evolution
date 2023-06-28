import { Knex } from 'knex';
import { onUpdateTrigger } from '../../config/knexfile';

const tableName = 'sv_interviews_accesses';

export async function up(knex: Knex): Promise<unknown> {
    await knex.schema.createTable(tableName, (table: Knex.TableBuilder) => {
        table.integer('interview_id').notNullable();
        table.foreign('interview_id').references('sv_interviews.id').onDelete('CASCADE');
        table.integer('user_id').notNullable();
        table.foreign('user_id').references('users.id').onDelete('CASCADE');
        table.boolean('for_validation').notNullable().defaultTo(false);
        table.integer('update_count').notNullable().defaultTo(0);
        table.timestamps(true, true);
        table.primary(['interview_id', 'user_id', 'for_validation']);
    });
    return knex.raw(onUpdateTrigger(tableName));
}

export async function down(knex: Knex): Promise<unknown> {
    return knex.schema.dropTable(tableName);
}
