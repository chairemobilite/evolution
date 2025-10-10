/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import moment from 'moment';
import { Response, Request } from 'express';
import knex from 'chaire-lib-backend/lib/config/shared/db.config';
import router from 'chaire-lib-backend/lib/api/admin.routes';
import { addExportRoutes } from './admin/exports.routes';

addExportRoutes();

router.all('/data/widgets/:widget/', (req: Request, res: Response, _next) => {
    const widgetName = req.params.widget;

    if (!widgetName) {
        return res.status(200).json({ status: 'provide a valid widget name' });
    }
    switch (widgetName) {
    case 'started-and-completed-interviews-by-day':
        getStartedAndCompletedInterviewsByDay(res);
        break;
    case 'started-interviews-count':
        // Get the count of started interviews
        getStartedInterviewsCount(res);
        break;
    case 'completed-interviews-count':
        // Get the count of completed interviews
        getCompletedInterviewsCount(res);
        break;
    case 'interviews-completion-rate':
        // Get the count of completed interviews
        getInterviewsCompletionRate(res);
        break;
    case 'survey-difficulty-distribution':
        // Get the survey difficulty distribution from respondent feedback
        getSurveyDifficultyDistribution(res);
        break;
    default:
        return res
            .status(404)
            .json({ status: 'ERROR', message: `Admin monitoring widget '${widgetName}' not found` });
    }
});

// TODO: add CSV export for this widget:
const getStartedAndCompletedInterviewsByDay = async (res: Response) => {
    // Get the sum directly from the DB, using the started_at date for grouping
    const subquery = knex('sv_interviews').select(
        'id',
        knex.raw('to_char(created_at, \'YYYY-MM-DD\') as started_at_date'),
        knex.raw('case when response->>\'_completedAt\' is null then 0 else 1 end as is_completed')
    );
    const responses = await knex(subquery.as('resp_data'))
        .select('started_at_date')
        .count({ started_at: 'id' })
        .sum({ is_completed: 'is_completed' })
        .whereNotNull('started_at_date')
        .groupBy('started_at_date')
        .orderBy('started_at_date');
    if (responses.length <= 0) {
        return res
            .status(200)
            .json({ status: 'OK', dates: [], started: [], completed: [], startedCount: 0, completedCount: 0 });
    }
    // Create an array of dates with all dates in range
    const dates: string[] = [];
    const firstDate = moment(responses[0]['started_at_date']);
    const lastDate = moment(responses[responses.length - 1]['started_at_date']);
    for (let date = firstDate; date.diff(lastDate, 'days') <= 0; date.add(1, 'days')) {
        const dateStr = date.format('YYYY-MM-DD');
        dates.push(dateStr);
    }
    // Process database data into response field
    const dataByDate = {};
    responses.forEach((dateCount) => (dataByDate[dateCount['started_at_date']] = dateCount));
    const started = dates.map((date) => (dataByDate[date] !== undefined ? Number(dataByDate[date]['started_at']) : 0));
    const completed = dates.map((date) =>
        dataByDate[date] !== undefined ? Number(dataByDate[date]['is_completed']) : 0
    );
    const startedCount = started.reduce((cnt, startedCnt) => cnt + startedCnt, 0);
    const completedCount = completed.reduce((cnt, startedCnt) => cnt + startedCnt, 0);
    return res.status(200).json({ status: 'OK', dates, started, completed, startedCount, completedCount });
};
// Helper function to get started interviews count from database
const getStartedInterviewsCountFromDb = async () => {
    const result = await knex('sv_interviews').count({ started: 'id' });
    return result && result[0] && result[0].started ? Number(result[0].started) : 0;
};
// Helper function to get completed interviews count from database
const getCompletedInterviewsCountFromDb = async () => {
    const result = await knex('sv_interviews').sum({
        is_completed: knex.raw('case when response->>\'_completedAt\' is null then 0 else 1 end')
    });
    return result && result[0] && result[0].is_completed ? Number(result[0].is_completed) : 0;
};

// Get the count of started interviews
const getStartedInterviewsCount = async (res: Response) => {
    try {
        const startedInterviewsCount = await getStartedInterviewsCountFromDb();
        return res.status(200).json({ status: 'OK', startedInterviewsCount });
    } catch (error) {
        console.error('Error fetching started interviews count:', error);
        return res.status(500).json({ status: 'ERROR', message: 'Failed to fetch started interviews count' });
    }
};

// Get the count of completed interviews
const getCompletedInterviewsCount = async (res: Response) => {
    try {
        const completedInterviewsCount = await getCompletedInterviewsCountFromDb();
        return res.status(200).json({ status: 'OK', completedInterviewsCount });
    } catch (error) {
        console.error('Error fetching completed interviews count:', error);
        return res.status(500).json({ status: 'ERROR', message: 'Failed to fetch completed interviews count' });
    }
};

// Get the interviews completion rate (completed / started, as a percentage, rounded to 1 decimal)
const getInterviewsCompletionRate = async (res: Response) => {
    try {
        // Get counts using helper functions
        const startedCount = await getStartedInterviewsCountFromDb();
        const completedCount = await getCompletedInterviewsCountFromDb();
        // Calculate completion rate (as percentage, 0 if startedCount is 0), rounded to 1 decimal
        const completionRate = startedCount > 0 ? Number(((completedCount / startedCount) * 100).toFixed(1)) : 0;
        return res.status(200).json({ status: 'OK', interviewsCompletionRate: completionRate });
    } catch (error) {
        console.error('Error fetching interviews completion rate:', error);
        return res.status(500).json({ status: 'ERROR', message: 'Failed to fetch interviews completion rate' });
    }
};

// Get the survey difficulty distribution from respondent feedback
const getSurveyDifficultyDistribution = async (res: Response) => {
    try {
        // Query all completed interviews with a non-null 'response.end.difficultyOfTheSurvey'
        const rows = await knex('sv_interviews')
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
        return res.status(200).json({ status: 'OK', data: distribution });
    } catch (error) {
        console.error('Error fetching survey difficulty distribution:', error);
        return res.status(500).json({ status: 'ERROR', message: 'Failed to fetch survey difficulty distribution' });
    }
};

export default router;
