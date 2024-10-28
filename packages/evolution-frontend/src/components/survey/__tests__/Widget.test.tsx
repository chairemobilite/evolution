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

import { interviewAttributes } from '../../inputs/__tests__/interviewData.test';
import { Widget, InGroupWidget } from '../Widget';
import { WidgetStatus } from '../../../services/interviews/interview';

// Mock react-markdown and remark-gfm as they use syntax not supported by jest
jest.mock('react-markdown', () => 'Markdown');
jest.mock('remark-gfm', () => 'remark-gfm');

// Mock the react-datepicker files to avoid jest compilation errors in imported files
jest.mock('react-datepicker/dist/react-datepicker.css', () => {});
// Mock the react-input-range files to avoid jest compilation errors in imported files
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

const testWidgetShortname = 'test';
const testNextWidgetShortname = 'testNext';
const commonWidgetConfig = {
    type: 'question' as const,
    twoColumns: true,
    path: 'myTestPath',
    containsHtml: true,
    label: {
        fr: 'Texte en français',
        en: 'English text'
    }
};
const mockedContext = { sections: {}, widgets: { [testWidgetShortname]: {}, [testNextWidgetShortname]: commonWidgetConfig }, devMode: false, dispath: jest.fn()};
jest.mock('../../hoc/WithSurveyContextHoc', () => ({
    withSurveyContext: (Component) => (props) => <Component {...props} surveyContext={mockedContext}/> 
}));

const mockComponent = (props, name) => (
    <div>
        Mocked {name} Widget: 
        path: {props.path}
        customPath: {props.customPath}
        section: {props.section}
        loadingState: {props.loadingState}
        widgetConfig: {JSON.stringify(props.widgetConfig)}
        widgetStatus: {JSON.stringify(props.widgetStatus)}
        join: {props.join === true ? 'true' : 'false'}
        {name === 'Group' && (
            <>
                shortname: {props.shortname}
                parentObjectIds: {JSON.stringify(props.parentObjectIds)}
                errors: {props.errors ? JSON.stringify(props.errors) : undefined}
            </>
        )}
    </div>
);

// Mock the Question component
jest.mock('../Question', () => jest.fn((props) => mockComponent(props, 'Question')));

// Mock the Text component
jest.mock('../Text', () => jest.fn((props) => mockComponent(props, 'Text')));

// Mock the Button component
jest.mock('../Button', () => jest.fn((props) => mockComponent(props, 'Button')));

// Mock the InfoMap component
jest.mock('../InfoMap', () => jest.fn((props) => mockComponent(props, 'InfoMap')));

// Mock the Group component
jest.mock('../GroupWidgets', () => ({
    Group: jest.fn((props) => mockComponent(props, 'Group'))
}));

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

const groupWidgetStatus: WidgetStatus = {
    ..._cloneDeep(defaultWidgetStatus),
    path: 'myGroupPath'
};

const frontendInterviewAttributes = {
    ...interviewAttributes,
    previousWidgets: {},
    previousGroups: {},
    widgets: {
        [testWidgetShortname]: _cloneDeep(defaultWidgetStatus),
        [testNextWidgetShortname]: _cloneDeep(defaultWidgetStatus)
    },
    groups: {
        myGroup: {
            myGroupId: {
                [testWidgetShortname]: _cloneDeep(groupWidgetStatus),
                [testNextWidgetShortname]: _cloneDeep(groupWidgetStatus)
            }
        }
    },
    visibleWidgets: [],
    allWidgetsValid: true
};

