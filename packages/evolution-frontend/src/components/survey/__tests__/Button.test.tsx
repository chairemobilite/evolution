/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _cloneDeep from 'lodash/cloneDeep';
// import required even if unused
import React from 'react';
import each from 'jest-each';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

import { runtimeInterviewAttributes } from '../../inputs/__tests__/interviewData';
import Button from '../Button';
import { ButtonWidgetConfig, InterviewUpdateCallbacks, WidgetStatus } from 'evolution-common/lib/services/questionnaire/types';

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

const commonWidgetConfig: ButtonWidgetConfig = {
    type: 'button' as const,
    label: 'label',
    action: jest.fn()
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

const startUpdateInterviewMock = jest.fn();
const startAddGroupedObjectsMock = jest.fn();
const startRemoveGroupedObjectsMock = jest.fn();
const startNavigateMock = jest.fn();

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

        const { container } = render(
            <Button
                path='home.region'
                widgetConfig={widgetConfig}
                interview={runtimeInterviewAttributes}
                user={userAttributes}
                widgetStatus={defaultWidgetStatus}
                section={''}
                startUpdateInterview={startUpdateInterviewMock}
                startAddGroupedObjects={startAddGroupedObjectsMock}
                startRemoveGroupedObjects={startRemoveGroupedObjectsMock}
                startNavigate={startNavigateMock}
                loadingState={0}
            />
        );
        expect(container).toMatchSnapshot();
    });

    test('Widget accessibility', async () => {
        const { container } = render(
            <Button
                path='home.region'
                widgetConfig={widgetConfig}
                interview={runtimeInterviewAttributes}
                user={userAttributes}
                widgetStatus={defaultWidgetStatus}
                section={''}
                startUpdateInterview={startUpdateInterviewMock}
                startAddGroupedObjects={startAddGroupedObjectsMock}
                startRemoveGroupedObjects={startRemoveGroupedObjectsMock}
                startNavigate={startNavigateMock}
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
    const { container } = render(
        <Button
            path='home.region'
            widgetConfig={commonWidgetConfig}
            interview={runtimeInterviewAttributes}
            user={userAttributes}
            widgetStatus={widgetStatus}
            section={''}
            startUpdateInterview={startUpdateInterviewMock}
            startAddGroupedObjects={startAddGroupedObjectsMock}
            startRemoveGroupedObjects={startRemoveGroupedObjectsMock}
            startNavigate={startNavigateMock}
            loadingState={0}
        />
    );
    expect(container).toMatchSnapshot();
});

test('Widget loading, should be disabled', () => {
    // Set hideWhenRefreshing to true and loadingState to 1
    const { container } = render(
        <Button
            path='home.region'
            widgetConfig={{
                ...commonWidgetConfig,
                hideWhenRefreshing: true
            }}
            interview={runtimeInterviewAttributes}
            user={userAttributes}
            widgetStatus={defaultWidgetStatus}
            section={''}
            startUpdateInterview={startUpdateInterviewMock}
            startAddGroupedObjects={startAddGroupedObjectsMock}
            startRemoveGroupedObjects={startRemoveGroupedObjectsMock}
            startNavigate={startNavigateMock}
            loadingState={1}
        />
    );
    expect(container).toMatchSnapshot();
});

describe('Button widget: behavioral tests', () => {
    test('Button click, no modal', async () => {
        render(<Button
            path='home.region'
            section='test'
            loadingState={0}
            widgetConfig={commonWidgetConfig}
            interview={runtimeInterviewAttributes}
            user={userAttributes}
            widgetStatus={defaultWidgetStatus}
            startUpdateInterview={startUpdateInterviewMock}
            startAddGroupedObjects={startAddGroupedObjectsMock}
            startRemoveGroupedObjects={startRemoveGroupedObjectsMock}
            startNavigate={startNavigateMock}
        />);
        const user = userEvent.setup();

        // Find and click (with mousedown/mouseup) on the button itself and make sure the action has been called
        expect(screen.getByRole('button')).toBeInTheDocument();
        await user.click(screen.getByRole('button'));

        // The next action should have been called
        expect(commonWidgetConfig.action).toHaveBeenCalledTimes(1);
        expect(commonWidgetConfig.action).toHaveBeenCalledWith({
            startUpdateInterview: expect.any(Function),
            startAddGroupedObjects: startAddGroupedObjectsMock,
            startRemoveGroupedObjects: startRemoveGroupedObjectsMock,
            startNavigate: expect.any(Function)
        }, runtimeInterviewAttributes, 'home.region', 'test', {}, undefined);
    });

    test('Button click, adding user action', async () => {
        const testValuesByPath = { testPath: 'testvalue' };
        // Call the startUpdateInterview, it should add the user action
        const actionFunction: ButtonWidgetConfig['action'] = jest.fn().mockImplementation((callbacks: InterviewUpdateCallbacks, _i, _p, section) => {
            callbacks.startUpdateInterview({ sectionShortname: section, valuesByPath: testValuesByPath });
        });
        const widgetConfig = {
            ...commonWidgetConfig,
            action: actionFunction
        }
        render(<Button
            path='home.region'
            section='test'
            loadingState={0}
            widgetConfig={widgetConfig}
            interview={runtimeInterviewAttributes}
            user={userAttributes}
            widgetStatus={defaultWidgetStatus}
            startUpdateInterview={startUpdateInterviewMock}
            startAddGroupedObjects={startAddGroupedObjectsMock}
            startRemoveGroupedObjects={startRemoveGroupedObjectsMock}
            startNavigate={startNavigateMock}
        />);
        const user = userEvent.setup();

        // Find and click (with mousedown/mouseup) on the button itself and make sure the action has been called
        expect(screen.getByRole('button')).toBeInTheDocument();
        await user.click(screen.getByRole('button'));

        // The next action should have been called
        expect(actionFunction).toHaveBeenCalledTimes(1);
        expect(actionFunction).toHaveBeenCalledWith({
            startUpdateInterview: expect.any(Function),
            startAddGroupedObjects: startAddGroupedObjectsMock,
            startRemoveGroupedObjects: startRemoveGroupedObjectsMock,
            startNavigate: expect.any(Function)
        }, runtimeInterviewAttributes, 'home.region', 'test', {}, undefined);
        expect(startUpdateInterviewMock).toHaveBeenCalledTimes(1);
        expect(startUpdateInterviewMock).toHaveBeenCalledWith({
            sectionShortname: 'test',
            valuesByPath: testValuesByPath,
            userAction: {
                type: 'buttonClick',
                buttonId: 'home.region'
            }
        }, undefined);
    });

    test('Button click, with modal, confirmed', async () => {
        const modalTitle = 'popupTitle';
        const widgetConfig = {
            ...commonWidgetConfig,
            confirmPopup: {
                title: modalTitle,
                content: 'popupContent',
            },
        }
        const initialProps = {
            path: 'home.region',
            section: 'test',
            loadingState: 0,
            widgetConfig: widgetConfig,
            interview: runtimeInterviewAttributes,
            user: userAttributes,
            widgetStatus: defaultWidgetStatus,
            startUpdateInterview: startUpdateInterviewMock,
            startAddGroupedObjects: startAddGroupedObjectsMock,
            startRemoveGroupedObjects: startRemoveGroupedObjectsMock,
            startNavigate: startNavigateMock
        }
        render(<Button
            {...initialProps}
        />);
        const user = userEvent.setup();

        // Find and click on the button itself and make sure the action has been called
        expect(screen.getByRole('button')).toBeInTheDocument();
        await user.click(screen.getByRole('button'));

        // The action should not have been called and there should be a modal
        expect(commonWidgetConfig.action).not.toHaveBeenCalled();

        // Find and click on the modal's cancel button
        const confirmModal = await screen.findByLabelText(modalTitle);
        expect(confirmModal).toBeInTheDocument();
        await user.click(screen.getByText('Confirm'));

        // The action should have been called
        expect(commonWidgetConfig.action).toHaveBeenCalledTimes(1);
        expect(commonWidgetConfig.action).toHaveBeenCalledWith({
            startUpdateInterview: expect.any(Function),
            startAddGroupedObjects: startAddGroupedObjectsMock,
            startRemoveGroupedObjects: startRemoveGroupedObjectsMock,
            startNavigate: expect.any(Function)
        }, runtimeInterviewAttributes, 'home.region', 'test', {}, undefined);
    });

    test('Button click, with modal, cancelled', async () => {
        const modalTitle = 'popupTitle';
        const widgetConfig = {
            ...commonWidgetConfig,
            confirmPopup: {
                title: modalTitle,
                content: 'popupContent',
            },
        }
        const initialProps = {
            path: 'home.region',
            section: 'test',
            loadingState: 0,
            widgetConfig: widgetConfig,
            interview: runtimeInterviewAttributes,
            user: userAttributes,
            widgetStatus: defaultWidgetStatus,
            startUpdateInterview: expect.any(Function),
            startAddGroupedObjects: startAddGroupedObjectsMock,
            startRemoveGroupedObjects: startRemoveGroupedObjectsMock,
            startNavigate: startNavigateMock
        }
        render(<Button
            {...initialProps}
        />);
        const user = userEvent.setup();

        // Find and click on the button itself and make sure the action has been called
        expect(screen.getByRole('button')).toBeInTheDocument();
        const button = screen.getByRole('button');
        fireEvent.mouseDown(button);
        fireEvent.mouseUp(button);

        // The action should not have been called and there should be a modal
        expect(commonWidgetConfig.action).not.toHaveBeenCalled();

        // Find and click on the modal's cancel button
        const confirmModal = await screen.findByLabelText(modalTitle);
        expect(confirmModal).toMatchSnapshot();
        await user.click(screen.getByText('Cancel'));

        // The action should not have been called
        expect(commonWidgetConfig.action).not.toHaveBeenCalled();
    });

    test('With loading state and mouse downed and hideWhenRefreshing to true', async () => {
        // Create the original widget
        const widgetConfig = {
            ...commonWidgetConfig,
            hideWhenRefreshing: true
        };
        const initialProps = {
            path: 'home.region',
            section: 'test',
            loadingState: 0,
            widgetConfig: widgetConfig,
            interview: runtimeInterviewAttributes,
            user: userAttributes,
            widgetStatus: defaultWidgetStatus,
            startUpdateInterview: expect.any(Function),
            startAddGroupedObjects: startAddGroupedObjectsMock,
            startRemoveGroupedObjects: startRemoveGroupedObjectsMock,
            startNavigate: startNavigateMock
        };
        const { rerender } = render(<Button
            {...initialProps}
        />);

        // Find and click on the button itself and make sure the action has been called
        expect(screen.getByRole('button')).toBeInTheDocument();
        const button = screen.getByRole('button');
        // Simulate the mousedown
        fireEvent.mouseDown(button);

        rerender(<Button
            {...initialProps}
            loadingState = {1}
        />);
        expect(commonWidgetConfig.action).not.toHaveBeenCalled();

        // Decrement the loading state to 0 again, it should trigger the action
        rerender(<Button
            {...initialProps}
            loadingState = {0}
        />);
        expect(commonWidgetConfig.action).toHaveBeenCalledTimes(1);
        expect(commonWidgetConfig.action).toHaveBeenCalledWith({
            startUpdateInterview: expect.any(Function),
            startAddGroupedObjects: startAddGroupedObjectsMock,
            startRemoveGroupedObjects: startRemoveGroupedObjectsMock,
            startNavigate: expect.any(Function)
        }, runtimeInterviewAttributes, 'home.region', 'test', {}, undefined);
    });
});