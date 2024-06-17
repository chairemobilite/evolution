/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import TestRenderer from 'react-test-renderer';
import { render, fireEvent } from '@testing-library/react';

import { interviewAttributes } from './interviewData.test';
import InputButton from '../InputButton';
import i18next from 'i18next';

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

describe('InputButton with normal options', () => {
    const conditionalFct = jest.fn().mockReturnValue(true);
    const translationFct = jest.fn().mockReturnValue('Translated string');
    const choices = [
        {
            value: 'val1',
            label: { en: 'english value', fr: 'valeur française' },
            hidden: false,
            color: 'green'
        },
        {
            value: 'val2',
            label: 'Unilingual label',
            iconPath: 'img/test.png',
            color: 'red',
            size: 'small' as const
        },
        {
            value: 'hiddenVal',
            label: { en: 'english hidden', fr: 'cachée' },
            hidden: true
        },
        {
            value: 'conditionalVal',
            label: { en: 'english conditional', fr: 'conditionnelle' },
            conditional: conditionalFct
        },
        {
            value: 'val3',
            label: translationFct,
            hidden: false,
            color: 'green'
        }
    ];

    const widgetConfig = {
        type: 'question' as const,
        twoColumns: true,
        path: 'test.foo',
        inputType: 'button' as const,
        choices,
        containsHtml: true,
        size: 'medium' as const,
        label: {
            fr: `Texte en français`,
            en: `English text`
        },
        isModal: true
    };

    test('Render InputButton with normal option type', () => {
        
        const wrapper = TestRenderer.create(
            <InputButton
                id={'test'}
                onValueChange={() => { /* nothing to do */}}
                widgetConfig={widgetConfig}
                value='value'
                inputRef={React.createRef()}
                interview={interviewAttributes}
                user={userAttributes}
                path='foo.test'
            />
        );
        expect(wrapper).toMatchSnapshot();
        expect(conditionalFct).toHaveBeenCalledTimes(1);
        expect(conditionalFct).toHaveBeenCalledWith(interviewAttributes, 'foo.test', userAttributes);
        expect(translationFct).toHaveBeenCalledWith(i18next.t, interviewAttributes, 'foo.test', userAttributes);
        
    });

    test('Test Button click event', () => {
        const mockOnValueChange = jest.fn();
        const { queryByText } = render(
            <InputButton
                id={'test'}
                onValueChange={mockOnValueChange}
                widgetConfig={widgetConfig}
                value='value'
                inputRef={React.createRef()}
                interview={interviewAttributes}
                user={userAttributes}
                path='foo.test'
            />
        );
        // Html was added, so the complete text is not there, it is actually composed of many texts
        const buttonOption1 = queryByText(choices[0].label['en']);
        expect(buttonOption1).toBeTruthy();

        const buttonOption2 = queryByText(choices[1].label as string);
        expect(buttonOption2).toBeTruthy();

        const buttonOption3 = queryByText(choices[3].label['en']);
        expect(buttonOption3).toBeTruthy();
    
        // Click on the close button
        fireEvent.click(buttonOption1 as any);
        expect(mockOnValueChange).toHaveBeenCalledTimes(1);
        expect(mockOnValueChange).toHaveBeenCalledWith({ target: { value: choices[0].value }});

        // Click on the close button
        fireEvent.click(buttonOption2 as any);
        expect(mockOnValueChange).toHaveBeenCalledTimes(2);
        expect(mockOnValueChange).toHaveBeenCalledWith({ target: { value: choices[1].value }});

        // Click on the close button
        fireEvent.click(buttonOption3 as any);
        expect(mockOnValueChange).toHaveBeenCalledTimes(3);
        expect(mockOnValueChange).toHaveBeenCalledWith({ target: { value: choices[3].value }});
    });

});

test('Render InputButton with choice function', () => {

    const choices = [
        {
            value: 'val1',
            label: { en: 'english value', fr: 'valeur française' },
            hidden: false,
            color: 'green'
        },
        {
            value: 'val2',
            label: 'Unilingual label',
            iconPath: 'img/test.png',
            color: 'red',
            size: 'small' as const
        },
        {
            value: 'hiddenVal',
            label: { en: 'english hidden', fr: 'cachée' },
            hidden: true
        },
        {
            value: 'conditionalVal',
            label: { en: 'english conditional', fr: 'conditionnelle' },
            conditional: () => false
        }
    ];
    const choiceFct = jest.fn().mockReturnValue(choices);
    
    const widgetConfig = {
        type: 'question' as const,
        twoColumns: true,
        path: 'test.foo',
        inputType: 'button' as const,
        choices: choiceFct,
        align: 'center' as const,
        sameLine: false,
        containsHtml: true,
        size: 'medium' as const,
        label: {
            fr: `Texte en français`,
            en: `English text`
        }
    };
    
    const wrapper = TestRenderer.create(
        <InputButton
            id={'test'}
            onValueChange={() => { /* nothing to do */}}
            widgetConfig={widgetConfig}
            value='value'
            inputRef={React.createRef()}
            interview={interviewAttributes}
            user={userAttributes}
            path='foo.test'
        />
    );
    expect(wrapper).toMatchSnapshot();
    expect(choiceFct).toHaveBeenCalledTimes(1);
    expect(choiceFct).toHaveBeenCalledWith(interviewAttributes, 'foo.test', userAttributes);
    
});
