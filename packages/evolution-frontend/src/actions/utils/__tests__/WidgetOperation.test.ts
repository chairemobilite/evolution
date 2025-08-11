/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _cloneDeep from 'lodash/cloneDeep';
import { prepareSectionWidgets } from '../WidgetOperation';
import { setApplicationConfiguration } from 'chaire-lib-frontend/lib/config/application.config';
import { UserRuntimeInterviewAttributes, WidgetStatus } from 'evolution-common/lib/services/questionnaire/types';
import { UserInterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import { checkConditional, checkChoicesConditional } from '../Conditional';
import { checkValidations } from '../Validation';

const testUser = {
    id: 1,
    username: 'test',
    preferences: { },
    serializedPermissions: [],
    isAuthorized: jest.fn(),
    is_admin: false,
    pages: [],
    showUserInfo: true
};

jest.mock('../Conditional', () => ({
    checkConditional: jest.fn().mockReturnValue([true, undefined, undefined]),
    checkChoicesConditional: jest.fn().mockReturnValue([true, undefined])
}));
const mockedCheckConditional = checkConditional as jest.MockedFunction<typeof checkConditional>;
const mockedCheckChoicesConditional = checkChoicesConditional as jest.MockedFunction<typeof checkChoicesConditional>;
jest.mock('../Validation', () => ({
    checkValidations: jest.fn().mockReturnValue([true, undefined])
}));
const mockedCheckValidations = checkValidations as jest.MockedFunction<typeof checkValidations>;

// Prepare sections and widget configurations
const mainSection = 'testSection';
const choiceSection = 'choiceSection';
const groupSection = 'groupSection';
const group1Name = 'group1Name';
const sections = {
    [mainSection]: {
        widgets: ['widget1', 'widget2']
    },
    [groupSection]: {
        widgets: [group1Name]
    },
    [choiceSection]: {
        widgets: ['widget4']
    },
};

const widgets = {
    widget1: {
        type: 'question',
        inputType: 'string',
        label: { en: 'q1 label' },
        path: 'section1.q1',
    },
    widget2: {
        type: 'question',
        inputType: 'string',
        path: 'section1.q2',
        label: { en: 'q2 label' },
        validations: jest.fn()
    },
    widget3: {
        type: 'question',
        inputType: 'string',
        path: 'gq1',
        label: { en: 'q3 label' },
        defaultValue: jest.fn().mockReturnValue('default')
    },
    widget4: {
        type: 'question',
        inputType: 'select',
        path: 'section1.q4',
        label: { en: 'q4 label' },
        validations: jest.fn(),
        choices: [
            { value: 'a', label: {}, conditional: () => true },
            { value: 'b', label: {}, conditional: () => false }
        ]
    },
    [group1Name]: {
        type: 'group',
        path: 'groupResponse',
        widgets: ['widget3']
    }
};
const mockedDefaultValue = widgets.widget3.defaultValue as jest.MockedFunction<any>;

// Prepare test interview attributes
const group1Id = 'group1Id';
const group2Id = 'group2Id';

const interviewAttributes: UserInterviewAttributes = {
    id: 1,
    uuid: 'arbitrary uuid',
    participant_id: 1,
    is_completed: false,
    response: {
        section1: {
            q1: 'abc',
            q2: 3
        },
        groupResponse: {
            [group1Id]: {
                _uuid: group1Id,
                gq1: 'test'
            },
            [group2Id]: {
                _uuid: group2Id
            }
        }
    } as any,
    validations: {
        section1: {
            q1: true,
            q2: true
        },
        groupResponse: {
            [group1Id]: {
                gq1: true
            },
            [group2Id]: {
                gq1: true
            }
        }
    } as any,
    is_valid: true,
};
const runtimeInterviewAttributes: UserRuntimeInterviewAttributes = {
    ...interviewAttributes,
    widgets: {},
    groups: {},
    allWidgetsValid: true,
    previousGroups: {},
    previousWidgets: {},
    visibleWidgets: []
};

/**
 * Common properties for widget status: visible, valid and responded widget,
 * without custom value. Each test will override the necessary properties
 */
const commonDefaultWidgetStatus: WidgetStatus = {
    path: 'to.set.in.test',
    customPath: undefined,
    isVisible: true,
    isDisabled: false,
    isCollapsed: false,
    isEmpty: false,
    isCustomEmpty: true,
    isValid: true,
    isResponded: true,
    isCustomResponded: false,
    errorMessage: undefined,
    groupedObjectId: undefined,
    value: 'to.set.in.test',
    customValue: undefined,
    currentUpdateKey: 0
};

beforeEach(() => {
    setApplicationConfiguration({ sections, widgets });
    jest.clearAllMocks();
});

test('Test widget preparation, without prior status', () => {
    // Prepare test data, without widget status at first
    const newValue = 'newValue';
    const testInterviewAttributes = _cloneDeep(runtimeInterviewAttributes);
    testInterviewAttributes.response.section1.q1 = newValue;
    const valuesByPath = { 'response.section1.q1': newValue };

    // Prepare expected interview, with the new value for q1
    const expectedInterview = _cloneDeep(interviewAttributes) as any;
    expectedInterview.response.section1.q1 = newValue;

    // Test, 2 widgets should be valid and visible
    const { updatedInterview, updatedValuesByPath, needUpdate } = prepareSectionWidgets(mainSection, testInterviewAttributes, { 'response.section1.q1': true }, _cloneDeep(valuesByPath));

    // Interview data should correspond to expected
    expect(updatedInterview).toEqual(expect.objectContaining(expectedInterview));
    expect(updatedValuesByPath).toEqual(valuesByPath);
    expect(needUpdate).toEqual(false);

    // Check calls of the validation function, should have been called only for the widget 2, as widget 1 has previous status and is unchanged
    expect(mockedCheckValidations).toHaveBeenCalledTimes(2);
    expect(mockedCheckValidations).toHaveBeenCalledWith(undefined, newValue, undefined, testInterviewAttributes, 'section1.q1', undefined);
    expect(mockedCheckValidations).toHaveBeenCalledWith(widgets.widget2.validations, runtimeInterviewAttributes.response.section1.q2, undefined, testInterviewAttributes, 'section1.q2', undefined);

    // Check calls to the conditional function, called twice, once for each widget
    expect(mockedCheckConditional).toHaveBeenCalledTimes(2);
    expect(mockedCheckConditional).toHaveBeenCalledWith(undefined, testInterviewAttributes, 'section1.q1', undefined);
    expect(mockedCheckConditional).toHaveBeenCalledWith(undefined, testInterviewAttributes, 'section1.q2', undefined);
    expect(mockedCheckChoicesConditional).not.toHaveBeenCalled();

    // Check widget statuses for the 2 widgets
    expect(updatedInterview.widgets.widget1).toEqual({
        ...commonDefaultWidgetStatus,
        path: 'section1.q1',
        value: newValue
    });
    expect(updatedInterview.widgets.widget2).toEqual({
        ...commonDefaultWidgetStatus,
        path: 'section1.q2',
        value: runtimeInterviewAttributes.response.section1.q2
    });
    expect(Object.keys(updatedInterview.widgets)).toEqual(['widget1', 'widget2']);

    // Check the visible widgets and the allWidgetsValid flag
    expect(updatedInterview.visibleWidgets).toEqual(['section1.q1', 'section1.q2']);
    expect(updatedInterview.allWidgetsValid).toEqual(true);
});

describe('Test with previous status', () => {

    // Prepare previous widget statuses
    const previousWidgetStatuses = {
        widget1: {
            ...commonDefaultWidgetStatus,
            path: 'section1.q1',
            value: runtimeInterviewAttributes.response.section1.q1
        },
        widget2: {
            ...commonDefaultWidgetStatus,
            path: 'section1.q2',
            value: runtimeInterviewAttributes.response.section1.q2
        }
    };

    test('Only affected widgets should be checked, no change in validity or visibility', () => {
        // Prepare test data, change q2 value
        const newValue = 2;
        const testInterviewAttributes = _cloneDeep(runtimeInterviewAttributes);
        testInterviewAttributes.response.section1.q2 = newValue;
        const valuesByPath = { 'response.section1.q2': 2 };
        // Set statuses before update
        testInterviewAttributes.widgets = _cloneDeep(previousWidgetStatuses);

        // Prepare expected interview
        const interviewCopy = _cloneDeep(interviewAttributes) as any;
        interviewCopy.response.section1.q2 = newValue;

        // Test, the 2 widgets should still be valid and visible
        const { updatedInterview, updatedValuesByPath, needUpdate } = prepareSectionWidgets(mainSection, testInterviewAttributes, { 'response.section1.q2': true }, _cloneDeep(valuesByPath));

        // Interview data should correspond to expected
        expect(updatedInterview).toEqual(expect.objectContaining(interviewCopy));
        expect(updatedValuesByPath).toEqual(valuesByPath);
        expect(needUpdate).toEqual(false);

        // Check calls of the validation function, should have been called only for the widget 2, as widget 1 has previous status and is unchanged
        expect(mockedCheckValidations).toHaveBeenCalledTimes(1);
        expect(mockedCheckValidations).toHaveBeenCalledWith(widgets.widget2.validations, newValue, undefined, testInterviewAttributes, 'section1.q2', undefined);

        // Check calls to the conditional function, called twice, once for each widget
        expect(mockedCheckConditional).toHaveBeenCalledTimes(2);
        expect(mockedCheckConditional).toHaveBeenCalledWith(undefined, testInterviewAttributes, 'section1.q1', undefined);
        expect(mockedCheckConditional).toHaveBeenCalledWith(undefined, testInterviewAttributes, 'section1.q2', undefined);

        // Widget statuses should match previous ones (no change)
        expect(updatedInterview.widgets).toEqual({
            widget1: previousWidgetStatuses.widget1,
            widget2: {
                ...previousWidgetStatuses.widget2,
                value: newValue
            }
        });

        // Check the visible widgets and the allWidgetsValid flag
        expect(updatedInterview.visibleWidgets).toEqual(['section1.q1', 'section1.q2']);
        expect(updatedInterview.allWidgetsValid).toEqual(true);
    });

    test('Only affected widgets should be checked, change in validity', () => {
        // Prepare test data, changing q2
        const newValue = 2;
        const testInterviewAttributes = _cloneDeep(runtimeInterviewAttributes);
        (testInterviewAttributes as any).response.section1.q2 = newValue;
        const valuesByPath = { 'response.section1.q2': newValue };
        // Set statuses before update
        testInterviewAttributes.widgets = _cloneDeep(previousWidgetStatuses);

        // Prepare expected interview
        const expectedInterview = _cloneDeep(interviewAttributes) as any;
        expectedInterview.response.section1.q2 = newValue;
        expectedInterview.validations.section1.q2 = false;

        // Let the validation function return `false`
        const errorMessage = 'error';
        mockedCheckValidations.mockReturnValueOnce([false, errorMessage]);

        // Test, both widgets should be visible, only widget 1 is valid
        const { updatedInterview, updatedValuesByPath, needUpdate } = prepareSectionWidgets(mainSection, testInterviewAttributes, { 'response.section1.q2': true }, _cloneDeep(valuesByPath));

        // Interview data should correspond to expected
        expect(updatedInterview).toEqual(expect.objectContaining(expectedInterview));
        expect(updatedValuesByPath).toEqual(Object.assign({}, valuesByPath, { 'validations.section1.q2': false }));
        expect(needUpdate).toEqual(false);

        // Check calls of the validation function, should have been called only for the widget 2, as widget 1 has previous status and is unchanged
        expect(mockedCheckValidations).toHaveBeenCalledTimes(1);
        expect(mockedCheckValidations).toHaveBeenCalledWith(widgets.widget2.validations, newValue, undefined, testInterviewAttributes, 'section1.q2', undefined);

        // Check calls to the conditional function, called twice, once for each widget
        expect(mockedCheckConditional).toHaveBeenCalledTimes(2);
        expect(mockedCheckConditional).toHaveBeenCalledWith(undefined, testInterviewAttributes, 'section1.q1', undefined);
        expect(mockedCheckConditional).toHaveBeenCalledWith(undefined, testInterviewAttributes, 'section1.q2', undefined);

        // Widget statuses should match previous ones (no change)
        expect(updatedInterview.widgets).toEqual({
            widget1: previousWidgetStatuses.widget1,
            widget2: {
                ...previousWidgetStatuses.widget2,
                isValid: false,
                errorMessage,
                value: newValue
            }
        });

        // Check the visible widgets and the allWidgetsValid flag
        expect(updatedInterview.visibleWidgets).toEqual(['section1.q1', 'section1.q2']);
        expect(updatedInterview.allWidgetsValid).toEqual(false);

    });

    test('Check all widgets if "_all" is affected', () => {
        // Prepare test data, no changes
        const testInterviewAttributes = _cloneDeep(runtimeInterviewAttributes);
        const valuesByPath = { };
        // Set statuses before update
        testInterviewAttributes.widgets = _cloneDeep(previousWidgetStatuses);

        // Prepare expected interview
        const expectedInterview = _cloneDeep(interviewAttributes) as any;
        expectedInterview.validations.section1.q1 = false;

        // Let the validation function return `false` for widget 1
        const errorMessage = 'error';
        mockedCheckValidations.mockReturnValueOnce([false, errorMessage]);

        // Test, the 2 widgets should be visible, widget1 is invalid
        const { updatedInterview, updatedValuesByPath, needUpdate } = prepareSectionWidgets(mainSection, testInterviewAttributes, { '_all': true }, _cloneDeep(valuesByPath));

        // Interview data should correspond to expected
        expect(updatedInterview).toEqual(expect.objectContaining(expectedInterview));
        expect(updatedValuesByPath).toEqual(Object.assign({}, valuesByPath, { 'validations.section1.q1': false }));
        expect(needUpdate).toEqual(false);

        // Check calls of the validation function, should have been called for all widgets
        expect(mockedCheckValidations).toHaveBeenCalledTimes(2);
        expect(mockedCheckValidations).toHaveBeenCalledWith(undefined, interviewAttributes.response.section1.q1, undefined, testInterviewAttributes, 'section1.q1', undefined);
        expect(mockedCheckValidations).toHaveBeenCalledWith(widgets.widget2.validations, interviewAttributes.response.section1.q2, undefined, testInterviewAttributes, 'section1.q2', undefined);

        // Check calls to the conditional function, called twice, once for each widget
        expect(mockedCheckConditional).toHaveBeenCalledTimes(2);
        expect(mockedCheckConditional).toHaveBeenCalledWith(undefined, testInterviewAttributes, 'section1.q1', undefined);
        expect(mockedCheckConditional).toHaveBeenCalledWith(undefined, testInterviewAttributes, 'section1.q2', undefined);

        // Widget statuses should match previous ones (no change)
        expect(updatedInterview.widgets).toEqual({
            widget1:  {
                ...previousWidgetStatuses.widget1,
                isValid: false,
                errorMessage,
                isCustomResponded: true // FIXME Really? What does it mean? There is no custom value, but the code sets it to true
            },
            widget2: {
                ...previousWidgetStatuses.widget2,
                isCustomResponded: true
            }
        });

        // Check the visible widgets and the allWidgetsValid flag
        expect(updatedInterview.visibleWidgets).toEqual(['section1.q1', 'section1.q2']);
        expect(updatedInterview.allWidgetsValid).toEqual(false);

    });

    test('Should set widget status if previous path does not match current one', () => {
        // Prepare test data: override previous status for widget1 with a different path
        const testInterviewAttributes = _cloneDeep(runtimeInterviewAttributes);
        const previousStatuses = _cloneDeep(previousWidgetStatuses);
        previousStatuses.widget1.path = 'not.the.same.path';
        previousStatuses.widget1.value = 'previous value of other path';
        testInterviewAttributes.widgets = previousStatuses;

        // Test, the 2 widgets should still be valid and visible
        const { updatedInterview, updatedValuesByPath, needUpdate } = prepareSectionWidgets(mainSection, testInterviewAttributes, { 'response.section1.q2': true }, {});

        // Interview data should correspond to expected
        expect(updatedInterview).toEqual(expect.objectContaining(interviewAttributes));
        expect(updatedValuesByPath).toEqual({});
        expect(needUpdate).toEqual(false);

        // Check calls of the validation function, should have been called for both widget: widget 2 because it is affected and widget 1 because it does not have a proper previous status.
        expect(mockedCheckValidations).toHaveBeenCalledTimes(2);
        expect(mockedCheckValidations).toHaveBeenCalledWith(undefined, interviewAttributes.response.section1.q1, undefined, testInterviewAttributes, 'section1.q1', undefined);
        expect(mockedCheckValidations).toHaveBeenCalledWith(widgets.widget2.validations, interviewAttributes.response.section1.q2, undefined, testInterviewAttributes, 'section1.q2', undefined);

        // Check calls to the conditional function, called twice, once for each widget
        expect(mockedCheckConditional).toHaveBeenCalledTimes(2);
        expect(mockedCheckConditional).toHaveBeenCalledWith(undefined, testInterviewAttributes, 'section1.q1', undefined);
        expect(mockedCheckConditional).toHaveBeenCalledWith(undefined, testInterviewAttributes, 'section1.q2', undefined);

        // Widget statuses should have been updated and match the one specified in the test, not the previous ones from the interview
        expect(updatedInterview.widgets).toEqual({
            widget1: previousWidgetStatuses.widget1,
            widget2: previousWidgetStatuses.widget2
        });

        // Check the visible widgets and the allWidgetsValid flag
        expect(updatedInterview.visibleWidgets).toEqual(['section1.q1', 'section1.q2']);
        expect(updatedInterview.allWidgetsValid).toEqual(true);
    });

});

describe('Test with conditional', () => {
    test('Change in widget1, make widget2 invisible and empty', () => {

        // Prepare test data
        const newValue = 2;
        const testInterviewAttributes = _cloneDeep(runtimeInterviewAttributes);
        (testInterviewAttributes as any).response.section1.q1 = newValue;
        const valuesByPath = { 'response.section1.q1': newValue };

        // Prepare previous widget statuses
        const previousWidgetStatuses = {
            widget1: {
                ...commonDefaultWidgetStatus,
                path: 'section1.q1',
                value: testInterviewAttributes.response.section1.q1
            },
            widget2: {
                ...commonDefaultWidgetStatus,
                path: 'section1.q2',
                value: runtimeInterviewAttributes.response.section1.q2
            }
        };
        testInterviewAttributes.widgets = _cloneDeep(previousWidgetStatuses);

        // Prepare expected interview
        const expectedInterview = _cloneDeep(interviewAttributes) as any;
        expectedInterview.response.section1.q1 = newValue;
        expectedInterview.response.section1.q2 = undefined;
        expectedInterview.validations.section1.q2 = true;

        // Let the conditional function return `false` for widget 2
        // First call for widget 1, second call is for widget 2
        mockedCheckConditional.mockReturnValueOnce([true, undefined, undefined]);
        mockedCheckConditional.mockReturnValueOnce([false, undefined, undefined]);

        // Test, widget 2 should be invisible and empty, widget 1 should be visible and valid
        const { updatedInterview, updatedValuesByPath, needUpdate } = prepareSectionWidgets(mainSection, testInterviewAttributes, { 'response.section1.q1': true }, _cloneDeep(valuesByPath));

        // Interview data should correspond to expected
        expect(updatedInterview).toEqual(expect.objectContaining(expectedInterview));
        expect(updatedValuesByPath).toEqual(Object.assign({}, valuesByPath, { 'response.section1.q2': undefined }));
        expect(needUpdate).toEqual(true);

        // Check calls of the validation function, should have been called for both widgets and their new values
        expect(mockedCheckValidations).toHaveBeenCalledTimes(2);
        expect(mockedCheckValidations).toHaveBeenCalledWith(undefined, newValue, undefined, testInterviewAttributes, 'section1.q1', undefined);
        expect(mockedCheckValidations).toHaveBeenCalledWith(widgets.widget2.validations, undefined, undefined, testInterviewAttributes, 'section1.q2', undefined);

        // Check calls to the conditional function, called twice, once for each widget
        expect(mockedCheckConditional).toHaveBeenCalledTimes(2);
        expect(mockedCheckConditional).toHaveBeenCalledWith(undefined, testInterviewAttributes, 'section1.q1', undefined);
        expect(mockedCheckConditional).toHaveBeenCalledWith(undefined, testInterviewAttributes, 'section1.q2', undefined);

        // Widget statuses should match previous ones (no change)
        expect(updatedInterview.widgets).toEqual({
            widget1: previousWidgetStatuses.widget1,
            widget2: {
                ...previousWidgetStatuses.widget2,
                isValid: true,
                isVisible: false,
                isEmpty: true,
                value: undefined
            }
        });

        // Check the visible widgets and the allWidgetsValid flag
        expect(updatedInterview.visibleWidgets).toEqual(['section1.q1']);
        expect(updatedInterview.allWidgetsValid).toEqual(true);

    });

    test('Change in widget1, make widget2 invisible with default value', () => {

        // Prepare test data
        const newValue = 2;
        const widget2DefaultValue = 'defaultValue';
        const testInterviewAttributes = _cloneDeep(runtimeInterviewAttributes);
        (testInterviewAttributes as any).response.section1.q1 = newValue;
        const valuesByPath = { 'response.section1.q1': newValue };

        // Prepare previous widget statuses
        const previousWidgetStatuses = {
            widget1: {
                ...commonDefaultWidgetStatus,
                path: 'section1.q1',
                value: testInterviewAttributes.response.section1.q1
            },
            widget2: {
                ...commonDefaultWidgetStatus,
                path: 'section1.q2',
                value: runtimeInterviewAttributes.response.section1.q2
            }
        };
        testInterviewAttributes.widgets = _cloneDeep(previousWidgetStatuses);

        // Prepare expected interview
        const expectedInterview = _cloneDeep(interviewAttributes) as any;
        expectedInterview.response.section1.q1 = newValue;
        expectedInterview.response.section1.q2 = widget2DefaultValue;
        expectedInterview.validations.section1.q2 = true;

        // Let the conditional function return `false` for widget 2 with a default value
        // First call for widget 1, second call is for widget 2

        mockedCheckConditional.mockReturnValueOnce([true, undefined, undefined]);
        mockedCheckConditional.mockReturnValueOnce([false, widget2DefaultValue, undefined]);

        // Test, widget 2 should be invisible and empty, widget 1 should be visible and valid
        const { updatedInterview, updatedValuesByPath, needUpdate } = prepareSectionWidgets(mainSection, testInterviewAttributes, { 'response.section1.q1': true }, _cloneDeep(valuesByPath));

        // Interview data should correspond to expected
        expect(updatedInterview).toEqual(expect.objectContaining(expectedInterview));
        expect(updatedValuesByPath).toEqual(Object.assign({}, valuesByPath, { 'response.section1.q2': widget2DefaultValue }));
        expect(needUpdate).toEqual(true);

        // Check calls of the validation function, should have been called for both widgets and their new values
        expect(mockedCheckValidations).toHaveBeenCalledTimes(2);
        expect(mockedCheckValidations).toHaveBeenCalledWith(undefined, newValue, undefined, testInterviewAttributes, 'section1.q1', undefined);
        expect(mockedCheckValidations).toHaveBeenCalledWith(widgets.widget2.validations, widget2DefaultValue, undefined, testInterviewAttributes, 'section1.q2', undefined);

        // Check calls to the conditional function, called twice, once for each widget
        expect(mockedCheckConditional).toHaveBeenCalledTimes(2);
        expect(mockedCheckConditional).toHaveBeenCalledWith(undefined, testInterviewAttributes, 'section1.q1', undefined);
        expect(mockedCheckConditional).toHaveBeenCalledWith(undefined, testInterviewAttributes, 'section1.q2', undefined);

        // Widget statuses should match previous ones (no change)
        expect(updatedInterview.widgets).toEqual({
            widget1: previousWidgetStatuses.widget1,
            widget2: {
                ...previousWidgetStatuses.widget2,
                isValid: true,
                isVisible: false,
                isEmpty: false,
                value: widget2DefaultValue
            }
        });

        // Check the visible widgets and the allWidgetsValid flag
        expect(updatedInterview.visibleWidgets).toEqual(['section1.q1']);
        expect(updatedInterview.allWidgetsValid).toEqual(true);

    });
});

describe('Test a group widget', () => {

    test('Initial group widget preparation, no previous status', () => {
        const g2DefaultValue = 'default';
        // Prepare test data, without widget status at first, make the value of gq1 in group 2 undefined, so it will set the default value
        const testInterviewAttributes = _cloneDeep(runtimeInterviewAttributes);
        testInterviewAttributes.response.groupResponse[group2Id].gq1 = undefined;
        const valuesByPath = { };

        // Prepare expected interview, with the new value for gq1 of group2
        const expectedInterview = _cloneDeep(interviewAttributes) as any;
        expectedInterview.response.groupResponse[group2Id].gq1 = g2DefaultValue;

        // Make default value function return the default value
        mockedDefaultValue.mockReturnValueOnce(g2DefaultValue);

        // Test, 2 widgets should be valid and visible
        const { updatedInterview, updatedValuesByPath, needUpdate } = prepareSectionWidgets(groupSection, testInterviewAttributes, { }, _cloneDeep(valuesByPath));

        // Interview data should correspond to expected
        expect(updatedInterview).toEqual(expect.objectContaining(expectedInterview));
        expect(updatedValuesByPath).toEqual(Object.assign({ 'response.groupResponse.group2Id.gq1': g2DefaultValue }, valuesByPath));
        expect(needUpdate).toEqual(true);

        // Check calls of the validation function, should have been called for the widget of each group
        expect(mockedCheckValidations).toHaveBeenCalledTimes(2);
        expect(mockedCheckValidations).toHaveBeenCalledWith(undefined, interviewAttributes.response.groupResponse[group1Id].gq1, undefined, testInterviewAttributes, `groupResponse.${group1Id}.gq1`, undefined);
        expect(mockedCheckValidations).toHaveBeenCalledWith(undefined, g2DefaultValue, undefined, testInterviewAttributes, `groupResponse.${group2Id}.gq1`, undefined);

        // Check calls to the conditional function, called twice, once for each widget
        expect(mockedCheckConditional).toHaveBeenCalledTimes(2);
        expect(mockedCheckConditional).toHaveBeenCalledWith(undefined, testInterviewAttributes, `groupResponse.${group1Id}.gq1`, undefined);
        expect(mockedCheckConditional).toHaveBeenCalledWith(undefined, testInterviewAttributes, `groupResponse.${group2Id}.gq1`, undefined);
        expect(mockedCheckChoicesConditional).not.toHaveBeenCalled();
        expect(mockedDefaultValue).toHaveBeenCalledTimes(1);

        // Check widget statuses for the widget, for each group
        expect(updatedInterview.widgets).toEqual({});
        expect(updatedInterview.groups[group1Name][group1Id].widget3).toEqual({
            ...commonDefaultWidgetStatus,
            path: `groupResponse.${group1Id}.gq1`,
            value: interviewAttributes.response.groupResponse[group1Id].gq1,
            groupedObjectId: group1Id
        });
        // Visible value was updated, so the updateKey is incremented
        expect(updatedInterview.groups[group1Name][group2Id].widget3).toEqual({
            ...commonDefaultWidgetStatus,
            path: `groupResponse.${group2Id}.gq1`,
            value: g2DefaultValue,
            groupedObjectId: group2Id,
            currentUpdateKey: 1
        });

        // Check the visible widgets and the allWidgetsValid flag
        expect(updatedInterview.visibleWidgets).toEqual([`groupResponse.${group1Id}.gq1`, `groupResponse.${group2Id}.gq1`]);
        expect(updatedInterview.allWidgetsValid).toEqual(true);

    });

    test('With previous status and change in group 1', () => {
        // Prepare test data, with values for both groups, but adding a new value for group 1
        const newValue = 'newValue';
        const valueInGroup2 = 'group 2 value';
        const testInterviewAttributes = _cloneDeep(runtimeInterviewAttributes);
        testInterviewAttributes.response.groupResponse[group1Id].gq1 = newValue;
        testInterviewAttributes.response.groupResponse[group2Id].gq1 = valueInGroup2;
        const valuesByPath = { 'response.groupResponse.group1Id.gq1': newValue };

        // Prepare previous widget statuses
        const previousWidgetStatuses = {
            [group1Id]: {
                widget3: {
                    ...commonDefaultWidgetStatus,
                    path: 'groupResponse.group1Id.gq1',
                    value: 'any previous value',
                    groupedObjectId: group1Id
                },
            },
            [group2Id]: {
                widget3: {
                    ...commonDefaultWidgetStatus,
                    path: 'groupResponse.group2Id.gq1',
                    value: valueInGroup2,
                    groupedObjectId: group2Id
                }
            }
        };
        testInterviewAttributes.groups = { [group1Name]: _cloneDeep(previousWidgetStatuses) };

        // Prepare expected interview, with the new value for gq1 of group 1
        const expectedInterview = _cloneDeep(interviewAttributes) as any;
        expectedInterview.response.groupResponse[group2Id].gq1 = valueInGroup2;
        expectedInterview.response.groupResponse[group1Id].gq1 = newValue;

        // Test, 2 widgets should be valid and visible
        const { updatedInterview, updatedValuesByPath, needUpdate } = prepareSectionWidgets(groupSection, testInterviewAttributes, { 'response.groupResponse.group1Id.gq1': true }, _cloneDeep(valuesByPath));

        // Interview data should correspond to expected
        expect(updatedInterview).toEqual(expect.objectContaining(expectedInterview));
        expect(updatedValuesByPath).toEqual(valuesByPath);
        expect(needUpdate).toEqual(false);

        // Check calls of the validation function, should have been called only for the widget in group 1
        expect(mockedCheckValidations).toHaveBeenCalledTimes(1);
        expect(mockedCheckValidations).toHaveBeenCalledWith(undefined, newValue, undefined, testInterviewAttributes, `groupResponse.${group1Id}.gq1`, undefined);

        // Check calls to the conditional function, called twice, once for each widget
        expect(mockedCheckConditional).toHaveBeenCalledTimes(2);
        expect(mockedCheckConditional).toHaveBeenCalledWith(undefined, testInterviewAttributes, `groupResponse.${group1Id}.gq1`, undefined);
        expect(mockedCheckConditional).toHaveBeenCalledWith(undefined, testInterviewAttributes, `groupResponse.${group2Id}.gq1`, undefined);
        expect(mockedCheckChoicesConditional).not.toHaveBeenCalled();
        expect(mockedDefaultValue).not.toHaveBeenCalled();

        // Check widget statuses for the widget, for each group
        expect(updatedInterview.widgets).toEqual({});
        expect(updatedInterview.groups[group1Name][group1Id].widget3).toEqual({
            ...commonDefaultWidgetStatus,
            path: `groupResponse.${group1Id}.gq1`,
            value: newValue,
            groupedObjectId: group1Id
        });
        expect(updatedInterview.groups[group1Name][group2Id].widget3).toEqual({
            ...commonDefaultWidgetStatus,
            path: `groupResponse.${group2Id}.gq1`,
            value: valueInGroup2,
            groupedObjectId: group2Id
        });

        // Check the visible widgets and the allWidgetsValid flag
        expect(updatedInterview.visibleWidgets).toEqual([`groupResponse.${group1Id}.gq1`, `groupResponse.${group2Id}.gq1`]);
        expect(updatedInterview.allWidgetsValid).toEqual(true);
    });

});

test('Test simple widget data with update key', () => {

    // Prepare test data, without widget status at first
    const newValue = 'newValue';
    const testInterviewAttributes = _cloneDeep(runtimeInterviewAttributes);
    testInterviewAttributes.response.section1.q1 = newValue;
    const valuesByPath = { 'response.section1.q1': newValue };

    // Prepare expected interview, with the new value for q1
    const expectedInterview = _cloneDeep(interviewAttributes) as any;
    expectedInterview.response.section1.q1 = newValue;

    // Test, 2 widgets should be valid and visible, with updateKey set
    const { updatedInterview, updatedValuesByPath, needUpdate } = prepareSectionWidgets(mainSection, testInterviewAttributes, { 'response.section1.q1': true }, _cloneDeep(valuesByPath), true);

    // Interview data should correspond to expected
    expect(updatedInterview).toEqual(expect.objectContaining(expectedInterview));
    expect(updatedValuesByPath).toEqual(valuesByPath);
    expect(needUpdate).toEqual(false);

    // Check widget statuses for the 2 widgets, widget1 should have an update key
    expect(updatedInterview.widgets.widget1).toEqual({
        ...commonDefaultWidgetStatus,
        path: 'section1.q1',
        value: newValue,
        currentUpdateKey: commonDefaultWidgetStatus.currentUpdateKey + 1
    });
    expect(updatedInterview.widgets.widget2).toEqual({
        ...commonDefaultWidgetStatus,
        path: 'section1.q2',
        value: runtimeInterviewAttributes.response.section1.q2
    });
    expect(Object.keys(updatedInterview.widgets)).toEqual(['widget1', 'widget2']);

    // Check the visible widgets and the allWidgetsValid flag
    expect(updatedInterview.visibleWidgets).toEqual(['section1.q1', 'section1.q2']);
    expect(updatedInterview.allWidgetsValid).toEqual(true);

});

describe('Test with choice conditional', () => {
    // These tests use the choiceSection, with widget4 with choice conditional

    test('No change in value if all choice conditionals are true', () => {

        // Prepare test data, without widget status
        const newValue = 'a';
        const testInterviewAttributes = _cloneDeep(runtimeInterviewAttributes);
        testInterviewAttributes.response.section1.q4 = newValue;
        const valuesByPath = { 'response.section1.q4': newValue };

        // Prepare expected interview, with the new value for q4
        const expectedInterview = _cloneDeep(interviewAttributes) as any;
        expectedInterview.response.section1.q4 = newValue;
        expectedInterview.validations.section1.q4 = true;

        // Return `true` for checkChoiceConditional
        mockedCheckChoicesConditional.mockReturnValueOnce([true, undefined]);

        // Test, the widget should be valid and visible, with value as set
        const { updatedInterview, updatedValuesByPath, needUpdate } = prepareSectionWidgets(choiceSection, testInterviewAttributes, { 'response.section1.q4': true }, _cloneDeep(valuesByPath), false);

        // Interview data should correspond to expected
        expect(updatedInterview).toEqual(expect.objectContaining(expectedInterview));
        expect(updatedValuesByPath).toEqual(Object.assign({ 'validations.section1.q4': true }, valuesByPath));
        expect(needUpdate).toEqual(false);

        // Check the mockecCheckChoicesConditional call
        expect(mockedCheckChoicesConditional).toHaveBeenCalledTimes(1);
        expect(mockedCheckChoicesConditional).toHaveBeenCalledWith(newValue, widgets.widget4.choices, testInterviewAttributes, 'section1.q4');

        // Check widget status for widget 4
        expect(updatedInterview.widgets.widget4).toEqual({
            ...commonDefaultWidgetStatus,
            path: 'section1.q4',
            value: newValue
        });
        expect(Object.keys(updatedInterview.widgets)).toEqual(['widget4']);

        // Check the visible widgets and the allWidgetsValid flag
        expect(updatedInterview.visibleWidgets).toEqual(['section1.q4']);
        expect(updatedInterview.allWidgetsValid).toEqual(true);

    });

    test('Choice conditional changes, set to undefined, as side-effect of other change', () => {

        // Prepare test data, changing a widget that is not widget4
        const valueForW4 = 'a';
        const newValue = 3;
        const testInterviewAttributes = _cloneDeep(runtimeInterviewAttributes);
        testInterviewAttributes.response.section1.q1 = newValue;
        testInterviewAttributes.response.section1.q4 = valueForW4;
        // Put valuesByPath to some other widget, to see how this one changes independently
        const valuesByPath = { 'response.section1.q1': newValue };

        // Prepare expected interview, with the new value for q1 and undefined for q4
        const expectedInterview = _cloneDeep(interviewAttributes) as any;
        expectedInterview.response.section1.q4 = undefined;
        expectedInterview.response.section1.q1 = newValue;
        expectedInterview.validations.section1.q4 = true;
        expectedInterview.validations.section1.q1 = true;

        // Return `false` with `undefined` as new value
        mockedCheckChoicesConditional.mockReturnValueOnce([false, undefined]);

        // Test, widget4 should have been updated
        const { updatedInterview, updatedValuesByPath, needUpdate } = prepareSectionWidgets(choiceSection, testInterviewAttributes, { 'response.section1.q1': true }, _cloneDeep(valuesByPath), false);

        // Interview data should correspond to expected
        expect(updatedInterview).toEqual(expect.objectContaining(expectedInterview));
        expect(updatedValuesByPath).toEqual(Object.assign({ 'validations.section1.q4': true, 'response.section1.q4': undefined }, valuesByPath));
        expect(needUpdate).toEqual(true);

        // Check the mockecCheckChoicesConditional call
        expect(mockedCheckChoicesConditional).toHaveBeenCalledTimes(1);
        expect(mockedCheckChoicesConditional).toHaveBeenCalledWith(valueForW4, widgets.widget4.choices, testInterviewAttributes, 'section1.q4');

        // Check widget statuses for the widget4
        expect(updatedInterview.widgets.widget4).toEqual({
            ...commonDefaultWidgetStatus,
            path: 'section1.q4',
            isEmpty: true,
            isValid: true,
            value: undefined,
            currentUpdateKey: 1
        });
        expect(Object.keys(updatedInterview.widgets)).toEqual(['widget4']);

        // Check the visible widgets and the allWidgetsValid flag
        expect(updatedInterview.visibleWidgets).toEqual(['section1.q4']);
        expect(updatedInterview.allWidgetsValid).toEqual(true);

    });

    test('Choice visibility changes, change to new values, with previous statuses', () => {

        // Prepare test data, changing a widget that is not widget4
        const initialValueForWidget4 = 'a';
        const updatedValueForWidget4 = 'b';
        const newValue = 3;
        const testInterviewAttributes = _cloneDeep(runtimeInterviewAttributes);
        testInterviewAttributes.response.section1.q1 = newValue;
        testInterviewAttributes.response.section1.q4 = initialValueForWidget4;
        // Put valuesByPath to some other widget, to see how this one changes independently
        const valuesByPath = { 'response.section1.q1': newValue };

        // Prepare previous widget statuses
        const previousWidgetStatuses = {
            widget4: {
                ...commonDefaultWidgetStatus,
                path: 'section1.q4',
                value: initialValueForWidget4
            }
        };
        testInterviewAttributes.widgets = _cloneDeep(previousWidgetStatuses);

        // Prepare expected interview, with the new value for q4
        const expectedInterview = _cloneDeep(interviewAttributes) as any;
        expectedInterview.response.section1.q4 = updatedValueForWidget4;
        expectedInterview.response.section1.q1 = newValue;
        expectedInterview.validations.section1.q4 = true;
        expectedInterview.validations.section1.q1 = true;

        // Return `false` with the updated value as new value
        mockedCheckChoicesConditional.mockReturnValueOnce([false, updatedValueForWidget4]);

        // Test, widget4 should have been updated
        const { updatedInterview, updatedValuesByPath, needUpdate } = prepareSectionWidgets(choiceSection, testInterviewAttributes, { 'response.section1.q1': true }, _cloneDeep(valuesByPath), false);

        // Interview data should correspond to expected
        expect(updatedInterview).toEqual(expect.objectContaining(expectedInterview));
        expect(updatedValuesByPath).toEqual(Object.assign({ 'validations.section1.q4': true, 'response.section1.q4': updatedValueForWidget4 }, valuesByPath));
        expect(needUpdate).toEqual(true);

        // Check the mockecCheckChoicesConditional call
        expect(mockedCheckChoicesConditional).toHaveBeenCalledTimes(1);
        expect(mockedCheckChoicesConditional).toHaveBeenCalledWith(initialValueForWidget4, widgets.widget4.choices, testInterviewAttributes, 'section1.q4');

        // Check widget statuses for widget 4, should have an update key and updated value
        expect(updatedInterview.widgets.widget4).toEqual({
            ...commonDefaultWidgetStatus,
            path: 'section1.q4',
            value: updatedValueForWidget4,
            currentUpdateKey: 1
        });
        expect(Object.keys(updatedInterview.widgets)).toEqual(['widget4']);

        // Check the visible widgets and the allWidgetsValid flag
        expect(updatedInterview.visibleWidgets).toEqual(['section1.q4']);
        expect(updatedInterview.allWidgetsValid).toEqual(true);

    });
});

describe('Test text widget', () => {

    test('Test with path and conditional', () => {
        // Test data
        const mockConditional = jest.fn();
        const path = 'somePath';
        const widget = {
            type: 'text',
            align: 'center',
            path,
            text: 'Test text',
            conditional: mockConditional
        };
        mockedCheckConditional.mockReturnValueOnce([true, undefined, undefined]);
        setApplicationConfiguration({ sections: { [mainSection]: { widgets: ['widget'] } }, widgets: { widget } });

        // Initialize current response
        const testInterviewAttributes = _cloneDeep(runtimeInterviewAttributes);
        prepareSectionWidgets(mainSection, testInterviewAttributes, { 'response.section1.q4': true }, { _all: true });

        expect(mockedCheckConditional).toHaveBeenLastCalledWith(mockConditional, testInterviewAttributes, path, undefined);
    });

});

describe('Test with custom path', () => {
    const widgetWithCustom = {
        type: 'question',
        inputType: 'radio',
        path: 'section1.q4',
        customPath: 'section1.q4custom',
        customChoice: 'custom',
        label: { en: 'q4 label' },
        validations: jest.fn(),
        choices: [
            { value: 'a', label: {}, conditional: () => true },
            { value: 'custom', label: {}, conditional: () => false }
        ]
    };

    const defaultExpectedWidgetStatus = {
        path: 'section1.q4',
        customPath: 'section1.q4custom',
        isVisible: true,
        isDisabled: false,
        isCollapsed: false,
        isEmpty: false,
        isCustomEmpty: true,
        isValid: true,
        isResponded: true,
        isCustomResponded: false,
        errorMessage: undefined,
        groupedObjectId: undefined,
        value: undefined,
        customValue: undefined,
        currentUpdateKey: 0
    };

    beforeEach(() => {
        setApplicationConfiguration({ sections: { choiceSection: { widgets: [ 'widgetWithCustom'] } }, widgets: { widgetWithCustom } });
    });

    test('Test with custom path, custom choice not selected', () => {
        // Prepare test data, setting value of q4
        const currentResponse = 'a';
        mockedCheckValidations.mockReturnValueOnce([true, undefined]);
        const testInterviewAttributes = _cloneDeep(runtimeInterviewAttributes);
        (testInterviewAttributes as any).response.section1.q4 = currentResponse;
        const valuesByPath = { 'response.section1.q4': currentResponse };

        // Prepare expected values
        const expectedInterview = _cloneDeep(interviewAttributes) as any;
        expectedInterview.response.section1.q4 = currentResponse;
        expectedInterview.validations.section1.q4 = true;
        expectedInterview.validations.section1.q4custom = true;

        // Test, custom statuses should be set to empty
        const { updatedInterview, updatedValuesByPath, needUpdate } = prepareSectionWidgets(choiceSection, testInterviewAttributes, { 'response.section1.q4': true }, _cloneDeep(valuesByPath));
        expect(updatedInterview).toEqual(expect.objectContaining(expectedInterview));
        expect(updatedValuesByPath).toEqual(Object.assign({}, valuesByPath, { 'validations.section1.q4': true, 'validations.section1.q4custom': true }));
        expect(needUpdate).toEqual(false);
        expect(mockedCheckValidations).toHaveBeenCalledTimes(1);
        expect(mockedCheckValidations).toHaveBeenCalledWith(widgetWithCustom.validations, (testInterviewAttributes as any).response.section1.q4, undefined, testInterviewAttributes, 'section1.q4',  'section1.q4custom');
        expect(updatedInterview.widgets.widgetWithCustom).toEqual({
            ...defaultExpectedWidgetStatus,
            isValid: true,
            value: currentResponse,
            isCustomEmpty: true,
            isCustomResponded: false
        });
        expect(updatedInterview.visibleWidgets).toEqual(['section1.q4', 'section1.q4custom']);
        expect(updatedInterview.allWidgetsValid).toEqual(true);
    });

    test('Test with custom path, custom choice selected', () => {
        // Prepare test data, setting custom value to q4
        const currentResponse = 'custom';
        const currentCustomResponse = 'custom response';
        mockedCheckValidations.mockReturnValueOnce([true, undefined]);
        const testInterviewAttributes = _cloneDeep(runtimeInterviewAttributes);
        (testInterviewAttributes as any).response.section1.q4 = currentResponse;
        (testInterviewAttributes as any).response.section1.q4custom = currentCustomResponse;
        const valuesByPath = { 'response.section1.q4': currentResponse };

        // Prepare expected values
        const expectedInterview = _cloneDeep(interviewAttributes) as any;
        expectedInterview.response.section1.q4 = currentResponse;
        expectedInterview.response.section1.q4custom = currentCustomResponse;
        expectedInterview.validations.section1.q4 = true;
        expectedInterview.validations.section1.q4custom = true;

        // Test, the custom value should be responded
        const { updatedInterview, updatedValuesByPath, needUpdate } = prepareSectionWidgets(choiceSection, testInterviewAttributes, { 'response.section1.q4': true }, _cloneDeep(valuesByPath));
        expect(updatedInterview).toEqual(expect.objectContaining(expectedInterview));
        expect(updatedValuesByPath).toEqual(Object.assign({}, valuesByPath, { 'validations.section1.q4': true, 'validations.section1.q4custom': true }));
        expect(needUpdate).toEqual(false);
        expect(mockedCheckValidations).toHaveBeenCalledTimes(1);
        expect(mockedCheckValidations).toHaveBeenCalledWith(widgetWithCustom.validations, currentResponse, currentCustomResponse, testInterviewAttributes, 'section1.q4',  'section1.q4custom');
        expect(updatedInterview.widgets.widgetWithCustom).toEqual({
            ...defaultExpectedWidgetStatus,
            isValid: true,
            value: currentResponse,
            customValue: currentCustomResponse,
            isCustomEmpty: false,
            isCustomResponded: true
        });
        expect(updatedInterview.visibleWidgets).toEqual(['section1.q4', 'section1.q4custom']);
        expect(updatedInterview.allWidgetsValid).toEqual(true);
    });

});
