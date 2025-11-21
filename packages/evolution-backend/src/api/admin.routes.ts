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
import {
    getStartedInterviewsCount,
    getCompletedInterviewsCount,
    getInterviewsCompletionRate,
    getSurveyDifficultyDistribution
} from '../models/monitoring.db.queries';

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
        handleStartedInterviewsCount(res);
        break;
    case 'completed-interviews-count':
        // Get the count of completed interviews
        handleCompletedInterviewsCount(res);
        break;
    case 'interviews-completion-rate':
        // Get the count of completed interviews
        handleInterviewsCompletionRate(res);
        break;
    case 'survey-difficulty-distribution':
        // Get the survey difficulty distribution from respondent feedback
        handleSurveyDifficultyDistribution(res);
        break;
    default:
        return res
            .status(404)
            .json({ status: 'ERROR', message: `Admin monitoring widget '${widgetName}' not found` });
    }
});

// TODO: add CSV export for this widget.
// TODO: Move this logic to monitoring.db.queries.ts
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

// Get the count of started interviews
const handleStartedInterviewsCount = async (res: Response) => {
    try {
        const startedInterviewsCount = await getStartedInterviewsCount();
        return res.status(200).json({ status: 'OK', startedInterviewsCount });
    } catch (error) {
        console.error('Error fetching started interviews count:', error);
        return res.status(500).json({ status: 'ERROR', message: 'Failed to fetch started interviews count' });
    }
};

// Get the count of completed interviews
const handleCompletedInterviewsCount = async (res: Response) => {
    try {
        const completedInterviewsCount = await getCompletedInterviewsCount();
        return res.status(200).json({ status: 'OK', completedInterviewsCount });
    } catch (error) {
        console.error('Error fetching completed interviews count:', error);
        return res.status(500).json({ status: 'ERROR', message: 'Failed to fetch completed interviews count' });
    }
};

// Get the interviews completion rate (completed / started, as a percentage, rounded to 1 decimal)
const handleInterviewsCompletionRate = async (res: Response) => {
    try {
        const interviewsCompletionRate = await getInterviewsCompletionRate();
        return res.status(200).json({ status: 'OK', interviewsCompletionRate });
    } catch (error) {
        console.error('Error fetching interviews completion rate:', error);
        return res.status(500).json({ status: 'ERROR', message: 'Failed to fetch interviews completion rate' });
    }
};

// Get the survey difficulty distribution from respondent feedback
const handleSurveyDifficultyDistribution = async (res: Response) => {
    try {
        const distribution = await getSurveyDifficultyDistribution();
        return res.status(200).json({ status: 'OK', data: distribution });
    } catch (error) {
        console.error('Error fetching survey difficulty distribution:', error);
        return res.status(500).json({ status: 'ERROR', message: 'Failed to fetch survey difficulty distribution' });
    }
};

export default router;
