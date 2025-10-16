/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { AuditForObject } from 'evolution-common/lib/services/audits/types';
import { InterviewAuditCheckContext, InterviewAuditCheckFunction } from '../AuditCheckContexts';

export const interviewAuditChecks: { [errorCode: string]: InterviewAuditCheckFunction } = {
    /**
     * Check if interview languages are missing
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
    }
};
