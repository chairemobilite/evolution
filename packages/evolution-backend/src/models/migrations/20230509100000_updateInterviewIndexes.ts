/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Knex } from 'knex';

const tableName = 'sv_interviews';

export async function up(knex: Knex): Promise<unknown> {
    await knex.schema.alterTable(tableName, (table: Knex.TableBuilder) => {
        table.index('uuid');
    });
    // Legacy versions of the DB had those indexes created when the table was
    // named only 'interviews' so the default index name is not found.  To avoid
    // the migration failing for those databases, we need to drop those indexes
    // by name if exists. Knex does not support this, we use raw
    await knex.schema.raw('DROP INDEX IF EXISTS sv_interviews_is_active_index');
    await knex.schema.raw('DROP INDEX IF EXISTS sv_interviews_is_frozen_index');
    await knex.schema.raw('DROP INDEX IF EXISTS sv_interviews_start_at_index');
    await knex.schema.raw('DROP INDEX IF EXISTS sv_interviews_is_started_index');
    await knex.schema.raw('DROP INDEX IF EXISTS interviews_is_active_index');
    await knex.schema.raw('DROP INDEX IF EXISTS interviews_start_at_index');
    await knex.schema.raw('DROP INDEX IF EXISTS interviews_is_started_index');
    return;
}

export async function down(knex: Knex): Promise<unknown> {
    return knex.schema.alterTable(tableName, (table: Knex.TableBuilder) => {
        table.dropIndex('uuid');
        table.index('is_active');
        table.index('start_at');
        table.index('is_started');
        table.index('is_frozen');
    });
}
