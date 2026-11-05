/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import type { Knex } from 'knex';

const tableName = 'sv_participants';
const usernamePrefix = 'facebook_';

/**
 * Drops the Facebook ID of the participants, the Facebook login was removed.
 * The participants without a username get `facebook_<facebook_id>` as
 * username, so the exported data still shows that they came from Facebook,
 * unless another participant already has that username.
 * @param knex - Knex instance
 */
export async function up(knex: Knex): Promise<void> {
    const facebookParticipantsWithoutUsername = () => knex(tableName).whereNotNull('facebook_id').whereNull('username');
    const updatedCount = await facebookParticipantsWithoutUsername()
        // The username is unique, so skip the ones already taken
        .whereNotExists(
            knex(`${tableName} as other`).whereRaw(`other.username = ? || ${tableName}.facebook_id`, [usernamePrefix])
        )
        .update({ username: knex.raw('? || facebook_id', [usernamePrefix]) });
    if (updatedCount > 0) {
        console.log(`Set the username of ${updatedCount} Facebook participant(s) to ${usernamePrefix}<facebook_id>`);
    }
    const [{ count: skippedCount }] = await facebookParticipantsWithoutUsername().count({ count: '*' });
    if (Number(skippedCount) > 0) {
        console.warn(
            `${skippedCount} Facebook participant(s) keep no username, as ${usernamePrefix}<facebook_id> is already taken by another participant`
        );
    }
    await knex.schema.alterTable(tableName, (table: Knex.TableBuilder) => {
        table.dropColumn('facebook_id');
    });
}

/**
 * Adds the Facebook ID column back, and moves the IDs back from the usernames
 * starting with `facebook_`
 * @param knex - Knex instance
 */
export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable(tableName, (table: Knex.TableBuilder) => {
        table.string('facebook_id').unique();
    });
    await knex(tableName)
        .whereRaw('starts_with(username, ?)', [usernamePrefix])
        .update({
            facebook_id: knex.raw('substr(username, ?::integer)', [usernamePrefix.length + 1]),
            username: null
        });
}
