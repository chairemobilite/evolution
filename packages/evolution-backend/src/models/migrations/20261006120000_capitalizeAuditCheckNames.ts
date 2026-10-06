/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Knex } from 'knex';

const tableName = 'sv_audits';

/** Stored audit codes whose description now starts with a capital letter. */
const renamedErrorCodes: readonly [from: string, to: string][] = [
    ['I_F_loginMethodIsEmail', 'I_F_LoginMethodIsEmail'],
    ['I_F_loginMethodIsAnonymous', 'I_F_LoginMethodIsAnonymous'],
    ['I_F_loginMethodIsGoogle', 'I_F_LoginMethodIsGoogle'],
    ['I_F_loginMethodIsInterviewer', 'I_F_LoginMethodIsInterviewer'],
    ['I_F_loginMethodIsByField', 'I_F_LoginMethodIsByField'],
    ['I_F_loginMethodIsUnknown', 'I_F_LoginMethodIsUnknown'],
    ['HM_I_preGeographyAndHomeGeographyTooFarApartError', 'HM_I_PreGeographyAndHomeGeographyTooFarApartError'],
    ['HM_W_preGeographyAndHomeGeographyTooFarApart', 'HM_W_PreGeographyAndHomeGeographyTooFarApart'],
    ['HM_I_geographyNotInSurveyTerritory', 'HM_I_GeographyNotInSurveyTerritory']
];

/**
 * Rename stored audit codes so an ignored row still matches its check.
 * @param knex Database connection
 */
export async function up(knex: Knex): Promise<void> {
    for (const [from, to] of renamedErrorCodes) {
        await knex(tableName).where('error_code', from).update({ error_code: to });
    }
}

/**
 * Restore the previous audit codes.
 * @param knex Database connection
 */
export async function down(knex: Knex): Promise<void> {
    for (const [from, to] of renamedErrorCodes) {
        await knex(tableName).where('error_code', to).update({ error_code: from });
    }
}
