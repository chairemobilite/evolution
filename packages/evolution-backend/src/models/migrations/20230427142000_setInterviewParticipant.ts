/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { UserAttributes } from 'chaire-lib-backend/lib/services/users/user';
import { Knex } from 'knex';
import participantsDbQueries from '../participants.db.queries';
import usersDbQueries from 'chaire-lib-backend/lib/models/db/users.db.queries';
import { ParticipantAttributes } from '../../services/participants/participant';

const participantTable = 'sv_participants';
const interviewTable = 'sv_interviews';
const usersTable = 'users';

export async function up(knex: Knex): Promise<unknown> {
    // Add the participant column to the table
    await knex.schema.alterTable(interviewTable, (table: Knex.TableBuilder) => {
        table.integer('participant_id');
    });

    // Create the participants for each current interview user and set participant ID in interview table
    const usersWithInterview = await knex
        .select(`${usersTable}.*`, `${interviewTable}.id as interview_id`)
        .from(usersTable)
        .join(interviewTable, `${interviewTable}.user_id`, `${usersTable}.id`);

    for (let i = 0; i < usersWithInterview.length; i++) {
        const user = usersWithInterview[i] as UserAttributes;
        const participant = await participantsDbQueries.create({
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            is_valid: user.is_valid,
            is_active: true,
            profile: user.profile,
            username: user.username,
            preferences: user.preferences,
            password: user.password,
            is_confirmed: user.is_confirmed,
            is_test: user.is_test,
            confirmation_token: user.confirmation_token,
            password_reset_token: user.password_reset_token,
            password_reset_expire_at: user.password_reset_expire_at,
            google_id: user.google_id,
            facebook_id: user.facebook_id
        });
        await knex(interviewTable)
            .update({ participant_id: participant.id })
            .where('id', (user as any).interview_id);
    }

    // Add foreign key to participant table and index and remove user_id column
    return knex.schema.alterTable(interviewTable, (table: Knex.TableBuilder) => {
        table.integer('participant_id').notNullable().index().alter();
        table.foreign('participant_id').references(`${participantTable}.id`).onDelete('CASCADE');
        table.dropColumn('user_id');
    });
}

export async function down(knex: Knex): Promise<void> {
    // Add the users column back to the table
    await knex.schema.alterTable(interviewTable, (table: Knex.TableBuilder) => {
        table.integer('user_id');
    });

    // Create or get the user for each current interview user and set user ID in interview table
    const usersWithInterview = await knex
        .select(`${participantTable}.*`, `${interviewTable}.id as interview_id`)
        .from(participantTable)
        .join(interviewTable, `${interviewTable}.participant_id`, `${participantTable}.id`);

    for (let i = 0; i < usersWithInterview.length; i++) {
        const participant = usersWithInterview[i] as ParticipantAttributes;
        const findBy: any = {};
        if (!_isBlank(participant.email)) {
            findBy.email = participant.email;
        }
        if (!_isBlank(participant.username)) {
            findBy.username = participant.username;
        }
        if (!_isBlank(participant.google_id)) {
            findBy.google_id = participant.google_id;
        }
        if (!_isBlank(participant.facebook_id)) {
            findBy.facebook_id = participant.facebook_id;
        }
        let user = await usersDbQueries.find(findBy);
        if (user === undefined) {
            user = await usersDbQueries.create({
                email: participant.email,
                first_name: participant.first_name,
                last_name: participant.last_name,
                is_valid: participant.is_valid,
                profile: participant.profile,
                username: participant.username,
                preferences: participant.preferences,
                password: participant.password,
                is_confirmed: participant.is_confirmed,
                is_test: participant.is_test,
                confirmation_token: participant.confirmation_token,
                password_reset_token: participant.password_reset_token,
                password_reset_expire_at: participant.password_reset_expire_at,
                google_id: participant.google_id,
                facebook_id: participant.facebook_id,
                is_admin: false
            });
        }

        await knex(interviewTable)
            .update({ user_id: user.id })
            .where('id', (participant as any).interview_id);
    }

    // Add foreign key to user table and index and remove participant_id column
    await knex.schema.alterTable(interviewTable, (table: Knex.TableBuilder) => {
        table.integer('user_id').notNullable().index().alter();
        table.foreign('user_id').references(`${usersTable}.id`).onDelete('CASCADE');
        table.dropColumn('participant_id');
    });

    return knex(participantTable).del();
}
