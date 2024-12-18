/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import React from 'react';
import { render } from '@testing-library/react';

import InputDatePicker from '../InputDatePicker';
import MockDate from 'mockdate';
import { interviewAttributes } from './interviewData.test';

MockDate.set(new Date(1659633411000));

// Mock the react-datepicker files to avoid jest compilation errors
jest.mock('react-datepicker/dist/react-datepicker.css', () => {});

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

// TODO These do not test the datepicker data itself, it's just the input
describe('Should correctly render InputDatePicker with minimal parameters', () => {

    const widgetConfig = {
        type: 'question' as const,
        twoColumns: true,
        path: 'test.foo',
        containsHtml: true,
        label: {
            fr: `Texte en français`,
            en: `English text`
        },
        inputType: 'datePicker' as const
    }

    test('Test without value', () => {
        // Should have a blank style
        const { container } = render(
            <InputDatePicker
                id={'test'}
                onValueChange={() => { /* nothing to do */}}
                widgetConfig={widgetConfig}
                value={undefined}
                inputRef={React.createRef()}
                interview={interviewAttributes}
                user={userAttributes}
                path='foo.test'
            />
        );
        expect(container).toMatchSnapshot();
    });

    test('Test with value', () => {
        const { container } = render(
            <InputDatePicker
                id={'test'}
                onValueChange={() => { /* nothing to do */}}
                widgetConfig={widgetConfig}
                value={'2022-08-10T12:00:00.000Z'}
                inputRef={React.createRef()}
                interview={interviewAttributes}
                user={userAttributes}
                path='foo.test'
            />
        );
        expect(container).toMatchSnapshot();
    });

});

describe('Should correctly render InputDatePicker with various parameters', () => {
    
    const baseWidgetConfig = {
        type: 'question' as const,
        twoColumns: true,
        path: 'test.foo',
        containsHtml: true,
        label: {
            fr: `Texte en français`,
            en: `English text`
        },
        inputType: 'datePicker' as const
    }

    test('Test with min max date values', () => {
        const mockMinDate = jest.fn().mockReturnValue(new Date('2022-12-10'));
        const widgetConfig = Object.assign({ 
            maxDate: new Date('2022-08-10'),
            minDate: mockMinDate
        }, baseWidgetConfig);
        const { container } = render(
            <InputDatePicker
                id={'test'}
                onValueChange={() => { /* nothing to do */}}
                widgetConfig={widgetConfig}
                value={'2022-11-11T12:00:00.000Z'}
                inputRef={React.createRef()}
                interview={interviewAttributes}
                user={userAttributes}
                path='foo.test'
            />
        );
        expect(container).toMatchSnapshot();
        expect(mockMinDate).toHaveBeenCalledTimes(1);
    });

    test('Test time, placeholder labels and locale', () => {
        const widgetConfig = Object.assign({ 
            showTimeSelect: true,
            placeholderText: 'click',
            locale: { fr: 'fr', en: 'en-CA' },
        }, baseWidgetConfig);
        const { container } = render(
            <InputDatePicker
                id={'test'}
                onValueChange={() => { /* nothing to do */}}
                widgetConfig={widgetConfig}
                value={undefined}
                inputRef={React.createRef()}
                interview={interviewAttributes}
                user={userAttributes}
                path='foo.test'
            />
        );
        expect(container).toMatchSnapshot();
    });

});
