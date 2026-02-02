/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';

import { SwitchPersonWidgetsFactory } from '../widgetsSwitchPerson';
import { interviewAttributesForTestCases } from '../../../../../tests/surveys';
import * as utilHelpers from '../../../../../utils/helpers';
import { ButtonWidgetConfig, TextWidgetConfig } from '../../../../questionnaire/types';

import * as odHelpers from '../../../../odSurvey/helpers';

const widgetFactoryOptions = {
    getFormattedDate: (date: string) => date,
    buttonActions: { validateButtonAction: jest.fn() },
    iconMapper: {}
};

jest.mock('../../../../odSurvey/helpers', () => ({
    getInterviewablePersonsArray: jest.fn().mockReturnValue([]),
    getActivePerson: jest.fn().mockReturnValue(null),
    countPersons: jest.fn().mockReturnValue(0)
}));
const mockedGetInterviewablePersonsArray = odHelpers.getInterviewablePersonsArray as jest.MockedFunction<typeof odHelpers.getInterviewablePersonsArray>;
const mockedGetActivePerson = odHelpers.getActivePerson as jest.MockedFunction<typeof odHelpers.getActivePerson>;
const mockedCountPersons = odHelpers.countPersons as jest.MockedFunction<typeof odHelpers.countPersons>;

beforeEach(() => {
    jest.clearAllMocks();
});

describe('SwitchPersonWidgets', () => {

    test('should return the correct widget configs', () => {
        const widgetConfig = new SwitchPersonWidgetsFactory(widgetFactoryOptions).getWidgetConfigs();
        expect(widgetConfig).toEqual({
            activePersonTitle: {
                type: 'text',
                align: 'center',
                containsHtml: true,
                classes: '',
                text: expect.any(Function),
                conditional: expect.any(Function)
            },
            buttonSwitchPerson: {
                type: 'button',
                align: 'center',
                containsHtml: true,
                color: 'blue',
                size: 'small',
                hideWhenRefreshing: true,
                label: expect.any(Function),
                confirmPopup: {
                    conditional: expect.any(Function),
                    content: expect.any(Function),
                    showConfirmButton: false,
                    cancelButtonColor: 'blue',
                    cancelButtonLabel: expect.any(Function)
                },
                conditional: expect.any(Function),
                action: expect.any(Function)
            }
        });
    });

});

describe('activePersonTitle widget', () => {

    const widgetConfig = new SwitchPersonWidgetsFactory(widgetFactoryOptions).getWidgetConfigs()['activePersonTitle'] as TextWidgetConfig;

    describe('conditional', () => {
        const conditional = widgetConfig.conditional;
        expect(conditional).toBeDefined();

        test('should return false if there is only one person in the interview', () => {
            mockedCountPersons.mockReturnValue(1);
            expect(conditional!(interviewAttributesForTestCases, 'path')).toBe(false);
        });

        test('should return true if there is more than one person in the interview', () => {
            mockedCountPersons.mockReturnValue(2);
            expect(conditional!(interviewAttributesForTestCases, 'path')).toBe(true);
        });
    });

    describe('text', () => {
        const mockedT = jest.fn();
        const text = widgetConfig.text;
        expect(text).toBeDefined();

        test('no active person', () => {
            mockedGetActivePerson.mockReturnValue(null);
            expect(utilHelpers.translateString(text, { t: mockedT } as any, interviewAttributesForTestCases, 'path')).toEqual('');
            expect(mockedT).not.toHaveBeenCalled();
        });

        test('Active person has a nickname', () => {
            const nickname = 'John Doe';
            mockedGetActivePerson.mockReturnValue({ _uuid: 'person1', _sequence: 1, nickname });
            utilHelpers.translateString(text, { t: mockedT } as any, interviewAttributesForTestCases, 'path');
            expect(mockedT).toHaveBeenCalledWith(['customSurvey:ActivePersonTitle', 'survey:ActivePersonTitle'], { context: '', name: nickname });
        });

        test('Active person does not have a nickname', () => {
            mockedGetActivePerson.mockReturnValue({ _uuid: 'person1', _sequence: 1 });
            utilHelpers.translateString(text, { t: mockedT } as any, interviewAttributesForTestCases, 'path');
            expect(mockedT).toHaveBeenCalledWith(['customSurvey:ActivePersonTitle', 'survey:ActivePersonTitle'], { context: 'unnamed', name: 1 });
        });

    });

});

