/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import React from 'react';
import each from 'jest-each';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

import { interviewAttributes } from '../../inputs/__tests__/interviewData.test';
import Text from '../Text';
import { WidgetStatus } from 'evolution-common/lib/services/questionnaire/types';

// Mock react-markdown and remark-gfm as they use syntax not supported by jest
jest.mock('react-markdown', () => 'Markdown');
jest.mock('remark-gfm', () => 'remark-gfm');

const userAttributes = {
    id: 1,
    username: 'foo',
    preferences: {  },
    serializedPermissions: [],
    isAuthorized: () => true,
    is_admin: false,
    pages: [],
    showUserInfo: true
};

const commonWidgetConfig = {
    type: 'text' as const,
    text: 'random text'
};

const defaultWidgetStatus: WidgetStatus = {
    path: 'foo',
    isVisible: true,
    isDisabled: false,
    isCollapsed: false,
    isEmpty: false,
    isCustomEmpty: false,
    isValid: true,
    isResponded: true,
    isCustomResponded: false,
    errorMessage: undefined,
    currentUpdateKey: 1,
    value: null
};

each([
    ['Default values', commonWidgetConfig],
    ['Contains html', { ...commonWidgetConfig, containsHtml: true, text: '<br> bold text</br>blabla' }],
    ['No html', { ...commonWidgetConfig, containsHtml: false, text: '<br>text not to be in bold</br>other' }],
    ['No html, with classes and alignment', { ...commonWidgetConfig, containsHtml: false, classes: 'my-class', align: 'right' }],
]).describe('Text widget: %s', (_widget, widgetConfig) => {

    test('Render widget', () => {

        const { container } = render(
            <Text
                path='home.region'
                widgetConfig={widgetConfig}
                interview={interviewAttributes}
                user={userAttributes}
                widgetStatus={defaultWidgetStatus}
            />
        );
        expect(container).toMatchSnapshot();
    });

    test('Widget accessibility', async () => {
        const { container } = render(
            <Text
                path='home.region'
                widgetConfig={widgetConfig}
                interview={interviewAttributes}
                user={userAttributes}
                widgetStatus={defaultWidgetStatus}
            />
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });
});

test('Widget invisible, should be null', () => {
    const widgetStatus = _cloneDeep(defaultWidgetStatus);
    widgetStatus.isVisible = false;
    const { container } = render(
        <Text
            path='home.region'
            widgetConfig={commonWidgetConfig}
            interview={interviewAttributes}
            user={userAttributes}
            widgetStatus={widgetStatus}
        />
    );
    expect(container).toMatchSnapshot();
});

test('Blank text on widget, should be null', () => {
    const widgetConfig = _cloneDeep(commonWidgetConfig);
    widgetConfig.text = jest.fn().mockReturnValue('') as any;
    const { container } = render(
        <Text
            path='home.region'
            widgetConfig={widgetConfig}
            interview={interviewAttributes}
            user={userAttributes}
            widgetStatus={defaultWidgetStatus}
        />
    );
    expect(container).toMatchSnapshot();
});
