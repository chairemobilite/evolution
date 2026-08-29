/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Knex } from 'knex';

const interviewsTable = 'sv_interviews';
const reviewDecisionsTable = 'sv_review_decisions';
const usersTable = 'users';

/**
 * Username of the user the migrated decisions are attributed to. Review
 * decisions require a reviewer, but the legacy `is_valid` column never recorded
 * who set it: the admin update was only traced in the paradata, which is
 * disabled by default (`logDatabaseUpdates`). Rather than crediting the
 * decisions to a real person who may not have taken them, they are attributed
 * to this placeholder, whose only purpose is to mark them as inherited.
 */
const legacyReviewerUsername = 'legacy-validation';

const legacyDecisionComment = 'Migrated from the deprecated is_valid interview column.';

/**
 * Gets the id of the user the migrated decisions are attributed to, creating it
 * on first need. The user cannot log in: it has no password, and `is_valid` is
 * false, which the authentication rejects.
 * @param knex - Knex instance of the migration
 * @returns Id of the legacy reviewer user
 */
const getLegacyReviewerId = async (knex: Knex): Promise<number> => {
    const existing = await knex(usersTable).select('id').where('username', legacyReviewerUsername).first();
    if (existing !== undefined) {
        return existing.id;
    }
    const [inserted] = await knex(usersTable)
        .insert({
            username: legacyReviewerUsername,
            first_name: 'Legacy',
            last_name: 'validation',
            is_valid: false,
            is_admin: false,
            is_confirmed: false
        })
        .returning('id');
    return typeof inserted === 'object' ? inserted.id : inserted;
};

export async function up(knex: Knex): Promise<void> {
    // `is_validated` is intentionally not migrated: it would map to a force
    // approve, which is an admin override that must be attributed to the admin
    // who took it. Its values stay in the deprecated column.
    const toMigrate = await knex(interviewsTable).select('id').whereNotNull('is_valid').first();
    if (toMigrate === undefined) {
        return;
    }
    const userId = await getLegacyReviewerId(knex);
    // Inserted in a single statement rather than row by row, as surveys hold
    // hundreds of thousands of interviews.
    await knex.raw(
        `insert into ?? (interview_id, user_id, object_type, object_uuid, decision_value, comment)
            select i.id, ?, 'interview', i.uuid,
                case when i.is_valid is true then 'approve' else 'reject' end, ?
            from ?? i
            where i.is_valid is not null
                -- The review system supersedes the legacy flag, so an interview already
                -- reviewed there keeps its decisions. A survey is not expected to have
                -- used both systems, but this lets the review decisions win if it did,
                -- instead of adding a migrated vote that would read as a disagreement.
                and not exists (
                    select 1 from ?? d where d.interview_id = i.id and d.object_type = 'interview'
                )
            -- Guards against the migration being run twice
            on conflict (interview_id, object_type, object_uuid, user_id) do nothing`,
        [reviewDecisionsTable, userId, legacyDecisionComment, interviewsTable, reviewDecisionsTable]
    );
}

export async function down(knex: Knex): Promise<void> {
    const user = await knex(usersTable).select('id').where('username', legacyReviewerUsername).first();
    if (user === undefined) {
        return;
    }
    // Only the rows `up` inserted are removed, recognized by the comment it wrote on them, and
    // the user is kept: `up` reuses an account already holding that username, whose own decisions
    // and account have to survive the rollback. A placeholder left behind is harmless, as it
    // cannot log in.
    await knex(reviewDecisionsTable)
        .where({ user_id: user.id, object_type: 'interview', comment: legacyDecisionComment })
        .delete();
}
