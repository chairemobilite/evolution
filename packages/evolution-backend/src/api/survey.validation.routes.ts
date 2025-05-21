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
import interviewUserIsAuthorized, { isUserAllowed } from '../services/auth/userAuthorization';
import projectConfig from '../config/projectConfig';
import { mapResponseToCorrectedResponse } from '../services/interviews/interviewUtils';
import { UserAttributes } from 'chaire-lib-backend/lib/services/users/user';
import { logUserAccessesMiddleware } from '../services/logging/queryLoggingMiddleware';
import { _booleish, _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { Audits } from '../services/audits/Audits';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import validateUuidMiddleware from './helpers/validateUuidMiddleware';
import { getParadataLoggingFunction } from '../services/logging/paradataLogging';

const router = express.Router();

router.use(interviewUserIsAuthorized(['validate', 'read']));

router.get(
    '/survey/validateInterview/:interviewUuid',
    validateUuidMiddleware,
    logUserAccessesMiddleware.openingInterview(true),
    async (req: Request, res: Response) => {
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
                    const objectsAndAudits = await Audits.runAndSaveInterviewAudits(interview);
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

router.post(
    '/survey/updateValidateInterview/:interviewUuid',
    validateUuidMiddleware,
    logUserAccessesMiddleware.updatingInterview(true),
    async (req: Request, res: Response) => {
        try {
            const timestamp = moment().unix();

            const content = req.body;
            if ((!content.valuesByPath && !content.userAction) || !req.params.interviewUuid) {
                if (!content.valuesByPath && !content.userAction) {
                    console.log('updateValidateInterview route: Missing valuesByPath or userAction');
                } else {
                    console.log('updateValidateInterview route: Unspecified interview ID');
                }
                return res.status(400).json({ status: 'BadRequest' });
            }
            const valuesByPath = content.valuesByPath || {};
            const origUnsetPaths = content.unsetPaths || [];

            if (origUnsetPaths.length === 0 && Object.keys(valuesByPath).length === 0 && !content.userAction) {
                return res.status(200).json({ status: 'success', interviewId: req.params.interviewUuid });
            }

            const {
                valuesByPath: mappedValuesByPath,
                unsetPaths,
                userAction
            } = mapResponseToCorrectedResponse(valuesByPath, origUnsetPaths, content.userAction);

            const interview = await Interviews.getInterviewByUuid(req.params.interviewUuid);
            if (interview) {
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

        const actualFilters: { [key: string]: FilterType } = {};
        Object.keys(filters).forEach((key) => {
            if (typeof filters[key] === 'string' || Array.isArray(filters[key])) {
                actualFilters[key] = filters[key];
            } else if (typeof filters[key] === 'object' && filters[key].value !== undefined) {
                actualFilters[key] = filters[key];
            }
        });
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
        const actualFilters: { [key: string]: string | string[] } = {};
        Object.keys(filters).forEach((key) => {
            if (Array.isArray(filters[key])) {
                actualFilters[key] = filters[key] as string[];
            } else if (typeof filters[key] === 'string') {
                actualFilters[key] = filters[key] as string;
            } else if (typeof filters[key] === 'object' && filters[key].value !== undefined) {
                actualFilters[key] = filters[key];
            }
        });
        const response = await Interviews.getValidationAuditStats({ filter: actualFilters });
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
        Audits.updateAudits(interview.id, audits);

        return res.status(200).json({
            status: 'ok'
        });
    } catch (error) {
        console.log('error updating audits for interview:', error);
        return res.status(500).json({ status: 'Error' });
    }
});

export default router;
