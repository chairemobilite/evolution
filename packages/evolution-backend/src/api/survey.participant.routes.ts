/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
/**
 * This file provides a router with the routes to create/activate/update a
 * user's own survey
 * */
import express, { Request, Response, Router } from 'express';
import { isLoggedIn } from 'chaire-lib-backend/lib/services/auth/authorization';
import { UserAttributes } from 'chaire-lib-backend/lib/services/users/user';
import Interviews from '../services/interviews/interviews';

import { InterviewLoggingMiddlewares } from '../services/logging/queryLoggingMiddleware';
import addCommonRoutes from './survey.common.routes';

export default (authorizationMiddleware, loggingMiddleware: InterviewLoggingMiddlewares): Router => {
    const router = express.Router();

    router.use(isLoggedIn);

    addCommonRoutes(router, authorizationMiddleware, loggingMiddleware);

    router.get(
        '/survey/activeInterview',
        authorizationMiddleware(['update', 'read']),
        async (req: Request, res: Response) => {
            try {
                if (!req.user) {
                    console.log('activeSurvey: Request user is not defined!');
                    res.status(400).json({ status: 'BadRequest' });
                    return;
                }
                // Get the current interview for user
                let interview = await Interviews.getUserInterview((req.user as UserAttributes).id);
                if (interview === undefined) {
                    interview = await Interviews.createInterviewForUser(
                        (req.user as UserAttributes).id,
                        {},
                        loggingMiddleware.getUserIdForLogging(req),
                        ['id', 'uuid', 'is_valid', 'is_completed', 'response', 'participant_id']
                    );
                }
                res.status(200).json({ status: 'success', interview });
            } catch (error) {
                console.error(`Error opening participant's interview: ${error}`);
                return res.status(500).json({ status: 'failed', interview: null, error: 'cannot fetch interview' });
            }
        }
    );

    return router;
};
