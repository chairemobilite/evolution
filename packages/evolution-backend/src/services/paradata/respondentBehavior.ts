/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import paradataEventsDbQueries from '../../models/paradataEvents.db.queries';
import { RespondentBehaviorMetrics } from 'evolution-common/lib/services/paradata/types';

export class RespondentBehaviorService {
    /**
     * Retrieves respondent behavior metrics by creating a temporary table within a transaction
     * and running queries against it. The transaction is read-only and uses READ COMMITTED
     * isolation level to avoid blocking other operations.
     *
     * @returns Promise<RespondentBehaviorMetrics> The computed metrics
     */
    static getRespondentBehaviorMetrics = async (): Promise<RespondentBehaviorMetrics> => {
        // Use a transaction with READ COMMITTED isolation level to avoid blocking
        // The transaction will automatically commit at the end, dropping the temporary table
        return await knex.transaction(async (trx) => {
            // Set transaction to READ COMMITTED to minimize locking
            await trx.raw('SET TRANSACTION ISOLATION LEVEL READ COMMITTED');

            // Create the temporary table (will be auto-dropped on commit due to ON COMMIT DROP)
            console.time('Create temp paradata with widget path table');
            await paradataEventsDbQueries.createParadataWithWidgetPathTable(trx);
            console.timeEnd('Create temp paradata with widget path table');

            // Get incomplete interviews last event counts
            const lastEventCounts = await paradataEventsDbQueries.getIncompleteInterviewsLastEventCounts(trx);

            // Transform the results to match the expected type
            const incompleteInterviewsLastActionCounts = lastEventCounts.map((row) => ({
                eventType: row.event_type,
                count: parseInt(row.count, 10)
            }));

            // TODO: Add more respondent behavior metrics queries here as needed

            return {
                incompleteInterviewsLastActionCounts
            };
        });
    };
}
