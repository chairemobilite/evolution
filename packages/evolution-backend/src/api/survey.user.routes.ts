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
import addCommonRoutes, { activateInterview } from './survey.common.routes';

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
                activateInterview(req, res, (req) => Interviews.getInterviewByUuid(req.params.interviewId));
            } catch (error) {
                console.error(`Error opening interview by id: ${error}`);
                return res.status(500).json({ status: 'failed', interview: null, error: 'cannot fetch interview' });
            }
        }
    );

    return router;
};
