import * as Knex from 'knex';
import { onUpdateTrigger } from '../../config/knexfile';

const tableName = 'sv_interviews';

export async function up(knex: Knex): Promise<unknown> {
    if (await knex.schema.hasTable(tableName)) {
        return;
    }
    await knex.schema.createTable(tableName, (table: Knex.TableBuilder) => {
        table.increments();
        table.uuid('uuid').notNullable().defaultTo(knex.raw('gen_random_uuid()'));
        table.integer('user_id').notNullable().index();
        table.foreign('user_id').references('users.id').onDelete('CASCADE');
        table.boolean('is_valid').index();
        table.boolean('is_active').index();
        table.boolean('is_completed').index();
        table.boolean('is_started').index();
        table.timestamp('start_at').index();
        table.timestamp('end_at').index();
        table.json('responses');
        table.json('validations');
        table.json('logs');
        table.json('validated_data'); // parsed and validated data ready for datawarehousing
        table.json('audits'); // validation audits
        table.boolean('is_validated').defaultTo(false).index(); // ready for datawarehousing (set after validation)
        table.boolean('is_frozen').defaultTo(false).index(); // responses changes will be ignored (set before starting validation or when survey is done)
        table.timestamps();
        table.index('created_at', 'idx_sv_interviews_created_at');
    });
    return knex.raw(onUpdateTrigger(tableName));
}

export async function down(knex: Knex): Promise<unknown> {
    return knex.schema.dropTable(tableName);
}
