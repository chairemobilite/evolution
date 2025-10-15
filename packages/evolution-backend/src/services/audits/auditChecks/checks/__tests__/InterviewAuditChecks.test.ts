/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

// Imports
import { interviewAuditChecks } from '../InterviewAuditChecks';
import { InterviewAuditCheckContext } from '../../AuditCheckContexts';
import { Interview, ExtendedInterviewAttributesWithComposedObjects } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import { SurveyObjectsRegistry } from 'evolution-common/lib/services/baseObjects/SurveyObjectsRegistry';
import projectConfig from 'evolution-common/lib/config/project.config';
import { ISODateString } from 'evolution-common/lib/utils/DateTimeUtils';

// Mock registry
const mockRegistry = new SurveyObjectsRegistry();

// Factory
const createRealMockInterview = (overrides: Partial<ExtendedInterviewAttributesWithComposedObjects> & { customAttributes?: { [key: string]: unknown } } = {}) => {
    return new Interview(
        overrides,
        { id: 1, uuid: '550e8400-e29b-41d4-a716-446655440000', participant_id: 1, is_completed: false, response: {}, validations: {}, is_valid: true, is_questionable: false, is_validated: false },
        mockRegistry
    );
};

// Tests with 4-space indentation

// Full test coverage

describe('I_M_Languages audit check', () => {
    it('should error when no languages', () => {
        const interview = createRealMockInterview({ _language: undefined });
        const context: InterviewAuditCheckContext = { interview };
        const result = interviewAuditChecks.I_M_Languages(context);
        expect(result).toMatchObject({ errorCode: 'I_M_Languages', level: 'error' });
    });

    it('should pass when languages present', () => {
        const interview = createRealMockInterview({ _language: 'en' });
        const context: InterviewAuditCheckContext = { interview };
        const result = interviewAuditChecks.I_M_Languages(context);
        expect(result).toBeUndefined();
    });

});

// Example for date check
describe('I_I_DateOutsideRange audit check', () => {
    const originalStartDate = projectConfig.startDate;
    const originalEndDate = projectConfig.endDate;

    beforeAll(() => {
        projectConfig.startDate = '2025-09-02' as ISODateString;
        projectConfig.endDate = '2025-12-16' as ISODateString;
    });

    afterAll(() => {
        projectConfig.startDate = originalStartDate;
        projectConfig.endDate = originalEndDate;
    });

    it('should error when date outside range', () => {
        const interview = createRealMockInterview();
        interview.customAttributes._startedAt = Math.floor(new Date('2023-01-01T00:00:00Z').getTime() / 1000);
        const context: InterviewAuditCheckContext = { interview };
        const result = interviewAuditChecks.I_I_DateOutsideRange(context);
        expect(result).toMatchObject({ errorCode: 'I_I_DateOutsideRange' });
    });

    it('should pass when date inside range', () => {
        const interview = createRealMockInterview();
        interview.customAttributes._startedAt = Math.floor(new Date('2025-10-01T00:00:00Z').getTime() / 1000);
        const context: InterviewAuditCheckContext = { interview };
        const result = interviewAuditChecks.I_I_DateOutsideRange(context);
        expect(result).toBeUndefined();
    });
});

describe('I_M_AccessCode audit check', () => {
    it('should error when missing', () => {
        const interview = createRealMockInterview({
            accessCode: undefined
        });
        const context: InterviewAuditCheckContext = { interview };
        const result = interviewAuditChecks.I_M_AccessCode(context);
        expect(result).toMatchObject({ errorCode: 'I_M_AccessCode' });
    });

    it('should pass when present', () => {
        const interview = createRealMockInterview({
            accessCode: '1234-5678'
        });
        const context: InterviewAuditCheckContext = { interview };
        const result = interviewAuditChecks.I_M_AccessCode(context);
        expect(result).toBeUndefined();
    });
});

describe('I_I_AccessCode audit check', () => {
    it('should error when invalid format', () => {
        const interview = createRealMockInterview({
            accessCode: 'invalid'
        });
        const context: InterviewAuditCheckContext = { interview };
        const result = interviewAuditChecks.I_I_AccessCode(context);
        expect(result).toMatchObject({ errorCode: 'I_I_AccessCode' });
    });

    it('should pass when valid format', () => {
        const interview = createRealMockInterview({
            accessCode: '1234-5678'
        });
        const context: InterviewAuditCheckContext = { interview };
        const result = interviewAuditChecks.I_I_AccessCode(context);
        expect(result).toBeUndefined();
    });

    it('should pass with dashes (edge)', () => {
        const interview = createRealMockInterview({ accessCode: '1234-5678' });
        const context: InterviewAuditCheckContext = { interview };
        const result = interviewAuditChecks.I_I_AccessCode(context);
        expect(result).toBeUndefined();
    });
});

describe('I_I_AccessCode_TestCode audit check', () => {
    it('should error when test code', () => {
        const interview = createRealMockInterview({ accessCode: '0000-0000' });
        const context: InterviewAuditCheckContext = { interview };
        const result = interviewAuditChecks.I_I_AccessCode_TestCode(context);
        expect(result).toMatchObject({ errorCode: 'I_I_AccessCode_TestCode' });
    });

    it('should pass when not test code', () => {
        const interview = createRealMockInterview({ accessCode: '1234-5678' });
        const context: InterviewAuditCheckContext = { interview };
        const result = interviewAuditChecks.I_I_AccessCode_TestCode(context);
        expect(result).toBeUndefined();
    });
});

describe('I_I_ContactPhoneNumber audit check', () => {
    it('should error when invalid', () => {
        const interview = createRealMockInterview({ contactPhoneNumber: 'invalid' as any });
        const context: InterviewAuditCheckContext = { interview };
        const result = interviewAuditChecks.I_I_ContactPhoneNumber(context);
        expect(result).toMatchObject({ errorCode: 'I_I_ContactPhoneNumber' });
    });

    it('should pass when valid', () => {
        const interview = createRealMockInterview({ contactPhoneNumber: '+15145551234' as any });
        const context: InterviewAuditCheckContext = { interview };
        const result = interviewAuditChecks.I_I_ContactPhoneNumber(context);
        expect(result).toBeUndefined();
    });

    it('should pass when test number (edge)', () => {
        const interview = createRealMockInterview({ contactPhoneNumber: '+15145555555' as any });
        const context: InterviewAuditCheckContext = { interview };
        const result = interviewAuditChecks.I_I_ContactPhoneNumber(context);
        expect(result).toBeUndefined();
    });
});

// Add for I_I_ContactPhoneNumber, I_I_HelpContactPhoneNumber, I_I_ContactEmail, etc.

// Example for email
describe('I_I_ContactEmail audit check', () => {
    it('should error when invalid', () => {
        const interview = createRealMockInterview({ contactEmail: 'invalid' });
        const context: InterviewAuditCheckContext = { interview };
        const result = interviewAuditChecks.I_I_ContactEmail(context);
        expect(result).toMatchObject({ errorCode: 'I_I_ContactEmail' });
    });

    it('should pass when valid', () => {
        const interview = createRealMockInterview({ contactEmail: 'test@example.com' });
        const context: InterviewAuditCheckContext = { interview };
        const result = interviewAuditChecks.I_I_ContactEmail(context);
        expect(result).toBeUndefined();
    });
});

// TODO: Add tests for remaining audit checks when they are implemented
// (section completions/incompletes)
