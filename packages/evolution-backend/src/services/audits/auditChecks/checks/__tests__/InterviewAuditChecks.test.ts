/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import { interviewAuditChecks } from '../InterviewAuditChecks';
import { runInterviewAuditChecks } from '../../AuditCheckRunners';
import { InterviewAuditCheckContext } from '../../AuditCheckContexts';
import { InterviewParadata } from 'evolution-common/lib/services/baseObjects/interview/InterviewParadata';

describe('InterviewAuditChecks', () => {
    const validUuid = uuidV4();
    const validId = 123;

    const createMockInterview = (overrides: Partial<Interview> = {}) => {
        return {
            _uuid: validUuid,
            get uuid() { return validUuid; },
            id: validId,
            ...overrides
        } as Interview;
    };

    describe('I_M_Languages audit check', () => {
        it('should pass when interview has languages', () => {
            const interview = createMockInterview();
            interview.paradata = new InterviewParadata({ languages: [{ language: 'en' }, { language: 'fr' }] });
            const context: InterviewAuditCheckContext = { interview };

            const result = interviewAuditChecks.I_M_Languages(context);

            expect(result).toBeUndefined();
        });

        it('should fail when interview missing languages', () => {
            const interview = createMockInterview();
            interview.paradata = new InterviewParadata({ languages: undefined });
            const context: InterviewAuditCheckContext = { interview };

            const result = interviewAuditChecks.I_M_Languages(context);

            expect(result).toEqual({
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
            const interview = createMockInterview();
            interview.paradata = new InterviewParadata({ languages: [] });
            const context: InterviewAuditCheckContext = { interview };

            const result = interviewAuditChecks.I_M_Languages(context);

            expect(result).toEqual({
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

    describe('runInterviewAuditChecks function', () => {
        it('should run all interview audits and format results with valid data', () => {
            const interview = createMockInterview();
            interview.paradata = new InterviewParadata({ languages: [{ language: 'en' }, { language: 'fr' }] });
            const context: InterviewAuditCheckContext = { interview };

            const audits = runInterviewAuditChecks(context, interviewAuditChecks);

            // All audits should pass with valid data, so no audits returned
            expect(audits).toHaveLength(0);
        });

        it('should include failed audits when languages are missing', () => {
            // Test with missing languages
            const interview = createMockInterview();
            interview.paradata = new InterviewParadata({ languages: undefined });
            const context: InterviewAuditCheckContext = { interview };

            const audits = runInterviewAuditChecks(context, interviewAuditChecks);

            expect(audits).toHaveLength(1);

            // Check that I_M_Languages audit appears
            const languagesAudit = audits.find((audit) => audit.errorCode === 'I_M_Languages');
            expect(languagesAudit).toEqual({
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
});
