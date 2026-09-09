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

export default (authorizationMiddleware, loggingMiddleware: InterviewLoggingMiddlewares): Router => {
    const router = express.Router();

    router.use(isLoggedIn);

    addCommonRoutes(router, authorizationMiddleware, loggingMiddleware);

    router.get(
        '/survey/activeInterview/:interviewId',
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
                const interview = await Interviews.getInterviewByUuid(req.params.interviewId);
                if (interview !== undefined) {
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

    return router;
};
