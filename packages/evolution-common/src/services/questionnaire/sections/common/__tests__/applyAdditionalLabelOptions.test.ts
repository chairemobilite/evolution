/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _cloneDeep from 'lodash/cloneDeep';
import { interviewAttributesForTestCases } from '../../../../../tests/surveys';
import { VisitedPlacesSectionConfiguration } from '../../../types';
import { TFunction } from 'i18next';
import { applySectionAdditionalLabelOptions } from '../applyAdditionalLabelOptions';

const defaultVisitedPlaceConfig: VisitedPlacesSectionConfiguration = {
    type: 'visitedPlaces' as const,
    enabled: true,
    tripDiaryMinTimeOfDay: 4 * 60 * 60, // 4h in seconds
    tripDiaryMaxTimeOfDay: 28 * 60 * 60 // 28h in seconds (i.e. 4h the next day)
};

describe('applyVisitedPlaceAdditionalLabelOptions', () => {
    const defaultWidgetConfig = {
        type: 'question' as const,
        inputType: 'string' as const,
        path: 'test',
        label: jest.fn()
    };

    test('no additional options functions', () => {
        // Setup widget configs
        const widgetsConfig = { testWidget: defaultWidgetConfig };

        // apply option functions
        const updatedWidgetsConfig = applySectionAdditionalLabelOptions(widgetsConfig, defaultVisitedPlaceConfig.additionalLabelOptionFunctions);
        // Updated config should be identical to the original
        expect(updatedWidgetsConfig).toBe(widgetsConfig);
    });

    test('test with an additional options function for a single widget', () => {
        // Setup widget configs
        const widgetsConfig = { testWidget: defaultWidgetConfig };
        // Setup configuration with some functions
        const sectionConfig = _cloneDeep(defaultVisitedPlaceConfig);
        sectionConfig.additionalLabelOptionFunctions = { testWidget: jest.fn() }

        // Apply the configuration
        const updatedWidgetsConfig = applySectionAdditionalLabelOptions(widgetsConfig, sectionConfig.additionalLabelOptionFunctions);
        expect(updatedWidgetsConfig).not.toBe(widgetsConfig);
        expect(updatedWidgetsConfig).toEqual({
            testWidget: {
                ...defaultWidgetConfig,
                label: expect.any(Function)
            }
        });
    });

    test('test with an additional options function for text field', () => {
        const widgetsConfig = {
            testWidget: {
                type: 'text' as const,
                text: jest.fn()
            }
        };
        const sectionConfig = _cloneDeep(defaultVisitedPlaceConfig);
        sectionConfig.additionalLabelOptionFunctions = { testWidget: jest.fn() }

        const updatedWidgetsConfig = applySectionAdditionalLabelOptions(widgetsConfig, sectionConfig.additionalLabelOptionFunctions);
        expect(updatedWidgetsConfig).not.toBe(widgetsConfig);
        expect(updatedWidgetsConfig).toEqual({
            testWidget: {
                type: 'text',
                text: expect.any(Function)
            }
        });
    });

    test('test with an additional options function on a widget where label is not a function', () => {
        // Setup widget configs
        const widgetsConfig = { testWidget: { ...defaultWidgetConfig, label: 'hardcoded' } };
        // Setup configuration with some functions
        const sectionConfig = _cloneDeep(defaultVisitedPlaceConfig);
        sectionConfig.additionalLabelOptionFunctions = { testWidget: jest.fn() }

        // Apply the configuration
        const updatedWidgetsConfig = applySectionAdditionalLabelOptions(widgetsConfig, sectionConfig.additionalLabelOptionFunctions);
        expect(updatedWidgetsConfig.testWidget).toBe(widgetsConfig.testWidget);
    });

    test('test with many widgets, some with additional options', () => {
        // Setup widget configs
        const widgetsConfig = {
            testWidget1: defaultWidgetConfig,
            testWidget2: {
                ...defaultWidgetConfig,
                label: jest.fn()
            }
        };
        // Setup configuration with some functions for testWidget2 (testWidget1 should remain unchanged)
        const sectionConfig = _cloneDeep(defaultVisitedPlaceConfig);
        sectionConfig.additionalLabelOptionFunctions = { testWidget2: jest.fn() }

        // Apply the configuration
        const updatedWidgetsConfig = applySectionAdditionalLabelOptions(widgetsConfig, sectionConfig.additionalLabelOptionFunctions);
        expect(updatedWidgetsConfig).toEqual({
            testWidget1: {
                ...defaultWidgetConfig,
                label: expect.any(Function)
            },
            testWidget2: {
                ...defaultWidgetConfig,
                label: expect.any(Function)
            }
        });
        // testWidget1 should be the same, testWidget2 should be different
        expect(updatedWidgetsConfig.testWidget1).toBe(widgetsConfig.testWidget1);
        expect(updatedWidgetsConfig.testWidget2).not.toBe(widgetsConfig.testWidget2);
    });

    test.each([
        {
            testCase: 'label function with only the key',
            originalFunction: (t: TFunction) => t('test.key'),
            additionalOptions: { interpolation: 'hello' },
            expected: ['test.key', { interpolation: 'hello' }]
        },
        {
            testCase: 'label function with other options and array of keys',
            originalFunction: (t: TFunction) => t(['test.key_withContext', 'test.key'], { opt1: 'value' }),
            additionalOptions: { interpolation: 'hello', otherInterpolation: '' },
            expected: [['test.key_withContext', 'test.key'], { opt1: 'value', interpolation: 'hello', otherInterpolation: '' }]
        },
        {
            testCase: 'unsupported with more than two parameters',
            originalFunction: (t: TFunction) => t('test.key', 'default', { opt1: 'value' }),
            additionalOptions: { interpolation: 'hello', otherInterpolation: '' },
            expected: ['test.key', 'default', { opt1: 'value' }]
        },
        {
            testCase: 'unsupported with default string as second parameter',
            originalFunction: (t: TFunction) => t('test.key', 'default'),
            additionalOptions: { interpolation: 'hello', otherInterpolation: '' },
            expected: ['test.key', 'default']
        }
    ])('$testCase', ({ originalFunction, additionalOptions, expected }) => {
        // Setup widget configs with the original function
        const widgetsConfig = { testWidget: { ...defaultWidgetConfig, label: originalFunction } };
        // Setup configuration with some functions
        const sectionConfig = _cloneDeep(defaultVisitedPlaceConfig);
        const mockedAdditionalOptionFct = jest.fn().mockReturnValue(additionalOptions);
        sectionConfig.additionalLabelOptionFunctions = { testWidget: mockedAdditionalOptionFct }

        // Apply the configuration
        const updatedWidgetsConfig = applySectionAdditionalLabelOptions(widgetsConfig, sectionConfig.additionalLabelOptionFunctions);

        // Call the `label` function with interview data and make sure the `t` function was correctly called
        const interview = _cloneDeep(interviewAttributesForTestCases);
        const updatedLblFunction = (updatedWidgetsConfig.testWidget as any).label;
        const mockedT = jest.fn().mockReturnValue('translated')
        const path = 'household.persons.personId1.journeys.journeyId1.visitedPlaces.workPlace1P1';
        const lbl = updatedLblFunction(mockedT, interview, path);

        // Validate the various calls.
        expect(mockedAdditionalOptionFct).toHaveBeenCalledWith({
            interview,
            t: mockedT,
            path
        })
        expect(mockedT).toHaveBeenCalledWith(...expected);
        expect(lbl).toEqual('translated');
    })
});
