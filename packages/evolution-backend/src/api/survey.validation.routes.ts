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
import Interviews from '../services/interviews/interviews';
import { updateInterview } from '../services/interviews/interview';
import interviewUserIsAuthorized, { isUserAllowed } from '../services/auth/authorization';
import projectConfig from '../config/projectConfig';
import { mapResponsesToValidatedData } from '../services/interviews/interviewUtils';
import { UserAttributes } from 'chaire-lib-backend/lib/services/auth/user';
import { InterviewAttributes } from 'evolution-common/lib/services/interviews/interview';

const router = express.Router();

router.use(interviewUserIsAuthorized(['validate', 'read']));

router.get('/survey/validateInterview/:interviewUuid', async (req: Request, res: Response) => {
    if (req.params.interviewUuid) {
        try {
            const interview = await Interviews.getInterviewByUuid(req.params.interviewUuid);
            if (interview) {
                // TODO Here, the responses field should not make it to frontend, it should freeze the survey and initialize the validated_data here. But make sure there are no side effect in the frontend, where the _responses is used or checked.
                const { responses, validated_data, ...rest } = interview;
                return res.status(200).json({
                    status: 'success',
                    interview: { responses: validated_data, _responses: responses, ...rest }
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
});

router.post('/survey/updateValidateInterview/:interviewUuid', async (req: Request, res: Response) => {
    try {
        const timestamp = moment().unix();

        const content = req.body;
        if (!content.valuesByPath || !req.params.interviewUuid) {
            console.log('Missing valuesByPath or unspecified interview ID');
            return res.status(400).json({ status: 'BadRequest' });
        }
        const valuesByPath = content.valuesByPath || {};
        const origUnsetPaths = content.unsetPaths || [];

        if (origUnsetPaths.length === 0 && Object.keys(valuesByPath).length === 0) {
            return res.status(200).json({ status: 'success', interviewId: req.params.interviewUuid });
        }

        const { valuesByPath: mappedValuesByPath, unsetPaths } = mapResponsesToValidatedData(
            valuesByPath,
            origUnsetPaths
        );

        const interview = await Interviews.getInterviewByUuid(req.params.interviewUuid);
        if (interview) {
            const canConfirm = isUserAllowed(req.user as UserAttributes, interview, ['confirm']);
            const fieldsToUpdate: (keyof InterviewAttributes<unknown, unknown, unknown, unknown>)[] = [
                'validated_data',
                'validations',
                'audits',
                'is_valid',
                'is_completed',
                'is_frozen'
            ];
            interview.responses._updatedAt = timestamp;
            const retInterview = await updateInterview<unknown, unknown, unknown, unknown>(interview, {
                valuesByPath: mappedValuesByPath,
                unsetPaths,
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
        console.error(`Error getting interviews: ${error}`);
        return res.status(500).json({ status: 'failed', interviewId: null });
    }
});

router.post('/validationList', async (req, res) => {
    try {
        const { pageIndex, pageSize, updatedAt, sortBy, ...filters } = req.body;
        const page =
            typeof pageIndex === 'number' ? pageIndex : typeof pageIndex === 'string' ? parseInt(pageIndex) || 0 : 0;
        const queryPageSize =
            typeof pageIndex === 'number' ? pageSize : typeof pageSize === 'string' ? parseInt(pageSize) : -1;
        const updatedAtNb = typeof updatedAt === 'string' ? parseInt(updatedAt) : 0;

        const actualFilters: { [key: string]: string } = {};
        Object.keys(filters).forEach((key) => {
            if (typeof filters[key] === 'string') {
                actualFilters[key] = filters[key] as string;
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

router.get('/interviewSummary/:interviewUuid', async (req: Request, res: Response) => {
    if (req.params.interviewUuid) {
        try {
            const response = await Interviews.getAllMatching({
                pageIndex: 0,
                pageSize: -1,
                filter: { uuid: req.params.interviewUuid }
            });
            if (response.interviews.length === 1) {
                return res.status(200).json({
                    status: 'success',
                    interview: response.interviews[0]
                });
            } else {
                console.log('Not found, got response', response);
                return res.status(404).json({ status: 'failed', interview: null });
            }
        } catch (error) {
            console.error(`Error getting interview summary: ${error}`);
            return res.status(500).json({ status: 'failed', interview: null, error: 'cannot fetch interview' });
        }
    } else {
        return res.status(500).json({ status: 'failed', interview: null, error: 'wrong interview id' });
    }
});

router.post('/validation/errors', async (req: Request, res: Response) => {
    try {
        const { ...filters } = req.body;

        const actualFilters: { [key: string]: string } = {};
        Object.keys(filters).forEach((key) => {
            if (typeof filters[key] === 'string') {
                actualFilters[key] = filters[key] as string;
            } else if (typeof filters[key] === 'object' && filters[key].value !== undefined) {
                actualFilters[key] = filters[key];
            }
        });
        const response = await Interviews.getValidationErrors({ filter: actualFilters });
        return res.status(200).json({
            status: 'success',
            errors: response.errors
        });
    } catch (error) {
        console.log('error getting interview list:', error);
        return res.status(500).json({ status: 'Error' });
    }
});

export default router;
