/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import TrError from 'chaire-lib-common/lib/utils/TrError';

const tableName = 'paradata_events';

const log = async ({
    interviewId,
    userId,
    eventType,
    eventData
}: {
    interviewId: number;
    userId?: number;
    eventType: string;
    eventData?: Record<string, any>;
}): Promise<boolean> => {
    try {
        // Let the DB handle the timestamp to its default value, which is now(), with us precision
        const dbObject = {
            interview_id: interviewId,
            user_id: userId,
            event_type: eventType,
            event_data: JSON.stringify(eventData).replaceAll('\\u0000', '')
        };
        await knex(tableName).insert(dbObject);
        return true;
    } catch (error) {
        console.error(error);
        throw new TrError(`cannot insert paradata event log (knex error: ${error})`, 'PARAEV0001');
    }
};

export default {
    log
};
