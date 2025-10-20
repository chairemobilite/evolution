/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { InterviewParadata } from 'evolution-common/lib/services/baseObjects/interview/InterviewParadata';
import { interviewAuditChecks } from '../../InterviewAuditChecks';
import { createContextWithInterview } from './testHelper';

describe('I_M_Languages audit check', () => {
    const validUuid = uuidV4();

    it('should pass when interview has languages', () => {
        const context = createContextWithInterview({
            paradata: new InterviewParadata({ languages: [{ language: 'en' }, { language: 'fr' }] })
        });

        const result = interviewAuditChecks.I_M_Languages(context);

        expect(result).toBeUndefined();
    });

    it('should pass when interview has at least one language', () => {
        const context = createContextWithInterview({
            paradata: new InterviewParadata({ languages: [{ language: 'en' }] })
        }, validUuid);

        const result = interviewAuditChecks.I_M_Languages(context);

        expect(result).toBeUndefined();
    });

    it('should fail when interview missing languages', () => {
        const context = createContextWithInterview({
            paradata: new InterviewParadata({ languages: undefined })
        }, validUuid);

        const result = interviewAuditChecks.I_M_Languages(context);

        expect(result).toMatchObject({
            objectType: 'interview',
            objectUuid: validUuid,
            errorCode: 'I_M_Languages',
            version: 1,
            level: 'error',
            message: 'Interview languages are missing',
            ignore: false
        });
    });

    it('should fail when interview has empty languages array', () => {
        const context = createContextWithInterview({
            paradata: new InterviewParadata({ languages: [] })
        }, validUuid);

        const result = interviewAuditChecks.I_M_Languages(context);

        expect(result).toMatchObject({
            objectType: 'interview',
            objectUuid: validUuid,
            errorCode: 'I_M_Languages',
            version: 1,
            level: 'error',
            message: 'Interview languages are missing',
            ignore: false
        });
    });

    it('should fail when interview has no paradata', () => {
        const context = createContextWithInterview({
            paradata: undefined
        }, validUuid);

        const result = interviewAuditChecks.I_M_Languages(context);

        expect(result).toMatchObject({
            objectType: 'interview',
            objectUuid: validUuid,
            errorCode: 'I_M_Languages',
            version: 1,
            level: 'error',
            message: 'Interview languages are missing',
            ignore: false
        });
    });
});

