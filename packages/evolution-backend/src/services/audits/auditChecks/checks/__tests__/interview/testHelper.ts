/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import type { Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import type { InterviewAuditCheckContext, InterviewAuditCheckFunction } from '../../../AuditCheckContexts';
import { InterviewParadata } from 'evolution-common/lib/services/baseObjects/interview/InterviewParadata';

export const createMockInterview = (overrides: Partial<Interview> = {}, validUuid = uuidV4(), validId = 123) => {
    return {
        _uuid: validUuid,
        get uuid() {
            return this._uuid;
        },
        id: validId,
        paradata: new InterviewParadata({ languages: [{ language: 'en' }] }),
        ...overrides
    } as Interview;
};

export const createContextWithInterview = (
    interviewOverrides: Partial<Interview> = {},
    validUuid = uuidV4()
): InterviewAuditCheckContext => {
    return {
        interview: createMockInterview(interviewOverrides, validUuid)
    };
};

/**
 * Shared test suite for email audit checks that use the _isBlank + _isEmail pattern.
 * Both valid and invalid scenarios are tested, including undefined and empty string.
 */
export const runEmailAuditCheckTests = (config: {
    checkFn: InterviewAuditCheckFunction;
    checkName: string;
    emailField: keyof Interview;
    errorMessage: string;
}) => {
    const validUuid = uuidV4();

    // more valid email addresses (using _isEmail function) are already tested in the Lodash Extensions test file
    describe('should pass in valid scenarios', () => {
        it.each([
            { description: 'valid email', email: 'contact@example.com' },
            { description: 'email with plus sign', email: 'test+test@example.com' },
            { description: 'undefined email', email: undefined },
            { description: 'empty string email', email: '' }
        ])('$description', ({ email }) => {
            const interview = createMockInterview({ [config.emailField]: email }, validUuid);
            const context: InterviewAuditCheckContext = { interview };

            const result = config.checkFn(context);

            expect(result).toBeUndefined();
        });
    });

    describe('should fail when email is invalid', () => {
        it.each([
            { description: 'email with letters only', email: 'invalid-email' },
            { description: 'email with special characters', email: '!@#$%^&*()' },
            { description: 'email with digits only', email: '1234567' },
            { description: 'email with multiple hyphens', email: '12-34-56-78@blue' }
        ])('$description', ({ email }) => {
            const interview = createMockInterview({ [config.emailField]: email }, validUuid);
            const context: InterviewAuditCheckContext = { interview };

            const result = config.checkFn(context);

            expect(result).toEqual({
                objectType: 'interview',
                objectUuid: validUuid,
                errorCode: config.checkName,
                version: 1,
                level: 'error',
                message: config.errorMessage,
                ignore: false
            });
        });
    });
};
