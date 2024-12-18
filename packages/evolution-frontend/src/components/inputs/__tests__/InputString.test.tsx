/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

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
        textTransform: 'lowercase' as const,
        keyboardInputMode: 'decimal' as const,
        placeholder: 'example placeholder' as const,
        containsHtml: true,
        size: 'medium' as const,
        label: {
            fr: `Texte en français`,
            en: `English text`
        }
    }

    const { container } = render(
        <InputString
            id={'test'}
            onValueChange={() => { /* nothing to do */}}
            widgetConfig={widgetConfig}
            value={undefined}
            inputRef={React.createRef()}
            updateKey={0}
            interview={interviewAttributes}
            path={'path'}
            user={userAttributes}
        />
    );
    expect(container).toMatchSnapshot();
});

test('Should correctly render InputString with default value as function', () =>{

    const widgetConfig = {
        type: 'question' as const,
        twoColumns: true,
        path: 'test.foo',
        inputType: 'string' as const,
        datatype: 'string' as const,
        maxLength: 20,
        size: 'medium' as const,
        defaultValue: jest.fn().mockReturnValue('fctDefault'),
        containsHtml: true,
        label: {
            fr: `Texte en français`,
            en: `English text`
        }
    }

    const { container } = render(
        <InputString
            id={'test'}
            onValueChange={() => { /* nothing to do */}}
            widgetConfig={widgetConfig}
            value={undefined}
            inputRef={React.createRef()}
            updateKey={0}
            interview={interviewAttributes}
            path={'path'}
            user={userAttributes}
        />
    );
    expect(container).toMatchSnapshot();
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
    const { container } = render(
        <InputString
            id={'test'}
            widgetConfig={widgetConfig}
            value='value'
            updateKey={0}
            interview={interviewAttributes}
            path={'path'}
            user={userAttributes}
            onValueChange={jest.fn()}
        />
    );
    expect(container).toMatchSnapshot();
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
    const { container } = render(
        <InputString
            id={'test'}
            widgetConfig={widgetConfig}
            value={0 as any}
            updateKey={0}
            interview={interviewAttributes}
            path={'path'}
            user={userAttributes}
            onValueChange={jest.fn()}
        />
    );
    expect(container).toMatchSnapshot();
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
    const onValueChangeMock = jest.fn();
    const { rerender } = render(<InputString
        id={testId}
        widgetConfig={widgetConfig}
        value='value'
        updateKey={0}
        interview={interviewAttributes}
        path={'path'}
        user={userAttributes}
        onValueChange={onValueChangeMock}
    />);

    // Validate initial values
    expect(screen.getByRole('textbox')).toHaveValue('value');

    // Change value 'manually'
    const newValue = 'newVal';
    fireEvent.change(screen.getByRole('textbox'), { target: { value: newValue } });
    expect(screen.getByRole('textbox')).toHaveValue(newValue);

    // Change value through props without changing updateKey, should not change
    const newProps = {
        id: testId,
        widgetConfig,
        value: 'updateByClient',
        updateKey: 0,
        interview: interviewAttributes,
        path: 'path',
        user: userAttributes,
        onValueChange: onValueChangeMock
    };
    rerender(<InputString  {...newProps} />);
    expect(screen.getByRole('textbox')).toHaveValue(newValue);

    // Change value through props and change updateKey, should be updated
    const updateByServerVal = 'updateByServer';
    const newPropsWithUpdateKey = {
        id: testId,
        widgetConfig,
        value: updateByServerVal,
        updateKey: 1,
        interview: interviewAttributes,
        path: 'path',
        user: userAttributes,
        onValueChange: onValueChangeMock
    };
    rerender(<InputString  {...newPropsWithUpdateKey} />);
    expect(screen.getByRole('textbox')).toHaveValue(updateByServerVal);
});
