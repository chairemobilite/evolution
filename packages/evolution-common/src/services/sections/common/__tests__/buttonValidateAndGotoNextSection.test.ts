/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';

import { getButtonValidateAndGotoNextSection } from '../buttonValidateAndGotoNextSection';
import { interviewAttributesForTestCases } from '../../../../tests/surveys';
import * as utilHelpers from '../../../../utils/helpers';

// Prepare configuration options
const mockButtonValidate = jest.fn();
const options = {
    buttonActions: { validateButtonAction: mockButtonValidate },
    iconMapper: { 'check-circle': 'check-circle' as any }
}
const translatableKey = 'myButtonKey';

beforeEach(() => {
    jest.clearAllMocks();
})

describe('getButtonValidateAndGotoNextSection', () => {

    test('should return the correct widget config', () => {
        const widgetConfig = getButtonValidateAndGotoNextSection(translatableKey, options);
        expect(widgetConfig).toEqual({
            type: 'button',
            color: 'green',
            label: expect.any(Function),
            hideWhenRefreshing: true,
            path: 'buttonValidateGotoNextSection',
            icon: 'check-circle',
            align: 'center',
            action: mockButtonValidate
        });
    });

});

describe('getButtonValidateAndGotoNextSection labels', () => {
    const widgetConfig = getButtonValidateAndGotoNextSection(translatableKey, options);

    test('should return the right label for title', () => {
        const mockedT = jest.fn();
        const title = widgetConfig.label;
        expect(title).toBeDefined();
        utilHelpers.translateString(title, { t: mockedT } as any, interviewAttributesForTestCases, 'path');
        expect(mockedT).toHaveBeenCalledWith([`customSurvey:${translatableKey}`, translatableKey]);
    });

});

describe('getButtonValidateAndGotoNextSection button action', () => {
    const widgetConfig = getButtonValidateAndGotoNextSection(translatableKey, options);

    test('test button action', () => {
        expect(mockButtonValidate).not.toHaveBeenCalled();
        const action = widgetConfig.action;
        action({ startUpdateInterview: jest.fn(), startAddGroupedObjects: jest.fn(), startRemoveGroupedObjects: jest.fn() }, interviewAttributesForTestCases, 'path', 'segments', {});
        expect(mockButtonValidate).toHaveBeenCalled();
    })
});