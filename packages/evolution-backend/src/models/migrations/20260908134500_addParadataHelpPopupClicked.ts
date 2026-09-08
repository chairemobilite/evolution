/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Knex } from 'knex';

const eventTypeEnumName = 'paradata_events_type';
const helpPopupClickedEnumVal = 'help_popup_clicked';

export async function up(knex: Knex): Promise<unknown> {
    return knex.raw(`ALTER TYPE ${eventTypeEnumName} ADD VALUE '${helpPopupClickedEnumVal}';`);
}

export async function down(): Promise<unknown> {
    // It is not recommended to remove values from an enum type in postgres as
    // it may cause data corruption if rows were using it. We just keep it
    return;
}
