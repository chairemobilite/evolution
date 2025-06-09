/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Knex } from 'knex';

const tableName = 'sv_interviews';

export async function up(knex: Knex): Promise<void> {
    console.log('Running up migration for gender values in sv_interviews');
    // Change "male" to "man" in response.household.persons[*].gender
    // Change "female" to "woman" in response.household.persons[*].gender
    await knex.raw(
        `
        UPDATE ??
        SET response = (
            SELECT jsonb_set(
                response::jsonb,
                '{household,persons}',
                (
                    SELECT jsonb_object_agg(
                        key,
                        CASE
                            WHEN value->>'gender' = 'male' THEN jsonb_set(value, '{gender}', '"man"')
                            WHEN value->>'gender' = 'female' THEN jsonb_set(value, '{gender}', '"woman"')
                            ELSE value
                        END
                    )
                    FROM jsonb_each((response::jsonb->'household'->'persons')::jsonb)
                )
            )::json
        )
        WHERE jsonb_typeof(response::jsonb->'household'->'persons') = 'object'
        `,
        [tableName]
    );
}

export async function down(knex: Knex): Promise<void> {
    console.log('Running down migration for gender values in sv_interviews');
    // Revert "man" to "male" in response.household.persons[*].gender
    // Revert "woman" to "female" in response.household.persons[*].gender
    await knex.raw(
        `
        UPDATE ??
        SET response = (
            SELECT jsonb_set(
                response::jsonb,
                '{household,persons}',
                (
                    SELECT jsonb_object_agg(
                        key,
                        CASE
                            WHEN value->>'gender' = 'man' THEN jsonb_set(value, '{gender}', '"male"')
                            WHEN value->>'gender' = 'woman' THEN jsonb_set(value, '{gender}', '"female"')
                            ELSE value
                        END
                    )
                    FROM jsonb_each((response::jsonb->'household'->'persons')::jsonb)
                )
            )::json
        )
        WHERE jsonb_typeof(response::jsonb->'household'->'persons') = 'object'
        `,
        [tableName]
    );
}
