/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import type { InterviewAuditCheckContext } from '../../../AuditCheckContexts';
import { interviewAuditChecks } from '../../InterviewAuditChecks';
import { createMockInterview } from './testHelper';

describe('I_M_ContactEmailButWouldLikeToParticipateInOtherSurveys audit check', () => {
    const validUuid = uuidV4();

    it.each([
        {
            description: 'would like to participate in other surveys and contact email present',
            wouldLikeToParticipateInOtherSurveys: true,
            contactEmail: 'contact@example.com',
            expectError: false
        },
        {
            description: 'would not like to participate in other surveys and contact email missing',
            wouldLikeToParticipateInOtherSurveys: false,
            contactEmail: undefined,
            expectError: false
        },
        {
            description: 'would not like to participate in other surveys and contact email present',
            wouldLikeToParticipateInOtherSurveys: false,
            contactEmail: 'contact@example.com',
            expectError: false
        },
        {
            description: 'wouldLikeToParticipateInOtherSurveys is undefined and contact email missing',
            wouldLikeToParticipateInOtherSurveys: undefined,
            contactEmail: undefined,
            expectError: false
        },
        {
            description: 'would like to participate in other surveys and contact email is empty string',
            wouldLikeToParticipateInOtherSurveys: true,
            contactEmail: '',
            expectError: true
        },
        {
            description: 'would like to participate in other surveys and contact email is undefined',
            wouldLikeToParticipateInOtherSurveys: true,
            contactEmail: undefined,
            expectError: true
        }
    ])('$description', ({ wouldLikeToParticipateInOtherSurveys, contactEmail, expectError }) => {
        const interview = createMockInterview({ wouldLikeToParticipateInOtherSurveys, contactEmail }, validUuid);
        const context: InterviewAuditCheckContext = { interview };

        const result = interviewAuditChecks.I_M_ContactEmailButWouldLikeToParticipateInOtherSurveys(context);

        if (!expectError) {
            expect(result).toBeUndefined();
        } else {
            expect(result).toEqual({
                objectType: 'interview',
                objectUuid: validUuid,
                errorCode: 'I_M_ContactEmailButWouldLikeToParticipateInOtherSurveys',
                version: 1,
                level: 'error',
                message: 'Contact email is missing but respondent would like to participate in other surveys',
                ignore: false
            });
        }
    });
});
