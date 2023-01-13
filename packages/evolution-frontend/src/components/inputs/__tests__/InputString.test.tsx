/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { mount } from 'enzyme';

import { InputString } from '../InputString';
import { interviewAttributes } from './interviewData.test';

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

test('Should correctly render InputString with all parameters', () =>{

    const widgetConfig = {
        type: 'question' as const,
        twoColumns: true,
        path: 'test.foo',
        inputType: 'string' as const,
        datatype: 'string' as const,
        maxLength: 20,
        defaultValue: 'test',
        containsHtml: true,
        label: {
            fr: `Texte en français`,
            en: `English text`
        }
    }

    const wrapper = TestRenderer.create(
        <InputString
            id={'test'}
            onValueChange={() => { /* nothing to do */}}
            widgetConfig={widgetConfig}
            value={undefined}
            inputRef={React.createRef()}
            size='medium'
            updateKey={0}
            interview={interviewAttributes}
            path={'path'}
            user={userAttributes}
        />
    );
    expect(wrapper).toMatchSnapshot();
});

test('Should correctly render InputString with default value as function', () =>{

    const widgetConfig = {
        type: 'question' as const,
        twoColumns: true,
        path: 'test.foo',
        inputType: 'string' as const,
        datatype: 'string' as const,
        maxLength: 20,
        defaultValue: jest.fn().mockReturnValue('fctDefault'),
        containsHtml: true,
        label: {
            fr: `Texte en français`,
            en: `English text`
        }
    }

    const wrapper = TestRenderer.create(
        <InputString
            id={'test'}
            onValueChange={() => { /* nothing to do */}}
            widgetConfig={widgetConfig}
            value={undefined}
            inputRef={React.createRef()}
            size='medium'
            updateKey={0}
            interview={interviewAttributes}
            path={'path'}
            user={userAttributes}
        />
    );
    expect(wrapper).toMatchSnapshot();
    expect(widgetConfig.defaultValue).toHaveBeenCalledWith(interviewAttributes, 'path', userAttributes);
});

test('Should correctly render InputString with base parameters', () =>{

    const widgetConfig = {
        type: 'question' as const,
        path: 'test.foo',
        inputType: 'string' as const,
        label: {
            fr: `Texte en français`,
            en: `English text`
        }
    }
    const wrapper = TestRenderer.create(
        <InputString
            id={'test'}
            widgetConfig={widgetConfig}
            value='value'
            updateKey={0}
            interview={interviewAttributes}
            path={'path'}
            user={userAttributes}
        />
    );
    expect(wrapper).toMatchSnapshot();
});

test('Should correctly render InputString with a value of 0', () =>{

    const widgetConfig = {
        type: 'question' as const,
        path: 'test.foo',
        inputType: 'string' as const,
        label: {
            fr: `Texte en français`,
            en: `English text`
        }
    }
    const wrapper = TestRenderer.create(
        <InputString
            id={'test'}
            widgetConfig={widgetConfig}
            value={0 as any}
            updateKey={0}
            interview={interviewAttributes}
            path={'path'}
            user={userAttributes}
        />
    );
    expect(wrapper).toMatchSnapshot();
});

test('Test update value through props', () => {
    const widgetConfig = {
        type: 'question' as const,
        path: 'test.foo',
        inputType: 'string' as const,
        label: {
            fr: `Texte en français`,
            en: `English text`
        }
    }
    const testId = 'test';
    const stringInput = mount(<InputString
        id={testId}
        widgetConfig={widgetConfig}
        value='value'
        updateKey={0}
        interview={interviewAttributes}
        path={'path'}
        user={userAttributes}
    />);

    // Validate initial values
    const inputElement = stringInput.find({id: `${testId}`, type: 'text'});
    expect(inputElement).toBeTruthy();
    expect(inputElement.getDOMNode<HTMLInputElement>().value).toBe('value');

    // Change value 'manually'
    const newValue = 'newVal';
    inputElement.getDOMNode<HTMLInputElement>().value = newValue;
    inputElement.simulate('change');
    expect(inputElement.getDOMNode<HTMLInputElement>().value).toBe(newValue);

    // Change value through props without changing updateKey, should not change
    stringInput.setProps({
        id: testId,
        widgetConfig,
        value: 'updateByClient',
        updateKey: 0,
        interview: interviewAttributes,
        path: 'path',
        user: userAttributes
    });
    expect(inputElement.getDOMNode<HTMLInputElement>().value).toBe(newValue);

    // Change value through props and change updateKey, should be updated
    const updateByServerVal = 'updateByServer';
    stringInput.setProps({
        id: testId,
        widgetConfig,
        value: updateByServerVal,
        updateKey: 1
    });
    expect(inputElement.getDOMNode<HTMLInputElement>().value).toBe(updateByServerVal);
});