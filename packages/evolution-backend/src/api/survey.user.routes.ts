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
import _get from 'lodash/get';
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
        getInterview: (req: Request) => Promise<UserInterviewAttributes | undefined>
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
                console.error(`Error opening participant's interview: ${error}`);
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
                console.error(`Error opening interview by id: ${error}`);
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

                // Get the current session data to send to client, then set to undefined again
                const session = req.session;
                const sessionClientPaths = session.clientValues?.updatedPaths;
                delete session.clientValues;

                const content = req.body;
                if (!content.valuesByPath || !content.interviewId) {
                    console.log('Missing valuesByPath or unspecified interview ID');
                    return res.status(400).json({ status: 'BadRequest' });
                }
                const valuesByPath = content.valuesByPath || {};
                const unsetPaths = content.unsetPaths || [];

                if (unsetPaths.length === 0 && Object.keys(valuesByPath).length === 0 && !sessionClientPaths) {
                    return res.status(200).json({
                        status: 'success',
                        interviewId: req.params.interviewUuid
                    });
                }

                const interview = await Interviews.getInterviewByUuid(content.interviewId);
                if (interview) {
                    interview.responses._ip = ip;
                    interview.responses._updatedAt = timestamp;
                    const retInterview = await updateInterview(interview, {
                        valuesByPath,
                        unsetPaths,
                        serverValidations: serverConfig.serverValidations,
                        fieldsToUpdate: ['responses', 'validations'],
                        deferredUpdateCallback: async (newValuesByPath) => {
                            // Reload the session as this can be called much later
                            session.reload((err) => {
                                if (err !== undefined) {
                                    console.error(`Error reloading session: ${err}`);
                                    return;
                                }
                                const reloadedSession = req.session;

                                // Save the updated paths in the current user's
                                // session data for asynchronous update to the
                                // client. We save the path instead of the whole
                                // values by path object because the value will
                                // be fetched directly from the latest version
                                // of the interview before sending back to the
                                // client. This avoids outdated values to be
                                // stored here.
                                //
                                // Previous paths may not have been sent yet to
                                // the client. New ones will be appended. But
                                // first, make sure the interview id is the same
                                // as the one is was saved for. It can happen
                                // for users of the admin app that a session is
                                // reused for another interview.
                                const currentSessionValues = reloadedSession.clientValues || {
                                    interviewId: interview.uuid,
                                    updatedPaths: []
                                };

                                const updatedPaths =
                                    currentSessionValues.interviewId === interview.uuid
                                        ? currentSessionValues.updatedPaths
                                        : [];
                                updatedPaths.push(...Object.keys(newValuesByPath));
                                reloadedSession.clientValues = {
                                    interviewId: interview.uuid,
                                    updatedPaths
                                };
                                // Save the session with the updated paths
                                reloadedSession.save();
                            });
                        }
                    });
                    // Fetch the values to send to the client from the interview
                    const sessionClientValues =
                        sessionClientPaths !== undefined
                            ? sessionClientPaths.reduce((acc, path) => {
                                acc[path] = _get(interview, path);
                                return acc;
                            }, {})
                            : {};
                    if (retInterview.serverValidations === true) {
                        // TODO See if we can do a `res.redirect`. It does not work with a local server, as the browser gets CORS Missing Allow Origin messages
                        return retInterview.redirectUrl === undefined
                            ? res.status(200).json({
                                status: 'success',
                                interviewId: retInterview.interviewId,
                                updatedValuesByPath: {
                                    ...sessionClientValues,
                                    ...retInterview.serverValuesByPath
                                }
                            })
                            : res.status(200).json({
                                status: 'redirect',
                                redirectUrl: retInterview.redirectUrl
                            });
                    }
                    return res.status(200).json({
                        status: 'invalid',
                        interviewId: retInterview.interviewId,
                        messages: retInterview.serverValidations,
                        updatedValuesByPath: { ...sessionClientValues, ...retInterview.serverValuesByPath }
                    });
                }
                return res.status(200).json({ status: 'failed', interviewId: null });
            } catch (error) {
                console.error(`Error updating interview: ${error}`);
                return res.status(500).json({ status: 'failed', interviewId: null });
            }
        }
    );

    router.post('/survey/clientSideException/', async (req: Request, res: Response) => {
        // Try/catch to avoid undocumented default behavior in case of an exception, even if we don't expect one
        try {
            // FIXME: Extract this to a function when we do more than just console.error
            const content = req.body;
            const interviewId = content.interviewId || -1;
            if (content.exception) {
                const exceptionString =
                    typeof content.exception !== 'string' ? String(content.exception) : content.exception;
                // Log up to 1000 characters of the exception to avoid spamming the logs
                console.error(
                    'Client-side exception in interview %d: %s',
                    interviewId,
                    exceptionString.substring(0, 1000)
                );
            }
            return res.status(200);
        } catch (error) {
            console.error(`Error logging client side exception: ${error}`);
            return res.status(500).json({ status: 'failed' });
        }
    });

    return router;
};