each([
    ['Text', { type: 'text', text: 'test text' }],
    ['InfoMap', { type: 'infoMap', title: 'info map title', geojsons: () => {} }],
    ['Button', { type: 'button', action: jest.fn(), label: 'test button label' }],
    ['Question', { type: 'question', path: 'test', label: 'test question', inputType: 'string' }],
    ['Question with custom path', { type: 'question', path: 'test', customPath: 'test.custom', label: 'test question', inputType: 'string' }],
    ['Question with join', { type: 'question', path: 'test', label: 'test question', inputType: 'string', joinWith: testNextWidgetShortname }],
    ['Group', { type: 'group', path: 'test', widgets: [testNextWidgetShortname] }],
    ['undefined', undefined]
]).describe('Widget of type %s', (_widget, widgetConfig) => {

    test('Render widget', () => {
        // Set the widget config in the context. Has to be in the test, since
        // it's a shared variable and otherwise it's racy with other tests
        mockedContext.widgets[testWidgetShortname] = widgetConfig;

        // What to check in snapshots
        // Expected path: should be the one specified in the widget, otherwise prefixed with "Test."
        // Expected section: Test
        // Expected widget status: should be the one with path as "myTestPath"
        // For groups, the additional parameters should be present but empty

        const wrapper = TestRenderer.create(
            <Widget
                currentWidgetShortname={testWidgetShortname}
                nextWidgetShortname={testNextWidgetShortname}
                sectionName='Test'
                interview={frontendInterviewAttributes}
                loadingState={0}
                errors={{}}
                user={userAttributes}
                startUpdateInterview={jest.fn()}
                startAddGroupedObjects={jest.fn()}
                startRemoveGroupedObjects={jest.fn()}
            />
        );
        expect(wrapper).toMatchSnapshot();
    });

    test('Render in group widget', () => {
        // Set the widget config in the context. Has to be in the test, since
        // it's a shared variable and otherwise it's racy with other tests
        mockedContext.widgets[testWidgetShortname] = widgetConfig;
        const groupedShortname = 'myGroupName';

        // What to check in snapshots
        // Expected path: should be prefixed with groupPath.uuid.groupName for widgets with a path specified, otherwise prefixed with "myGroupName."
        // Expected section: myGroupName
        // Expected widget status: should be the one with path as "myGroupPath"
        // For groups, the additional parameters should match what is sent here

        const wrapper = TestRenderer.create(
            <InGroupWidget
                currentWidgetShortname={testWidgetShortname}
                nextWidgetShortname={testNextWidgetShortname}
                sectionName={groupedShortname}
                interview={frontendInterviewAttributes}
                loadingState={0}
                errors={{}}
                user={userAttributes}
                startUpdateInterview={jest.fn()}
                startAddGroupedObjects={jest.fn()}
                startRemoveGroupedObjects={jest.fn()}
                widgetStatusPath='groups.myGroup.myGroupId'
                pathPrefix='groupPath.uuid.groupName'
                groupedObjectId='myGroupId'
                parentObjectIds={{[groupedShortname]: 'myGroupId'}}
            />
        );
        expect(wrapper).toMatchSnapshot();
    });

});

describe('With server errors', () => {

    test('Render Question with server error', () => {
        // In the snapshot, expect the widget status to have the extra server error in it
        const questionWidgetConfig = {
            type: 'question',
            path: 'test',
            label: 'test question',
            inputType: 'string'
        };
        mockedContext.widgets[testWidgetShortname] = questionWidgetConfig;

        const wrapper = TestRenderer.create(
            <Widget
                currentWidgetShortname={testWidgetShortname}
                nextWidgetShortname={testNextWidgetShortname}
                sectionName='Test'
                interview={frontendInterviewAttributes}
                loadingState={0}
                errors={{
                    [testWidgetShortname]: 'Server error message'
                }}
                user={userAttributes}
                startUpdateInterview={jest.fn()}
                startAddGroupedObjects={jest.fn()}
                startRemoveGroupedObjects={jest.fn()}
            />
        );
        expect(wrapper).toMatchSnapshot();
    });

    test('Render Group with server error, shoud be passed along', () => {
        // In the snapshot, expect the widget status to have the extra server
        // error in it. The errors prop should also be passed along to the Group
        // widget
        const questionWidgetConfig = { type: 'group', path: 'test', widgets: [testNextWidgetShortname] };
        mockedContext.widgets[testWidgetShortname] = questionWidgetConfig;

        const wrapper = TestRenderer.create(
            <Widget
                currentWidgetShortname={testWidgetShortname}
                nextWidgetShortname={testNextWidgetShortname}
                sectionName='Test'
                interview={frontendInterviewAttributes}
                loadingState={0}
                errors={{
                    [testWidgetShortname]: 'Server error message'
                }}
                user={userAttributes}
                startUpdateInterview={jest.fn()}
                startAddGroupedObjects={jest.fn()}
                startRemoveGroupedObjects={jest.fn()}
            />
        );
        expect(wrapper).toMatchSnapshot();

    })

});
