/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
/**
 * This file provides a router with the routes to activate/update an interview
 * by a user of the admin app.
 * */
import express, { Request, Response, Router } from 'express';
import { isLoggedIn } from 'chaire-lib-backend/lib/services/auth/authorization';
import Interviews from '../services/interviews/interviews';

import { InterviewLoggingMiddlewares } from '../services/logging/queryLoggingMiddleware';
import validateUuidMiddleware from './helpers/validateUuidMiddleware';
import addCommonRoutes from './survey.common.routes';
import { addRolesToInterview } from '../services/interviews/interview';
import { UserAttributes } from 'chaire-lib-backend/lib/services/users/user';
import { UserAction } from 'evolution-common/lib/services/questionnaire/types';
import { getParadataLoggingFunction } from '../services/logging/paradataLogging';
import { isParticipantBlockedByFreeze } from 'evolution-common/lib/services/interviews/canFreezeInterview';

export default (authorizationMiddleware, loggingMiddleware: InterviewLoggingMiddlewares): Router => {
    const router = express.Router();

    router.use(isLoggedIn);

    addCommonRoutes(router, authorizationMiddleware, loggingMiddleware);

    router.get(
        '/survey/activeInterview/:interviewUuid',
        validateUuidMiddleware,
        authorizationMiddleware(['update', 'read']),
        loggingMiddleware.openingInterview(false),
        async (req: Request, res: Response) => {
            try {
                if (!req.user) {
                    console.log('activeSurvey: Request user is not defined!');
                    res.status(400).json({ status: 'BadRequest' });
                    return;
                }
                // Get the current interview with uuid
                const interview = await Interviews.getInterviewByUuid(req.params.interviewUuid);
                if (interview !== undefined && isParticipantBlockedByFreeze(interview)) {
                    console.log(`activeSurvey: Interview is frozen for interview id ${interview.id}`);
                    return res
                        .status(403)
                        .json({ status: 'forbidden', interview: null, error: 'interview cannot be accessed' });
                } else if (interview !== undefined) {
                    addRolesToInterview(interview, req.user as UserAttributes);
                    res.status(200).json({ status: 'success', interview });
                } else {
                    // If not found, return null
                    res.status(404).json({ status: 'notFound', interview: null });
                }
            } catch (error) {
                console.error(`Error opening interview by id: ${error}`);
                return res.status(500).json({ status: 'failed', interview: null, error: 'cannot fetch interview' });
            }
        }
    );

    // On the admin side, paradata events only happen for a logged in user
    router.post('/survey/logClientEvent/', async (req: Request, res: Response) => {
        try {
            if (!req.user) {
                console.log('logClientEvent: Request user is not defined!');
                res.status(400).json({ status: 'BadRequest' });
                return;
            }
            // The interview ID should come from the request
            const userId = loggingMiddleware.getUserIdForLogging(req);
            const content = req.body;
            const clientEvent = content.clientEvent as UserAction;
            const receivedInterviewId = content.interviewId;
            if (receivedInterviewId === undefined || receivedInterviewId === null) {
                return res.status(400).json({ status: 'MissingInterviewId' });
            }
            const interviewId =
                typeof receivedInterviewId === 'number'
                    ? receivedInterviewId
                    : typeof receivedInterviewId === 'string' && receivedInterviewId.trim() !== ''
                        ? Number(receivedInterviewId)
                        : NaN;
            if (!Number.isInteger(interviewId) || interviewId <= 0) {
                return res.status(400).json({ status: 'InvalidInterviewId' });
            }

            // Log this support request in the paradata if logging is enabled
            const paradataLogginsFct = getParadataLoggingFunction({
                interviewId,
                userId
            });
            if (paradataLogginsFct !== undefined) {
                paradataLogginsFct({
                    userAction: clientEvent
                });
            }
            return res.status(200).json({ status: 'success' });
        } catch (error) {
            console.error(`Error logging client paradata event: ${error}`);
            return res.status(500).json({ status: 'failed' });
        }
    });

    return router;
};
