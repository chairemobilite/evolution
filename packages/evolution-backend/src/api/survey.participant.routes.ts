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
import projectConfig from 'evolution-common/lib/config/project.config';
import { isLoggedIn } from 'chaire-lib-backend/lib/services/auth/authorization';
import { getParadataLoggingFunction, isUserAction } from '../services/logging/paradataLogging';
import { UserAttributes } from 'chaire-lib-backend/lib/services/users/user';
import Interviews from '../services/interviews/interviews';
import { sendSupportRequestEmail } from '../services/logging/supportRequest';
import { validateCaptchaToken } from 'chaire-lib-backend/lib/api/captcha.routes';

import { InterviewLoggingMiddlewares } from '../services/logging/queryLoggingMiddleware';
import addCommonRoutes from './survey.common.routes';

// Get a router for the routes that do not need the participant to be logged in
export const getPublicParticipantRoutes = (loggingMiddleware: InterviewLoggingMiddlewares) => {
    const publicRouter = express.Router();

    if (projectConfig.surveySupportForm === true) {
        publicRouter.post('/supportRequest/', validateCaptchaToken(), async (req: Request, res: Response) => {
            try {
                const content = req.body;

                // Get interview ID if user is logged in
                let interviewId: number | undefined = undefined;
                if (req.user) {
                    const interview = await Interviews.getUserInterview((req.user as UserAttributes).id);
                    if (interview) {
                        interviewId = interview.id;
                    }
                }

                // Send support request email
                await sendSupportRequestEmail({
                    message: content.message || 'No message provided',
                    userEmail: content.email,
                    interviewId,
                    currentUrl: content.currentUrl
                });
                // Log this support request in the paradata if logging is enabled
                if (interviewId !== undefined) {
                    const paradataLoggingFct = getParadataLoggingFunction({
                        interviewId,
                        userId: loggingMiddleware.getUserIdForLogging(req)
                    });
                    if (paradataLoggingFct !== undefined) {
                        paradataLoggingFct({
                            userAction: {
                                type: 'supportRequestSent'
                            }
                        });
                    }
                }

                return res.status(200).json({ status: 'success' });
            } catch (error) {
                console.error(`Error processing support request: ${error}`);
                return res.status(500).json({ status: 'failed' });
            }
        });
    }

    // Client paradata events can occur when the user is not logged in (support
    // request open for example, so this route is not protedted)
    publicRouter.post('/logClientEvent/', async (req: Request, res: Response) => {
        try {
            // Validate the client event first
            const content = req.body;
            const clientEvent = content.clientEvent;
            if (!isUserAction(clientEvent)) {
                return res.status(400).json({ status: 'NotAClientEvent' });
            }
            // Get interview ID if user is logged in
            let interviewId: number | undefined = undefined;
            let userId: number | undefined;
            if (req.user) {
                const interview = await Interviews.getUserInterview((req.user as UserAttributes).id);
                if (interview) {
                    interviewId = interview.id;
                    userId = loggingMiddleware.getUserIdForLogging(req);
                }
            }
            if (interviewId === undefined) {
                // Client is not logged in yet, just console.log the event to record it in the logs
                console.log('Received not logged in client paradata event: ', clientEvent.type);
                return res.status(200).json({ status: 'success' });
            }

            // Log this support request in the paradata if logging is enabled
            const paradataLoggingFct = getParadataLoggingFunction({
                interviewId,
                userId
            });
            if (paradataLoggingFct !== undefined) {
                paradataLoggingFct({
                    userAction: clientEvent
                });
            }
            return res.status(200).json({ status: 'success' });
        } catch (error) {
            console.error(`Error logging client paradata event: ${error}`);
            return res.status(500).json({ status: 'failed' });
        }
    });

    return publicRouter;
};

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
                    return res.status(400).json({ status: 'BadRequest' });
                }
                // Get the current interview for user
                let interview = await Interviews.getUserInterview((req.user as UserAttributes).id);
                if (interview === undefined) {
                    interview = await Interviews.createInterviewForUser(
                        (req.user as UserAttributes).id,
                        {},
                        loggingMiddleware.getUserIdForLogging(req),
                        ['id', 'uuid', 'is_completed', 'response', 'participant_id']
                    );
                }

                // Check if interview is frozen, if so, do not allow access
                if (interview?.is_frozen) {
                    console.log(`activeSurvey: Interview is frozen for interview id ${interview?.id}`);
                    return res
                        .status(403)
                        .json({ status: 'forbidden', interview: null, error: 'interview cannot be accessed' });
                }
                return res.status(200).json({ status: 'success', interview });
            } catch (error) {
                console.error(`Error opening participant's interview: ${error}`);
                return res.status(500).json({ status: 'failed', interview: null, error: 'cannot fetch interview' });
            }
        }
    );

    return router;
};
