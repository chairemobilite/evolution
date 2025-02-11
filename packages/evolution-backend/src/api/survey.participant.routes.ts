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
import addCommonRoutes, { activateInterview } from './survey.common.routes';

export default (authorizationMiddleware, loggingMiddleware: InterviewLoggingMiddlewares): Router => {
    const router = express.Router();

    router.use(isLoggedIn);

    addCommonRoutes(router, authorizationMiddleware, loggingMiddleware);

    router.get('/survey/createInterview', authorizationMiddleware(['create']), async (req: Request, res: Response) => {
        try {
            if (!req.user) {
                throw 'Request user is not defined, an interview cannot be created for the user';
            }
            const interview = await Interviews.createInterviewForUser((req.user as UserAttributes).id, {}, [
                'id',
                'uuid',
                'is_valid',
                'is_completed',
                'responses',
                'participant_id'
            ]);
            return res.status(200).json({ status: 'success', interview });
        } catch (error) {
            console.error(`Error creating interviews: ${error}`);
            return res
                .status(200)
                .json({ status: 'failed', interview: null, error: 'cannot create interview:' + error });
        }
    });

    router.get(
        '/survey/activeInterview/',
        authorizationMiddleware(['update', 'read']),
        async (req: Request, res: Response) => {
            try {
                activateInterview(req, res, (req) => Interviews.getUserInterview((req.user as UserAttributes).id));
            } catch (error) {
                console.error(`Error opening participant's interview: ${error}`);
                return res.status(500).json({ status: 'failed', interview: null, error: 'cannot fetch interview' });
            }
        }
    );

    return router;
};
