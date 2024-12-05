/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import moment from 'moment';
import * as Status from 'chaire-lib-common/lib/utils/Status';
import serverHelper from 'evolution-legacy/lib/helpers/server';
import express from 'express';
import papaparse from 'papaparse';

import isAuthorized from 'chaire-lib-backend/lib/services/auth/authorization';
import { InterviewersSubject } from '../services/auth/roleDefinition';
import { UserAttributes } from 'chaire-lib-backend/lib/services/users/user';
import interviewerDbQueries from '../models/interviewers.db.queries';

const updateInterviewerCache = async function (
    options: { start: number; end: number; userId: number },
    interviewDataFct: (responses) => { [key: string]: unknown },
    batchSize = 100
) {
    let batchRowsCount = Infinity;
    let offset = 0;

    const monitoringInterviewsData: any[] = [];
    while (batchRowsCount > 0) {
        const rows = await interviewerDbQueries.getInterviewerDataBatch({
            offset,
            limit: batchSize,
            start: options.start,
            end: options.end
        });
        batchRowsCount = rows.length;
        offset += batchSize;
        for (let i = 0; i < batchRowsCount; i++) {
            const row = rows[i];
            const responses = row.responses;
            if (!responses) {
                continue;
            }

            const interviewData = interviewDataFct(responses);
            // get interview main timestamps:
            const startedAtTimestamp = responses._startedAt ? responses._startedAt : null;
            const completedAtTimestamp = responses._completedAt ? responses._completedAt : null;
            const interviewerStarted = moment(row.created_at).unix();
            const interviewerEnded = moment(row.updated_at).unix();

            monitoringInterviewsData.push({
                interviewer: row.email,
                interviewId: row.interview_id,
                interviewerStartedAt: interviewerStarted,
                interviewerLastUpdatedAt: interviewerEnded,
                startedAt: startedAtTimestamp,
                completedAt: completedAtTimestamp,
                isCompleted: completedAtTimestamp !== null,
                durationSeconds:
                    startedAtTimestamp !== null && completedAtTimestamp !== null
                        ? completedAtTimestamp - startedAtTimestamp
                        : null,
                durationMinutes:
                    startedAtTimestamp !== null && completedAtTimestamp !== null
                        ? Math.ceil((completedAtTimestamp - startedAtTimestamp) / 60)
                        : null,
                // Interviewer started if timestamps is within 30 seconds of the start time
                interviewerStarted: Math.abs(startedAtTimestamp - interviewerStarted) < 30000,
                // Interviewer considered to have ended if the last update is later than end time
                interviewerEnded: completedAtTimestamp !== null ? interviewerEnded > completedAtTimestamp : false,
                ...interviewData
            });
        }
    }
    serverHelper.setCache(`interviewer_monitoring_stats_${options.userId}.json`, {
        start: options.start,
        end: options.end,
        data: monitoringInterviewsData
    });
};

/**
 * Add interviewer routes to the application. With the resulting router, set it
 * to the `interviewer` path, like this: `app.use('/interviewer',
 * interviewerRoutes(...));`
 *
 * @param interviewDataFct
 * @returns
 */
export default function (interviewDataFct: {
    data: (responses) => { [key: string]: unknown };
    aggregate: (dataForInterviewer: any[]) => { [key: string]: unknown };
}) {
    const router = express.Router();

    router.use(isAuthorized({ [InterviewersSubject]: ['manage'] }));

    router.post('/monitoring/update_interviewer_cache', async (req, res) => {
        try {
            if (!(req as any).user) {
                throw 'Request user is not defined, an interview cannot be created for the user';
            }
            const user = (req as any).user as UserAttributes;
            const content = req.body;
            await updateInterviewerCache(
                { start: content.start, end: content.end, userId: user.id },
                interviewDataFct.data
            );
            return res.status(200).json(Status.createOk(true));
        } catch (error) {
            console.error(error);
            return res.status(500).json(Status.createError('could not update interviewer cache'));
        }
    });

    router.get('/monitoring/get_interviewer_data', (req, res, next) => {
        try {
            if (!(req as any).user) {
                throw 'Request user is not defined, an interview cannot be created for the user';
            }
            const user = (req as any).user as UserAttributes;
            const interviewsData = serverHelper.getCache(`interviewer_monitoring_stats_${user.id}.json`, { data: [] } as any);

            const csvContent: any[] = [];
            if (interviewsData.start === undefined) {
                throw 'No interviewer cache file';
            }
            const createCsvContent = (currentData: any[], currentUser) => {
                if (currentData.length > 0) {
                    const interviewerAggregation = {
                        interviewer: currentUser,
                        ...interviewDataFct.aggregate(currentData)
                    };
                    csvContent.push(interviewerAggregation);
                }
            };
            let currentInterviewer = undefined;
            const currentInterviewerData: any[] = [];
            for (let i = 0; i < interviewsData.data.length; i++) {
                const interviewerData = interviewsData.data[i];
                if (interviewerData.interviewer === currentInterviewer) {
                    currentInterviewerData.push(interviewerData);
                    continue;
                }
                createCsvContent(currentInterviewerData, currentInterviewer);
                currentInterviewerData.splice(0);
                currentInterviewer = interviewerData.interviewer;
                currentInterviewerData.push(interviewerData);
            }
            createCsvContent(currentInterviewerData, currentInterviewer);
            res.setHeader(
                'Content-disposition',
                `attachment; filename=interviewerData_${moment.unix(interviewsData.start).format('YYYYMMDD')}_${moment
                    .unix(interviewsData.end)
                    .format('YYYYMMDD')}.csv`
            );
            res.set('Content-Type', 'text/csv');
            return res.status(200).send(papaparse.unparse(csvContent));
        } catch (error) {
            console.error(error);
            return res.status(500).json(Status.createError('could not create csv file'));
        }
    });

    return router;
}
