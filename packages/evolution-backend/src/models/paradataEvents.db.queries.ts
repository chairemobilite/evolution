/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import TrError from 'chaire-lib-common/lib/utils/TrError';

const tableName = 'paradata_events';
const interviewsTable = 'sv_interviews';

type ParadataEventType =
    | 'legacy'
    | 'legacy_server'
    | 'widget_interaction'
    | 'button_click'
    | 'side_effect'
    | 'server_event'
    | 'section_change'
    | 'language_change'
    | 'interview_open';

const log = async ({
    interviewId,
    userId,
    eventType,
    eventData
}: {
    interviewId: number;
    userId?: number;
    eventType: ParadataEventType;
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

/**
 * Streams the paradata for a single or all interviews.
 *
 * @param {number|undefined} interviewId The id of the interview to get the logs
 * for. Leave undefined to get all the paradata
 * @returns An interview logs stream. Returned fields are the interview 'id',
 * 'uuid', 'updated_at', 'is_valid', 'is_completed', 'is_validated',
 * 'is_questionable', as well as for each event the timestamp, as date
 * ('event_date') and unix timestamp ('timestampSec'), the ID of the user who
 * did the update ('user_id', null for participant) and the 'values_by_path',
 * 'unset_paths' and 'user_action' data
 */
const getParadataStream = function (interviewId?: number) {
    // FIXME As we really support more than legacy events, see what we can do
    // with the event_data instead of hard-coding the 3 paths
    const interviewParadataQuery = knex
        .select([
            'id',
            'uuid',
            'updated_at',
            'is_valid',
            'is_completed',
            'is_validated',
            'is_questionable',
            'user_id',
            'event_type',
            knex.raw('to_char(timestamp AT TIME ZONE \'UTC\', \'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"\') as event_date'),
            knex.raw('extract(epoch from timestamp) as timestamp_sec'),
            knex.raw('event_data->\'valuesByPath\' as values_by_path'),
            knex.raw('event_data->\'unsetPaths\' as unset_paths'),
            knex.raw('event_data->\'userAction\' as user_action')
        ])
        .from(tableName)
        .innerJoin(interviewsTable, 'id', `${tableName}.interview_id`);
    if (interviewId) {
        interviewParadataQuery.andWhere('id', interviewId);
    }
    return interviewParadataQuery.orderBy(['interview_id', 'timestamp']).stream();
};

export default {
    log,
    getParadataStream
};
