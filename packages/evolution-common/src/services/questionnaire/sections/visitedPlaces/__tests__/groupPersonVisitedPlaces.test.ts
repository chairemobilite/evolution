/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';

import { PersonVisitedPlacesGroupConfigFactory } from '../groupPersonVisitedPlaces';
import { interviewAttributesForTestCases, maskFunctions, widgetFactoryOptions } from '../../../../../tests/surveys';
import * as utilHelpers from '../../../../../utils/helpers';
import { GroupConfig, VisitedPlacesSectionConfiguration, WidgetConfig } from '../../../types';
import { getActivityCategoryWidgetConfig } from '../widgetActivityCategory';
import { getActivityWidgetConfig } from '../widgetActivity';
import { getNextPlaceCategoryWidgetConfig } from '../widgetNextPlaceCategory';
import { VisitedPlaceGeographyWidgetFactory } from '../widgetsGeography';
import { VisitedPlaceShortcutWidgetFactory } from '../widgetsVisitedPlaceShortcut';

const visitedPlacesSectionConfig: VisitedPlacesSectionConfiguration = {
    type: 'visitedPlaces',
    enabled: true,
    tripDiaryMinTimeOfDay: 4 * 60 * 60, // 4h in seconds
    tripDiaryMaxTimeOfDay: 28 * 60 * 60
};

describe('PersonVisitedPlacesGroupConfigFactory widgets', () => {
    test.each([
        'personVisitedPlaces',
        'visitedPlaceActivityCategory',
        'visitedPlaceActivity',
        'visitedPlaceAlreadyVisited',
        'visitedPlaceShortcut',
        'visitedPlaceName',
        'visitedPlaceGeography',
        'visitedPlaceNextPlaceCategory'
    ])('should have a widget named %s', (widgetName) => {
        const widgetConfigs = new PersonVisitedPlacesGroupConfigFactory(
            visitedPlacesSectionConfig,
            widgetFactoryOptions
        ).getWidgetConfigs();
        const widgetNames = Object.keys(widgetConfigs);
        expect(widgetNames).toContain(widgetName);
    });

    test('should not return extra widgets', () => {
        const widgetConfigs = new PersonVisitedPlacesGroupConfigFactory(
            visitedPlacesSectionConfig,
            widgetFactoryOptions
        ).getWidgetConfigs();
        expect(Object.keys(widgetConfigs)).toHaveLength(8);
    });

    test.each([
        {
            widgetName: 'visitedPlaceActivityCategory',
            expected: (config: VisitedPlacesSectionConfiguration) =>
                getActivityCategoryWidgetConfig(config, widgetFactoryOptions)
        },
        {
            widgetName: 'visitedPlaceActivity',
            expected: (config: VisitedPlacesSectionConfiguration) => getActivityWidgetConfig(config, widgetFactoryOptions)
        },
        {
            widgetName: 'visitedPlaceNextPlaceCategory',
            expected: (config: VisitedPlacesSectionConfiguration) =>
                getNextPlaceCategoryWidgetConfig(config, widgetFactoryOptions)
        },
        {
            widgetName: 'visitedPlaceAlreadyVisited',
            expected: (config: VisitedPlacesSectionConfiguration) =>
                new VisitedPlaceShortcutWidgetFactory(config, widgetFactoryOptions).getWidgetConfigs().visitedPlaceAlreadyVisited
        },
        {
            widgetName: 'visitedPlaceShortcut',
            expected: (config: VisitedPlacesSectionConfiguration) =>
                new VisitedPlaceShortcutWidgetFactory(config, widgetFactoryOptions).getWidgetConfigs().visitedPlaceShortcut
        },
        {
            widgetName: 'visitedPlaceName',
            expected: (config: VisitedPlacesSectionConfiguration) =>
                new VisitedPlaceGeographyWidgetFactory(config, widgetFactoryOptions).getWidgetConfigs().visitedPlaceName
        },
        {
            widgetName: 'visitedPlaceGeography',
            expected: (config: VisitedPlacesSectionConfiguration) =>
                new VisitedPlaceGeographyWidgetFactory(config, widgetFactoryOptions).getWidgetConfigs()
                    .visitedPlaceGeography
        }
    ])(
        'should return the correct widget config for $widgetName',
        ({
            widgetName,
            expected
        }: {
            widgetName: string;
            expected: (config: VisitedPlacesSectionConfiguration) => WidgetConfig;
        }) => {
            const widgetConfigs = new PersonVisitedPlacesGroupConfigFactory(
                visitedPlacesSectionConfig,
                widgetFactoryOptions
            ).getWidgetConfigs();
            const widgetConfig = widgetConfigs[widgetName];
            const expectedWidgetConfig = expected(visitedPlacesSectionConfig);
            expect(maskFunctions(widgetConfig)).toEqual(maskFunctions(expectedWidgetConfig));
        }
    );
});

