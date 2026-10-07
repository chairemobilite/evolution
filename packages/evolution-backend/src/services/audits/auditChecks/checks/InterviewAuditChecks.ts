/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { AuditForObject } from 'evolution-common/lib/services/audits/types';
import { _isBlank, _isEmail } from 'chaire-lib-common/lib/utils/LodashExtensions';
import type { InterviewAuditCheckContext, InterviewAuditCheckFunction } from '../AuditCheckContexts';
import projectConfig from 'evolution-common/lib/config/project.config';
import { secondsToMillisecondsTimestamp, parseISODateToTimestamp } from 'evolution-common/lib/utils/DateTimeUtils';
import { validateAccessCode } from '../../../accessCode';
import { fieldIsRequired } from '../../AuditUtils';
import type { InterviewLoginMethod } from 'evolution-common/lib/services/questionnaire/types';

/**
 * Info flag for a participant login method. Lets reviewers filter interviews.
 * @param loginMethod - Value that must match `interview.loginMethod`
 * @param errorCode - Audit error code
 * @param message - English audit message (locales override the display)
 */
const loginMethodInfoAudit = (
    loginMethod: InterviewLoginMethod,
    errorCode: string,
    message: string
): InterviewAuditCheckFunction => {
    return (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        if (context.interview.loginMethod !== loginMethod) {
            return undefined;
        }

        return {
            objectType: 'interview',
            objectUuid: context.interview.uuid!,
            errorCode,
            version: 1,
            level: 'info',
            message,
            ignore: false
        };
    };
};

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
     * (for instance it does not check if a letter has been sent with this access code;
     * that is `I_I_AccessCodeFromList`)
     * Some surveys may not implement access codes at all.
     * The format is validated against the configured accessCodeFormat; surveys
     * can register an additional check for survey-specific validation.
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
    },

    /**
     * Check that a present access code was on the issued list.
     * The prefill import copies the CSV row into `home.preData`. That record is
     * the proof the code was on the list and data was prefilled from it. No query to `sv_interviews_prefill`.
     * Silent when the access code is blank. An empty `preData` does not count.
     * A survey that uses access codes without a prefill list flags every coded interview.
     * @param context - InterviewAuditCheckContext
     * @returns {AuditForObject | undefined}
     */
    I_I_AccessCodeFromList: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        const { interview, home } = context;
        if (_isBlank(interview.accessCode)) {
            return undefined;
        }
        const preData = home?.preData;
        if (preData !== undefined && Object.keys(preData).length > 0) {
            return undefined;
        }
        return {
            objectType: 'interview',
            objectUuid: interview.uuid!,
            errorCode: 'I_I_AccessCodeFromList',
            version: 1,
            level: 'error',
            message: 'Access code has no associated address in the sample (might be wrong)',
            ignore: false
        };
    },

    /**
     * Check if interview contact email is invalid
     * @param context - InterviewAuditCheckContext
     * @returns {AuditForObject | undefined}
     */
    I_I_ContactEmail: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        const { interview } = context;
        const contactEmail = interview.contactEmail;
        if (!_isBlank(contactEmail) && !_isEmail(contactEmail as string)) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_I_ContactEmail',
                version: 1,
                level: 'error',
                message: 'Contact email is invalid',
                ignore: false
            };
        }
        return undefined;
    },

    /**
     * Check if contact email is missing while the respondent would like to participate in other surveys
     * @param context - InterviewAuditCheckContext
     * @returns {AuditForObject | undefined}
     */
    I_M_ContactEmailButWouldLikeToParticipateInOtherSurveys: (
        context: InterviewAuditCheckContext
    ): AuditForObject | undefined => {
        const { interview } = context;
        if (interview.wouldLikeToParticipateInOtherSurveys === true && _isBlank(interview.contactEmail)) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_M_ContactEmailButWouldLikeToParticipateInOtherSurveys',
                version: 1,
                level: 'error',
                message: 'Contact email is missing but respondent would like to participate in other surveys',
                ignore: false
            };
        }
        return undefined;
    },

    /**
     * Check if interview help contact email is invalid
     * @param context - InterviewAuditCheckContext
     * @returns {AuditForObject | undefined}
     */
    I_I_HelpContactEmail: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        const { interview } = context;
        const helpContactEmail = interview.helpContactEmail;
        if (!_isBlank(helpContactEmail) && !_isEmail(helpContactEmail as string)) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_I_HelpContactEmail',
                version: 1,
                level: 'error',
                message: 'Help contact email is invalid',
                ignore: false
            };
        }
        return undefined;
    },

    // TODO: validate phone number formats and normalize. The format should be defined in the survey config (by country).

    /**
     * Check if interview assigned date is missing (if required)
     * @param context - InterviewAuditCheckContext
     * @returns {AuditForObject | undefined}
     */
    I_M_AssignedDate: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        const { interview } = context;
        const assignedDate = interview.assignedDate;
        if (fieldIsRequired('interview', 'assignedDate') && _isBlank(assignedDate)) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_M_AssignedDate',
                version: 1,
                level: 'error',
                message: 'Assigned date is missing',
                ignore: false
            };
        }
        return undefined;
    },

    /**
     * Info flag when the respondent accepted to be contacted for help.
     * Lets reviewers filter interviews they can call back.
     * @param context - InterviewAuditCheckContext
     * @returns {AuditForObject | undefined}
     */
    I_F_AcceptToBeContactedForHelp: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        const { interview } = context;
        if (interview.acceptToBeContactedForHelp !== true) {
            return undefined;
        }
        return {
            objectType: 'interview',
            objectUuid: interview.uuid!,
            errorCode: 'I_F_AcceptToBeContactedForHelp',
            version: 1,
            level: 'info',
            message: 'Respondent household accepts to be contacted for help',
            ignore: false
        };
    },

    I_F_LoginMethodIsEmail: loginMethodInfoAudit('email', 'I_F_LoginMethodIsEmail', 'Login method is email'),
    I_F_LoginMethodIsAnonymous: loginMethodInfoAudit(
        'anonymous',
        'I_F_LoginMethodIsAnonymous',
        'Login method is anonymous'
    ),
    I_F_LoginMethodIsGoogle: loginMethodInfoAudit('google', 'I_F_LoginMethodIsGoogle', 'Login method is Google'),
    I_F_LoginMethodIsInterviewer: loginMethodInfoAudit(
        'interviewer',
        'I_F_LoginMethodIsInterviewer',
        'The interview was started by an interviewer'
    ),
    I_F_LoginMethodIsByField: loginMethodInfoAudit('byField', 'I_F_LoginMethodIsByField', 'Login method is by field'),
    I_F_LoginMethodIsUnknown: loginMethodInfoAudit('unknown', 'I_F_LoginMethodIsUnknown', 'Login method is unknown')
};
