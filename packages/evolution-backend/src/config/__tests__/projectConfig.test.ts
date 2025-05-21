/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { InterviewListAttributes, InterviewStatusAttributesBase } from 'evolution-common/lib/services/questionnaire/types';
import projectConfig, { defaultConfig, setProjectConfig } from '../projectConfig';

const interview: InterviewListAttributes = {
    id: 1,
    uuid: 'arbitrary',
    participant_id: 4,
    is_valid: true,
    is_completed: true,
    response: { accessCode: 'notsure', foo: 'bar', household: { size: 0 } } as any,
    corrected_response: {},
    username: 'test',
    facebook: false,
    google: false,
    audits: { 'errorMsg': 2, 'errorMsg2': 5 }
};

const nullResponseInterview = {
    id: 1,
    uuid: 'arbitrary',
    participant_id: 4,
    is_valid: true,
    is_completed: true,
    response: null,
    corrected_response: null,
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
            response: { household: { size: 0 } },
            audits: interview.audits
        });
    });

    test('test default validation filter with null values for response and corrected response', () => {
        const interviewStatus = projectConfig.validationListFilter(nullResponseInterview as any);
        expect(interviewStatus).toEqual({
            id: interview.id,
            uuid: interview.uuid,
            is_valid: interview.is_valid,
            is_validated: undefined,
            is_completed: interview.is_completed,
            username: interview.username,
            facebook: interview.facebook,
            google: interview.google,
            response: { household: { size: undefined }, _isCompleted: undefined, _validationComment: undefined }
        });
    });

    test('Add project specific filter', () => {
        setProjectConfig({ validationListFilter: (interview: InterviewListAttributes) => {
            const status = defaultConfig.validationListFilter(interview) as InterviewStatusAttributesBase;
            (status.response as any).accessCode = (interview.response as any).accessCode;
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
            response: { accessCode: (interview.response as any).accessCode, household: { size: 0 } },
            audits: interview.audits
        });
    });
});

describe('Transition API configuration', () => {

    beforeEach(() => {
        // Undefine all environment variables and transitionApi config
        delete process.env.TRANSITION_API_URL;
        delete process.env.TRANSITION_API_USERNAME;
        delete process.env.TRANSITION_API_PASSWORD;
        projectConfig.transitionApi = undefined;
    });

    test('Default value should not be set', () => {
        setProjectConfig({
            // Nothing to set
        });
        expect(projectConfig.transitionApi).toBeUndefined();
    });

    test('Should use environment variables if set', () => {
        process.env.TRANSITION_API_URL = 'https://transition.from.env';
        process.env.TRANSITION_API_USERNAME = 'username.env';
        process.env.TRANSITION_API_PASSWORD = 'password.env';
        setProjectConfig({
            // Nothing to set
        });
        expect(projectConfig.transitionApi).toEqual({
            url: 'https://transition.from.env',
            username: 'username.env',
            password: 'password.env'
        });
    });

    test('Missing password, should not be set', () => {
        process.env.TRANSITION_API_URL = 'https://transition.from.env';
        process.env.TRANSITION_API_USERNAME = 'username.env';
        setProjectConfig({
            // Nothing to set
        });
        expect(projectConfig.transitionApi).toBeUndefined();
    });

    test('Should use the values specified in the config if set', () => {
        setProjectConfig({
            transitionApi: {
                url: 'http://transition',
                username: 'user',
                password: 'password'
            }
        });
        expect(projectConfig.transitionApi).toEqual({
            url: 'http://transition',
            username: 'user',
            password: 'password'
        });
    });

    test('Should use values in config if both environment and config set', () => {
        process.env.TRANSITION_API_URL = 'https://transition.from.env';
        process.env.TRANSITION_API_USERNAME = 'username.env';
        process.env.TRANSITION_API_PASSWORD = 'password.env';
        setProjectConfig({
            transitionApi: {
                url: 'http://transition',
                username: 'user',
                password: 'password'
            }
        });
        expect(projectConfig.transitionApi).toEqual({
            url: 'http://transition',
            username: 'user',
            password: 'password'
        });
    });
});

