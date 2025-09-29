/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { interviewAuditChecks } from '../InterviewAuditChecks';
import { runInterviewAuditChecks } from '../../infrastructure/AuditCheckRunners';
import { InterviewAuditCheckContext } from '../../infrastructure/AuditCheckContexts';

describe('InterviewAuditChecks', () => {
    const validUuid = uuidV4();
    const validId = 123;

    const createMockInterview = (overrides: Partial<Interview> = {}) => {
        return {
            _uuid: validUuid,
            id: validId,
            ...overrides
        } as Interview;
    };

    const createMockInterviewAttributes = (overrides: Partial<InterviewAttributes> = {}): InterviewAttributes => {
        return {
            uuid: validUuid,
            id: validId,
            participant_id: 1,
            is_valid: true,
            is_active: true,
            is_completed: false,
            is_questionable: false,
            is_validated: false,
            response: {
                household: {},
                persons: {}
            },
            validations: {},
            survey_id: 1,
            ...overrides
        };
    };

    describe('I_M_Uuid audit check', () => {
        it('should pass when interview has UUID', () => {
            const interview = createMockInterview();
            const interviewAttributes = createMockInterviewAttributes();
            const context: InterviewAuditCheckContext = { interview, interviewAttributes };

            const result = interviewAuditChecks.I_M_Uuid(context);

            expect(result).toBeUndefined();
        });

        it('should fail when interview missing UUID', () => {
            const interview = createMockInterview({ _uuid: undefined });
            const interviewAttributes = createMockInterviewAttributes();
            const context: InterviewAuditCheckContext = { interview, interviewAttributes };

            const result = interviewAuditChecks.I_M_Uuid(context);

            expect(result).toEqual({
                version: 1,
                level: 'error',
                message: 'Interview UUID is missing',
                ignore: false
            });
        });
    });

    describe('I_M_Id audit check', () => {
        it('should pass when interview has ID', () => {
            const interview = createMockInterview();
            const interviewAttributes = createMockInterviewAttributes();
            const context: InterviewAuditCheckContext = { interview, interviewAttributes };

            const result = interviewAuditChecks.I_M_Id(context);

            expect(result).toBeUndefined();
        });

        it('should fail when interview missing ID', () => {
            const interview = createMockInterview({ id: undefined });
            const interviewAttributes = createMockInterviewAttributes();
            const context: InterviewAuditCheckContext = { interview, interviewAttributes };

            const result = interviewAuditChecks.I_M_Id(context);

            expect(result).toEqual({
                version: 1,
                level: 'error',
                message: 'Interview ID is missing',
                ignore: false
            });
        });
    });

    describe('I_M_Response audit check', () => {
        it('should pass when interview has response data', () => {
            const interview = createMockInterview();
            const interviewAttributes = createMockInterviewAttributes();
            const context: InterviewAuditCheckContext = { interview, interviewAttributes };

            const result = interviewAuditChecks.I_M_Response(context);

            expect(result).toBeUndefined();
        });

        it('should warn when interview has no response data', () => {
            const interview = createMockInterview();
            const interviewAttributes = createMockInterviewAttributes({ response: undefined });
            const context: InterviewAuditCheckContext = { interview, interviewAttributes };

            const result = interviewAuditChecks.I_M_Response(context);

            expect(result).toEqual({
                version: 1,
                level: 'warning',
                message: 'Interview has no response',
                ignore: false
            });
        });
    });

    describe('runInterviewAuditChecks function', () => {
        it('should run all interview audits and format results with valid data', () => {
            const interview = createMockInterview();
            const interviewAttributes = createMockInterviewAttributes();
            const context: InterviewAuditCheckContext = { interview, interviewAttributes };

            const audits = runInterviewAuditChecks(context, interviewAuditChecks);

            // All audits should pass with valid data, so no audits returned
            expect(audits).toHaveLength(0);
        });

        it('should not create audits when interview has no UUID', () => {
            // Test with missing UUID - the audit runner should not create any audits
            const interview = createMockInterview({ _uuid: undefined, id: undefined });
            const interviewAttributes = createMockInterviewAttributes({ response: undefined });
            const context: InterviewAuditCheckContext = { interview, interviewAttributes };

            const audits = runInterviewAuditChecks(context, interviewAuditChecks);

            // No audits should be created when UUID is missing (audit runner requirement)
            expect(audits).toHaveLength(0);
        });

        it('should include multiple failed audits when multiple issues exist', () => {
            // Test with valid UUID but missing ID and response data
            const interview = createMockInterview({ id: undefined });
            const interviewAttributes = createMockInterviewAttributes({ response: undefined });
            const context: InterviewAuditCheckContext = { interview, interviewAttributes };

            const audits = runInterviewAuditChecks(context, interviewAuditChecks);

            expect(audits).toHaveLength(2);

            // Check that I_M_Id audit appears
            const idAudit = audits.find((audit) => audit.errorCode === 'I_M_Id');
            expect(idAudit).toEqual({
                objectType: 'interview',
                objectUuid: validUuid,
                errorCode: 'I_M_Id',
                version: 1,
                level: 'error',
                message: 'Interview ID is missing',
                ignore: false
            });

            // Check that I_M_Response audit appears
            const responseAudit = audits.find((audit) => audit.errorCode === 'I_M_Response');
            expect(responseAudit).toEqual({
                objectType: 'interview',
                objectUuid: validUuid,
                errorCode: 'I_M_Response',
                version: 1,
                level: 'warning',
                message: 'Interview has no response',
                ignore: false
            });
        });
    });
});