describe('PersonVisitedPlacesGroupConfigFactory personVisitedPlaces GroupConfig widget', () => {
    const widgetConfig = new PersonVisitedPlacesGroupConfigFactory(
        visitedPlacesSectionConfig,
        widgetFactoryOptions
    ).getWidgetConfigs().personVisitedPlaces as GroupConfig;

    test('should return the correct widget config', () => {
        expect(widgetConfig).toEqual({
            type: 'group',
            path: 'household.persons.{_activePersonId}.journeys.{_activeJourneyId}.visitedPlaces',
            title: expect.any(Function),
            filter: expect.any(Function),
            name: expect.any(Function),
            showGroupedObjectDeleteButton: false,
            deleteConfirmPopup: {
                content: expect.any(Function)
            },
            showGroupedObjectAddButton: true,
            addButtonLocation: 'both',
            widgets: [
                'visitedPlaceActivityCategory',
                'visitedPlaceActivity',
                'visitedPlaceAlreadyVisited',
                'visitedPlaceShortcut',
                'visitedPlaceName',
                'visitedPlaceGeography',
                'visitedPlaceNextPlaceCategory'
            ]
        });
    });

    describe('labels', () => {
        test('should return the right label for title', () => {
            const mockedT = jest.fn();
            const title = widgetConfig.title;
            expect(title).toBeDefined();
            utilHelpers.translateString(title, { t: mockedT } as any, interviewAttributesForTestCases, 'path');
            expect(mockedT).toHaveBeenCalledWith('visitedPlaces:personVisitedPlacesGroupTitle');
        });

        test.each([
            {
                title: 'uses escaped name when available',
                groupedObject: { name: '<b>Work place</b>', activity: 'shopping' },
                sequence: 2,
                expected: 'VisitedPlaceSequence-2 • **&lt;b&gt;Work place&lt;/b&gt;**'
            },
            {
                title: 'uses translated activity when name is missing',
                groupedObject: { activity: 'shopping' },
                sequence: 3,
                expected: 'VisitedPlaceSequence-3 • **visitedPlaces:activities:shopping**'
            },
            {
                title: 'returns sequence only when name and activity are missing',
                groupedObject: {},
                sequence: 1,
                expected: 'VisitedPlaceSequence-1'
            }
        ])('group name: %s', ({ title, groupedObject, sequence, expected }) => {
            const name = widgetConfig.name;
            expect(name).toBeDefined();
            const mockedT = jest.fn().mockImplementation((key, options) => {
                if (key === 'visitedPlaces:VisitedPlaceSequence') {
                    return `VisitedPlaceSequence-${options.count}`;
                }
                return key; // for other keys, just return the key to simplify testing
            });

            expect((name as any)(mockedT, groupedObject, sequence)).toEqual(expected);
        });

        test('should return the right label for delete confirm popup', () => {
            const deleteConfirmPopup = widgetConfig.deleteConfirmPopup;
            expect(deleteConfirmPopup).toBeDefined();
            const mockedT = jest.fn();
            utilHelpers.translateString(
                deleteConfirmPopup?.content,
                { t: mockedT } as any,
                interviewAttributesForTestCases,
                'path'
            );
            expect(mockedT).toHaveBeenCalledWith('visitedPlaces:ConfirmDeleteVisitedPlace');
        });
    });

    describe('filter', () => {
        test('should keep only the active visited place when it exists', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            utilHelpers.setResponse(interview, '_activePersonId', 'personId1');
            utilHelpers.setResponse(interview, '_activeJourneyId', 'journeyId1');
            utilHelpers.setResponse(interview, '_activeVisitedPlaceId', 'workPlace1P1');

            const groupedObjects = interview.response.household!.persons!.personId1!.journeys!.journeyId1!.visitedPlaces!;
            const filter = widgetConfig.filter;
            expect(filter).toBeDefined();
            expect((filter as any)(interview, groupedObjects)).toEqual({
                workPlace1P1: groupedObjects.workPlace1P1
            });
        });

        test('should return an empty object when there is no active visited place', () => {
            const interview = _cloneDeep(interviewAttributesForTestCases);
            utilHelpers.setResponse(interview, '_activePersonId', 'personId1');
            utilHelpers.setResponse(interview, '_activeJourneyId', 'journeyId1');
            utilHelpers.setResponse(interview, '_activeVisitedPlaceId', null);

            const groupedObjects = interview.response.household!.persons!.personId1!.journeys!.journeyId1!.visitedPlaces!;
            const filter = widgetConfig.filter;
            expect(filter).toBeDefined();
            expect((filter as any)(interview, groupedObjects)).toEqual({});
        });
    });
});

