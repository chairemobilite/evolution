/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { InterviewListAttributes, InterviewStatusAttributesBase } from 'evolution-common/lib/services/interviews/interview';
import projectConfig, { defaultConfig, setProjectConfig } from '../projectConfig';

type CustomSurvey = {
    accessCode?: string;
    foo?: string;
}

const interview: InterviewListAttributes<CustomSurvey, any, any, any> = {
    id: 1,
    uuid: 'arbitrary',
    participant_id: 4,
    is_valid: true,
    is_completed: true,
    responses: { accessCode: 'notsure', foo: 'bar', household: { size: 0 } },
    validated_data: {},
    username: 'test',
    facebook: false,
    google: false,
    audits: { 'errorMsg': 2, 'errorMsg2': 5}
};

const nullResponsesInterview = {
    id: 1,
    uuid: 'arbitrary',
    participant_id: 4,
    is_valid: true,
    is_completed: true,
    responses: null,
    validated_data: null,
    username: 'test',
    facebook: false,
    google: false
};

describe('Validation List Filter', () => {
    test('test default validation filter', () => {
        const interviewStatus = projectConfig.validationListFilter(interview);
        expect(interviewStatus).toEqual({
            id: interview.id,
            uuid: interview.uuid,
            is_valid: interview.is_valid,
            is_validated: undefined,
            is_completed: interview.is_completed,
            username: interview.username,
            facebook: interview.facebook,
            google: interview.google,
            responses: { household: { size: 0 }},
            audits: interview.audits
        });
    });

    test('test default validation filter with null values for resonses and validated data', () => {
        const interviewStatus = projectConfig.validationListFilter(nullResponsesInterview as any);
        expect(interviewStatus).toEqual({
            id: interview.id,
            uuid: interview.uuid,
            is_valid: interview.is_valid,
            is_validated: undefined,
            is_completed: interview.is_completed,
            username: interview.username,
            facebook: interview.facebook,
            google: interview.google,
            responses: { household: { size: undefined }, _isCompleted: undefined, _validationComment: undefined }
        });
    });

    test('Add project specific filter', () => {
        setProjectConfig<CustomSurvey, any, any, any>({ validationListFilter: (interview: InterviewListAttributes<CustomSurvey, any, any, any>) => {
            const status = defaultConfig.validationListFilter(interview) as InterviewStatusAttributesBase<CustomSurvey, any, any, any>;
            status.responses.accessCode = interview.responses.accessCode;
            return status;
        } });

        const interviewStatus = projectConfig.validationListFilter(interview);
        expect(interviewStatus).toEqual({
            id: interview.id,
            uuid: interview.uuid,
            is_valid: interview.is_valid,
            is_validated: undefined,
            is_completed: interview.is_completed,
            username: interview.username,
            facebook: interview.facebook,
            google: interview.google,
            responses: { accessCode: interview.responses.accessCode, household: { size: 0 } },
            audits: interview.audits
        });
    })
});

