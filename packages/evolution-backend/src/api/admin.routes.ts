/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import moment from 'moment';
import knex from 'chaire-lib-backend/lib/config/shared/db.config';

import router from 'chaire-lib-backend/lib/api/admin.routes';
// Add export routes from admin/exports.routes
import { addExportRoutes } from './admin/exports.routes';

addExportRoutes();

router.all('/data/widgets/:widget/', (req, res, _next) => {
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
        getCompletedInterviewsCount(res);
        break;
    case 'interviews-completion-rate':
        getInterviewsCompletionRate(res);
        break;
    default:
        // TODO: new widgets will be added
    }
});

// TODO: add CSV export for this widget:
const getStartedAndCompletedInterviewsByDay = async (res) => {
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
const getStartedInterviewsCount = async (res) => {
    try {
        const startedInterviewsCount = await getStartedInterviewsCountFromDb();
        return res.status(200).json({ status: 'OK', startedInterviewsCount });
    } catch (error) {
        console.error('Error fetching started interviews count:', error);
        return res.status(500).json({ status: 'ERROR', message: 'Failed to fetch started interviews count' });
    }
};

// Get the count of completed interviews
const getCompletedInterviewsCount = async (res) => {
    try {
        const completedInterviewsCount = await getCompletedInterviewsCountFromDb();
        return res.status(200).json({ status: 'OK', completedInterviewsCount });
    } catch (error) {
        console.error('Error fetching completed interviews count:', error);
        return res.status(500).json({ status: 'ERROR', message: 'Failed to fetch completed interviews count' });
    }
};

// Get the interviews completion rate (completed / started, as a percentage, rounded to 1 decimal)
const getInterviewsCompletionRate = async (res) => {
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

export default router;
