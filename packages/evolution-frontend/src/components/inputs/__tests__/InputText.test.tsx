/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { UserInterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import React from 'react';
import TestRenderer from 'react-test-renderer';

import { InputText } from '../InputText';

const userAttributes = {
    id: 1,
    username: 'foo',
    preferences: {  },
    serializedPermissions: [],
    isAuthorized: () => true,
    is_admin: false,
    pages: [],
    showUserInfo: true
}

const interviewAttributes: UserInterviewAttributes = {
    id: 1,
    uuid: 'arbitrary uuid',
    user_id: 1,
    is_completed: false,
    responses: {
        section1: {
            q1: 'abc',
            q2: 3
        },
        section2: {
            q1: 'test'
        }
    },
    validations: {
        section1: {
            q1: true,
            q2: false
        },
        section2: {
            q1: true
        }
    },
    is_valid: true
};

test('Should correctly render InputText with all parameters', () =>{

    const widgetConfig = {
        type: 'question' as const,
        twoColumns: true,
        path: 'test.foo',
        inputType: 'text' as const,
        datatype: 'text' as const,
        maxLength: 1500,
        defaultValue: 'test',
        shortname: 'testName',
        rows: 10,
        containsHtml: true,
        label: {
            fr: `Texte en français`,
            en: `English text`
        }
    }

    const wrapper = TestRenderer.create(
        <InputText
            id={'test'}
            onValueChange={() => { /* nothing to do */}}
            widgetConfig={widgetConfig}
            value='value'
            inputRef={React.createRef()}
            size='medium'
            interview={interviewAttributes}
            path={'path'}
            user={userAttributes}
        />
    );
    expect(wrapper).toMatchSnapshot();
});

test('Should correctly render InputText with base parameters', () =>{

    const widgetConfig = {
        type: 'question' as const,
        path: 'test.foo',
        inputType: 'text' as const,
        label: {
            fr: `Texte en français`,
            en: `English text`
        }
    }
    const wrapper = TestRenderer.create(
        <InputText
            id={'test'}
            widgetConfig={widgetConfig}
            value='value'
            interview={interviewAttributes}
            path={'path'}
            user={userAttributes}
        />
    );
    expect(wrapper).toMatchSnapshot();
});

test('Should correctly render InputText with defaultValue', () =>{

    const widgetConfig = {
        type: 'question' as const,
        path: 'test.foo',
        inputType: 'text' as const,
        defaultValue: 'This is the text that should be present',
        label: {
            fr: `Texte en français`,
            en: `English text`
        }
    }
    const wrapper = TestRenderer.create(
        <InputText
            id={'test'}
            widgetConfig={widgetConfig}
            value=''
            interview={interviewAttributes}
            path={'path'}
            user={userAttributes}
        />
    );
    expect(wrapper).toMatchSnapshot();
});
