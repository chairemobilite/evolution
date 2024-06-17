/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import React from 'react';
import TestRenderer from 'react-test-renderer';
import each from 'jest-each';
import { mount } from 'enzyme';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

import { interviewAttributes } from '../../inputs/__tests__/interviewData.test';
import Button from '../Button';
import { WidgetStatus } from '../../../services/interviews/interview';

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
    type: 'button' as const,
    label: 'label',
    action: jest.fn()
};

const defaultWidgetStatus: WidgetStatus = {
    path: 'foo',
    isVisible: true,
    modalIsOpen: false,
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

const startUpdateInterviewMock = jest.fn();
const startAddGroupedObjectsMock = jest.fn();
const startRemoveGroupedObjectsMock = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
});

each([
    ['Default values', commonWidgetConfig],
    ['All values set', {
        ...commonWidgetConfig,
        label: 'newLabel',
        hideWhenRefreshing: true,
        containsHtml: true,
        color: 'red',
        iconPath: 'path/to/somewhere',
        align: 'right',
        saveCallback: jest.fn(),
        confirmPopup: {
            title: 'popupTitle',
            content: 'popupContent',
        },
        size: 'small',
        conditional: jest.fn()
    }],
]).describe('Button widget: %s', (_widget, widgetConfig) => {

    test('Render widget', () => {

        const wrapper = TestRenderer.create(
            <Button
                path='home.region'
                widgetConfig={widgetConfig}
                interview={interviewAttributes}
                user={userAttributes}
                widgetStatus={defaultWidgetStatus}
                section={''}
                startUpdateInterview={startUpdateInterviewMock}
                startAddGroupedObjects={startAddGroupedObjectsMock}
                startRemoveGroupedObjects={startRemoveGroupedObjectsMock}
                loadingState={0}
            />
        );
        expect(wrapper).toMatchSnapshot();
    });

    test('Widget accessibility', async () => {
        const { container } = render(
            <Button
                path='home.region'
                widgetConfig={widgetConfig}
                interview={interviewAttributes}
                user={userAttributes}
                widgetStatus={defaultWidgetStatus}
                section={''}
                startUpdateInterview={startUpdateInterviewMock}
                startAddGroupedObjects={startAddGroupedObjectsMock}
                startRemoveGroupedObjects={startRemoveGroupedObjectsMock}
                loadingState={0}
            />
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });
});

test('Widget invisible, should be null', () => {
    const widgetStatus = _cloneDeep(defaultWidgetStatus);
    widgetStatus.isVisible = false;
    const wrapper = TestRenderer.create(
        <Button
            path='home.region'
            widgetConfig={commonWidgetConfig}
            interview={interviewAttributes}
            user={userAttributes}
            widgetStatus={widgetStatus}
            section={''}
            startUpdateInterview={startUpdateInterviewMock}
            startAddGroupedObjects={startAddGroupedObjectsMock}
            startRemoveGroupedObjects={startRemoveGroupedObjectsMock}
            loadingState={0}
        />
    );
    expect(wrapper).toMatchSnapshot();
});

test('Widget loading, should be disabled', () => {
    // Set hideWhenRefreshing to true and loadingState to 1
    const wrapper = TestRenderer.create(
        <Button
            path='home.region'
            widgetConfig={{
                ...commonWidgetConfig,
                hideWhenRefreshing: true
            }}
            interview={interviewAttributes}
            user={userAttributes}
            widgetStatus={defaultWidgetStatus}
            section={''}
            startUpdateInterview={startUpdateInterviewMock}
            startAddGroupedObjects={startAddGroupedObjectsMock}
            startRemoveGroupedObjects={startRemoveGroupedObjectsMock}
            loadingState={1}
        />
    );
    expect(wrapper).toMatchSnapshot();
});

describe('Button widget: behavioral tests', () => {
    test('Button click, no modal', () => {
        const buttonWidget = mount(<Button
            path='home.region'
            section='test'
            loadingState={0}
            widgetConfig={commonWidgetConfig}
            interview={interviewAttributes}
            user={userAttributes}
            widgetStatus={defaultWidgetStatus}
            startUpdateInterview={startUpdateInterviewMock}
            startAddGroupedObjects={startAddGroupedObjectsMock}
            startRemoveGroupedObjects={startRemoveGroupedObjectsMock}
        />);

        // Find and click (with mousedown/mouseup) on the button itself and make sure the action has been called
        const button = buttonWidget.find('.button');
        button.simulate('mousedown');
        button.simulate('mouseup');

        // The next action should have been called
        buttonWidget.update();
        expect(commonWidgetConfig.action).toHaveBeenCalledTimes(1);
        expect(commonWidgetConfig.action).toHaveBeenCalledWith({
            startUpdateInterview: startUpdateInterviewMock,
            startAddGroupedObjects: startAddGroupedObjectsMock,
            startRemoveGroupedObjects: startRemoveGroupedObjectsMock
        }, interviewAttributes, 'home.region', 'test', {}, undefined);
    });

    test('Button click, with modal, confirmed', () => {
        const widgetConfig = {
            ...commonWidgetConfig,
            confirmPopup: {
                title: 'popupTitle',
                content: 'popupContent',
            },
        }
        const initialProps = {
            path: 'home.region',
            section: 'test',
            loadingState: 0,
            widgetConfig: widgetConfig,
            interview: interviewAttributes,
            user: userAttributes,
            widgetStatus: defaultWidgetStatus,
            startUpdateInterview: startUpdateInterviewMock,
            startAddGroupedObjects: startAddGroupedObjectsMock,
            startRemoveGroupedObjects: startRemoveGroupedObjectsMock,
        }
        const buttonWidget = mount(<Button
            {...initialProps}
        />);

        // Find and click (with mousedown/mouseup) on the button itself and make sure the action has been called
        const button = buttonWidget.find('.button');
        button.simulate('mousedown');
        button.simulate('mouseup');

        // The action should not have been called
        buttonWidget.update();
        expect(commonWidgetConfig.action).not.toHaveBeenCalled();

        // Find and click on the modal's confirm button
        const confirmModal = buttonWidget.find('.react-modal');
        expect(confirmModal).toMatchSnapshot();
        const confirmButton = confirmModal.findWhere(node => node.type() === 'button' && node.text() === 'Confirm');
        confirmButton.first().simulate('click');
        expect(commonWidgetConfig.action).toHaveBeenCalledTimes(1);
        expect(commonWidgetConfig.action).toHaveBeenCalledWith({
            startUpdateInterview: startUpdateInterviewMock,
            startAddGroupedObjects: startAddGroupedObjectsMock,
            startRemoveGroupedObjects: startRemoveGroupedObjectsMock
        }, interviewAttributes, 'home.region', 'test', {}, undefined);
    });

    test('Button click, with modal, cancelled', () => {
        const widgetConfig = {
            ...commonWidgetConfig,
            confirmPopup: {
                title: 'popupTitle',
                content: 'popupContent',
            },
        }
        const initialProps = {
            path: 'home.region',
            section: 'test',
            loadingState: 0,
            widgetConfig: widgetConfig,
            interview: interviewAttributes,
            user: userAttributes,
            widgetStatus: defaultWidgetStatus,
            startUpdateInterview: startUpdateInterviewMock,
            startAddGroupedObjects: startAddGroupedObjectsMock,
            startRemoveGroupedObjects: startRemoveGroupedObjectsMock,
        }
        const buttonWidget = mount(<Button
            {...initialProps}
        />);

        // Find and click (with mousedown/mouseup) on the button itself and make sure the action has been called
        const button = buttonWidget.find('.button');
        button.simulate('mousedown');
        button.simulate('mouseup');

        // The action should not have been called
        buttonWidget.update();
        expect(commonWidgetConfig.action).not.toHaveBeenCalled();

        // Find and click on the modal's cancel button
        const confirmModal = buttonWidget.find('.react-modal');
        expect(confirmModal).toMatchSnapshot();
        const cancelButton = confirmModal.findWhere(node => node.type() === 'button' && node.text() === 'Cancel');
        cancelButton.first().simulate('click');
        expect(commonWidgetConfig.action).not.toHaveBeenCalled();
    });

    test('With loading state and mouse downed and hideWhenRefreshing to true', () => {
        // Create the original widget
        const widgetConfig = {
            ...commonWidgetConfig,
            hideWhenRefreshing: true
        }
        const initialProps = {
            path: 'home.region',
            section: 'test',
            loadingState: 0,
            widgetConfig: widgetConfig,
            interview: interviewAttributes,
            user: userAttributes,
            widgetStatus: defaultWidgetStatus,
            startUpdateInterview: startUpdateInterviewMock,
            startAddGroupedObjects: startAddGroupedObjectsMock,
            startRemoveGroupedObjects: startRemoveGroupedObjectsMock,
        }
        const buttonWidget = mount(<Button
            {...initialProps}
        />);

        // Simulate the mousedown
        const button = buttonWidget.find('.button');
        button.simulate('mousedown');

        // Update the props to set the loading state to 1 in the meantime
        buttonWidget.setProps({
            ...initialProps,
            loadingState: 1
        });
        buttonWidget.update();

        // Decrement the loading state to 0 again, it should trigger the action
        buttonWidget.setProps({
            ...initialProps,
            loadingState: 0
        });
        buttonWidget.update();
        expect(commonWidgetConfig.action).toHaveBeenCalledTimes(1);
        expect(commonWidgetConfig.action).toHaveBeenCalledWith({
            startUpdateInterview: startUpdateInterviewMock,
            startAddGroupedObjects: startAddGroupedObjectsMock,
            startRemoveGroupedObjects: startRemoveGroupedObjectsMock
        }, interviewAttributes, 'home.region', 'test', {}, undefined);
    });
});