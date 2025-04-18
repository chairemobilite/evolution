/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render } from '@testing-library/react';
import { faCrow } from '@fortawesome/free-solid-svg-icons/faCrow';

import { shuffle } from 'chaire-lib-common/lib/utils/RandomUtils';
import { interviewAttributes } from './interviewData.test';

import InputCheckbox from '../InputCheckbox';
import i18next from 'i18next';

jest.mock('chaire-lib-common/lib/utils/RandomUtils', () => ({
    shuffle: jest.fn()
}));

const shuffleMock = shuffle as jest.MockedFunction<typeof shuffle>;

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

describe('Render InputCheckbox with various parameter combinations, all parameters', () => {

    const conditionalFct = jest.fn().mockReturnValue(true);
    const translationFct = jest.fn().mockReturnValue('Translated string');
    const choices = [
        {
            value: 'val1',
            label: { en: 'english value', fr: 'valeur française' },
            hidden: false,
            icon: faCrow
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
        inputType: 'checkbox' as const,
        choices,
        iconSize: '3em',
        seed: 23,
        shuffle: false,
        addCustom: false,
        columns: 2,
        sameLine: false,
        customLabel: 'custom label',
        size: 'medium' as const,
        containsHtml: true,
        label: {
            fr: `Texte en français`,
            en: `English text`
        }
    };

    beforeEach(() => {
        conditionalFct.mockClear();
    })

    test('Includes hidden values, conditional displayed, no custom, 2 columns, 2 selected values', () => {
        const { container } = render(
            <InputCheckbox
                id={'test'}
                onValueChange={() => { /* nothing to do */}}
                widgetConfig={widgetConfig}
                value={['val1', 'val2']}
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

    test('Conditional value hidden, same line, no value selected', () => {
        conditionalFct.mockReturnValueOnce(false);
        const testWidgetConfig = Object.assign({}, widgetConfig, { sameLine: true, columns: undefined });
        const { container } = render(
            <InputCheckbox
                id={'test'}
                onValueChange={() => { /* nothing to do */}}
                widgetConfig={testWidgetConfig}
                value={[]}
                inputRef={React.createRef()}
                interview={interviewAttributes}
                user={userAttributes}
                path='foo.test'
            />
        );
        expect(container).toMatchSnapshot();
    });

    test('Shuffle choices, one selected value', () => {
        shuffleMock.mockReturnValue([choices[1], choices[3], choices[0], choices[2]]);
        const testWidgetConfig = Object.assign({}, widgetConfig, { shuffle: true });
        const { container } = render(
            <InputCheckbox
                id={'test'}
                onValueChange={() => { /* nothing to do */}}
                widgetConfig={testWidgetConfig}
                value={['val2']}
                inputRef={React.createRef()}
                interview={interviewAttributes}
                user={userAttributes}
                path='foo.test'
            />
        );
        expect(container).toMatchSnapshot();
        expect(shuffleMock).toHaveBeenCalledTimes(1);
        expect(shuffleMock).toHaveBeenCalledWith(choices, undefined, widgetConfig.seed);
    });

    test('With custom choice, custom unchecked', () => {
        const testWidgetConfig = Object.assign({}, widgetConfig, { addCustom: true });
        const { container } = render(
            <InputCheckbox
                id={'test'}
                onValueChange={() => { /* nothing to do */}}
                widgetConfig={testWidgetConfig}
                value={['value']}
                inputRef={React.createRef()}
                interview={interviewAttributes}
                user={userAttributes}
                path='foo.test'
                customId='foo.test.custom'
            />
        );
        expect(container).toMatchSnapshot();
    });

    test('With custom choice, custom checked', () => {
        const testWidgetConfig = Object.assign({}, widgetConfig, { addCustom: true });
        const { container } = render(
            <InputCheckbox
                id={'test'}
                onValueChange={() => { /* nothing to do */}}
                widgetConfig={testWidgetConfig}
                value={['custom']}
                inputRef={React.createRef()}
                interview={interviewAttributes}
                user={userAttributes}
                path='foo.test'
                customId='foo.test.custom'
            />
        );
        expect(container).toMatchSnapshot();
    });
    
});

describe('Render InputCheckbox with minimum parameters', () => {

    const choices = [
        {
            value: 'val1',
            label: { en: 'english value', fr: 'valeur française' }
        },
        {
            value: 'val2',
            label: 'Unilingual label'
        }
    ];

    const widgetConfig = {
        type: 'question' as const,
        twoColumns: true,
        path: 'test.foo',
        inputType: 'checkbox' as const,
        choices,
        containsHtml: true,
        label: {
            fr: `Texte en français`,
            en: `English text`
        }
    };

    test('Minimum parameters, one value selected', () => {
        const { container } = render(
            <InputCheckbox
                id={'test'}
                onValueChange={() => { /* nothing to do */}}
                widgetConfig={widgetConfig}
                value={['val1']}
                inputRef={React.createRef()}
                interview={interviewAttributes}
                user={userAttributes}
                path='foo.test'
            />
        );
        expect(container).toMatchSnapshot();
    });
    
});

describe('Render InputCheckbox with HTML label', () => {

    const choices = [
        {
            value: 'first value',
            label: {
                fr: '<div>premiere valeur</div>',
                en: '<div>first value</div>'
            }
        },
        {
            value: 'second value',
            label: '<div>second value</div>'
        }
    ];

    const widgetConfig = {
        type: 'question' as const,
        twoColumns: true,
        path: 'test.foo',
        inputType: 'checkbox' as const,
        choices,
        size: 'medium',
        containsHtml: true,
        label: {
            fr: `Texte en français`,
            en: `English text`
        }
    };

    test('HTML label', () => {
        const { container } = render(
            <InputCheckbox
                id={'test'}
                onValueChange={() => { /* nothing to do */}}
                widgetConfig={widgetConfig}
                value={['second value']}
                inputRef={React.createRef()}
                interview={interviewAttributes}
                user={userAttributes}
                path='foo.test'
            />
        );
        expect(container).toMatchSnapshot();
    });

});
