/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
/**
 * This file provides a router with the routes to create/activate/update a
 * user's own survey
 * */
import express, { Request, Response, Router } from 'express';
import moment from 'moment';
import { isLoggedIn } from 'chaire-lib-backend/lib/services/auth/authorization';
import { UserAttributes } from 'chaire-lib-backend/lib/services/users/user';
import Interviews from '../services/interviews/interviews';
import { addRolesToInterview, updateInterview } from '../services/interviews/interview';
import { UserInterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import serverConfig from '../config/projectConfig';
import { InterviewLoggingMiddlewares } from '../services/logging/queryLoggingMiddleware';

export default (authorizationMiddleware, loggingMiddleware: InterviewLoggingMiddlewares): Router => {
    const router = express.Router();

    router.use(isLoggedIn);

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

    const activateInterview = async (
        req: Request,
        res: Response,
        getInterview: (req: Request) => Promise<UserInterviewAttributes<unknown, unknown, unknown, unknown> | undefined>
    ): Promise<Response> => {
        if (!req.user) {
            throw 'Request user is not defined, an interview cannot be created for the user';
        }
        const user = req.user as UserAttributes;
        const interview = await getInterview(req);
        if (interview) {
            addRolesToInterview(interview, user);
            return res.status(200).json({ status: 'success', interview });
        } else {
            return res.status(200).json({ status: 'failed', interview: null });
        }
    };

    router.get(
        '/survey/activeInterview/',
        authorizationMiddleware(['update', 'read']),
        async (req: Request, res: Response) => {
            try {
                activateInterview(req, res, (req) => Interviews.getUserInterview((req.user as UserAttributes).id));
            } catch (error) {
                console.error(`Error getting interviews: ${error}`);
                return res.status(500).json({ status: 'failed', interview: null, error: 'cannot fetch interview' });
            }
        }
    );

    router.get(
        '/survey/activeInterview/:interviewId',
        authorizationMiddleware(['update', 'read']),
        loggingMiddleware.openingInterview(false),
        async (req: Request, res: Response) => {
            try {
                activateInterview(req, res, (req) => Interviews.getInterviewByUuid(req.params.interviewId));
            } catch (error) {
                console.error(`Error getting interviews: ${error}`);
                return res.status(500).json({ status: 'failed', interview: null, error: 'cannot fetch interview' });
            }
        }
    );

    router.post(
        '/survey/updateInterview/',
        authorizationMiddleware(['update', 'read']),
        loggingMiddleware.updatingInterview(false),
        async (req: Request, res: Response) => {
            try {
                const ip = (req as any).clientIp;
                const timestamp = moment().unix();

                const content = req.body;
                if (!content.valuesByPath || !content.interviewId) {
                    console.log('Missing valuesByPath or unspecified interview ID');
                    return res.status(400).json({ status: 'BadRequest' });
                }
                const valuesByPath = content.valuesByPath || {};
                const unsetPaths = content.unsetPaths || [];

                if (unsetPaths.length === 0 && Object.keys(valuesByPath).length === 0) {
                    return res.status(200).json({ status: 'success', interviewId: req.params.interviewUuid });
                }

                const interview = await Interviews.getInterviewByUuid(content.interviewId);
                if (interview) {
                    interview.responses._ip = ip;
                    interview.responses._updatedAt = timestamp;
                    const retInterview = await updateInterview(interview, {
                        valuesByPath,
                        unsetPaths,
                        serverValidations: serverConfig.serverValidations,
                        fieldsToUpdate: ['responses', 'validations']
                    });
                    if (retInterview.serverValidations === true) {
                        return res.status(200).json({
                            status: 'success',
                            interviewId: retInterview.interviewId,
                            updatedValuesByPath: retInterview.serverValuesByPath
                        });
                    }
                    return res.status(200).json({
                        status: 'invalid',
                        interviewId: retInterview.interviewId,
                        messages: retInterview.serverValidations,
                        updatedValuesByPath: retInterview.serverValuesByPath
                    });
                }
                return res.status(200).json({ status: 'failed', interviewId: null });
            } catch (error) {
                console.error(`Error getting interviews: ${error}`);
                return res.status(500).json({ status: 'failed', interviewId: null });
            }
        }
    );

    return router;
};
