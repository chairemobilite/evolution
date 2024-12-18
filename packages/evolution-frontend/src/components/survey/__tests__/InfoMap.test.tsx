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
import InfoMap from '../InfoMap';
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
    type: 'infoMap' as const,
    title: 'title',
    geojsons: {}
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

beforeEach(() => {
    jest.clearAllMocks();
});

each([
    ['Default values', commonWidgetConfig],
    ['All values set', {
        ...commonWidgetConfig,
        path: 'home.region',
        conditional: jest.fn(),
        defaultCenter: { lat: 0, lon: 0 },
        maxZoom: 18,
        defaultZoom: 16,
        linestringColor: 'blue',
        linestringActiveColor: 'red'
    }],
]).describe('Button widget: %s', (_widget, widgetConfig) => {

    test('Render widget', () => {

        const { container } = render(
            <InfoMap
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
            <InfoMap
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
