/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import { Knex } from 'knex';
import TrError from 'chaire-lib-common/lib/utils/TrError';

const tableName = 'paradata_events';
const interviewsTable = 'sv_interviews';
const tempTableName = 'temp_paradata_events_with_widget_path';

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
    eventData,
    forCorrection
}: {
    interviewId: number;
    userId?: number;
    eventType: ParadataEventType;
    eventData?: Record<string, any>;
    forCorrection?: boolean;
}): Promise<boolean> => {
    try {
        // Let the DB handle the timestamp to its default value, which is now(), with us precision
        const dbObject = {
            interview_id: interviewId,
            user_id: userId,
            event_type: eventType,
            event_data: JSON.stringify(eventData).replaceAll('\\u0000', ''),
            for_correction: forCorrection ?? false
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
            knex.raw('response->>\'_isCompleted\' as interview_is_completed'),
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

/**
 * Creates a temporary table with transformed paradata events including a widgetPath field.
 * The widgetPath field extracts specific data based on event_type:
 * - widget_interaction: userAction->path
 * - section_change: userAction->targetSection->sectionShortname
 * - button_click: userAction->buttonId
 *
 * The temporary table includes indexes on interview_id and timestamp for efficient queries.
 * When used within a transaction, the table will be automatically dropped at commit.
 * Note: No foreign key constraint is added because PostgreSQL temporary tables can only
 * reference other temporary tables.
 *
 * @param trx Optional knex transaction object. If provided, uses the transaction for all operations.
 * @returns Promise<void>
 */
const createParadataWithWidgetPathTable = async (trx: Knex.Transaction): Promise<void> => {
    try {
        // Drop the temporary table if it exists
        await trx.raw(`DROP TABLE IF EXISTS ${tempTableName}`);

        // Create the temporary table with the transformed data
        // ON COMMIT DROP ensures automatic cleanup when the transaction commits
        await trx.raw(`
            CREATE TEMPORARY TABLE ${tempTableName}
            ON COMMIT DROP
            AS
            SELECT 
                interview_id,
                timestamp,
                user_id,
                event_type,
                event_data,
                CASE 
                    WHEN event_type = 'widget_interaction' THEN event_data->'userAction'->>'path'
                    WHEN event_type = 'section_change' THEN event_data->'userAction'->'targetSection'->>'sectionShortname'
                    WHEN event_type = 'button_click' THEN event_data->'userAction'->>'buttonId'
                    ELSE NULL
                END as widget_path
            FROM ${tableName}
        `);

        // Note: Cannot add foreign key constraint to sv_interviews because temporary tables
        // can only reference other temporary tables in PostgreSQL
        // The join in queries will ensure referential integrity

        // Create index on interview_id for faster queries
        await trx.raw(`
            CREATE INDEX idx_${tempTableName}_interview_id 
            ON ${tempTableName}(interview_id)
        `);

        // Create index on timestamp for time-based queries
        await trx.raw(`
            CREATE INDEX idx_${tempTableName}_timestamp 
            ON ${tempTableName}(timestamp)
        `);
    } catch (error) {
        console.error('Error creating paradata with widget path table:', error);
        throw new TrError(`Cannot create temporary paradata table (knex error: ${error})`, 'PARAEV0002');
    }
};

/**
 * Gets the count of last events for incomplete interviews, grouped by widget path and event type.
 * Must be called within a transaction after createParadataWithWidgetPathTable has been called.
 *
 * @param trx Knex transaction object
 * @returns Promise with array of widget path, event type, and count
 */
const getIncompleteInterviewsLastEventCounts = async (
    trx: Knex.Transaction
): Promise<Array<{ event_type: string; count: string }>> => {
    try {
        // Subquery to get the max timestamp for each incomplete interview
        const maxTimestampSubquery = trx(tempTableName)
            .select('interview_id')
            .max('timestamp as max_timestamp')
            .whereNull('user_id') // Participant events only
            .whereIn('event_type', ['widget_interaction', 'button_click', 'section_change'])
            .groupBy('interview_id')
            .as('max_events');

        // Get the last events for incomplete interviews, grouped by widget_path and event_type
        const result = await trx
            .select(`${tempTableName}.event_type`)
            .count('* as count')
            .from(tempTableName)
            .innerJoin(interviewsTable, `${interviewsTable}.id`, `${tempTableName}.interview_id`)
            .innerJoin(maxTimestampSubquery, function (this: Knex.JoinClause) {
                this.on(`${tempTableName}.interview_id`, '=', 'max_events.interview_id').andOn(
                    `${tempTableName}.timestamp`,
                    '=',
                    'max_events.max_timestamp'
                );
            })
            // Incomplete interviews
            .where(function (this: Knex.QueryBuilder) {
                this.whereRaw(`${interviewsTable}.response->>'_isCompleted' IS NULL`).orWhereRaw(
                    `${interviewsTable}.response->>'_isCompleted' = 'false'`
                );
            })
            .groupBy([`${tempTableName}.event_type`])
            .orderBy('count', 'desc');

        return result;
    } catch (error) {
        console.error('Error getting incomplete interviews last event counts:', error);
        throw new TrError(`Cannot get incomplete interviews last event counts (knex error: ${error})`, 'PARAEV0003');
    }
};

export default {
    log,
    getParadataStream,
    createParadataWithWidgetPathTable,
    getIncompleteInterviewsLastEventCounts
};
