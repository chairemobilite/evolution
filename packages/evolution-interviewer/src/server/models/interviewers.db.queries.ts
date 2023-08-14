/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';

type InterviewerSurveyData = {
    user_id: number;
    interview_id: number;
    email: string;
    created_at: string;
    updated_at: string;
    responses: any;
};

const getInterviewerDataBatch = async function (options: {
    offset: number;
    limit: number;
    start: number;
    end: number;
}): Promise<InterviewerSurveyData[]> {
    return (await knex
        .select('a.user_id', 'a.interview_id', 'u.email', 'a.created_at', 'a.updated_at', 'i.responses')
        .from('sv_interviews_accesses as a')
        .innerJoin('sv_interviews as i', 'a.interview_id', 'i.id')
        .innerJoin('users as u', 'a.user_id', 'u.id')
        .where('a.for_validation', false)
        .andWhereRaw('extract(epoch from a.updated_at) >= ?', options.start)
        .andWhereRaw('extract(epoch from a.created_at) <= ?', options.end)
        .orderBy('a.user_id', 'i.id')
        .offset(options.offset)
        .limit(options.limit)) as InterviewerSurveyData[];
};

export default {
    getInterviewerDataBatch
};