describe('buttonSwitchPerson widget', () => {
    const widgetConfig = new SwitchPersonWidgetsFactory(widgetFactoryOptions).getWidgetConfigs()['buttonSwitchPerson'] as ButtonWidgetConfig;

    describe('conditional', () => {

        test('should return false if there are no interviewable persons', () => {
            mockedGetInterviewablePersonsArray.mockReturnValue([]);
            expect(widgetConfig.conditional!(interviewAttributesForTestCases, 'path')).toEqual([false, undefined]);
        });

        test('should return false if there is only one interviewable person', () => {
            mockedGetInterviewablePersonsArray.mockReturnValue([{ _uuid: 'personId1', _sequence: 1 }]);
            expect(widgetConfig.conditional!(interviewAttributesForTestCases, 'path')).toEqual([false, undefined]);
        });

        test('should return true if there is more than one interviewable person', () => {
            mockedGetInterviewablePersonsArray.mockReturnValue([{ _uuid: 'personId1', _sequence: 1 }, { _uuid: 'personId1', _sequence: 1 }]);
            expect(widgetConfig.conditional!(interviewAttributesForTestCases, 'path')).toEqual([true, undefined]);
        });

    });

    test('action', () => {
        const action = widgetConfig.action;
        expect(action).toBeDefined();
        const callbackMocks = { startUpdateInterview: jest.fn(), startAddGroupedObjects: jest.fn(), startRemoveGroupedObjects: jest.fn(), startNavigate: jest.fn() };
        action(callbackMocks, interviewAttributesForTestCases, 'path', 'section', {}, jest.fn());
        expect(callbackMocks.startNavigate).toHaveBeenCalledWith({ requestedSection: { sectionShortname: 'selectPerson' } });
    });

    test('label', () => {
        const mockedT = jest.fn();
        const text = widgetConfig.label;
        expect(text).toBeDefined();
        utilHelpers.translateString(text, { t: mockedT } as any, interviewAttributesForTestCases, 'path');
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:SwitchPersonTitle', 'survey:SwitchPersonTitle']);
    });

    describe('confirmPopup', () => {
        const confirmPopup = widgetConfig.confirmPopup;
        expect(confirmPopup).toBeDefined();

        describe('conditional', () => {
            const conditional = confirmPopup!.conditional;
            expect(conditional).toBeDefined();

            test('should return false if all widgets are valid', () => {
                const interview = _cloneDeep(interviewAttributesForTestCases);
                (interview as any).allWidgetsValid = true;
                expect(conditional!(interview, 'path')).toBe(false);
            });

            test('should return true if not all widgets are valid', () => {
                const interview = _cloneDeep(interviewAttributesForTestCases);
                (interview as any).allWidgetsValid = false;
                expect(conditional!(interview, 'path')).toBe(true);
            });

            test('should return true if not allWidgetsValid is undefined', () => {
                const interview = _cloneDeep(interviewAttributesForTestCases);
                (interview as any).allWidgetsValid = undefined;
                expect(conditional!(interview, 'path')).toBe(true);
            });

        });

        test('content', () => {
            const mockedT = jest.fn();
            const text = confirmPopup!.content;
            expect(text).toBeDefined();
            utilHelpers.translateString(text, { t: mockedT } as any, interviewAttributesForTestCases, 'path');
            expect(mockedT).toHaveBeenCalledWith(['customSurvey:SwitchPersonNeedComplete', 'survey:SwitchPersonNeedComplete']);
        });

        test('cancelButtonLabel', () => {
            const mockedT = jest.fn();
            const text = confirmPopup!.cancelButtonLabel;
            expect(text).toBeDefined();
            utilHelpers.translateString(text, { t: mockedT } as any, interviewAttributesForTestCases, 'path');
            expect(mockedT).toHaveBeenCalledWith('main:OK');
        });

    });

});
