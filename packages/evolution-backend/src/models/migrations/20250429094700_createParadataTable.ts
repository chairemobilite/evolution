/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { Knex } from 'knex';

const interviewsTbl = 'sv_interviews';
const paradataTbl = 'paradata_events';
const eventTypeEnumName = 'paradata_events_type';

const getInterviewLogsStream = function (knex: Knex) {
    const select = ['i.id', knex.raw('json_array_elements(logs) as logEntry')];

    const interviewsLogEntriesQuery = knex
        .select(...select)
        .from(`${interviewsTbl} as i`)
        .whereNotNull('logs');

    return knex
        .select([
            'id',
            knex.raw('(logEntry->>\'timestamp\')::numeric as timestamp'),
            knex.raw('logEntry->\'valuesByPath\' as values_by_path'),
            knex.raw('logEntry->\'unsetPaths\' as unset_paths')
        ])
        .from(interviewsLogEntriesQuery)
        .orderBy(['id', 'timestamp'])
        .stream();
};

const logsDataToParadata = async (knex: Knex) => {
    const queryStream = getInterviewLogsStream(knex);
    return new Promise((resolve, reject) => {
        queryStream
            .on('error', (error) => {
                console.error('queryStream failed', error);
                reject(error);
            })
            .on('data', (row) => {
                queryStream.pause();
                const { id, values_by_path, unset_paths, timestamp, server } = row;

                const paradata = {
                    interview_id: id,
                    timestamp: knex.raw('to_timestamp(?)', timestamp),
                    event_type: server ? 'legacy_server' : 'legacy',
                    event_data: JSON.stringify({ valuesByPath: values_by_path, unsetPaths: unset_paths }).replaceAll(
                        '\\u0000',
                        ''
                    )
                };

                knex(paradataTbl)
                    .insert(paradata)
                    .then(() => queryStream.resume())
                    .catch((error) => reject(error));
            })
            .on('end', () => {
                resolve(true);
            });
    });
};

export async function up(knex: Knex): Promise<unknown> {
    if (await knex.schema.hasTable(paradataTbl)) {
        return;
    }
    await knex.schema.createTable(paradataTbl, (table: Knex.TableBuilder) => {
        table.integer('interview_id').notNullable();
        table.foreign('interview_id').references(`${interviewsTbl}.id`).onDelete('CASCADE');
        table.timestamp('timestamp', { useTz: true }).notNullable().defaultTo(knex.fn.now());
        // Value will be null if user is the participant, the ID of the user otherwise, that can't be deleted
        table.integer('user_id').references('users.id').onDelete('RESTRICT');
        table
            .enu(
                'event_type',
                [
                    'legacy', // Event converted from legacy logs
                    'legacy_server', // Event converted from legacy logs, marked as server event
                    'widget_interaction', // Event when the participant/user interacts with a widget
                    'button_click', // Event when the participant/user clicks a button
                    'side_effect', // Event from the client, that does not come from a direct participant/user interaction
                    'server_event' // Event triggered by the server
                ],
                { useNative: true, enumName: eventTypeEnumName }
            )
            .defaultTo('side_effect');
        table.jsonb('event_data'); // The data corresponding to this event (content depends on the action type)
    });

    // Insert the logs from the interviews table
    await logsDataToParadata(knex);

    // Drop the logs column from the interviews table
    return knex.schema.table(interviewsTbl, (table: Knex.TableBuilder) => {
        table.dropColumn('logs');
    });
}

type ParadataLog = {
    timestamp: number;
    valuesByPath: Record<string, any>;
    server?: boolean;
    unsetPaths?: string[];
};

export async function down(knex: Knex): Promise<unknown> {
    await knex.schema.alterTable(interviewsTbl, (table: Knex.TableBuilder) => {
        table.json('logs');
    });

    const interviewUuids = await knex.select('id').from(interviewsTbl);
    for (let i = 0; i < interviewUuids.length; i++) {
        const interviewId = interviewUuids[i].id;
        const paradata = await knex(paradataTbl).where('interview_id', interviewId).orderBy('timestamp');
        if (paradata.length === 0) {
            continue;
        }
        const logs: ParadataLog[] = [];
        for (let j = 0; j < paradata.length; j++) {
            const logEntry = paradata[j];
            const { timestamp, event_type, event_data } = logEntry;
            const { valuesByPath, unsetPath } = event_data;

            const log: ParadataLog = {
                timestamp: Math.floor(new Date(timestamp).getTime() / 1000), // Convert to Unix seconds
                valuesByPath
            };
            if (event_type === 'legacy_server' || event_type === 'server_event') {
                log.server = true;
            }
            if (unsetPath !== undefined) {
                (log as any).unsetPaths = unsetPath;
            }
            logs.push(log);
        }
        await knex(interviewsTbl)
            .update({ logs: JSON.stringify(logs).replaceAll('\\u0000', '') })
            .where('id', interviewId);
    }

    return knex.schema.dropTable(paradataTbl).raw(`DROP TYPE ${eventTypeEnumName}`);
}
