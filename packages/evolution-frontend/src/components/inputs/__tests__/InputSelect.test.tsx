/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render } from '@testing-library/react';

import { interviewAttributes } from './interviewData';
import InputSelect from '../InputSelect';
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

test('Render InputSelect with normal option type', () => {

    const conditionalFct = jest.fn().mockReturnValue(true);
    const translationFct = jest.fn().mockReturnValue('Translated string');
    const choices = [
        {
            value: 'val1',
            label: { en: 'english value', fr: 'valeur française' },
            hidden: false,
            icon: 'creative-commons' as const
        },
        {
            value: 'val2',
            label: 'Unilingual label',
            iconPath: 'img/test.png'
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
        inputType: 'select' as const,
        choices,
        size: 'medium',
        containsHtml: true,
        label: {
            fr: `Texte en français`,
            en: `English text`
        }
    };
    
    const { container } = render(
        <InputSelect
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
    expect(container).toMatchSnapshot();
    expect(conditionalFct).toHaveBeenCalledTimes(1);
    expect(conditionalFct).toHaveBeenCalledWith(interviewAttributes, 'foo.test', userAttributes);
    expect(translationFct).toHaveBeenCalledWith(i18next.t, interviewAttributes, 'foo.test', userAttributes);
    
});

test('Render InputSelect with choice function and grouped choice type', () => {

    const choices = [
        {
            value: 'val1',
            label: { en: 'english value', fr: 'valeur française' },
            hidden: false,
            icon: 'creative-commons' as const
        },
        {
            groupName: 'select group',
            groupShortname: 'sel',
            groupLabel: { en: 'english select label', fr: 'étiquette française' },
            choices: [
                {
                    value: 'val2',
                    label: 'Unilingual label',
                    iconPath: 'img/test.png'
                },
                {
                    value: 'hiddenVal',
                    label: { en: 'english hidden', fr: 'cachée' },
                    hidden: true
                },
            ]
        },
        {
            groupName: 'select group',
            groupShortname: 'sel',
            groupLabel: 'Unilingual group label',
            choices: [
                {
                    value: 'val2',
                    label: 'Unilingual label',
                    iconPath: 'img/test.png'
                },
                {
                    value: 'val3',
                    label: { en: 'english val3', fr: 'val3 français' }
                },
            ]
        }
    ];
    const choiceFct = jest.fn().mockReturnValue(choices);
    
    const widgetConfig = {
        type: 'question' as const,
        twoColumns: true,
        path: 'test.foo',
        inputType: 'select' as const,
        choices: choiceFct,
        containsHtml: true,
        size: 'medium',
        label: {
            fr: `Texte en français`,
            en: `English text`
        }
    };
    
    const { container } = render(
        <InputSelect
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
    expect(container).toMatchSnapshot();
    expect(choiceFct).toHaveBeenCalledTimes(1);
    expect(choiceFct).toHaveBeenCalledWith(interviewAttributes, 'foo.test', userAttributes);
    
});

test('Render InputSelect with grouped choice type without labels', () => {

    const choices = [
        {
            value: 'val1',
            label: { en: 'english value', fr: 'valeur française' },
            hidden: false,
            icon: 'creative-commons' as const
        },
        {
            groupName: 'select group',
            groupShortname: 'sel',
            groupLabel: '',
            choices: [
                {
                    value: 'val2',
                    label: 'Unilingual label',
                    iconPath: 'img/test.png'
                },
                {
                    value: 'hiddenVal',
                    label: { en: 'english hidden', fr: 'cachée' },
                    hidden: true
                },
            ]
        },
        {
            groupName: 'select group',
            groupShortname: 'sel',
            groupLabel: '',
            choices: [
                {
                    value: 'val2',
                    label: 'Unilingual label',
                    iconPath: 'img/test.png'
                },
                {
                    value: 'val3',
                    label: { en: 'english val3', fr: 'val3 français' }
                },
            ]
        }
    ];

    const widgetConfig = {
        type: 'question' as const,
        twoColumns: true,
        path: 'test.foo',
        inputType: 'select' as const,
        choices,
        containsHtml: true,
        size: 'medium',
        label: {
            fr: `Texte en français`,
            en: `English text`
        }
    };

    const { container } = render(
        <InputSelect
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
    expect(container).toMatchSnapshot();

});
