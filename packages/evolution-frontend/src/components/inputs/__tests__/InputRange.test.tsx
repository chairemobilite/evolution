/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { UserInterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
import React from 'react';
import TestRenderer from 'react-test-renderer';

import InputRange from '../InputRange';

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
}

const interviewAttributes: UserInterviewAttributes = {
    id: 1,
    uuid: 'arbitrary uuid',
    user_id: 1,
    is_completed: false,
    responses: {
        section1: {
            q1: 'abc',
            q2: 3
        },
        section2: {
            q1: 'test'
        }
    },
    validations: {
        section1: {
            q1: true,
            q2: false
        },
        section2: {
            q1: true
        }
    },
    is_valid: true
};

describe('Should correctly render InputRange with minimal parameters', () => {

    const widgetConfig = {
        type: 'question' as const,
        twoColumns: true,
        path: 'test.foo',
        containsHtml: true,
        label: {
            fr: `Texte en français`,
            en: `English text`
        },
        inputType: 'slider' as const
    }

    test('Test without value', () => {
        // Should have a blank style
        const wrapper = TestRenderer.create(
            <InputRange
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
        expect(wrapper).toMatchSnapshot();
    });

    test('Test with value', () => {
        const wrapper = TestRenderer.create(
            <InputRange
                id={'test'}
                onValueChange={() => { /* nothing to do */}}
                widgetConfig={widgetConfig}
                value={10}
                inputRef={React.createRef()}
                interview={interviewAttributes}
                user={userAttributes}
                path='foo.test'
            />
        );
        expect(wrapper).toMatchSnapshot();
    });

});

describe('Should correctly render InputRange with various parameters', () => {

    const baseWidgetConfig = {
        type: 'question' as const,
        twoColumns: true,
        path: 'test.foo',
        containsHtml: true,
        label: {
            fr: `Texte en français`,
            en: `English text`
        },
        inputType: 'slider' as const
    }

    test('Test with min max range values', () => {
        const widgetConfig = Object.assign({ 
            maxValue: 40,
            minValue: 10
        }, baseWidgetConfig);
        const wrapper = TestRenderer.create(
            <InputRange
                id={'test'}
                onValueChange={() => { /* nothing to do */}}
                widgetConfig={widgetConfig}
                value={5}
                inputRef={React.createRef()}
                interview={interviewAttributes}
                user={userAttributes}
                path='foo.test'
            />
        );
        expect(wrapper).toMatchSnapshot();
    });

    test('Test trackclass and labels', () => {
        const formatLabel = jest.fn().mockImplementation((val) => `l${val}`);
        const widgetConfig = Object.assign({ 
            formatLabel,
            labels: ['unilingual text', { fr: '2e label français', en: '2nd english label' }],
            trackClassName: 'myTrackClass',
        }, baseWidgetConfig);
        const wrapper = TestRenderer.create(
            <InputRange
                id={'test'}
                onValueChange={() => { /* nothing to do */}}
                widgetConfig={widgetConfig}
                value={10}
                inputRef={React.createRef()}
                interview={interviewAttributes}
                user={userAttributes}
                path='foo.test'
            />
        );
        expect(wrapper).toMatchSnapshot();
    });

});
