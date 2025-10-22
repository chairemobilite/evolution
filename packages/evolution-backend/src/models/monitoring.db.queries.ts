/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import TrError from 'chaire-lib-common/lib/utils/TrError';

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
 * Get the survey difficulty distribution from respondent feedback
 */
export const getSurveyDifficultyDistribution = async (): Promise<
    Array<{ label: string; percentage: number; count: number }>
> => {
    try {
        // Query all completed interviews with a non-null 'response.end.difficultyOfTheSurvey'
        const rows = await knex(interviewsTable)
            .select(knex.raw('CAST(response->\'end\'->>\'difficultyOfTheSurvey\' AS FLOAT) as difficulty'))
            .whereRaw('response->\'end\'->\'difficultyOfTheSurvey\' IS NOT NULL');

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
