/*
 * Copyright 2026, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { ActivityWidgetFactory } from '../index';
import { widgetFactoryOptions, maskFunctions } from '../../../../../tests/surveys';
import { getActivityWidgetConfig } from '../widgetActivity';
import { getActivityCategoryWidgetConfig } from '../widgetActivityCategory';
import { WidgetConfig, VisitedPlacesSectionConfiguration, QuestionWidgetConfig, InputRadioType } from '../../../types';

const visitedPlacesSectionConfig: VisitedPlacesSectionConfiguration = {
    type: 'visitedPlaces' as const,
    enabled: true
};

describe('ActivityWidgetFactory', () => {
    
    describe('getWidgetConfigs', () => {
        test('should return an object with activityCategory and activity widget configs', () => {
            const factory = new ActivityWidgetFactory(visitedPlacesSectionConfig, widgetFactoryOptions);
            const widgetConfigs = factory.getWidgetConfigs();

            expect(widgetConfigs).toEqual(
                expect.objectContaining({
                    activityCategory: expect.any(Object),
                    activity: expect.any(Object)
                })
            );
            expect(Object.keys(widgetConfigs)).toHaveLength(2);
        });

        test('should return the correct activityCategory widget config', () => {
            const factory = new ActivityWidgetFactory(visitedPlacesSectionConfig, widgetFactoryOptions);
            const widgetConfigs = factory.getWidgetConfigs();

            const expectedConfig = getActivityCategoryWidgetConfig(visitedPlacesSectionConfig, widgetFactoryOptions);
            expect(maskFunctions(widgetConfigs.activityCategory)).toEqual(maskFunctions(expectedConfig));
        });

        test('should return the correct activity widget config', () => {
            const factory = new ActivityWidgetFactory(visitedPlacesSectionConfig, widgetFactoryOptions);
            const widgetConfigs = factory.getWidgetConfigs();

            const expectedConfig = getActivityWidgetConfig(visitedPlacesSectionConfig, widgetFactoryOptions);
            expect(maskFunctions(widgetConfigs.activity)).toEqual(maskFunctions(expectedConfig));
        });

        test('should throw when section is disabled and no activities available', () => {
            const disabledConfig: VisitedPlacesSectionConfiguration = {
                type: 'visitedPlaces',
                enabled: false
            };
            const factory = new ActivityWidgetFactory(disabledConfig, widgetFactoryOptions);

            expect(() => factory.getWidgetConfigs()).toThrow('No available activity categories to create activityCategory widget configuration');
        });

        test('should respect activities filter in returned configs', () => {
            const filteredConfig: VisitedPlacesSectionConfiguration = {
                type: 'visitedPlaces',
                enabled: true,
                activitiesIncludeOnly: ['home', 'workUsual', 'shopping']
            };
            const factory = new ActivityWidgetFactory(filteredConfig, widgetFactoryOptions);
            const widgetConfigs = factory.getWidgetConfigs();

            // The activity widget should contain only filtered activities
            const activityChoices = (widgetConfigs.activity as any).choices;
            const allowedActivities = ['home', 'workUsual', 'shopping'];
            const activityValues = activityChoices.map((choice: any) => choice.value);
            
            activityValues.forEach((value: string) => {
                expect(allowedActivities).toContain(value);
            });
        });

        test('should respect activities exclude in returned configs', () => {
            const excludeConfig: VisitedPlacesSectionConfiguration = {
                type: 'visitedPlaces',
                enabled: true,
                activityExclude: ['dontKnow', 'preferNotToAnswer']
            };
            const factory = new ActivityWidgetFactory(excludeConfig, widgetFactoryOptions);
            const widgetConfigs = factory.getWidgetConfigs();

            // The activity widget should not contain excluded activities
            const activityChoices = (widgetConfigs.activity as any).choices;
            const excludedActivities = ['dontKnow', 'preferNotToAnswer'];
            const activityValues = activityChoices.map((choice: any) => choice.value);
            
            activityValues.forEach((value: string) => {
                expect(excludedActivities).not.toContain(value);
            });
        });
    });

    describe('multiple instances', () => {
        test('should create independent instances with different configs', () => {
            const config1: VisitedPlacesSectionConfiguration = {
                type: 'visitedPlaces',
                enabled: true,
                activitiesIncludeOnly: ['home', 'shopping']
            };
            const config2: VisitedPlacesSectionConfiguration = {
                type: 'visitedPlaces',
                enabled: true,
                activitiesIncludeOnly: ['workUsual', 'schoolUsual']
            };

            const factory1 = new ActivityWidgetFactory(config1, widgetFactoryOptions);
            const factory2 = new ActivityWidgetFactory(config2, widgetFactoryOptions);

            const configs1 = factory1.getWidgetConfigs();
            const configs2 = factory2.getWidgetConfigs();

            // Both should have the same widget structure but different activity choices
            expect(Object.keys(configs1)).toEqual(Object.keys(configs2));
            
            const choices1 = (configs1.activity as any).choices.map((c: any) => c.value);
            const choices2 = (configs2.activity as any).choices.map((c: any) => c.value);
            
            expect(choices1).not.toEqual(choices2);
        });
    });
});