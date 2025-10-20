/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import each from 'jest-each';

import DeleteGroupedObjectButton from '../DeleteGroupedObjectButton';
import { interviewAttributes } from '../../../inputs/__tests__/interviewData';

// Mock react-markdown and remark-gfm as they use syntax not supported by jest
jest.mock('react-markdown', () => 'Markdown');
jest.mock('remark-gfm', () => 'remark-gfm');

const commonWidgetConfig = {
    type: 'group' as const,
    path: 'household.myGroup',
    showGroupedObjectDeleteButton: true   
};

const startUpdateInterviewMock = jest.fn();
const startAddGroupedObjectsMock = jest.fn();
const startRemoveGroupedObjectsMock = jest.fn();

beforeEach(() => {
    jest.clearAllMocks();
});

each([
    ['Display with default label', commonWidgetConfig],
    ['Display with custom label', {
        ...commonWidgetConfig,
        groupedObjectDeleteButtonLabel: jest.fn().mockReturnValue('Delete for unit test')
    }],
    ['Display is false', {
        ...commonWidgetConfig,
        showGroupedObjectDeleteButton: false
    }]
]).describe('DeleteGroupedObjectButton layout: %s', (_widget, widgetConfig) => {

    test('Render widget', () => {

        const { container } = render(
            <DeleteGroupedObjectButton
                path='home.region'
                widgetConfig={widgetConfig}
                shortname='myGroup'
                interview={interviewAttributes}
                startUpdateInterview={startUpdateInterviewMock}
                startAddGroupedObjects={startAddGroupedObjectsMock}
                startRemoveGroupedObjects={startRemoveGroupedObjectsMock}
            />
        );
        expect(container).toMatchSnapshot();
    });

});

