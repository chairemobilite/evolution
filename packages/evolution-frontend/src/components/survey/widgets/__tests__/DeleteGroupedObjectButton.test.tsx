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

import DeleteGroupedObjectButton from '../DeleteGroupedObjectButton';
import { interviewAttributes } from '../../../inputs/__tests__/interviewData.test';

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

        const wrapper = TestRenderer.create(
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
        expect(wrapper).toMatchSnapshot();
    });

});

describe('DeleteGroupedObjectButton behavior', () => {

    const path = 'persons.0'

    test('Click on button, no confirm modal', () => {
        const buttonWidget = mount(<DeleteGroupedObjectButton
            path={path}
            widgetConfig={commonWidgetConfig}
            shortname='myGroup'
            interview={interviewAttributes}
            startUpdateInterview={startUpdateInterviewMock}
            startAddGroupedObjects={startAddGroupedObjectsMock}
            startRemoveGroupedObjects={startRemoveGroupedObjectsMock}
        />);

        // Find and click on the button itself and make sure the action has been called
        const button = buttonWidget.find('.button');
        button.simulate('click');

        // The next action should have been called
        buttonWidget.update();
        expect(startRemoveGroupedObjectsMock).toHaveBeenCalledTimes(1);
        expect(startRemoveGroupedObjectsMock).toHaveBeenCalledWith(path);
    });
    
    test('Click on button, confirm modal, confirm', () => {
        const widgetConfig = {
            ...commonWidgetConfig,
            deleteConfirmPopup: {
                content: {
                    en: 'Are you sure you want to delete this item?'
                },
                title: 'Delete item',
                cancelAction: jest.fn().mockReturnValue('cancelAction'),
                containsHtml: false
            },
            showGroupedObjectDeleteButton: true
        }
        const buttonWidget = mount(<DeleteGroupedObjectButton
            path={path}
            widgetConfig={widgetConfig}
            shortname='myGroup'
            interview={interviewAttributes}
            startUpdateInterview={startUpdateInterviewMock}
            startAddGroupedObjects={startAddGroupedObjectsMock}
            startRemoveGroupedObjects={startRemoveGroupedObjectsMock}
        />);

        // Find and click on the button itself and make sure the action has been called
        const button = buttonWidget.find('.button');
        button.simulate('click');

        // The next action should have been called
        buttonWidget.update();
        expect(startRemoveGroupedObjectsMock).not.toHaveBeenCalled();

        // Find and click on the modal's confirm button
        const confirmModal = buttonWidget.find('.react-modal');
        expect(confirmModal).toMatchSnapshot();
        const confirmButton = confirmModal.findWhere(node => node.type() === 'button' && node.text() === 'Confirm');
        confirmButton.first().simulate('click');
        expect(startRemoveGroupedObjectsMock).toHaveBeenCalledTimes(1);
        expect(startRemoveGroupedObjectsMock).toHaveBeenCalledWith(path);
    });

    test('Click on button, confirm modal, cancel', () => {
        const widgetConfig = {
            ...commonWidgetConfig,
            deleteConfirmPopup: {
                content: {
                    en: 'Are you sure you want to delete this item?'
                },
                title: 'Delete item',
                cancelAction: jest.fn().mockReturnValue('cancelAction'),
                containsHtml: false
            },
            showGroupedObjectDeleteButton: true
        }
        const buttonWidget = mount(<DeleteGroupedObjectButton
            path={path}
            widgetConfig={widgetConfig}
            shortname='myGroup'
            interview={interviewAttributes}
            startUpdateInterview={startUpdateInterviewMock}
            startAddGroupedObjects={startAddGroupedObjectsMock}
            startRemoveGroupedObjects={startRemoveGroupedObjectsMock}
        />);

        // Find and click on the button itself and make sure the action has been called
        const button = buttonWidget.find('.button');
        button.simulate('click');

        // The next action should have been called
        buttonWidget.update();
        expect(startRemoveGroupedObjectsMock).not.toHaveBeenCalled();

        // Find and click on the modal's cancel button
        const confirmModal = buttonWidget.find('.react-modal');
        expect(confirmModal).toMatchSnapshot();
        const cancelButton = confirmModal.findWhere(node => node.type() === 'button' && node.text() === 'Cancel');
        cancelButton.first().simulate('click');
        expect(startRemoveGroupedObjectsMock).not.toHaveBeenCalled();
        expect(widgetConfig.deleteConfirmPopup.cancelAction).toHaveBeenCalled();
    });

    test('Click on button, conditional modal, should not be displayed', () => {
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
        const buttonWidget = mount(<DeleteGroupedObjectButton
            path={path}
            widgetConfig={widgetConfig}
            interview={interviewAttributes}
            shortname='myGroup'
            startUpdateInterview={startUpdateInterviewMock}
            startAddGroupedObjects={startAddGroupedObjectsMock}
            startRemoveGroupedObjects={startRemoveGroupedObjectsMock}
        />);

        // Find and click on the button itself and make sure the action has been called
        const button = buttonWidget.find('.button');
        button.simulate('click');

        // The conditional returned false, so the next action should be called directly
        buttonWidget.update();
        expect(widgetConfig.deleteConfirmPopup.conditional).toHaveBeenCalledTimes(1);
        expect(widgetConfig.deleteConfirmPopup.conditional).toHaveBeenCalledWith(interviewAttributes, path, undefined);
        expect(startRemoveGroupedObjectsMock).toHaveBeenCalledWith(path);
    });

    test('Click on button, conditional modal, should be displayed', () => {
        const widgetConfig = {
            ...commonWidgetConfig,
            deleteConfirmPopup: {
                content: {
                    en: 'Are you sure you want to delete this item?'
                },
                title: 'Delete item',
                cancelAction: jest.fn().mockReturnValue('cancelAction'),
                containsHtml: false,
                conditional: jest.fn().mockReturnValue(true)
            },
            showGroupedObjectDeleteButton: true
        }
        const buttonWidget = mount(<DeleteGroupedObjectButton
            path={path}
            widgetConfig={widgetConfig}
            interview={interviewAttributes}
            shortname='myGroup'
            startUpdateInterview={startUpdateInterviewMock}
            startAddGroupedObjects={startAddGroupedObjectsMock}
            startRemoveGroupedObjects={startRemoveGroupedObjectsMock}
        />);

        // Find and click on the button itself and make sure the action has been called
        const button = buttonWidget.find('.button');
        button.simulate('click');

        // The conditional returned false, so the next action should be called directly
        buttonWidget.update();
        expect(widgetConfig.deleteConfirmPopup.conditional).toHaveBeenCalledTimes(1);
        expect(widgetConfig.deleteConfirmPopup.conditional).toHaveBeenCalledWith(interviewAttributes, path, undefined);
        
        // Just make sure the react modal is there
        const confirmModal = buttonWidget.find('.react-modal');
        expect(confirmModal).toMatchSnapshot();
    });

});