/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { NextFunction, Request, Response } from 'express';
import { validate as uuidValidate } from 'uuid';

import TrError from 'chaire-lib-common/lib/utils/TrError';
import { UserAttributes } from 'chaire-lib-backend/lib/services/users/user';
import projectConfig from 'evolution-common/lib/config/project.config';
import type { SurveyObjectName } from 'evolution-common/lib/services/baseObjects/types';
import type { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import Interviews from '../../services/interviews/interviews';
import { surveyObjectExistsInInterview } from '../../services/surveyObjects/surveyObjectExistsInInterview';
import {
    assertCorrectedResponsePresent,
    CORRECTED_RESPONSE_REQUIRED_ERROR_CODE
} from '../../services/interviews/assertCorrectedResponsePresent';

/** Validated context attached to the response locals by {@link validateReviewObjectMiddleware}. */
export type ReviewObjectContext = {
    interview: InterviewAttributes;
    user: UserAttributes;
    objectType: SurveyObjectName;
    objectUuid: string;
};

const isReviewableObjectType = (value: unknown): value is SurveyObjectName =>
    // reviewableSurveyObjects comes from the survey's loaded evolution-common config, not backend
    // serverProjectConfig (server-only callbacks/validations). See config/projectConfig.ts.
    typeof value === 'string' && projectConfig.reviewableSurveyObjects.includes(value as SurveyObjectName);

/**
 * Returns the review context validated by {@link validateReviewObjectMiddleware}.
 * Only call from route handlers registered after that middleware.
 * @param res - Express response carrying the validated context in its locals
 * @returns The validated review object context
 */
export const getReviewObjectContext = (res: Response): ReviewObjectContext => {
    const reviewObjectContext = res.locals.reviewObjectContext;
    if (!reviewObjectContext) {
        throw new Error('getReviewObjectContext called without validateReviewObjectMiddleware');
    }
    return reviewObjectContext as ReviewObjectContext;
};

/** Sends the standard `{ status: 'error', error }` JSON body with the given HTTP status. */
export const sendError = (res: Response, status: number, error: string) =>
    res.status(status).json({ status: 'error', error });

/**
 * Express middleware validating a review mutation request: reviewable object type, valid
 * object uuid, existing interview, populated corrected_response, and object existence in
 * the corrected response. Authentication and per-interview permissions are handled before
 * this middleware by the per-route `interviewUserIsAuthorized` middleware.
 * On success, the validated context is stored in `res.locals` for
 * {@link getReviewObjectContext}; otherwise the HTTP error response is sent here.
 */
const validateReviewObjectMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { objectType, objectUuid } = req.body;

        if (!isReviewableObjectType(objectType)) {
            return sendError(res, 400, 'Object type is not reviewable for this survey');
        }
        // validateUuidMiddleware only validates the interview uuid route param;
        // objectUuid comes from the request body and is validated here.
        if (!uuidValidate(objectUuid)) {
            return sendError(res, 400, 'Invalid object uuid');
        }

        const interview = await Interviews.getInterviewByUuid(req.params.interviewId);
        if (!interview) {
            return sendError(res, 404, 'Interview does not exist');
        }
        // Reviews apply to the corrected response only. When it is not populated yet, the
        // interview has not been opened for correction (possibly still being answered by
        // the participant), so reject instead of silently copying the participant response.
        try {
            assertCorrectedResponsePresent(interview);
        } catch (error) {
            if (TrError.isTrError(error) && error.getCode() === CORRECTED_RESPONSE_REQUIRED_ERROR_CODE) {
                return sendError(res, 409, 'Interview has not been opened for correction yet');
            }
            throw error;
        }
        if (!surveyObjectExistsInInterview(interview, objectType, objectUuid)) {
            return sendError(res, 404, 'Survey object does not exist in interview');
        }

        res.locals.reviewObjectContext = {
            interview,
            user: req.user as UserAttributes,
            objectType,
            objectUuid
        } as ReviewObjectContext;
        next();
    } catch (error) {
        console.error('error validating review object request:', error);
        return res.status(500).json({ status: 'error' });
    }
};

export default validateReviewObjectMiddleware;
