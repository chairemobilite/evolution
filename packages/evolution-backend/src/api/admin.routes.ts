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
        // TODO: new widgets will be added
    }
});

// TODO: add CSV export for this widget:
const getStartedAndCompletedInterviewsByDay = async (res) => {
    // Get the sum directly from the DB, using the started_at date for grouping
    const subquery = knex('sv_interviews').select(
        'id',
        knex.raw('to_char(created_at, \'YYYY-MM-DD\') as started_at_date'),
        knex.raw('case when responses->>\'_completedAt\' is null then 0 else 1 end as completed_at')
    );
    const responses = await knex(subquery.as('resp_data'))
        .select('started_at_date')
        .count({ started_at: 'id' })
        .sum({ completed_at: 'completed_at' })
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

    // Process database data into responses fields
    const dataByDate = {};
    responses.forEach((dateCount) => (dataByDate[dateCount['started_at_date']] = dateCount));

    const started = dates.map((date) => (dataByDate[date] !== undefined ? Number(dataByDate[date]['started_at']) : 0));
    const completed = dates.map((date) =>
        dataByDate[date] !== undefined ? Number(dataByDate[date]['completed_at']) : 0
    );
    const startedCount = started.reduce((cnt, startedCnt) => cnt + startedCnt, 0);
    const completedCount = completed.reduce((cnt, startedCnt) => cnt + startedCnt, 0);

    return res.status(200).json({ status: 'OK', dates, started, completed, startedCount, completedCount });
};

export default router;
