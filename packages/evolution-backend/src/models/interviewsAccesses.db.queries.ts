/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import TrError from 'chaire-lib-common/lib/utils/TrError';
import { UserInterviewAccesses } from '../services/logging/loggingTypes';

import interviewsDbQueries from './interviews.db.queries';

const tableName = 'sv_interviews_accesses';

const getInterviewId = async (interviewUuid: string): Promise<number> => {
    const interviewId = await interviewsDbQueries.getInterviewIdByUuid(interviewUuid);
    if (interviewId === undefined) {
        throw `The requested interview does not exist: ${interviewUuid}`;
    }
    return interviewId;
};

const userOpenedInterview = async (options: {
    interviewUuid: string;
    userId: number;
    validationMode?: boolean;
}): Promise<boolean> => {
    try {
        const interviewId = await getInterviewId(options.interviewUuid);
        await knex(tableName)
            .insert({
                interview_id: interviewId,
                user_id: options.userId,
                for_validation: options.validationMode === true
            })
            .onConflict(['interview_id', 'user_id', 'for_validation'])
            .ignore();

        return true;
    } catch (error) {
        console.error(error);
        throw new TrError(`cannot log the user opening the interview (knex error: ${error})`, 'TIUAQGC0001');
    }
};

const userUpdatedInterview = async (options: {
    interviewUuid: string;
    userId: number;
    validationMode?: boolean;
}): Promise<boolean> => {
    try {
        const interviewId = await getInterviewId(options.interviewUuid);
        // Insert a new record, the opening time will be the current timestamp
        await knex(tableName)
            .insert({
                interview_id: interviewId,
                user_id: options.userId,
                for_validation: options.validationMode === true,
                update_count: 1
            })
            .onConflict(['interview_id', 'user_id', 'for_validation'])
            .merge({
                update_count: knex.raw(`${tableName}.update_count + 1`)
            });

        return true;
    } catch (error) {
        console.error(error);
        throw new TrError(`cannot log the user updating an interview (knex error: ${error})`, 'TIUAQGC0002');
    }
};

const collection = async (): Promise<UserInterviewAccesses[]> => {
    try {
        return await knex.select(`${tableName}.*`).from(tableName);
    } catch (error) {
        console.error(error);
        throw new TrError(`cannot fetch user interview accesses (knex error: ${error})`, 'TIUAQGC0003');
    }
};

// TODO Add filters by date?
const statEditingUsers = async (params: {
    permissions?: string[];
}): Promise<(UserInterviewAccesses & { email: string })[]> => {
    try {
        const statQuery = knex
            .select(`${tableName}.*`, 'users.email')
            .from(tableName)
            .leftJoin('users', `${tableName}.user_id`, 'users.id');

        if (params.permissions) {
            params.permissions.forEach((permission, index) => {
                const wherePermission = `(users.permissions->>'${permission}')::boolean = true`;
                if (index === 0) {
                    statQuery.whereRaw(wherePermission);
                } else {
                    statQuery.orWhereRaw(wherePermission);
                }
            });
        }

        return (await statQuery) as (UserInterviewAccesses & { email: string })[];
    } catch (error) {
        throw new TrError(
            `Cannot stat the editing users for interviews (knex error: ${error})`,
            'DBQCR0007',
            'DatabaseCannotStatEditingUsersBecauseDatabaseError'
        );
    }
};

export default {
    userOpenedInterview,
    userUpdatedInterview,
    collection,
    statEditingUsers
};
