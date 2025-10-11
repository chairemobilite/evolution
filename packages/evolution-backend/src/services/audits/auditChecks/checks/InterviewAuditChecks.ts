/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import parsePhoneNumber, { CountryCode } from 'libphonenumber-js';
import { AuditForObject } from 'evolution-common/lib/services/audits/types';
import { InterviewAuditCheckContext, InterviewAuditCheckFunction } from '../AuditCheckContexts';
import projectConfig from 'evolution-common/lib/config/project.config';
import { epochToDate } from 'evolution-common/lib/utils/DateTimeUtils';
import { _isEmail } from 'chaire-lib-common/lib/utils/LodashExtensions';

export const interviewAuditChecks: { [errorCode: string]: InterviewAuditCheckFunction } = {
    /**
     * Check if interview languages are missing
     */
    I_M_Languages: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        const { interview } = context;
        const hasLanguages = interview.languages !== undefined && interview.languages.length > 0;
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
     * Check if interview date is outside range
     */
    I_I_DateOutsideRange: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        const { interview } = context;
        const startedAtTimestamp = interview.customAttributes?._startedAt;
        if (
            startedAtTimestamp &&
            typeof startedAtTimestamp === 'number' &&
            projectConfig.startDate &&
            projectConfig.endDate
        ) {
            const startedAt = epochToDate(startedAtTimestamp);
            const startDate = new Date(`${projectConfig.startDate}T00:00:00Z`);
            const endDate = new Date(`${projectConfig.endDate}T23:59:59Z`);
            if (!(startedAt >= startDate && startedAt <= endDate)) {
                return {
                    objectType: 'interview',
                    objectUuid: interview.uuid!,
                    errorCode: 'I_I_DateOutsideRange',
                    version: 2,
                    level: 'error',
                    message: 'Interview date is outside the expected range',
                    ignore: false
                };
            }
        }
        return undefined;
    },

    /**
     * Check if access code is missing
     */
    I_M_AccessCode: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        const { interview } = context;
        if (interview.accessCode === undefined) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_M_AccessCode',
                version: 2,
                level: 'error',
                message: 'Access code is missing',
                ignore: false
            };
        }
        return undefined;
    },

    /**
     * Check if access code is invalid
     */
    I_I_AccessCode: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        const { interview } = context;
        if (interview.accessCode !== undefined && !interview.accessCode.match(/^\d{4}-? *\d{4}$/gi)) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_I_AccessCode',
                version: 2,
                level: 'error',
                message: 'Invalid access code format',
                ignore: false
            };
        }
        return undefined;
    },

    /**
     * Check if access code is test code
     */
    I_I_AccessCode_TestCode: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        const { interview } = context;
        if (interview.accessCode !== undefined && interview.accessCode === '0000-0000') {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_I_AccessCode_TestCode',
                version: 2,
                level: 'error',
                message: 'Test access code used',
                ignore: false
            };
        }
        return undefined;
    },

    /**
     * Check if contact phone number is invalid
     */
    I_I_ContactPhoneNumber: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        const { interview } = context;
        if (interview.contactPhoneNumber !== undefined) {
            const parsedPhoneNumber = parsePhoneNumber(
                interview.contactPhoneNumber,
                projectConfig.countryCode as CountryCode
            );
            if (parsedPhoneNumber === undefined || !parsedPhoneNumber.isValid()) {
                return {
                    objectType: 'interview',
                    objectUuid: interview.uuid!,
                    errorCode: 'I_I_ContactPhoneNumber',
                    version: 2,
                    level: 'error',
                    message: 'Invalid contact phone number',
                    ignore: false
                };
            }
        }
        return undefined;
    },

    /**
     * Check if help contact phone number is invalid
     */
    I_I_HelpContactPhoneNumber: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        const { interview } = context;
        if (interview.helpContactPhoneNumber !== undefined) {
            const parsedPhoneNumber = parsePhoneNumber(
                interview.helpContactPhoneNumber,
                projectConfig.countryCode as CountryCode
            );
            if (parsedPhoneNumber === undefined || !parsedPhoneNumber.isValid()) {
                return {
                    objectType: 'interview',
                    objectUuid: interview.uuid!,
                    errorCode: 'I_I_HelpContactPhoneNumber',
                    version: 2,
                    level: 'error',
                    message: 'Invalid help contact phone number',
                    ignore: false
                };
            }
        }
        return undefined;
    },

    /**
     * Check if contact email is invalid
     */
    I_I_ContactEmail: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        const { interview } = context;
        if (interview.contactEmail !== undefined && !_isEmail(interview.contactEmail)) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_I_ContactEmail',
                version: 2,
                level: 'error',
                message: 'Invalid contact email',
                ignore: false
            };
        }
        return undefined;
    },

    /**
     * Check if assigned date is missing
     */
    I_M_AssignedDate: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        const { interview } = context;
        if (interview.assignedDate === undefined) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_M_AssignedDate',
                version: 2,
                level: 'error',
                message: 'Assigned date is missing',
                ignore: false
            };
        }
        return undefined;
    },

    /**
     * Check if interview section "Home" is complete
     */
    I_L_InterviewSectionHomeComplete: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { interview } = context;
        return undefined;
        /*if (interview.getSectionCompletionStatus()?.home === true) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_L_InterviewSectionHomeComplete',
                version: 2,
                level: 'info',
                message: 'Interview section "Home" is complete',
                ignore: false
            };
        }
        return undefined;*/
    },

    /**
     * Check if interview section "Household Members" is complete
     */
    I_L_InterviewSectionHouseholdMembersComplete: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { interview } = context;
        return undefined;
        /*
        if (interview.getSectionCompletionStatus().householdMembers === true) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_L_InterviewSectionHouseholdMembersComplete',
                version: 2,
                level: 'info',
                message: 'Interview section "Household Members" is complete',
                ignore: false
            };
        }
        return undefined;
        */
    },

    /**
     * Check if interview section "Visited Places" is complete
     */
    I_L_InterviewSectionVisitedPlacesComplete: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { interview } = context;
        return undefined;
        /*if (interview.getSectionCompletionStatus().visitedPlaces === true) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_L_InterviewSectionVisitedPlacesComplete',
                version: 2,
                level: 'info',
                message: 'Interview section "Visited Places" is complete',
                ignore: false
            };
        }
        return undefined;
        */
    },

    /**
     * Check if interview section "Trips" is complete
     */
    I_L_InterviewSectionTripsComplete: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { interview } = context;
        return undefined;
        /*
        if (interview.getSectionCompletionStatus().trips === true) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_L_InterviewSectionTripsComplete',
                version: 2,
                level: 'info',
                message: 'Interview section "Trips" is complete',
                ignore: false
            };
        }
        return undefined;
        */
    },

    /**
     * Check if interview section "Travel Behavior" is complete
     */
    I_L_InterviewSectionTravelBehaviorComplete: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { interview } = context;
        return undefined;
        /*
        if (interview.getSectionCompletionStatus().travelBehavior === true) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_L_InterviewSectionTravelBehaviorComplete',
                version: 2,
                level: 'info',
                message: 'Interview section "Travel Behavior" is complete',
                ignore: false
            };
        }
        return undefined;
        */
    },

    /**
     * Check if interview section "End" is complete
     */
    I_L_InterviewSectionEndComplete: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { interview } = context;
        return undefined;
        /*
        if (interview.getSectionCompletionStatus().end === true) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_L_InterviewSectionEndComplete',
                version: 2,
                level: 'info',
                message: 'Interview section "End" is complete',
                ignore: false
            };
        }
        return undefined;
        */
    },

    /**
     * Check if interview section "Home" is incomplete
     */
    I_L_InterviewSectionHomeIncomplete: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { interview } = context;
        return undefined;
        /*
        if (interview.getSectionCompletionStatus().home !== true) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_L_InterviewSectionHomeIncomplete',
                version: 2,
                level: 'error',
                message: 'Interview section "Home" is incomplete',
                ignore: false
            };
        }
        return undefined;
        */
    },

    /**
     * Check if interview section "Household Members" is incomplete
     */
    I_L_InterviewSectionHouseholdMembersIncomplete: (
        context: InterviewAuditCheckContext
    ): AuditForObject | undefined => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { interview } = context;
        return undefined;
        /*
        if (interview.getSectionCompletionStatus().householdMembers !== true) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_L_InterviewSectionHouseholdMembersIncomplete',
                version: 2,
                level: 'error',
                message: 'Interview section "Household Members" is incomplete',
                ignore: false
            };
        }
        return undefined;
        */
    },

    /**
     * Check if interview section "Visited Places" is incomplete
     */
    I_L_InterviewSectionVisitedPlacesIncomplete: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { interview } = context;
        return undefined;
        /*
        if (interview.getSectionCompletionStatus().visitedPlaces !== true) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_L_InterviewSectionVisitedPlacesIncomplete',
                version: 2,
                level: 'warning',
                message: 'Interview section "Visited Places" is incomplete',
                ignore: false
            };
        }
        return undefined;
        */
    },

    /**
     * Check if interview section "Trips" is incomplete
     */
    I_L_InterviewSectionTripsIncomplete: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { interview } = context;
        return undefined;
        /*
        if (interview.getSectionCompletionStatus().trips !== true) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_L_InterviewSectionTripsIncomplete',
                version: 2,
                level: 'warning',
                message: 'Interview section "Trips" is incomplete',
                ignore: false
            };
        }
        return undefined;
        */
    },

    /**
     * Check if interview section "Travel Behavior" is incomplete
     */
    I_L_InterviewSectionTravelBehaviorIncomplete: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { interview } = context;
        return undefined;
        /*
        if (interview.getSectionCompletionStatus().travelBehavior !== true) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_L_InterviewSectionTravelBehaviorIncomplete',
                version: 2,
                level: 'warning',
                message: 'Interview section "Travel Behavior" is incomplete',
                ignore: false
            };
        }
        return undefined;
        */
    },

    /**
     * Check if interview section "End" is incomplete
     */
    I_L_InterviewSectionEndIncomplete: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { interview } = context;
        return undefined;
        /*
        if (interview.getSectionCompletionStatus().end !== true) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_L_InterviewSectionEndIncomplete',
                version: 2,
                level: 'warning',
                message: 'Interview section "End" is incomplete',
                ignore: false
            };
        }
        return undefined;
        */
    },

    /**
     * Check if at least one person completed visited places
     */
    I_L_AtLeastOnePersonCompletedVisitedPlaces: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { interview } = context;
        return undefined;
        /*
        if (interview.getSectionCompletionStatus().visitedPlacesOnePersonCompleted === true) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_L_AtLeastOnePersonCompletedVisitedPlaces',
                version: 3,
                level: 'info',
                message: 'At least one person completed visited places',
                ignore: false
            };
        }
        return undefined;
        */
    },

    /**
     * Check if at least one person completed trips
     */
    I_L_AtLeastOnePersonCompletedTrips: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { interview } = context;
        return undefined;
        /*
        if (interview.getSectionCompletionStatus().tripsOnePersonCompleted === true) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_L_AtLeastOnePersonCompletedTrips',
                version: 3,
                level: 'info',
                message: 'At least one person completed trips',
                ignore: false
            };
        }
        return undefined;
        */
    },

    /**
     * Check if at least one person completed travel behavior
     */
    I_L_AtLeastOnePersonCompletedTravelBehavior: (context: InterviewAuditCheckContext): AuditForObject | undefined => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { interview } = context;
        return undefined;
        /*
        if (interview.getSectionCompletionStatus().travelBehaviorOnePersonCompleted === true) {
            return {
                objectType: 'interview',
                objectUuid: interview.uuid!,
                errorCode: 'I_L_AtLeastOnePersonCompletedTravelBehavior',
                version: 3,
                level: 'info',
                message: 'At least one person completed travel behavior',
                ignore: false
            };
        }
        return undefined;
        */
    }
};
