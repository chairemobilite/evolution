/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { UserAttributes } from 'chaire-lib-backend/lib/services/users/user';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { NextFunction, Request, Response } from 'express';
import interviewsAccessesDbQueries from '../../models/interviewsAccesses.db.queries';

export type InterviewLoggingMiddlewares = {
    openingInterview: (validationMode: boolean) => (req: Request, res: Response, next: NextFunction) => void;
    updatingInterview: (validationMode: boolean) => (req: Request, res: Response, next: NextFunction) => void;
    /** Get the ID of the user to whom logs should be associated with. Participants should return undefined */
    getUserIdForLogging: (req: Request) => number | undefined;
};

const openingInterview = (validationMode: boolean) => (req: Request, _res: Response, next: NextFunction) => {
    // Log a user opening the interview
    const interviewUuid = req.params.interviewUuid || req.params.interviewId;
    const user = req.user as UserAttributes;
    if (!_isBlank(interviewUuid) && !_isBlank(user)) {
        // We don't need to wait for this to complete, failures are not dramatic, but we may want to do something about it?
        // TODO do not require to cast user, see https://github.com/chairemobilite/transition/issues/676 for chaire-lib function to do this
        interviewsAccessesDbQueries.userOpenedInterview({ interviewUuid, userId: user.id, validationMode });
    }
    next();
};

const updatingInterview = (validationMode: boolean) => (req: Request, _res: Response, next: NextFunction) => {
    // Log a user updating an interview
    const interviewUuid = req.params.interviewUuid || req.body.interviewId;
    const user = req.user as UserAttributes;
    if (!_isBlank(interviewUuid) && !_isBlank(user)) {
        // We don't need to wait for this to complete, failures are not dramatic, but we may want to do something about it?
        // TODO do not require to cast user, see https://github.com/chairemobilite/transition/issues/676 for chaire-lib function to do this
        interviewsAccessesDbQueries.userUpdatedInterview({ interviewUuid, userId: user.id, validationMode });
    }
    next();
};

export const defaultMiddlewares: InterviewLoggingMiddlewares = {
    openingInterview: () => (_req: Request, _res: Response, next: NextFunction) => next(),
    updatingInterview: () => (_req: Request, _res: Response, next: NextFunction) => next(),
    getUserIdForLogging: (_req: Request) => undefined
};

export const logUserAccessesMiddleware: InterviewLoggingMiddlewares = {
    openingInterview,
    updatingInterview,
    getUserIdForLogging: (req: Request) => (req.user as UserAttributes).id
};
