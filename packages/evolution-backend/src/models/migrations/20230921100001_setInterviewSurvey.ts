/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { Knex } from 'knex';
import { SurveyAttributes } from '../../services/surveys/survey';
import config from 'chaire-lib-common/lib/config/shared/project.config';

const interviewTable = 'sv_interviews';
const surveyTable = 'sv_surveys';

export async function up(knex: Knex): Promise<unknown> {
    // Add the survey column to the table
    await knex.schema.alterTable(interviewTable, (table: Knex.TableBuilder) => {
        table.integer('survey_id');
    });

    // Get existing surveys:
    const existingSurveys = await knex
        .select('*')
        .from(surveyTable);

    const surveys : SurveyAttributes[] = [];
    for (let i = 0; i < existingSurveys.length; i++) {
        const survey = existingSurveys[i] as SurveyAttributes;
        surveys.push(survey);
    }

    // this is the survey id to which we will assign all interviews:
    let assignedSurveyId : number | undefined = undefined;

    // If only one survey exist, use this one
    if (surveys.length === 1) {
        assignedSurveyId = surveys[0].id;
    } else {
        // if more then 1 survey or no survey in db, create a default one using the project shortname or set to string "default":
        const returning = await knex(surveyTable)
            .insert({
                shortname: config.projectShortname || 'default'
            })
            .returning('id');
        assignedSurveyId = returning[0].id;
    }

    if (assignedSurveyId === undefined) {
        throw('Cannot find or generate survey to assign to the interviews');
    }

    await knex(interviewTable)
        .update({ survey_id: assignedSurveyId });

    // Add foreign key to participant table and index + set unique on survey_id and id
    return knex.schema.alterTable(interviewTable, (table: Knex.TableBuilder) => {
        table.integer('survey_id').notNullable().index().alter();
        table.foreign('survey_id').references(`${surveyTable}.id`).onDelete('RESTRICT');
        table.unique(['survey_id', 'participant_id']);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable(interviewTable, (table: Knex.TableBuilder) => {
        table.dropUnique(['survey_id', 'participant_id']);
        table.dropForeign('survey_id');
        table.dropColumn('survey_id');
    });
}
