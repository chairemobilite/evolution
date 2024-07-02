/*
 * Copyright 2023, Polytechnique Montreal and contributors
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
import Question from '../Question';
import { WidgetStatus } from '../../../services/interviews/interview';

// Mock react-markdown and remark-gfm as they use syntax not supported by jest
jest.mock('react-markdown', () => 'Markdown');
jest.mock('remark-gfm', () => 'remark-gfm');

// Mock the react-datepicker files to avoid jest compilation errors
jest.mock('react-datepicker/dist/react-datepicker.css', () => {});
// Mock the react-input-range files to avoid jest compilation errors
jest.mock('react-input-range/src/js/input-range/default-class-names', () => ({
    activeTrack: 'input-range__track input-range__track--active',
    disabledInputRange: 'input-range input-range--disabled',
    inputRange: 'input-range',
    labelContainer: 'input-range__label-container',
    maxLabel: 'input-range__label input-range__label--max',
    minLabel: 'input-range__label input-range__label--min',
    slider: 'input-range__slider',
    sliderContainer: 'input-range__slider-container',
    track: 'input-range__track input-range__track--background',
    valueLabel: 'input-range__label input-range__label--value',
}));

jest.mock('react-input-range/lib/css/index.css', () => {});

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
    type: 'question' as const,
    twoColumns: true,
    path: 'home.region',
    containsHtml: true,
    label: {
        fr: 'Texte en français',
        en: 'English text'
    }
};

const defaultWidgetStatus: WidgetStatus = {
    path: commonWidgetConfig.path,
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

each([
    ['InputSelect', { ...commonWidgetConfig, inputType: 'select', choices: [{ label: 'choice 1', value: 'c1' }, { label: 'choice 2', value: 'c2' }] }, 'c2'],
    ['InputRadio', { ...commonWidgetConfig, inputType: 'radio', choices: [{ label: 'choice 1', value: 'c1' }, { label: 'choice 2', value: 'c2' }] }, 'c2'],
    ['InputRadioNumber', { ...commonWidgetConfig, valueRange: { min: 1, max: 3 }, inputType: 'radioNumber', overMaxAllowed: true }, 4],
    ['InputCheckbox', { ...commonWidgetConfig, inputType: 'checkbox', choices: [{ label: 'choice 1', value: 'c1' }, { label: 'choice 2', value: 'c2' }] }, ['c2']],
    ['InputMultiselect', { ...commonWidgetConfig, inputType: 'multiselect', choices: [{ label: 'choice 1', value: 'c1' }, { label: 'choice 2', value: 'c2' }] }, 'c2'],
    ['InputButton', { ...commonWidgetConfig, inputType: 'button', choices: [{ label: 'choice 1', value: 'c1' }, { label: 'choice 2', value: 'c2' }] }, 'c2'],
    ['InputDatePicker', { ...commonWidgetConfig, inputType: 'datePicker', minDate: new Date('2023-05-01'), maxDate: new Date('2023-06-01') }, new Date('2023-05-24 10:00:00 GMT-0400')],
    ['InputRange', { ...commonWidgetConfig, inputType: 'slider', minValue: 3, maxValue: 10 }],
    ['InputText', { ...commonWidgetConfig, inputType: 'text' }, 'foo'], // This test needs a value
    ['InputString', { ...commonWidgetConfig, inputType: 'string' }],
    ['InputTime', { ...commonWidgetConfig, inputType: 'time', minTimeSecondsSinceMidnight: 3600, maxTimeSecondsSinceMidnight: 7200, minuteStep: 10 }, 3660], // This test needs a value
]).describe('Question with widget %s', (_widget, widgetConfig, value: unknown = undefined) => {

    const widgetStatus = _cloneDeep(defaultWidgetStatus);
    widgetStatus.value = value as any;

    test('Render widget', () => {

        const wrapper = TestRenderer.create(
            <Question
                path='home.region'
                section='test'
                loadingState={0}
                widgetConfig={widgetConfig}
                interview={interviewAttributes}
                user={userAttributes}
                widgetStatus={widgetStatus}
                startUpdateInterview={() => { /* Nothing to do */}}
            />
        );
        expect(wrapper).toMatchSnapshot();
    });

    test('Widget accessibility', async () => {
        const { container } = render(
            <Question
                path='home.region'
                section='test'
                loadingState={0}
                widgetConfig={widgetConfig}
                interview={interviewAttributes}
                user={userAttributes}
                widgetStatus={widgetStatus}
                startUpdateInterview={() => { /* Nothing to do */}}
            />
        );
        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });
});

