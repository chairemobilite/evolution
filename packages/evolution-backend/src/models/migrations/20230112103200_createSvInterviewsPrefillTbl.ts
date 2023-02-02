import { Knex } from 'knex';

const tableName = 'sv_interviews_prefill';

export async function up(knex: Knex): Promise<unknown> {
    if (await knex.schema.hasTable(tableName)) {
        return;
    }
    return knex.schema.createTable(tableName, (table: Knex.TableBuilder) => {
        table.string('reference_field').notNullable().unique().index(); // required
        table.json('responses');
    });
}

export async function down(knex: Knex): Promise<unknown> {
    return knex.schema.dropTable(tableName);
}