describe('PersonVisitedPlacesGroupConfigFactory personVisitedPlaces GroupConfig widget with additional widget names', () => {
    test('should return correct widget names when no duplicate', () => {
        const configWithWidgets = _cloneDeep(visitedPlacesSectionConfig);
        configWithWidgets.additionalVisitedPlacesWidgetNames = ['customWidget1', 'customWidget2'];

        const widgetConfig = new PersonVisitedPlacesGroupConfigFactory(
            configWithWidgets,
            widgetFactoryOptions
        ).getWidgetConfigs().personVisitedPlaces as GroupConfig;

        expect(widgetConfig).toEqual({
            type: 'group',
            path: 'household.persons.{_activePersonId}.journeys.{_activeJourneyId}.visitedPlaces',
            title: expect.any(Function),
            filter: expect.any(Function),
            name: expect.any(Function),
            showGroupedObjectDeleteButton: false,
            deleteConfirmPopup: {
                content: expect.any(Function)
            },
            showGroupedObjectAddButton: true,
            addButtonLocation: 'both',
            widgets: [
                'visitedPlaceActivityCategory',
                'visitedPlaceActivity',
                'visitedPlaceAlreadyVisited',
                'visitedPlaceShortcut',
                'visitedPlaceName',
                'visitedPlaceGeography',
                'customWidget1',
                'customWidget2',
                'visitedPlaceNextPlaceCategory'
            ]
        });
    });

    test('should not return duplicate widget names', () => {
        const configWithWidgets = _cloneDeep(visitedPlacesSectionConfig);
        // Include some builtin widget names in the additional widgets to test
        // that duplicates are removed and original order is preserved
        configWithWidgets.additionalVisitedPlacesWidgetNames = [
            'customWidget1',
            'visitedPlaceActivity',
            'customWidget2',
            'visitedPlaceGeography',
            'visitedPlaceNextPlaceCategory'
        ];

        const widgetConfig = new PersonVisitedPlacesGroupConfigFactory(
            configWithWidgets,
            widgetFactoryOptions
        ).getWidgetConfigs().personVisitedPlaces as GroupConfig;

        expect(widgetConfig).toEqual({
            type: 'group',
            path: 'household.persons.{_activePersonId}.journeys.{_activeJourneyId}.visitedPlaces',
            title: expect.any(Function),
            filter: expect.any(Function),
            name: expect.any(Function),
            showGroupedObjectDeleteButton: false,
            deleteConfirmPopup: {
                content: expect.any(Function)
            },
            showGroupedObjectAddButton: true,
            addButtonLocation: 'both',
            widgets: [
                'visitedPlaceActivityCategory',
                'visitedPlaceAlreadyVisited',
                'visitedPlaceShortcut',
                'visitedPlaceName',
                'customWidget1',
                'visitedPlaceActivity',
                'customWidget2',
                'visitedPlaceGeography',
                'visitedPlaceNextPlaceCategory'
            ]
        });
    });
});
