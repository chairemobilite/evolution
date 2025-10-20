/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { interviewAttributes } from './interviewData';
import React from 'react';
import { render } from '@testing-library/react';

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
        size: 'medium' as const,
        containsHtml: true,
        label: {
            fr: `Texte en français`,
            en: `English text`
        }
    }

    const { container } = render(
        <InputText
            id={'test'}
            onValueChange={() => { /* nothing to do */}}
            widgetConfig={widgetConfig}
            value='value'
            inputRef={React.createRef()}
            interview={interviewAttributes}
            path={'path'}
            user={userAttributes}
        />
    );
    expect(container).toMatchSnapshot();
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
    const { container } = render(
        <InputText
            id={'test'}
            widgetConfig={widgetConfig}
            value='value'
            interview={interviewAttributes}
            path={'path'}
            user={userAttributes}
            onValueChange={jest.fn()}
        />
    );
    expect(container).toMatchSnapshot();
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
    const { container } = render(
        <InputText
            id={'test'}
            widgetConfig={widgetConfig}
            value=''
            interview={interviewAttributes}
            path={'path'}
            user={userAttributes}
            onValueChange={jest.fn()}
        />
    );
    expect(container).toMatchSnapshot();
});
