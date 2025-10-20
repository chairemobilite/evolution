/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import type { Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import type { InterviewAuditCheckContext } from '../../../AuditCheckContexts';
import { InterviewParadata } from 'evolution-common/lib/services/baseObjects/interview/InterviewParadata';

export const createMockInterview = (overrides: Partial<Interview> = {}, validUuid = uuidV4(), validId = 123) => {
    return {
        _uuid: validUuid,
        get uuid() { return this._uuid; },
        id: validId,
        paradata: new InterviewParadata({ languages: [{ language: 'en' }] }),
        ...overrides
    } as Interview;
};

export const createContextWithInterview = (interviewOverrides: Partial<Interview> = {}, validUuid = uuidV4()): InterviewAuditCheckContext => {
    return {
        interview: createMockInterview(interviewOverrides, validUuid)
    };
};
