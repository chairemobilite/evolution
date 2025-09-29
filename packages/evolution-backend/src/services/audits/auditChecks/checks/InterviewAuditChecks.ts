/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { AuditForObject } from 'evolution-common/lib/services/audits/types';
import { InterviewAuditCheckContext, InterviewAuditCheckFunction } from '../infrastructure/AuditCheckContexts';

/**
 * Interview-specific audit check functions
 */
export const interviewAuditChecks: { [errorCode: string]: InterviewAuditCheckFunction } = {
    I_M_Uuid: (context: InterviewAuditCheckContext): Partial<AuditForObject> | undefined => {
        const { interview } = context;
        const hasUuid = !!interview._uuid;
        if (!hasUuid) {
            return {
                version: 1,
                level: 'error',
                message: 'Interview UUID is missing',
                ignore: false
            };
        }
        return undefined;
    },

    I_M_Id: (context: InterviewAuditCheckContext): Partial<AuditForObject> | undefined => {
        const { interview } = context;
        const hasId = !!interview.id;
        if (!hasId) {
            return {
                version: 1,
                level: 'error',
                message: 'Interview ID is missing',
                ignore: false
            };
        }
        return undefined;
    },

    /**
     * Check if interview has required basic information (missing UUID or ID)
     */
    I_M_Response: (context: InterviewAuditCheckContext): Partial<AuditForObject> | undefined => {
        const { interviewAttributes } = context;
        const hasResponseData = !!interviewAttributes.response;

        if (!hasResponseData) {
            return {
                version: 1,
                level: 'warning',
                message: 'Interview has no response',
                ignore: false
            };
        }

        return undefined;
    }
};
