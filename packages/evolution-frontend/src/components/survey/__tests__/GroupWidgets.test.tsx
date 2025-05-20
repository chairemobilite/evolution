/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

import { Group, GroupedObject } from '../GroupWidgets';
import each from 'jest-each';
import { interviewAttributes } from '../../inputs/__tests__/interviewData.test';
import { UserRuntimeInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';

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

// Add widgets to the survey context
const widgets = {
    widgetText: {
        type: 'text' as const,
        text: 'This is a text widget'
    },
    widgetQuestion: {
        type: 'question' as const,
        path: 'quest',
        label: 'Test Question Label',
        inputType: 'string' as const
    },
};
const nestedGroupWidget = {
    widgetGroups: {
        type: 'group' as const,
        path: 'myNestedGroups',
        widgets: Object.keys(widgets),
        title: 'Nested group title',
        name: jest.fn().mockImplementation((_t, _obj, seq) => `Nested object at index ${seq}`),
    }
}
const surveyContext = { widgets: { ...widgets, ...nestedGroupWidget } };
const path = 'myGroups';
const commonWidgetConfig = {
    type: 'group' as const,
    path,
    widgets: Object.keys(widgets)
};

// Mock the HOC
jest.mock('../../hoc/WithSurveyContextHoc', () => ({
    withSurveyContext: (Component: React.ComponentType) => (props: any) => <Component {...props} surveyContext={surveyContext} />
}));

// Mock data and functions
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
const startUpdateInterviewMock = jest.fn();
const startAddGroupedObjectsMock = jest.fn();
const startRemoveGroupedObjectsMock = jest.fn();

// Add some grouped object data in the interview
const interview = _cloneDeep(interviewAttributes) as UserRuntimeInterviewAttributes;
const groupedObjectIds = [ 'obj0Uuid', 'obj1Uuid', 'obj2Uuid' ];
interview.response.myGroups = {
    [groupedObjectIds[0]]: {
        _uuid: groupedObjectIds[0],
        _sequence: 0,
        quest: 'Some answer'
    },
    [groupedObjectIds[1]]: {
        _uuid: groupedObjectIds[1],
        _sequence: 1,
        quest: 'Some other answer'
    },
    [groupedObjectIds[2]]: {
        _uuid: groupedObjectIds[2],
        _sequence: 2
    }
};
// Make all widgets visible
(interview as any).groups = {
    myGroup: {
        [groupedObjectIds[0]]: {
            widgetText: { isVisible: true },
            widgetQuestion: { isVisible: true, value: interview.response.myGroups[groupedObjectIds[0]].quest }
        },
        [groupedObjectIds[1]]: {
            widgetText: { isVisible: true },
            widgetQuestion: { isVisible: true, value: interview.response.myGroups[groupedObjectIds[1]].quest }
        },
        [groupedObjectIds[2]]: {
            widgetText: { isVisible: true },
            widgetQuestion: { isVisible: true, value: interview.response.myGroups[groupedObjectIds[2]].quest }
        }
    }
}

describe('Group', () => {

    each([
        ['Default values', commonWidgetConfig],
        ['All values set, all true, add button default data, filter show all', {
            ...commonWidgetConfig,
            showTitle: true,
            title: 'Group Title',
            name: jest.fn().mockImplementation((_t, _obj, seq) => `Grouped object at index ${seq}`),
            conditional: true,
            groupedObjectConditional: true,
            showGroupedObjectAddButton: jest.fn().mockReturnValue(true),
            groupedObjectAddButtonLabel: jest.fn().mockReturnValue('Add a new grouped object in my group'),
            showGroupedObjectDeleteButton: jest.fn().mockReturnValue(true),
            groupedObjectDeleteButtonLabel: jest.fn().mockReturnValue('Delete this grouped object from my group'),
            addButtonLocation: 'both',
            addButtonSize: 'small',
            filter: jest.fn().mockImplementation((interview, objects) => objects)
        }],
        ['All values set, false when possible', {
            ...commonWidgetConfig,
            showTitle: false,
            title: 'Group Title',
            name: jest.fn().mockImplementation((_t, _obj, seq) => `Grouped object at index ${seq}`),
            conditional: true,
            groupedObjectConditional: true,
            showGroupedObjectAddButton: jest.fn().mockReturnValue(false),
            groupedObjectAddButtonLabel: jest.fn().mockReturnValue('Add a new grouped object in my group'),
            showGroupedObjectDeleteButton: jest.fn().mockReturnValue(false),
            groupedObjectDeleteButtonLabel: jest.fn().mockReturnValue('Delete this grouped object from my group'),
            addButtonLocation: 'both',
            addButtonSize: 'small',
            filter: jest.fn().mockImplementation((interview, objects) => objects)
        }],
        ['With object filter, show even sequenced objects', {
            ...commonWidgetConfig,
            name: jest.fn().mockImplementation((_t, _obj, seq) => `Grouped object at index ${seq}`),
            filter: jest.fn().mockImplementation((interview, objects) => {
                const retObjects = {};
                Object.keys(objects).forEach((key) => {
                    if (objects[key]._sequence % 2 === 0) {
                        retObjects[key] = objects[key];
                    }
                });
                return retObjects;
            })
        }],
        ['With grouped object conditional filter, show only object 1', {
            ...commonWidgetConfig,
            name: jest.fn().mockImplementation((_t, _obj, seq) => `Grouped object at index ${seq}`),
            groupedObjectConditional: jest.fn().mockImplementation((interview, path: string) => path.includes(groupedObjectIds[1]) === true)
        }],
        ['Add button top, default label, medium', {
            ...commonWidgetConfig,
            showGroupedObjectAddButton: jest.fn().mockReturnValue(true),
            addButtonLocation: 'top',
            addButtonSize: 'small'
        }],
        ['Conditional false, should not display', {
            conditional: jest.fn().mockReturnValue(false)
        }]
    ]).describe('%s', (_widget, widgetConfig) => {
    
        test('Render widget', () => {
    
            const { container } = render(
                <Group
                    path={'myGroups'}
                    widgetConfig={widgetConfig}
                    interview={interview}
                    user={userAttributes}
                    shortname={'myGroup'}
                    section={''}
                    startUpdateInterview={startUpdateInterviewMock}
                    startAddGroupedObjects={startAddGroupedObjectsMock}
                    startRemoveGroupedObjects={startRemoveGroupedObjectsMock}
                    loadingState={0}
                    parentObjectIds={{}}
                />
            );
            expect(container).toMatchSnapshot();
        });
    
        test('Widget accessibility', async () => {
            const { container } = render(
                <Group
                    path={'myGroups'}
                    widgetConfig={widgetConfig}
                    interview={interview}
                    user={userAttributes}
                    shortname={'myGroup'}
                    section={''}
                    startUpdateInterview={startUpdateInterviewMock}
                    startAddGroupedObjects={startAddGroupedObjectsMock}
                    startRemoveGroupedObjects={startRemoveGroupedObjectsMock}
                    loadingState={0}
                    parentObjectIds={{}}
                />
            );
            const results = await axe(container);
            expect(results).toHaveNoViolations();
        });
    });

    test('Nested groups, should display widgets with right path', () => {
        const interviewWithNested = _cloneDeep(interviewAttributes) as UserRuntimeInterviewAttributes;
        const groupedObjectIds = [ 'obj0Uuid', 'obj1Uuid', 'obj2Uuid' ];
        const nestedGroupObjectIds = [ 'nestedObj0Uuid', 'nestedObj1Uuid' ];
        interviewWithNested.response.myGroups = {
            [groupedObjectIds[0]]: {
                _uuid: groupedObjectIds[0],
                _sequence: 0,
                myNestedGroups: {
                    [nestedGroupObjectIds[0]]: {
                        _uuid: nestedGroupObjectIds[0],
                        _sequence: 0,
                        quest: 'Some answer'
                    },
                    [nestedGroupObjectIds[1]]: {
                        _uuid: nestedGroupObjectIds[1],
                        _sequence: 1,
                        quest: 'Some other answer'
                    }
                }
            },
            [groupedObjectIds[1]]: {
                _uuid: groupedObjectIds[1],
                _sequence: 1,
                widgetGroup: {}
            },
            [groupedObjectIds[2]]: {
                _uuid: groupedObjectIds[2],
                _sequence: 2
            }
        };
        // Make all widgets visible
        (interviewWithNested as any).groups = {
            myGroups: {
                [groupedObjectIds[0]]: {
                    widgetGroup: { isVisible: true }
                },
                [groupedObjectIds[1]]: {
                    widgetGroup: { isVisible: true }
                },
                [groupedObjectIds[2]]: {
                    widgetGroup: { isVisible: true }
                }
            },
            widgetGroups: {
                [nestedGroupObjectIds[0]]: {
                    widgetText: { isVisible: true },
                    widgetQuestion: { isVisible: true, value: interviewWithNested.response.myGroups[groupedObjectIds[0]].myNestedGroups[nestedGroupObjectIds[0]].quest }
                },
                [nestedGroupObjectIds[1]]: {
                    widgetText: { isVisible: true },
                    widgetQuestion: { isVisible: true, value: interviewWithNested.response.myGroups[groupedObjectIds[0]].myNestedGroups[nestedGroupObjectIds[1]].quest }
                }
            }
        }

        // Group with nested group widgetConfig
        const widgetConfig = {
            type: 'group' as const,
            path,
            shortname: 'myGroup',
            widgets: Object.keys(nestedGroupWidget),
            name: jest.fn().mockImplementation((_t, _obj, seq) => `Grouped object at index ${seq}`),
        };

        const { container } = render(
            <Group
                path={'myGroups'}
                widgetConfig={widgetConfig}
                interview={interviewWithNested}
                user={userAttributes}
                shortname={'myGroup'}
                section={''}
                startUpdateInterview={startUpdateInterviewMock}
                startAddGroupedObjects={startAddGroupedObjectsMock}
                startRemoveGroupedObjects={startRemoveGroupedObjectsMock}
                loadingState={0}
                parentObjectIds={{}}
            />
        );
        expect(container).toMatchSnapshot();
    })

});

describe('Grouped Object', () => {

    each([
        ['Default values', commonWidgetConfig],
        ['All values set, all true, add button default label, filter show all', {
            ...commonWidgetConfig,
            showTitle: true,
            title: 'Group Title',
            name: jest.fn().mockImplementation((_t, _obj, seq) => `Grouped object at index ${seq}`),
            conditional: true,
            groupedObjectConditional: true,
            showGroupedObjectAddButton: jest.fn().mockReturnValue(true),
            groupedObjectAddButtonLabel: jest.fn().mockReturnValue('Add a new grouped object in my group'),
            showGroupedObjectDeleteButton: jest.fn().mockReturnValue(true),
            groupedObjectDeleteButtonLabel: jest.fn().mockReturnValue('Delete this grouped object from my group'),
            addButtonLocation: 'both',
            addButtonSize: 'small',
            filter: jest.fn().mockImplementation((interview, objects) => objects)
        }],
        ['All values set, add/delete button false', {
            ...commonWidgetConfig,
            showTitle: false,
            title: 'Group Title',
            name: jest.fn().mockImplementation((_t, _obj, seq) => `Grouped object at index ${seq}`),
            conditional: true,
            groupedObjectConditional: true,
            showGroupedObjectAddButton: jest.fn().mockReturnValue(false),
            groupedObjectAddButtonLabel: jest.fn().mockReturnValue('Add a new grouped object in my group'),
            showGroupedObjectDeleteButton: jest.fn().mockReturnValue(false),
            groupedObjectDeleteButtonLabel: jest.fn().mockReturnValue('Delete this grouped object from my group'),
            addButtonLocation: 'both',
            addButtonSize: 'small',
            filter: jest.fn().mockImplementation((interview, objects) => objects)
        }]
    ]).describe('%s', (_widget, widgetConfig) => {

        const groupedObjectPath = `${path}.${groupedObjectIds[0]}`;
    
        test('Render widget', () => {
    
            const { container } = render(
                <GroupedObject
                    path={groupedObjectPath}
                    widgetConfig={widgetConfig}
                    interview={interview}
                    user={userAttributes}
                    shortname={'myGroup'}
                    section={''}
                    startUpdateInterview={startUpdateInterviewMock}
                    startAddGroupedObjects={startAddGroupedObjectsMock}
                    startRemoveGroupedObjects={startRemoveGroupedObjectsMock}
                    loadingState={0}
                    parentObjectIds={{}}
                    objectId={groupedObjectIds[0]}
                    sequence={0}
                />
            );
            expect(container).toMatchSnapshot();
        });
    
        test('Widget accessibility', async () => {
            const { container } = render(
                <GroupedObject
                    path={groupedObjectPath}
                    widgetConfig={widgetConfig}
                    interview={interview}
                    user={userAttributes}
                    shortname={'myGroup'}
                    section={''}
                    startUpdateInterview={startUpdateInterviewMock}
                    startAddGroupedObjects={startAddGroupedObjectsMock}
                    startRemoveGroupedObjects={startRemoveGroupedObjectsMock}
                    loadingState={0}
                    parentObjectIds={{}}
                    objectId={groupedObjectIds[0]}
                    sequence={0}
                />
            );
            const results = await axe(container);
            expect(results).toHaveNoViolations();
        });
    });

});