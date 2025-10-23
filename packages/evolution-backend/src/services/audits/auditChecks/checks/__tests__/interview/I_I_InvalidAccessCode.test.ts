/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import type { InterviewAuditCheckContext } from '../../../AuditCheckContexts';
import { createMockInterview } from './testHelper';
import { interviewAuditChecks } from '../../InterviewAuditChecks';
import { registerAccessCodeValidationFunction } from '../../../../../accessCode';

// Register a simple validation function for testing
// Valid codes are 8 digits, optionally with a hyphen in the middle (e.g., "1234-5678" or "12345678")
registerAccessCodeValidationFunction((accessCode: string) => {
    return /^\d{4}-?\d{4}$/.test(accessCode);
});

describe('I_I_InvalidAccessCodeFormat audit check', () => {
    const validUuid = uuidV4();

    describe('should pass in valid scenarios', () => {
        it.each([
            {
                description: 'interview has valid access code with hyphen',
                accessCode: '1234-5678'
            },
            {
                description: 'interview has valid access code without hyphen',
                accessCode: '12345678'
            },
            {
                description: 'interview has no access code (undefined)',
                accessCode: undefined
            },
            {
                description: 'interview has null access code',
                accessCode: null
            },
            {
                description: 'interview has empty string access code',
                accessCode: ''
            }
        ])('$description', ({ accessCode }) => {
            const interview = createMockInterview({ accessCode: accessCode as string | undefined });
            const context: InterviewAuditCheckContext = { interview };

            const result = interviewAuditChecks.I_I_InvalidAccessCodeFormat(context);

            expect(result).toBeUndefined();
        });
    });

    describe('should fail when access code is invalid', () => {
        it.each([
            {
                description: 'access code with letters',
                accessCode: 'invalid-code'
            },
            {
                description: 'access code too short',
                accessCode: '123'
            },
            {
                description: 'access code with special characters',
                accessCode: '!@#$%^&*()'
            },
            {
                description: 'access code too long',
                accessCode: '1234567890123456789012345678901234567890'
            },
            {
                description: 'access code with 7 digits only',
                accessCode: '1234567'
            },
            {
                description: 'access code with multiple hyphens',
                accessCode: '12-34-56-78'
            }
        ])('$description', ({ accessCode }) => {
            const interview = createMockInterview({ accessCode }, validUuid);
            const context: InterviewAuditCheckContext = { interview };

            const result = interviewAuditChecks.I_I_InvalidAccessCodeFormat(context);

            expect(result).toEqual({
                objectType: 'interview',
                objectUuid: validUuid,
                errorCode: 'I_I_InvalidAccessCodeFormat',
                version: 1,
                level: 'error',
                message: 'Interview access code format is invalid',
                ignore: false
            });
        });
    });
});

