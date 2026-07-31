/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import TrError from 'chaire-lib-common/lib/utils/TrError';
import config from 'evolution-common/lib/config/project.config';
import { parseISODateToTimestamp } from 'evolution-common/lib/utils/DateTimeUtils';

const interviewsTable = 'sv_interviews';

/**
 * Get the count of started interviews from database
 */
export const getStartedInterviewsCount = async (): Promise<number> => {
    try {
        const result = await knex(interviewsTable).count({ started: 'id' });
        return result && result[0] && result[0].started ? Number(result[0].started) : 0;
    } catch (error) {
        console.error('Error fetching started interviews count:', error);
        throw new TrError(`cannot get started interviews count (knex error: ${error})`, 'MON0001');
    }
};

/**
 * Get the count of completed interviews from database
 */
export const getCompletedInterviewsCount = async (): Promise<number> => {
    try {
        const result = await knex(interviewsTable).sum({
            is_completed: knex.raw('case when response->>\'_completedAt\' is null then 0 else 1 end')
        });
        return result && result[0] && result[0].is_completed ? Number(result[0].is_completed) : 0;
    } catch (error) {
        console.error('Error fetching completed interviews count:', error);
        throw new TrError(`cannot get completed interviews count (knex error: ${error})`, 'MON0002');
    }
};

/**
 * Get the interviews completion rate (completed / started, as a percentage, rounded to 1 decimal)
 */
export const getInterviewsCompletionRate = async (): Promise<number> => {
    try {
        const startedCount = await getStartedInterviewsCount();
        const completedCount = await getCompletedInterviewsCount();
        const completionRate = startedCount > 0 ? Number(((completedCount / startedCount) * 100).toFixed(1)) : 0;
        return completionRate;
    } catch (error) {
        console.error('Error fetching interviews completion rate:', error);
        throw new TrError(`cannot get interviews completion rate (knex error: ${error})`, 'MON0003');
    }
};

/**
 * Get the counts of started and completed interviews, grouped by the calendar
 * day (in the survey's configured timezone) on which the interview started.
 * Interviews started outside the survey period (`startDateTimeWithTimezoneOffset` /
 * `endDateTimeWithTimezoneOffset` config options, when set) are ignored.
 * @returns Array of `{ date: 'YYYY-MM-DD', started, completed }`, ordered by date
 */
export const getStartedAndCompletedInterviewsByDay = async (): Promise<
    Array<{ date: string; started: number; completed: number }>
> => {
    try {
        // created_at is a timestamptz; convert it to the survey's timezone (UTC when not
        // configured) so the calendar day does not depend on the DB session timezone
        const subquery = knex(interviewsTable).select(
            'id',
            knex.raw('to_char(created_at at time zone ?, \'YYYY-MM-DD\') as started_at_date', [config.timezone ?? 'UTC']),
            knex.raw('case when response->>\'_completedAt\' is null then 0 else 1 end as is_completed')
        );
        // Ignore interviews started outside the survey period, if configured
        const surveyStartTimestamp = parseISODateToTimestamp(config.startDateTimeWithTimezoneOffset);
        const surveyEndTimestamp = parseISODateToTimestamp(config.endDateTimeWithTimezoneOffset);
        if (surveyStartTimestamp !== undefined) {
            subquery.where('created_at', '>=', new Date(surveyStartTimestamp));
        }
        if (surveyEndTimestamp !== undefined) {
            subquery.where('created_at', '<=', new Date(surveyEndTimestamp));
        }
        const rows = await knex(subquery.as('resp_data'))
            .select('started_at_date')
            .count({ started_at: 'id' })
            .sum({ is_completed: 'is_completed' })
            .whereNotNull('started_at_date')
            .groupBy('started_at_date')
            .orderBy('started_at_date');
        return rows.map((row) => ({
            date: row['started_at_date'],
            started: Number(row['started_at']),
            completed: Number(row['is_completed'])
        }));
    } catch (error) {
        console.error('Error fetching started and completed interviews by day:', error);
        throw new TrError(`cannot get started and completed interviews by day (knex error: ${error})`, 'MON0005');
    }
};

/**
 * Get the survey difficulty distribution from respondent feedback
 */
export const getSurveyDifficultyDistribution = async (): Promise<
    Array<{ label: string; percentage: number; count: number }>
> => {
    try {
        // Query interviews with a non-null 'response.perceivedBurden.difficultyRange'
        // Important: use ->> (text extraction) so JSON `null` is treated as SQL NULL and excluded.
        const rows = await knex(interviewsTable)
            .select(knex.raw('CAST(response->\'perceivedBurden\'->>\'difficultyRange\' AS FLOAT) as difficulty'))
            .whereRaw('response->\'perceivedBurden\'->>\'difficultyRange\' IS NOT NULL');

        // Bin the values into 10 bins: 0-10, 11-20, 21-30, ..., 91-100
        const bins = Array.from({ length: 10 }, (_, i) => {
            const min = i === 0 ? 0 : i * 10 + 1;
            const max = (i + 1) * 10;
            return {
                min,
                max,
                count: 0,
                label: `${min}-${max} %`
            };
        });

        // Count the number of responses in each bin
        for (const row of rows) {
            const difficulty = Number(row.difficulty);
            if (isNaN(difficulty)) continue;

            // Find the correct bin
            let binIdx = -1;
            if (difficulty >= 0 && difficulty <= 10) {
                binIdx = 0;
            } else {
                binIdx = bins.findIndex((bin, i) => i > 0 && difficulty >= bin.min && difficulty <= bin.max);
            }
            if (binIdx >= 0 && binIdx < bins.length) {
                bins[binIdx].count += 1;
            }
        }

        // Calculate total for percentage
        const total = bins.reduce((sum, bin) => sum + bin.count, 0);

        // Format for frontend: include count (value) and percentage
        const distribution = bins.map(({ count, label }) => ({
            label,
            percentage: total > 0 ? Math.round((count / total) * 100) : 0,
            count
        }));

        return distribution;
    } catch (error) {
        console.error('Error fetching survey difficulty distribution:', error);
        throw new TrError(`cannot get survey difficulty distribution (knex error: ${error})`, 'MON0004');
    }
};
