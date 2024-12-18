/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render } from '@testing-library/react';

import { interviewAttributes } from './interviewData.test';
import InputMultiselect from '../InputMultiselect';
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

describe('Render InputMultiselect with various options', () => {

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
        inputType: 'multiselect' as const,
        choices,
        size: 'medium',
        containsHtml: true,
        label: {
            fr: `Texte en français`,
            en: `English text`
        }
    };

    test('Basic options', () => {
        const { container } = render(
            <InputMultiselect
                id={'test'}
                onValueChange={() => { /* nothing to do */}}
                widgetConfig={widgetConfig}
                value={['val1','val2']}
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
    
    test('With shortcuts', () => {
        const shortcutTranslateFct = jest.fn().mockReturnValue('Translated shortcut');
        const configWithShortcuts = Object.assign({}, widgetConfig, { 
            shortcuts: [
                {
                    value: 'val2',
                    label: 'Unilingual label',
                    iconPath: 'img/test.png'
                },
                {
                    value: 'conditionalVal',
                    label: { en: 'english conditional', fr: 'conditionnelle' },
                    color: 'red'
                },
                {
                    value: 'val3',
                    label: shortcutTranslateFct,
                    color: 'red'
                },
            ]
        });
        const { container } = render(
            <InputMultiselect
                id={'test'}
                onValueChange={() => { /* nothing to do */}}
                widgetConfig={configWithShortcuts}
                value={['val1']}
                inputRef={React.createRef()}
                interview={interviewAttributes}
                user={userAttributes}
                path='foo.test'
            />
        );
        expect(container).toMatchSnapshot();
        expect(shortcutTranslateFct).toHaveBeenCalledWith(i18next.t, interviewAttributes, 'foo.test', userAttributes);
    });

    test('With all parameters', () => {
        // One of the shortcuts is not a present choice
        conditionalFct.mockReturnValueOnce(false);
        const configWithShortcuts = Object.assign({}, widgetConfig, { 
            shortcuts: [
                {
                    value: 'val2',
                    label: 'Unilingual label',
                    iconPath: 'img/test.png'
                },
                {
                    value: 'conditionalVal',
                    label: { en: 'english conditional', fr: 'conditionnelle' },
                    color: 'red'
                },
            ],
            multiple: true, // Should have only one value
            onlyLabelSearch: true,
            isClearable: true,
            closeMenuOnSelect: true
        });
        const { container } = render(
            <InputMultiselect
                id={'test'}
                onValueChange={() => { /* nothing to do */}}
                widgetConfig={configWithShortcuts}
                value={['val1', 'val2']}
                inputRef={React.createRef()}
                interview={interviewAttributes}
                user={userAttributes}
                path='foo.test'
            />
        );
        expect(container).toMatchSnapshot();
    });
    
});
