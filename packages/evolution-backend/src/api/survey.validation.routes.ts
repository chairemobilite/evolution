/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
/**
 * This file provides a router with the routes to validate interviews
 * */
import express, { Request, Response } from 'express';
import moment from 'moment';

import Interviews, { FilterType } from '../services/interviews/interviews';
import { updateInterview, copyResponseToCorrectedResponse } from '../services/interviews/interview';
import { VALID_OPERATORS } from '../models/interviews.db.queries';
import interviewUserIsAuthorized, { isUserAllowed } from '../services/auth/userAuthorization';
import projectConfig from '../config/projectConfig';
import { handleUserActionSideEffect, mapResponseToCorrectedResponse } from '../services/interviews/interviewUtils';
import { UserAttributes } from 'chaire-lib-backend/lib/services/users/user';
import { logUserAccessesMiddleware } from '../services/logging/queryLoggingMiddleware';
import { _booleish, _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { SurveyObjectsAndAuditsFactory } from '../services/audits/SurveyObjectsAndAuditsFactory';
import { SurveyObjectsWithAudits } from 'evolution-common/lib/services/audits/types';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import validateUuidMiddleware from './helpers/validateUuidMiddleware';
import { getParadataLoggingFunction } from '../services/logging/paradataLogging';
import { BatchAuditService } from '../services/audits/BatchAuditService';
import { hasErrors } from 'evolution-common/lib/types/Result.type';

const router = express.Router();

router.use(interviewUserIsAuthorized(['validate', 'read']));

/**
 * Type for the filter parameter accepted by getValidationAuditStats
 */
type ValidationAuditStatsFilter = { is_valid?: 'valid' | 'invalid' | 'notInvalid' | 'notValidated' | 'all' } & {
    [key: string]:
        | string
        | string[]
        | { value: string | string[] | boolean | number | null; op?: (typeof VALID_OPERATORS)[number] };
};

/**
 * Sanitizes filter objects by validating their structure.
 * Accepts filters with string, array, or object with .value property.
 * @param filters - Raw filters object from request body
 * @returns Sanitized filters object with FilterType values
 */
function sanitizeFilters(filters: Record<string, unknown>): { [key: string]: FilterType } {
    const actualFilters: { [key: string]: FilterType } = {};
    Object.keys(filters).forEach((key) => {
        if (typeof filters[key] === 'string' || Array.isArray(filters[key])) {
            actualFilters[key] = filters[key] as string | string[];
        } else if (
            typeof filters[key] === 'object' &&
            filters[key] !== null &&
            (filters[key] as { value?: unknown }).value !== undefined
        ) {
            actualFilters[key] = filters[key] as FilterType;
        }
    });
    return actualFilters;
}

// This route fetches the interview for correction. It runs the audit and
// returns serialized objects for the interview summary page.
router.get(
    '/survey/correctInterview/:interviewUuid',
    validateUuidMiddleware,
    logUserAccessesMiddleware.openingInterview(true),
    async (req: Request, res: Response) => {
        // Extended audit checks: When enabled (extended=true), runs additional audit checks that may
        // fetch data from external services or perform long/complex calculations (e.g., validating
        // geocoding, route feasibility, external API data). Use extended=true for initial/thorough
        // validation but avoid during iterative review/correction as it increases processing time
        // (potentially seconds vs milliseconds) and may hit external API rate limits.
        const runExtendedAuditChecks = _booleish(req.query.extended) ?? false;
        if (runExtendedAuditChecks) {
            const userId = req.user ? (req.user as UserAttributes).id : undefined;
            console.info(
                'Extended audit checks enabled: interviewUuid=%s userId=%s',
                req.params.interviewUuid,
                userId ?? 'undefined'
            );
        }
        if (req.params.interviewUuid) {
            try {
                const interview = await Interviews.getInterviewByUuid(req.params.interviewUuid);
                if (interview) {
                    const forceCopy = _booleish(req.query.reset) === true;
                    // Copy the response in the corrected_response
                    if (forceCopy || _isBlank(interview.corrected_response)) {
                        await copyResponseToCorrectedResponse(interview);
                    }
                    // Run audits on the corrected_response
                    const objectsAndAudits: SurveyObjectsWithAudits =
                        await SurveyObjectsAndAuditsFactory.createSurveyObjectsAndSaveAuditsToDb(
                            interview,
                            runExtendedAuditChecks
                        );

                    // TODO Here, the response field should not make it to frontend. But make sure there are no side effect in the frontend, where the _response is used or checked.
                    const { response, corrected_response, ...rest } = interview;
                    return res.status(200).json({
                        status: 'success',
                        interview: {
                            response: corrected_response,
                            _response: response,
                            surveyObjectsAndAudits: objectsAndAudits,
                            ...rest,
                            validationDataDirty:
                                response._updatedAt !== undefined &&
                                interview.is_frozen !== true &&
                                (corrected_response?._correctedResponseCopiedAt === undefined ||
                                    corrected_response._correctedResponseCopiedAt < response._updatedAt)
                        }
                    });
                } else {
                    return res.status(500).json({ status: 'failed', interview: null });
                }
            } catch (error) {
                console.error(`Error getting interview to validate: ${error}`);
                return res.status(500).json({ status: 'failed', interview: null, error: 'cannot fetch interview' });
            }
        } else {
            return res.status(500).json({ status: 'failed', interview: null, error: 'wrong interview id' });
        }
    }
);

// This route fetches the interview for correction in "edit" mode. It returns the corrected response only
router.get(
    '/survey/activeCorrectedInterview/:interviewUuid',
    validateUuidMiddleware,
    logUserAccessesMiddleware.openingInterview(true),
    async (req: Request, res: Response) => {
        if (req.params.interviewUuid) {
            try {
                const interview = await Interviews.getInterviewByUuid(req.params.interviewUuid);
                if (interview) {
                    // FIXME Check if interview is frozen, if so, do not allow
                    // access. When
                    // https://github.com/chairemobilite/evolution/issues/1257
                    // is fixed, we can remove this check and still open the
                    // interview, the corrector knows what he is doing. Or we
                    // can pass a parameter to bypass the check and make sure we
                    // had confirmation from the corrector.
                    if (interview?.is_frozen) {
                        console.log('activeSurvey: Interview is frozen');
                        return res
                            .status(403)
                            .json({ status: 'forbidden', interview: null, error: 'interview cannot be accessed' });
                    }

                    // Copy the response in the corrected_response if it is not already
                    if (_isBlank(interview.corrected_response)) {
                        await copyResponseToCorrectedResponse(interview);
                    }

                    // Make sure the original response does not make it to the frontend
                    const { response: _response, corrected_response, ...rest } = interview;
                    return res.status(200).json({
                        status: 'success',
                        interview: {
                            response: corrected_response,
                            ...rest
                        }
                    });
                } else {
                    return res.status(500).json({ status: 'failed', interview: null });
                }
            } catch (error) {
                console.error(`Error getting interview to validate: ${error}`);
                return res.status(500).json({ status: 'failed', interview: null, error: 'cannot fetch interview' });
            }
        } else {
            return res.status(500).json({ status: 'failed', interview: null, error: 'wrong interview id' });
        }
    }
);

router.post(
    '/survey/updateCorrectedInterview/:interviewUuid',
    validateUuidMiddleware,
    logUserAccessesMiddleware.updatingInterview(true),
    async (req: Request, res: Response) => {
        try {
            const timestamp = moment().unix();

            const content = req.body;
            if ((!content.valuesByPath && !content.userAction) || !req.params.interviewUuid) {
                if (!content.valuesByPath && !content.userAction) {
                    console.log('updateCorrectedInterview route: Missing valuesByPath or userAction');
                } else {
                    console.log('updateCorrectedInterview route: Unspecified interview ID');
                }
                return res.status(400).json({ status: 'BadRequest' });
            }
            const valuesByPath = content.valuesByPath || {};
            const origUnsetPaths = content.unsetPaths || [];

            if (origUnsetPaths.length === 0 && Object.keys(valuesByPath).length === 0 && !content.userAction) {
                return res.status(200).json({ status: 'success', interviewId: req.params.interviewUuid });
            }

            const interview = await Interviews.getInterviewByUuid(req.params.interviewUuid);
            if (interview) {
                if (content.userAction) {
                    handleUserActionSideEffect(interview, valuesByPath, content.userAction);
                }
                const {
                    valuesByPath: mappedValuesByPath,
                    unsetPaths,
                    userAction
                } = mapResponseToCorrectedResponse(valuesByPath, origUnsetPaths, content.userAction);

                const canConfirm = isUserAllowed(req.user as UserAttributes, interview, ['confirm']);
                const fieldsToUpdate: (keyof InterviewAttributes)[] = [
                    'corrected_response',
                    'validations',
                    'audits',
                    'is_valid',
                    'is_completed',
                    'is_questionable'
                ];
                interview.response._updatedAt = timestamp;
                const retInterview = await updateInterview(interview, {
                    logUpdate: getParadataLoggingFunction(interview.id, (req.user as UserAttributes).id),
                    valuesByPath: mappedValuesByPath,
                    unsetPaths,
                    userAction,
                    fieldsToUpdate: canConfirm ? [...fieldsToUpdate, 'is_validated'] : fieldsToUpdate,
                    logData: { adminValidation: true }
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
            console.error(`Error updating interview in validation mode: ${error}`);
            return res.status(500).json({ status: 'failed', interviewId: null });
        }
    }
);

router.post('/validationList', async (req, res) => {
    try {
        const { pageIndex, pageSize, updatedAt, sortBy, ...filters } = req.body;
        const page =
            typeof pageIndex === 'number' ? pageIndex : typeof pageIndex === 'string' ? parseInt(pageIndex) || 0 : 0;
        const queryPageSize =
            typeof pageIndex === 'number' ? pageSize : typeof pageSize === 'string' ? parseInt(pageSize) : -1;
        const updatedAtNb = typeof updatedAt === 'string' ? parseInt(updatedAt) : 0;

        const actualFilters = sanitizeFilters(filters);
        const sortByFields = sortBy
            ? sortBy.map((sort) => ({ field: sort.id, order: sort.desc ? 'desc' : 'asc' }))
            : undefined;
        const response = await Interviews.getAllMatching({
            pageIndex: Number.isNaN(page) ? 0 : page,
            pageSize: Number.isNaN(queryPageSize) ? -1 : queryPageSize,
            filter: actualFilters,
            updatedAt: Number.isNaN(updatedAtNb) ? 0 : updatedAtNb,
            sort: sortByFields
        });
        return res.status(200).json({
            status: 'success',
            totalCount: response.totalCount,
            interviews: response.interviews.map(projectConfig.validationListFilter)
        });
    } catch (error) {
        console.log('error getting interview list:', error);
        return res.status(500).json({ status: 'Error' });
    }
});

router.post('/validation/auditStats', async (req: Request, res: Response) => {
    try {
        const { ...filters } = req.body;
        const actualFilters = sanitizeFilters(filters);
        // Type assertion needed because getValidationAuditStats expects a more restrictive type
        // than FilterType, but the runtime behavior is correct (sanitizeFilters only includes
        // valid filter structures)
        const response = await Interviews.getValidationAuditStats({
            filter: actualFilters as ValidationAuditStatsFilter
        });
        return res.status(200).json({
            status: 'success',
            auditStats: response.auditStats
        });
    } catch (error) {
        console.log('error getting interview list:', error);
        return res.status(500).json({ status: 'Error' });
    }
});

router.post('/validation/updateAudits/:uuid', async (req, res, _next) => {
    try {
        const audits = req.body.audits;
        const interview = await Interviews.getInterviewByUuid(req.params.uuid);
        if (!interview) {
            throw 'Interview does not exist';
        }
        await SurveyObjectsAndAuditsFactory.updateAudits(interview.id, audits);

        return res.status(200).json({
            status: 'ok'
        });
    } catch (error) {
        console.log('error updating audits for interview:', error);
        return res.status(500).json({ status: 'Error' });
    }
});

/**
 * Batch run audits on interviews matching the provided filters
 */
router.post('/validation/batchAudits', async (req: Request, res: Response) => {
    try {
        const { extended, ...filters } = req.body;
        const userId = req.user ? (req.user as UserAttributes).id : undefined;

        // Validate extended parameter
        const runExtendedAuditChecks = _booleish(extended) ?? false;

        // Validate filters structure
        const actualFilters = sanitizeFilters(filters);

        const result = await BatchAuditService.runBatchAudits(actualFilters, runExtendedAuditChecks, userId);

        if (hasErrors(result)) {
            const errorMessage = result.errors.map((e) => (e instanceof Error ? e.message : String(e))).join('; ');
            return res.status(500).json({ status: 'error', error: errorMessage });
        }

        return res.status(200).json({
            status: 'success',
            ...result.result
        });
    } catch (error) {
        console.error('Error running batch audits:', error);
        return res.status(500).json({ status: 'error', error: 'Failed to run batch audits' });
    }
});

export default router;
