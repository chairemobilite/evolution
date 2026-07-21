/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _cloneDeep from 'lodash/cloneDeep';
import { v4 as uuidV4 } from 'uuid';
import projectConfig from 'evolution-common/lib/config/project.config';
import type { Interview } from 'evolution-common/lib/services/baseObjects/interview/Interview';
import type { InterviewAuditCheckContext } from '../../../AuditCheckContexts';
import { interviewAuditChecks } from '../../InterviewAuditChecks';
import { createMockInterview } from './testHelper';

/**
 * Override interview required fields for the current test.
 * @param fields - Field names required on the interview object for this test
 */
const setInterviewRequiredFields = (fields: string[]): void => {
    projectConfig.requiredFieldsBySurveyObject = {
        ...projectConfig.requiredFieldsBySurveyObject,
        interview: fields
    };
};

describe('I_M_AssignedDate audit check', () => {
    const validUuid = uuidV4();
    let originalRequiredFieldsBySurveyObject: typeof projectConfig.requiredFieldsBySurveyObject;

    beforeAll(() => {
        originalRequiredFieldsBySurveyObject = _cloneDeep(projectConfig.requiredFieldsBySurveyObject);
    });

    afterEach(() => {
        projectConfig.requiredFieldsBySurveyObject = _cloneDeep(originalRequiredFieldsBySurveyObject);
    });

    describe('audit should pass when', () => {
        it.each([
            {
                description: 'assigned date is required and present',
                assignedDate: '2023-05-01',
                isRequired: true
            },
            {
                description: 'assigned date is not required and present',
                assignedDate: '2023-05-01',
                isRequired: false
            },
            {
                description: 'assigned date is not required and missing',
                assignedDate: undefined,
                isRequired: false
            },
            {
                description: 'assigned date is not required and null',
                assignedDate: null,
                isRequired: false
            },
            {
                description: 'assigned date is not required and empty string',
                assignedDate: '',
                isRequired: false
            }
        ])('$description', ({ assignedDate, isRequired }) => {
            setInterviewRequiredFields(isRequired ? ['assignedDate'] : []);

            const interview = createMockInterview({ assignedDate } as Partial<Interview>);
            const context: InterviewAuditCheckContext = { interview };

            const result = interviewAuditChecks.I_M_AssignedDate(context);

            expect(result).toBeUndefined();
        });
    });

    describe('audit should fail when assigned date is required', () => {
        it.each([
            {
                description: 'assigned date is undefined',
                assignedDate: undefined
            },
            {
                description: 'assigned date is empty string',
                assignedDate: ''
            },
            {
                description: 'assigned date is whitespace only',
                assignedDate: '   '
            }
        ])('$description', ({ assignedDate }) => {
            setInterviewRequiredFields(['assignedDate']);

            const interview = createMockInterview({ assignedDate } as Partial<Interview>, validUuid);
            const context: InterviewAuditCheckContext = { interview };

            const result = interviewAuditChecks.I_M_AssignedDate(context);

            expect(result).toEqual({
                objectType: 'interview',
                objectUuid: validUuid,
                errorCode: 'I_M_AssignedDate',
                version: 1,
                level: 'error',
                message: 'Assigned date is missing',
                ignore: false
            });
        });
    });
});