describe('DeleteGroupedObjectButton behavior', () => {

    const path = 'persons.0'

    test('Click on button, no confirm modal', async () => {
        render(<DeleteGroupedObjectButton
            path={path}
            widgetConfig={commonWidgetConfig}
            shortname='myGroup'
            interview={interviewAttributes}
            startUpdateInterview={startUpdateInterviewMock}
            startAddGroupedObjects={startAddGroupedObjectsMock}
            startRemoveGroupedObjects={startRemoveGroupedObjectsMock}
        />);
        const user = userEvent.setup();

        // Find and click on the button itself and make sure the action has been called
        expect(screen.getByRole('button')).toBeInTheDocument();
        await user.click(screen.getByRole('button'));

        // The startRemoveGroupedObjectsMock action should have been called
        expect(startRemoveGroupedObjectsMock).toHaveBeenCalledTimes(1);
        expect(startRemoveGroupedObjectsMock).toHaveBeenCalledWith(path);
    });
    
    test('Click on button, confirm modal, confirm', async () => {
        const deleteTitle = 'Delete item';
        const widgetConfig = {
            ...commonWidgetConfig,
            deleteConfirmPopup: {
                content: {
                    en: 'Are you sure you want to delete this item?'
                },
                title: deleteTitle,
                cancelAction: jest.fn().mockReturnValue('cancelAction'),
                containsHtml: false
            },
            showGroupedObjectDeleteButton: true
        }
        render(<DeleteGroupedObjectButton
            path={path}
            widgetConfig={widgetConfig}
            shortname='myGroup'
            interview={interviewAttributes}
            startUpdateInterview={startUpdateInterviewMock}
            startAddGroupedObjects={startAddGroupedObjectsMock}
            startRemoveGroupedObjects={startRemoveGroupedObjectsMock}
        />);
        const user = userEvent.setup();

        // Find and click on the button itself and make sure the action has been called
        expect(screen.getByRole('button')).toBeInTheDocument();
        await user.click(screen.getByRole('button'));

        // The startRemoveGroupedObjectsMock action should not have been called and there should be a modal
        expect(startRemoveGroupedObjectsMock).not.toHaveBeenCalled();

        // Find and click on the modal's confirm button
        const confirmModal = await screen.findByLabelText(deleteTitle);
        expect(confirmModal).toMatchSnapshot();
        await user.click(screen.getByText('Confirm'));

        // The startRemoveGroupedObjectsMock action should have been called
        expect(startRemoveGroupedObjectsMock).toHaveBeenCalledTimes(1);
        expect(startRemoveGroupedObjectsMock).toHaveBeenCalledWith(path);
    });

    test('Click on button, confirm modal, cancel', async () => {
        const deleteTitle = 'Delete item';
        const widgetConfig = {
            ...commonWidgetConfig,
            deleteConfirmPopup: {
                content: {
                    en: 'Are you sure you want to delete this item?'
                },
                title: deleteTitle,
                cancelAction: jest.fn().mockReturnValue('cancelAction'),
                containsHtml: false
            },
            showGroupedObjectDeleteButton: true
        }
        render(<DeleteGroupedObjectButton
            path={path}
            widgetConfig={widgetConfig}
            shortname='myGroup'
            interview={interviewAttributes}
            startUpdateInterview={startUpdateInterviewMock}
            startAddGroupedObjects={startAddGroupedObjectsMock}
            startRemoveGroupedObjects={startRemoveGroupedObjectsMock}
        />);
        const user = userEvent.setup();

        // Find and click on the button itself and make sure the action has been called
        expect(screen.getByRole('button')).toBeInTheDocument();
        await user.click(screen.getByRole('button'));

        // The startRemoveGroupedObjectsMock action should not have been called and there should be a modal
        expect(startRemoveGroupedObjectsMock).not.toHaveBeenCalled();

        // Find and click on the modal's cancel button
        const confirmModal = await screen.findByLabelText(deleteTitle);
        expect(confirmModal).toMatchSnapshot();
        await user.click(screen.getByText('Cancel'));

        // The startRemoveGroupedObjectsMock action should not have been called
        expect(startRemoveGroupedObjectsMock).not.toHaveBeenCalled();
    });

    test('Click on button, conditional modal, should not be displayed', async () => {
        const widgetConfig = {
            ...commonWidgetConfig,
            deleteConfirmPopup: {
                content: {
                    en: 'Are you sure you want to delete this item?'
                },
                title: 'Delete item',
                cancelAction: jest.fn().mockReturnValue('cancelAction'),
                containsHtml: false,
                conditional: jest.fn().mockReturnValue(false)
            },
            showGroupedObjectDeleteButton: true
        }
        render(<DeleteGroupedObjectButton
            path={path}
            widgetConfig={widgetConfig}
            interview={interviewAttributes}
            shortname='myGroup'
            startUpdateInterview={startUpdateInterviewMock}
            startAddGroupedObjects={startAddGroupedObjectsMock}
            startRemoveGroupedObjects={startRemoveGroupedObjectsMock}
        />);
        const user = userEvent.setup();

        // Find and click on the button itself and make sure the action has been called
        expect(screen.getByRole('button')).toBeInTheDocument();
        await user.click(screen.getByRole('button'));

        // The conditional returned false, so the startRemoveGroupedObjectsMock action should be called directly
        expect(widgetConfig.deleteConfirmPopup.conditional).toHaveBeenCalledTimes(1);
        expect(widgetConfig.deleteConfirmPopup.conditional).toHaveBeenCalledWith(interviewAttributes, path, undefined);
        expect(startRemoveGroupedObjectsMock).toHaveBeenCalledWith(path);
    });

    test('Click on button, conditional modal, should be displayed', async () => {
        const deleteTitle = 'Delete item';
        const widgetConfig = {
            ...commonWidgetConfig,
            deleteConfirmPopup: {
                content: {
                    en: 'Are you sure you want to delete this item?'
                },
                title: deleteTitle,
                cancelAction: jest.fn().mockReturnValue('cancelAction'),
                containsHtml: false,
                conditional: jest.fn().mockReturnValue(true)
            },
            showGroupedObjectDeleteButton: true
        }
        render(<DeleteGroupedObjectButton
            path={path}
            widgetConfig={widgetConfig}
            interview={interviewAttributes}
            shortname='myGroup'
            startUpdateInterview={startUpdateInterviewMock}
            startAddGroupedObjects={startAddGroupedObjectsMock}
            startRemoveGroupedObjects={startRemoveGroupedObjectsMock}
        />);
        const user = userEvent.setup();

        // Find and click on the button itself and make sure the action has been called
        expect(screen.getByRole('button')).toBeInTheDocument();
        await user.click(screen.getByRole('button'));

        // The startRemoveGroupedObjectsMock action should not have been called and there should be a modal
        expect(startRemoveGroupedObjectsMock).not.toHaveBeenCalled();

        // Find the modal
        const confirmModal = await screen.findByLabelText(deleteTitle);
        expect(confirmModal).toMatchSnapshot();
    });

});