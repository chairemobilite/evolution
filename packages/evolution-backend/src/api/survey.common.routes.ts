/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
/**
 * This file adds common survey related routes that are used both by the admin
 * and participant app.
 * */
import { Request, Response, Router } from 'express';
import _get from 'lodash/get';
import moment from 'moment';
import { UserAttributes } from 'chaire-lib-backend/lib/services/users/user';
import Interviews from '../services/interviews/interviews';

import { UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import serverConfig from '../config/projectConfig';
import { InterviewLoggingMiddlewares } from '../services/logging/queryLoggingMiddleware';
import { logClientSide } from '../services/logging/messageLogging';
import { addRolesToInterview, updateInterview } from '../services/interviews/interview';
import { getParadataLoggingFunction } from '../services/logging/paradataLogging';

export const activateInterview = async (
    req: Request,
    res: Response,
    getInterview: (req: Request) => Promise<UserInterviewAttributes | undefined>
): Promise<Response> => {
    if (!req.user) {
        // Sanity check, but callers should have already checked this
        throw 'Request user is not defined, an interview cannot be activated by the user';
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

/**
 * Add the common survey routes to the router
 *
 * @param router The router to which to add the routes
 * @param authorizationMiddleware The middleware to use for authorization
 * @param loggingMiddleware The middleware to use for logging
 */
export default (router: Router, authorizationMiddleware, loggingMiddleware: InterviewLoggingMiddlewares) => {
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
                if ((!content.valuesByPath && !content.userAction) || !content.interviewId) {
                    if (!content.valuesByPath && !content.userAction) {
                        console.log('updateInterview route: Missing valuesByPath or userAction');
                    } else {
                        console.log('updateInterview route: Unspecified interview ID');
                    }
                    return res.status(400).json({ status: 'BadRequest' });
                }
                const valuesByPath = content.valuesByPath || {};
                const unsetPaths = content.unsetPaths || [];
                const userAction = content.userAction;

                if (
                    unsetPaths.length === 0 &&
                    Object.keys(valuesByPath).length === 0 &&
                    !userAction &&
                    !sessionClientPaths
                ) {
                    return res.status(200).json({
                        status: 'success',
                        interviewId: req.params.interviewUuid
                    });
                }

                const interview = await Interviews.getInterviewByUuid(content.interviewId);
                if (interview) {
                    interview.response._ip = ip;
                    interview.response._updatedAt = timestamp;
                    const retInterview = await updateInterview(interview, {
                        logUpdate: getParadataLoggingFunction(interview.id, loggingMiddleware.getUserIdForLogging(req)),
                        valuesByPath,
                        unsetPaths,
                        userAction,
                        serverValidations: serverConfig.serverValidations,
                        fieldsToUpdate: ['response', 'validations'],
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

    router.post('/survey/logClientSideMessage/', async (req: Request, res: Response) => {
        // Try/catch to avoid undocumented default behavior in case of an exception, even if we don't expect one
        try {
            const content = req.body;
            logClientSide(content);
            // Need to return a json response status (or at least something), otherwise the client will wait undefinitely and the survey will block
            return res.status(200).json({ status: 'success' });
        } catch (error) {
            console.error(`Error logging client side exception: ${error}`);
            return res.status(500).json({ status: 'failed' });
        }
    });
};