describe('With help popup and link', () => {
    const helpContent = 'Help content';
    const widgetConfig = {
        ...commonWidgetConfig,
        inputType: 'string',
        helpPopup: {
            title: 'Help title',
            content: jest.fn().mockReturnValue(helpContent)
        }
    };

    test('Test widget with help', () => {
        const widgetStatus = _cloneDeep(defaultWidgetStatus);
        widgetStatus.value = 'test';

        const wrapper = TestRenderer.create(
            <Question
                path='home.region'
                section='test'
                loadingState={0}
                widgetConfig={widgetConfig as any}
                interview={interviewAttributes}
                user={userAttributes}
                widgetStatus={widgetStatus}
                startUpdateInterview={() => { /* Nothing to do */}}
            />
        );
        expect(wrapper).toMatchSnapshot();
    });

    test('Open modal', () => {
        const widgetStatus = _cloneDeep(defaultWidgetStatus);
        widgetStatus.value = 'test';

        const questionWidget = mount(<Question
            path='home.region'
            section='test'
            loadingState={0}
            widgetConfig={widgetConfig as any}
            interview={interviewAttributes}
            user={userAttributes}
            widgetStatus={widgetStatus}
            startUpdateInterview={() => { /* Nothing to do */}}
        />);

        // Find and click on the help button
        expect(widgetConfig.helpPopup.content).not.toHaveBeenCalled();
        const helpButton = questionWidget.find('.helper-popup');
        const modal = questionWidget.find('.react-modal');
        expect(modal.children().length).toEqual(0);
        expect(helpButton.getDOMNode<HTMLButtonElement>().textContent).toEqual(widgetConfig.helpPopup.title);
        helpButton.simulate('click');

        // The modal should be opened now
        questionWidget.update();
        expect(widgetConfig.helpPopup.content).toHaveBeenCalledTimes(1);
        const modalAfterClick = questionWidget.find('.react-modal');
        expect(modalAfterClick).toMatchSnapshot();

    });
});

describe('With error message', () => {
    const widgetConfig = {
        ...commonWidgetConfig,
        inputType: 'string',
    };

    test('Error message on visible widget', () => {
        const widgetStatus = _cloneDeep(defaultWidgetStatus);
        widgetStatus.errorMessage = 'error test';
        widgetStatus.isValid = false;

        const wrapper = TestRenderer.create(
            <Question
                path='home.region'
                section='test'
                loadingState={0}
                widgetConfig={widgetConfig as any}
                interview={interviewAttributes}
                user={userAttributes}
                widgetStatus={widgetStatus}
                startUpdateInterview={() => { /* Nothing to do */}}
            />
        );
        expect(wrapper).toMatchSnapshot();
    });

});

describe('With joining questions', () => {

    test('Joining next', () => {
        const widgetConfig = {
            ...commonWidgetConfig,
            inputType: 'string',
        };
        const widgetStatus = _cloneDeep(defaultWidgetStatus);

        const wrapper = TestRenderer.create(
            <Question
                path='home.region'
                section='test'
                loadingState={0}
                widgetConfig={widgetConfig as any}
                interview={interviewAttributes}
                user={userAttributes}
                widgetStatus={widgetStatus}
                startUpdateInterview={() => { /* Nothing to do */}}
                join={true}
            />
        );
        expect(wrapper).toMatchSnapshot();
    });
});

// TODO: Test with modal and other Question props
