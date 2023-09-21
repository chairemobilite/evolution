import _cloneDeep from 'lodash/cloneDeep';
import { prepareWidgets } from '../WidgetOperation';
import { setApplicationConfiguration } from 'chaire-lib-frontend/lib/config/application.config';
import { SurveyWidgets, UserFrontendInterviewAttributes } from '../../../services/interviews/interview';
import { UserInterviewAttributes } from 'evolution-common/lib/services/interviews/interview';
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
}

jest.mock('../Conditional', () => ({
    checkConditional: jest.fn().mockReturnValue([true, undefined, undefined]),
    checkChoicesConditional: jest.fn().mockReturnValue([true, undefined])
}));
const mockedCheckConditional = checkConditional as jest.MockedFunction<typeof checkConditional>;
const mockedCheckChoicesConditional = checkChoicesConditional as jest.MockedFunction<typeof checkChoicesConditional>;
jest.mock('../Validation', () => ({
    checkValidations: jest.fn().mockImplementation((_validations, value, _customVal, _interview, path, _customPath) => (path === 'section1.q2' ? [false, 'error'] : path === 'groupResponses.group2Id.gq1' && value !== undefined ? [false, 'error'] : [true, undefined]))
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
        groups: {
            [group1Name]: {
                widgets: ['widget3']
            }
        },
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
        path: `groupResponses`
    }
};
const mockedDefaultValue = widgets.widget3.defaultValue as jest.MockedFunction<any>;

// Prepare test interview attributes
const group1Id = 'group1Id';
const group2Id = 'group2Id';
type CustomSurvey = {
    section1?: {
        q1?: string;
        q2?: number;
    };
    groupResponses?: {
        [groupId: string]: {
            _uuid?: string;
            gq1?: string;
        }
    }
}

const userInterviewAttributes: UserInterviewAttributes<CustomSurvey, unknown, unknown, unknown> = {
    id: 1,
    uuid: 'arbitrary uuid',
    participant_id: 1,
    is_completed: false,
    responses: {
        section1: {
            q1: 'abc',
            q2: 3
        },
        groupResponses: {
            [group1Id]: {
                _uuid: group1Id,
                gq1: 'test'
            },
            [group2Id]: {
                _uuid: group2Id
            }
        }
    },
    validations: {
        section1: {
            q1: true,
            q2: false
        },
        groupResponses: {
            [group1Id]: {
                gq1: true
            },
            [group2Id]: {
                gq1: true
            }
        }
    },
    is_valid: true,
}
const interviewAttributes: UserFrontendInterviewAttributes<CustomSurvey, unknown, unknown, unknown> = {
    ...userInterviewAttributes,
    widgets: {},
    groups: {},
    allWidgetsValid: true,
    previousGroups: {},
    previousWidgets: {},
    visibleWidgets: []
};

const defaultExpectedWidgetStatus = {
    widget1: {
        path: 'section1.q1',
        customPath: undefined,
        isVisible: true,
        modalIsOpen: false,
        isDisabled: false,
        isCollapsed: false,
        isEmpty: false,
        isCustomEmpty: true,
        isValid: (userInterviewAttributes.validations as any).section1.q1,
        isResponded: true,
        isCustomResponded: false,
        errorMessage: undefined,
        groupedObjectId: undefined,
        value: (userInterviewAttributes.responses as any).section1.q1,
        customValue: undefined,
        currentUpdateKey: 0
    },
    widget2: {
        path: 'section1.q2',
        customPath: undefined,
        isVisible: true,
        modalIsOpen: false,
        isDisabled: false,
        isCollapsed: false,
        isEmpty: false,
        isCustomEmpty: true,
        isValid: (userInterviewAttributes.validations as any).section1.q2,
        isResponded: true,
        isCustomResponded: false,
        errorMessage: 'error',
        groupedObjectId: undefined,
        value: (userInterviewAttributes.responses as any).section1.q2,
        customValue: undefined,
        currentUpdateKey: 0
    },
    widget4: {
        path: 'section1.q4',
        customPath: undefined,
        isVisible: true,
        modalIsOpen: false,
        isDisabled: false,
        isCollapsed: false,
        isEmpty: false,
        isCustomEmpty: true,
        isValid: (userInterviewAttributes.validations as any).section1.q4,
        isResponded: true,
        isCustomResponded: false,
        errorMessage: undefined,
        groupedObjectId: undefined,
        value: (userInterviewAttributes.responses as any).section1.q4,
        customValue: undefined,
        currentUpdateKey: 0
    },
    widget3Group1: {
        path: `groupResponses.${group1Id}.gq1`,
        customPath: undefined,
        isVisible: true,
        modalIsOpen: false,
        isDisabled: false,
        isCollapsed: false,
        isEmpty: false,
        isCustomEmpty: true,
        isValid: (userInterviewAttributes.validations as any).groupResponses[group1Id].gq1,
        isResponded: true,
        isCustomResponded: false,
        errorMessage: undefined,
        groupedObjectId: group1Id,
        value: (userInterviewAttributes.responses as any).groupResponses[group1Id].gq1,
        customValue: undefined,
        currentUpdateKey: 0
    },
    widget3Group2: {
        path: `groupResponses.${group2Id}.gq1`,
        customPath: undefined,
        isVisible: true,
        modalIsOpen: false,
        isDisabled: false,
        isCollapsed: false,
        isEmpty: true,
        isCustomEmpty: true,
        isValid: (userInterviewAttributes.validations as any).groupResponses[group2Id].gq1,
        isResponded: false,
        isCustomResponded: false,
        errorMessage: undefined,
        groupedObjectId: group2Id,
        value: (userInterviewAttributes.responses as any).groupResponses[group2Id].gq1,
        customValue: undefined,
        currentUpdateKey: 0
    }
}

beforeEach(() => {
    setApplicationConfiguration({ sections, widgets });
    widgets.widget2.validations.mockClear();
    mockedCheckValidations.mockClear();
    mockedCheckChoicesConditional.mockClear();
    mockedDefaultValue.mockClear();
})

test('Test simple widget data', () => {
    // Prepare test data
    const newValue = 'newValue';
    const testInterviewAttributes = _cloneDeep(interviewAttributes);
    const interviewCopy = _cloneDeep(userInterviewAttributes) as any;
    interviewCopy.responses.section1.q1 = newValue;
    (testInterviewAttributes as any).responses.section1.q1 = newValue;
    const valuesByPath = { 'responses.section1.q1': newValue };

    // Test
    const [interview, newValuesByPath, foundModalOpen, needUpdate] = prepareWidgets(mainSection, testInterviewAttributes, { 'responses.section1.q1': true }, _cloneDeep(valuesByPath));
    expect(interview).toEqual(expect.objectContaining(interviewCopy));
    expect(newValuesByPath).toEqual(valuesByPath);
    expect(foundModalOpen).toEqual(false);
    expect(needUpdate).toEqual(false);
    expect(interview.widgets.widget1).toEqual({
        ...defaultExpectedWidgetStatus.widget1,
        value: newValue
    });
    expect(interview.visibleWidgets).toEqual(['section1.q1', 'section1.q2']);
    expect(interview.allWidgetsValid).toEqual(false);
});

test('Test with conditional, no change in conditional', () => {
    // Prepare test data
    const newValue = 2;
    const testInterviewAttributes = _cloneDeep(interviewAttributes);
    const interviewCopy = _cloneDeep(userInterviewAttributes) as any;
    interviewCopy.responses.section1.q2 = newValue;
    (testInterviewAttributes as any).responses.section1.q2 = newValue;
    const valuesByPath = { 'responses.section1.q2': 2 };

    // Test
    const [interview, newValuesByPath, foundModalOpen, needUpdate] = prepareWidgets(mainSection, testInterviewAttributes, { 'responses.section1.q2': true }, _cloneDeep(valuesByPath));
    expect(interview).toEqual(expect.objectContaining(interviewCopy));
    expect(newValuesByPath).toEqual(valuesByPath);
    expect(foundModalOpen).toEqual(false);
    expect(needUpdate).toEqual(false);
    expect(mockedCheckValidations).toHaveBeenCalledTimes(2);
    expect(mockedCheckValidations).toHaveBeenCalledWith(widgets.widget2.validations, newValue, undefined, testInterviewAttributes, 'section1.q2', undefined);
    expect(interview.widgets.widget2).toEqual({
        ...defaultExpectedWidgetStatus.widget2,
        value: newValue,
    });
    expect(interview.visibleWidgets).toEqual(['section1.q1', 'section1.q2']);
    expect(interview.allWidgetsValid).toEqual(false);
});

test('Test with conditional, change in conditional', () => {
    // Prepare test data
    const newValue = 2;
    // validation response for widget1, then widget2
    mockedCheckValidations.mockReturnValueOnce([true, undefined]);
    mockedCheckValidations.mockReturnValueOnce([true, undefined]);
    const testInterviewAttributes = _cloneDeep(interviewAttributes);
    const interviewCopy = _cloneDeep(userInterviewAttributes) as any;
    interviewCopy.responses.section1.q2 = newValue;
    interviewCopy.validations.section1.q2 = true;
    (testInterviewAttributes as any).responses.section1.q2 = newValue;
    const valuesByPath = { 'responses.section1.q2': newValue };

    // Test
    const [interview, newValuesByPath, foundModalOpen, needUpdate] = prepareWidgets(mainSection, testInterviewAttributes, { 'responses.section1.q2': true }, _cloneDeep(valuesByPath));
    expect(interview).toEqual(expect.objectContaining(interviewCopy));
    expect(newValuesByPath).toEqual(Object.assign({}, valuesByPath, { 'validations.section1.q2': true }));
    expect(foundModalOpen).toEqual(false);
    expect(needUpdate).toEqual(false);
    expect(mockedCheckValidations).toHaveBeenCalledTimes(2);
    expect(mockedCheckValidations).toHaveBeenCalledWith(widgets.widget2.validations, newValue, undefined, testInterviewAttributes, 'section1.q2', undefined);
    expect(interview.widgets.widget2).toEqual({
        ...defaultExpectedWidgetStatus.widget2,
        value: newValue,
        isValid: true,
        errorMessage: undefined
    });
    expect(interview.visibleWidgets).toEqual(['section1.q1', 'section1.q2']);
    expect(interview.allWidgetsValid).toEqual(true);
    
    // Change the status again
    const [interview2, newValuesByPath2, foundModalOpen2, needUpdate2] = prepareWidgets(mainSection, interview, { 'responses.section1.q2': true }, _cloneDeep(valuesByPath));
    interviewCopy.validations.section1.q2 = false;
    expect(interview2).toEqual(expect.objectContaining(interviewCopy));
    expect(newValuesByPath2).toEqual(Object.assign({}, valuesByPath, { 'validations.section1.q2': false }));
    expect(foundModalOpen2).toEqual(false);
    expect(needUpdate2).toEqual(false);
    expect(mockedCheckValidations).toHaveBeenCalledTimes(3); // 3 because the validation for widget1 was not called, not changed
    expect(mockedCheckValidations).toHaveBeenCalledWith(widgets.widget2.validations, newValue, undefined, interview, 'section1.q2', undefined);
    expect(interview.widgets.widget2).toEqual({
        ...defaultExpectedWidgetStatus.widget2,
        value: newValue,
    });
    expect(interview.previousWidgets?.widget2).toEqual({
        ...defaultExpectedWidgetStatus.widget2,
        value: newValue,
        isValid: true,
        errorMessage: undefined
    });
    expect(interview.visibleWidgets).toEqual(['section1.q1', 'section1.q2']);
    expect(interview.allWidgetsValid).toEqual(false);
});

test('Make widget2 invisible', () => {
    // Prepare test data
    const testInterviewAttributes = _cloneDeep(interviewAttributes);
    const interviewCopy = _cloneDeep(userInterviewAttributes) as any;
    (interviewCopy as any).responses.section1.q2 = undefined;
    const valuesByPath = { 'responses.section1.q1': interviewCopy.responses.section1.q1 };
    // Second call is for widget 2
    mockedCheckConditional.mockReturnValueOnce([true, undefined, undefined]);
    mockedCheckConditional.mockReturnValueOnce([false, undefined, undefined]);

    // Test
    const [interview, newValuesByPath, foundModalOpen, needUpdate] = prepareWidgets(mainSection, testInterviewAttributes, { 'responses.section1.q1': true }, _cloneDeep(valuesByPath));
    expect(interview).toEqual(expect.objectContaining(interviewCopy));
    expect(newValuesByPath).toEqual(valuesByPath);
    expect(foundModalOpen).toEqual(false);
    expect(needUpdate).toEqual(true);
    expect(interview.widgets.widget1).toEqual({
        ...defaultExpectedWidgetStatus.widget1
    });
    expect(interview.widgets.widget2).toEqual({
        ...defaultExpectedWidgetStatus.widget2,
        isVisible: false,
        isEmpty: true,
        value: undefined
    });
    expect(interview.visibleWidgets).toEqual(['section1.q1']);
    expect(interview.allWidgetsValid).toEqual(true);
});

test('Test a group widget, with visibility and default value', () => {
    // Prepare test data
    const newValue = 'newValue';
    const testInterviewAttributes = _cloneDeep(interviewAttributes);
    const interviewExpected = _cloneDeep(userInterviewAttributes) as any;
    (interviewExpected as any).responses.groupResponses[group1Id].gq1 = newValue;
    (interviewExpected as any).responses.groupResponses[group2Id].gq1 = undefined;
    (testInterviewAttributes as any).responses.groupResponses[group1Id].gq1 = newValue;
    const valuesByPath = { [`responses.groupResponses.${group1Id}.gq1`]: interviewExpected.responses.section1.q1 };

    // Test, make the group2 invisible
    mockedCheckConditional.mockReturnValueOnce([true, undefined, undefined]);
    mockedCheckConditional.mockReturnValueOnce([false, undefined, undefined]);
    const [interview, newValuesByPath, foundModalOpen, needUpdate] = prepareWidgets(groupSection, testInterviewAttributes, { [`responses.groupResponses.${group1Id}.gq1`]: true }, _cloneDeep(valuesByPath), false, testUser);
    expect(interview).toEqual(expect.objectContaining(interviewExpected));
    expect(newValuesByPath).toEqual(valuesByPath);
    expect(foundModalOpen).toEqual(false);
    expect(needUpdate).toEqual(false);
    expect(interview.groups[group1Name][group1Id].widget3).toEqual({
        ...defaultExpectedWidgetStatus.widget3Group1,
        value: newValue
    });
    expect(interview.groups[group1Name][group2Id].widget3).toEqual({
        ...defaultExpectedWidgetStatus.widget3Group2,
        isVisible: false,
        value: undefined
    });
    expect((interview.previousGroups as any)[group1Name]).toBeUndefined();
    expect((interview.previousGroups as any)[group1Name]).toBeUndefined();
    expect(interview.visibleWidgets).toEqual([`groupResponses.${group1Id}.gq1`]);
    expect(interview.allWidgetsValid).toEqual(true);
    // The default value function should not have been called
    expect(mockedDefaultValue).not.toHaveBeenCalled();

    // Make a second call, making the group2 widget visible
    // Since the value has just been set, it should valid
    (interviewExpected as any).responses.groupResponses[group2Id].gq1 = 'default';
    (interviewExpected as any).validations.groupResponses[group2Id].gq1 = true;
    const [interview2, newValuesByPath2, foundModalOpen2, needUpdate2] = prepareWidgets(groupSection, interview, { [`responses.groupResponses.${group1Id}.gq1`]: true }, _cloneDeep(valuesByPath), false, testUser);
    expect(interview2).toEqual(expect.objectContaining(interviewExpected));
    // Validate that the default value function has been called with proper parameters
    expect(mockedDefaultValue).toHaveBeenCalledTimes(1);
    expect(mockedDefaultValue).toHaveBeenCalledWith(interview, `groupResponses.${group2Id}.gq1`, testUser);
    expect(newValuesByPath2).toEqual({ ...valuesByPath, [`responses.groupResponses.${group2Id}.gq1`]: 'default' });
    expect(foundModalOpen2).toEqual(false);
    expect(needUpdate2).toEqual(true);
    expect(interview2.groups[group1Name][group1Id].widget3).toEqual({
        ...defaultExpectedWidgetStatus.widget3Group1,
        value: newValue
    });
    expect(interview2.groups[group1Name][group2Id].widget3).toEqual({
        ...defaultExpectedWidgetStatus.widget3Group2,
        isEmpty: false,
        isResponded: true,
        isValid: true,
        errorMessage: undefined,
        value: 'default',
        currentUpdateKey: 1
    });
    expect((interview2.previousGroups as any)[group1Name][group1Id].widget3).toEqual({
        ...defaultExpectedWidgetStatus.widget3Group1,
        value: newValue
    });
    expect((interview2.previousGroups as any)[group1Name][group2Id].widget3).toEqual({
        ...defaultExpectedWidgetStatus.widget3Group2,
        isVisible: false,
        value: undefined
    });
    expect(interview2.visibleWidgets).toEqual([`groupResponses.${group1Id}.gq1`, `groupResponses.${group2Id}.gq1`]);
    expect(interview2.allWidgetsValid).toEqual(true);

    // Make a third call, changing again value from group 1, group2 should remain the same, even if value is technically invalid
    (interviewExpected as any).responses.groupResponses[group2Id].gq1 = 'default';
    (interviewExpected as any).validations.groupResponses[group2Id].gq1 = true;
    const [interview3, newValuesByPath3, foundModalOpen3, needUpdate3] = prepareWidgets(groupSection, interview2, { [`responses.groupResponses.${group1Id}.gq1`]: true }, _cloneDeep(valuesByPath));
    expect(interview3).toEqual(expect.objectContaining(interviewExpected));
    expect(newValuesByPath3).toEqual(valuesByPath);
    expect(foundModalOpen3).toEqual(false);
    expect(needUpdate3).toEqual(false);
    expect(interview3.groups[group1Name][group1Id].widget3).toEqual({
        ...defaultExpectedWidgetStatus.widget3Group1,
        value: newValue
    });
    expect(interview3.groups[group1Name][group2Id].widget3).toEqual({
        ...defaultExpectedWidgetStatus.widget3Group2,
        isEmpty: false,
        isResponded: true,
        isValid: true,
        errorMessage: undefined,
        value: 'default',
        currentUpdateKey: 1
    });
    expect((interview3.previousGroups as any)[group1Name][group1Id].widget3).toEqual({
        ...defaultExpectedWidgetStatus.widget3Group1,
        value: newValue
    });
    expect((interview3.previousGroups as any)[group1Name][group2Id].widget3).toEqual({
        ...defaultExpectedWidgetStatus.widget3Group2,
        isEmpty: false,
        isResponded: true,
        isValid: true,
        errorMessage: undefined,
        value: 'default',
        currentUpdateKey: 1
    });
    expect(interview3.visibleWidgets).toEqual([`groupResponses.${group1Id}.gq1`, `groupResponses.${group2Id}.gq1`]);
    expect(interview3.allWidgetsValid).toEqual(true);

    // Make a fourth call, with _all values to check, validity should now be false
    (interviewExpected as any).validations.groupResponses[group2Id].gq1 = false;
    const valuesByPathForGroup2 = { [`_all`]: true };
    const [interview4, newValuesByPath4, foundModalOpen4, needUpdate4] = prepareWidgets(groupSection, interview2, { [`_all`]: true }, _cloneDeep(valuesByPathForGroup2));
    expect(interview4).toEqual(expect.objectContaining(interviewExpected));
    expect(newValuesByPath4).toEqual(Object.assign({}, valuesByPathForGroup2, { [`validations.groupResponses.${group2Id}.gq1`]: false}));
    expect(foundModalOpen4).toEqual(false);
    expect(needUpdate4).toEqual(false);
    expect(interview4.groups[group1Name][group1Id].widget3).toEqual({
        ...defaultExpectedWidgetStatus.widget3Group1,
        value: newValue,
        isCustomResponded: true
    });
    expect(interview4.groups[group1Name][group2Id].widget3).toEqual({
        ...defaultExpectedWidgetStatus.widget3Group2,
        isEmpty: false,
        isResponded: true,
        isValid: false,
        errorMessage: 'error',
        value: 'default',
        isCustomResponded: true,
        currentUpdateKey: 1
    });
    expect(interview4.visibleWidgets).toEqual([`groupResponses.${group1Id}.gq1`, `groupResponses.${group2Id}.gq1`]);
    expect(interview4.allWidgetsValid).toEqual(false);
});

test('Test simple widget data with update key', () => {
    // Prepare test data
    const newValue = 'newValue';
    const testInterviewAttributes = _cloneDeep(interviewAttributes);
    const interviewCopy = _cloneDeep(userInterviewAttributes) as any;
    interviewCopy.responses.section1.q1 = newValue;
    (testInterviewAttributes as any).responses.section1.q1 = newValue;
    const valuesByPath = { 'responses.section1.q1': newValue };

    // Test
    const [interview, newValuesByPath, foundModalOpen, needUpdate] = prepareWidgets(mainSection, testInterviewAttributes, { 'responses.section1.q1': true }, _cloneDeep(valuesByPath), true);
    expect(interview).toEqual(expect.objectContaining(interviewCopy));
    expect(newValuesByPath).toEqual(valuesByPath);
    expect(foundModalOpen).toEqual(false);
    expect(needUpdate).toEqual(false);
    expect(interview.widgets.widget1).toEqual({
        ...defaultExpectedWidgetStatus.widget1,
        value: newValue,
        currentUpdateKey: defaultExpectedWidgetStatus.widget1.currentUpdateKey + 1
    });
    expect(interview.widgets.widget2).toEqual({
        ...defaultExpectedWidgetStatus.widget2
    });
    expect(interview.visibleWidgets).toEqual(['section1.q1', 'section1.q2']);
    expect(interview.allWidgetsValid).toEqual(false);
});

describe('Test with choice conditional', () => {
    test('No change in value', () => {
        // Prepare test data
        const newValue = 'a';
        // validation response for widget4
        mockedCheckValidations.mockReturnValueOnce([true, undefined]);
        const testInterviewAttributes = _cloneDeep(interviewAttributes);
        // Change current field
        const interviewExpected = _cloneDeep(userInterviewAttributes) as any;
        interviewExpected.responses.section1.q4 = newValue;
        interviewExpected.validations.section1.q4 = true;
        (testInterviewAttributes as any).responses.section1.q4 = newValue;
        const valuesByPath = { 'responses.section1.q4': newValue };
    
        // Test
        const [interview, newValuesByPath, foundModalOpen, needUpdate] = prepareWidgets(choiceSection, testInterviewAttributes, { 'responses.section1.q4': true }, _cloneDeep(valuesByPath));
        expect(interview).toEqual(expect.objectContaining(interviewExpected));
        expect(newValuesByPath).toEqual(Object.assign({}, valuesByPath, { 'validations.section1.q4': true }));
        expect(foundModalOpen).toEqual(false);
        expect(needUpdate).toEqual(false);
        expect(mockedCheckValidations).toHaveBeenCalledTimes(1);
        expect(mockedCheckValidations).toHaveBeenCalledWith(widgets.widget4.validations, (testInterviewAttributes as any).responses.section1.q4, undefined, testInterviewAttributes, 'section1.q4', undefined);
        expect(interview.widgets.widget4).toEqual({
            ...defaultExpectedWidgetStatus.widget4,
            isValid: true,
            value: newValue
        });
        expect(interview.visibleWidgets).toEqual(['section1.q4']);
        expect(interview.allWidgetsValid).toEqual(true);
        
    });

    test('Change value for undefined', () => {
        // Prepare test data
        const value = 'a';
        // validation response for widget4
        mockedCheckValidations.mockReturnValueOnce([true, undefined]);
        mockedCheckChoicesConditional.mockReturnValueOnce([false, undefined]);
        // Initialize current response
        const testInterviewAttributes = _cloneDeep(interviewAttributes);
        (testInterviewAttributes as any).responses.section1.q4 = value;
        (testInterviewAttributes as any).validations.section1.q4 = true;
        // Change some other field than the choice field
        const interviewExpected = _cloneDeep(userInterviewAttributes) as any;
        interviewExpected.responses.section1.q4 = undefined;
        interviewExpected.validations.section1.q4 = true;
        
        // Put valuesByPath to some other widget, to see how this one changes independently
        const valuesByPath = { 'responses.section1.q2': 3 };
    
        // Test
        const [interview, newValuesByPath, foundModalOpen, needUpdate] = prepareWidgets(choiceSection, testInterviewAttributes, { 'responses.section1.q4': true }, _cloneDeep(valuesByPath));
        expect(interview).toEqual(expect.objectContaining(interviewExpected));
        expect(newValuesByPath).toEqual(valuesByPath);
        expect(foundModalOpen).toEqual(false);
        expect(needUpdate).toEqual(true);
        expect(mockedCheckValidations).toHaveBeenCalledTimes(1);
        expect(mockedCheckValidations).toHaveBeenCalledWith(widgets.widget4.validations, (testInterviewAttributes as any).responses.section1.q4, undefined, testInterviewAttributes, 'section1.q4', undefined);
        expect(mockedCheckChoicesConditional).toHaveBeenCalledTimes(1);
        expect(mockedCheckChoicesConditional).toHaveBeenCalledWith(value, widgets.widget4.choices, testInterviewAttributes, 'section1.q4');
        expect(interview.widgets.widget4).toEqual({
            ...defaultExpectedWidgetStatus.widget4,
            isEmpty: true,
            isValid: true,
            value: undefined,
            currentUpdateKey: 1
        });
        expect(interview.visibleWidgets).toEqual(['section1.q4']);
        expect(interview.allWidgetsValid).toEqual(true);
        
    });

    test('Change value for something else', () => {
        // Prepare test data
        const value = 'a';
        const updatedValue = 'b';
        // Initialize current response
        const testInterviewAttributes = _cloneDeep(interviewAttributes);
        (testInterviewAttributes as any).responses.section1.q4 = value;
        (testInterviewAttributes as any).validations.section1.q4 = true;
        // Change some other field than the choice field
        const interviewExpected = _cloneDeep(userInterviewAttributes) as any;
        interviewExpected.responses.section1.q4 = updatedValue;
        interviewExpected.validations.section1.q4 = true;
        
        // Put valuesByPath to some other widget, to see how this one changes independently
        const valuesByPath = { 'responses.section1.q2': 3 };
    
        // validation and choice conditional response for widget4 
        mockedCheckValidations.mockReturnValueOnce([true, undefined]);
        mockedCheckChoicesConditional.mockReturnValueOnce([false, updatedValue]);

        // Test
        const [interview, newValuesByPath, foundModalOpen, needUpdate] = prepareWidgets(choiceSection, testInterviewAttributes, { 'responses.section1.q2': true }, _cloneDeep(valuesByPath));
        expect(interview).toEqual(expect.objectContaining(interviewExpected));
        expect(newValuesByPath).toEqual(Object.assign({}, valuesByPath, { 'responses.section1.q4': updatedValue }));
        expect(foundModalOpen).toEqual(false);
        expect(needUpdate).toEqual(true);
        expect(mockedCheckValidations).toHaveBeenCalledTimes(1);
        expect(mockedCheckValidations).toHaveBeenCalledWith(widgets.widget4.validations, (testInterviewAttributes as any).responses.section1.q4, undefined, testInterviewAttributes, 'section1.q4', undefined);
        expect(mockedCheckChoicesConditional).toHaveBeenCalledTimes(1);
        expect(mockedCheckChoicesConditional).toHaveBeenCalledWith(value, widgets.widget4.choices, testInterviewAttributes, 'section1.q4');
        expect(interview.widgets.widget4).toEqual({
            ...defaultExpectedWidgetStatus.widget4,
            isEmpty: false,
            isValid: true,
            value: updatedValue,
            currentUpdateKey: 1
        });
        expect(interview.visibleWidgets).toEqual(['section1.q4']);
        expect(interview.allWidgetsValid).toEqual(true);

        // Make a second call, to reset value, making sure the widget is still valid
        const updatedValue2 = undefined;
        interviewExpected.responses.section1.q4 = updatedValue2;
        interviewExpected.validations.section1.q4 = true;
        // validation and choice conditional response for widget4
        mockedCheckValidations.mockReturnValueOnce([false, { en: 'value must be set' }]);
        mockedCheckChoicesConditional.mockReturnValueOnce([false, updatedValue2]);
        const [interview2, newValuesByPath2, foundModalOpen2, needUpdate2] = prepareWidgets(choiceSection, interview, { 'responses.section1.q2': true }, _cloneDeep(valuesByPath));
        expect(interview2).toEqual(expect.objectContaining(interviewExpected));
        expect(newValuesByPath2).toEqual(Object.assign({}, valuesByPath, { 'responses.section1.q4': updatedValue2 }));
        expect(foundModalOpen2).toEqual(false);
        expect(needUpdate2).toEqual(true);
        // Though it's invalid, this path was not affected, so the widget should still be valid
        expect(interview.widgets.widget4).toEqual({
            ...defaultExpectedWidgetStatus.widget4,
            isEmpty: true,
            isValid: true,
            value: undefined,
            currentUpdateKey: 2
        });
        expect(interview.visibleWidgets).toEqual(['section1.q4']);
        expect(interview.allWidgetsValid).toEqual(true);
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
        setApplicationConfiguration({ sections: { [mainSection]: { widgets: ['widget'] }}, widgets: { widget } });

        // Initialize current responses
        const testInterviewAttributes = _cloneDeep(interviewAttributes);
        prepareWidgets(mainSection, testInterviewAttributes, { 'responses.section1.q4': true }, { _all: true });

        expect(mockedCheckConditional).toHaveBeenLastCalledWith(mockConditional, testInterviewAttributes, path, undefined);
    })

})
