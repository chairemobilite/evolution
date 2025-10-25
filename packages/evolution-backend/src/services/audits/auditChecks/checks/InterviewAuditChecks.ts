/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { AuditForObject } from 'evolution-common/lib/services/audits/types';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import type { InterviewAuditCheckContext, InterviewAuditCheckFunction } from '../AuditCheckContexts';
import projectConfig from 'evolution-common/lib/config/project.config';
import { secondsToMillisecondsTimestamp, parseISODateToTimestamp } from 'evolution-common/lib/utils/DateTimeUtils';
import { validateAccessCode } from '../../../accessCode';
import { fieldIsRequired } from '../../AuditUtils';

export const interviewAuditChecks: { [errorCode: string]: InterviewAuditCheckFunction } = {
    /**
     * Check if interview languages are missing
     * @param context - InterviewAuditCheckContext
     * @returns {AuditForObject | undefined} The audit result, or undefined if no issues found
     */
    I_M_Languages: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        const { interview } = context;
        const hasLanguages = (interview.paradata?.languages?.length ?? 0) > 0;
        if (!hasLanguages) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_M_Languages',
                version: 1,
                level: 'error',
                message: 'Interview languages are missing',
                ignore: false
            };
        }
        return undefined;
    },

    /**
     * Check if interview start date is missing or invalid
     * @param context - InterviewAuditCheckContext
     * @returns {AuditForObject | undefined}
     */
    I_M_StartedAt: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        const { interview } = context;
        const startedAt = interview.paradata?.startedAt;
        // Consider startedAt missing/invalid if it's undefined, null, not finite (NaN/Infinity), or negative
        const hasValidStartDate =
            startedAt !== undefined && startedAt !== null && Number.isFinite(startedAt) && startedAt >= 0;
        if (!hasValidStartDate) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_M_StartedAt',
                version: 1,
                level: 'error',
                message: 'Interview start time is missing',
                ignore: false
            };
        }
        return undefined;
    },

    /**
     * Check if interview started at timestamp is before the survey start date
     * Will be ignored if survey start date is not set.
     * @param context - InterviewAuditCheckContext
     * @returns {AuditForObject | undefined}
     */
    I_I_StartedAtBeforeSurveyStartDate: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        const { interview } = context;

        // Convert startedAt from seconds to milliseconds, validating it's finite
        const interviewStartTimestamp = secondsToMillisecondsTimestamp(interview.paradata?.startedAt);

        // Parse survey start date and guard against invalid date strings
        const surveyStartTimestamp = parseISODateToTimestamp(projectConfig.startDateTimeWithTimezoneOffset);

        // Only perform comparison when both timestamps are valid and finite
        if (
            interviewStartTimestamp !== undefined &&
            surveyStartTimestamp !== undefined &&
            interviewStartTimestamp < surveyStartTimestamp
        ) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_I_StartedAtBeforeSurveyStartDate',
                version: 1,
                level: 'error',
                message: 'Interview start time is before survey start date',
                ignore: false
            };
        }
        return undefined;
    },

    /**
     * Check if interview started at timestamp is after the survey end date
     * Will be ignored if survey end date is not set.
     * @param context - InterviewAuditCheckContext
     * @returns {AuditForObject | undefined}
     */
    I_I_StartedAtAfterSurveyEndDate: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        const { interview } = context;

        // Convert startedAt from seconds to milliseconds, validating it's finite
        const interviewStartTimestamp = secondsToMillisecondsTimestamp(interview.paradata?.startedAt);

        // Parse survey end date and guard against invalid date strings
        const surveyEndTimestamp = parseISODateToTimestamp(projectConfig.endDateTimeWithTimezoneOffset);

        // Only perform comparison when both timestamps are valid and finite
        if (
            interviewStartTimestamp !== undefined &&
            surveyEndTimestamp !== undefined &&
            interviewStartTimestamp > surveyEndTimestamp
        ) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_I_StartedAtAfterSurveyEndDate',
                version: 1,
                level: 'error',
                message: 'Interview start time is after survey end date',
                ignore: false
            };
        }
        return undefined;
    },

    /**
     * Check if interview access code is missing (if required)
     * @param context - InterviewAuditCheckContext
     * @returns {AuditForObject | undefined}
     */
    I_M_AccessCode: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        const { interview } = context;
        const accessCode = interview.accessCode;
        if (fieldIsRequired('interview', 'accessCode') && _isBlank(accessCode)) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_M_AccessCode',
                version: 1,
                level: 'error',
                message: 'Access code is missing',
                ignore: false
            };
        }
        return undefined;
    },

    /**
     * Check if interview access code format is invalid
     * Only validates the format if access code is present.
     * It does not verify that the access code is valid
     * (for instance it does not check if a letter has been sent with this access code)
     * Some surveys may not implement access codes at all.
     * The validateAccessCode function is defined in the survey project.
     * @param context - InterviewAuditCheckContext
     * @returns {AuditForObject | undefined}
     */
    I_I_InvalidAccessCodeFormat: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        const { interview } = context;
        const accessCode = interview.accessCode;

        // Only validate format if access code is present (some surveys don't use access codes)
        if (!_isBlank(accessCode)) {
            const isValid = validateAccessCode(accessCode as string);
            if (!isValid) {
                return {
                    objectType: 'interview',
                    objectUuid: interview.uuid!,
                    errorCode: 'I_I_InvalidAccessCodeFormat',
                    version: 1,
                    level: 'error',
                    message: 'Access code format is invalid',
                    ignore: false
                };
            }
        }
        return undefined;
    }
};
