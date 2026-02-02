/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';

import { PersonTripsGroupConfigFactory } from '../groupPersonTrips';
import { interviewAttributesForTestCases, maskFunctions } from '../../../../../tests/surveys';
import * as utilHelpers from '../../../../../utils/helpers';
import { WidgetFactoryOptions } from '../../types';
import { GroupConfig, SegmentSectionConfiguration, WidgetConfig } from '../../../types';
import { SegmentsGroupConfigFactory } from '../groupSegments';
import { Mode } from '../../../../odSurvey/types';
import { getTripSegmentsIntro } from '../widgetTripSegmentsIntro';
import { getButtonSaveTripSegmentsConfig } from '../buttonSaveTripSegments';

const widgetFactoryOptions: WidgetFactoryOptions = {
    getFormattedDate: (date: string) => date,
    buttonActions: { validateButtonAction: jest.fn() },
    iconMapper: {}
};
const segmentSectionConfig = {
    type: 'segments' as const,
    enabled: true
};

describe('PersonsTripsGroupConfigFactory widgets', () => {

    test.each([
        'personTrips',
        'segmentIntro',
        'buttonSaveTrip'
    ])('should have a widget named %s', (widgetName) => {
        const widgetConfigs = new PersonTripsGroupConfigFactory(segmentSectionConfig, widgetFactoryOptions).getWidgetConfigs();
        const widgetNames = Object.keys(widgetConfigs);
        expect(widgetNames).toContain(widgetName);
    });
    
    describe('should also have all the extra widgets from the segments group', () => {
        const testSegmentSectionConfig = { ...segmentSectionConfig, modesIncludeOnly: ['walking', 'bicycle'] as Mode[]};
        const segmentGroupConfig = new SegmentsGroupConfigFactory(testSegmentSectionConfig, widgetFactoryOptions).getWidgetConfigs();

        // Make sure there are widgets, then test each one
        const segmentGroupWidgetNames = Object.keys(segmentGroupConfig);
        test('there should be widgets in the segments group', () =>  {
            expect(segmentGroupWidgetNames.length).toBeGreaterThan(0);
        });

        test.each(
            segmentGroupWidgetNames.map(widgetName => ({ widgetName, expected: segmentGroupConfig[widgetName] }))
        )('should have the segment group widget named $widgetName', ({ widgetName, expected }: { widgetName: string, expected: WidgetConfig }) => {
            const widgetConfigs = new PersonTripsGroupConfigFactory(testSegmentSectionConfig, widgetFactoryOptions).getWidgetConfigs();
            const widgetConfig = widgetConfigs[widgetName];
            expect(maskFunctions(widgetConfig)).toEqual(maskFunctions(expected));
        });
    });

    test('should not return extra widgets', () => {
        const widgetConfigs = new PersonTripsGroupConfigFactory(segmentSectionConfig, widgetFactoryOptions).getWidgetConfigs();

        // Count the widgets from the segments group config
        const segmentGroupConfig = new SegmentsGroupConfigFactory(segmentSectionConfig, widgetFactoryOptions);
        const segmentGroupWidgetConfigs = segmentGroupConfig.getWidgetConfigs();
        const segmentGroupWidgetNames = Object.keys(segmentGroupWidgetConfigs);

        // Verify if the count matches
        const widgetNames = Object.keys(widgetConfigs);
        expect(widgetNames.length).toBe(3 + segmentGroupWidgetNames.length);
    });

    test.each([
        { widgetName: 'segmentIntro', segmentSectionConfig, expected: (config: SegmentSectionConfiguration) => getTripSegmentsIntro(widgetFactoryOptions) },
        { widgetName: 'buttonSaveTrip', segmentSectionConfig: { ...segmentSectionConfig, modesIncludeOnly: ['walking', 'bicycle'] as Mode[]}, expected: (config: SegmentSectionConfiguration) => getButtonSaveTripSegmentsConfig(widgetFactoryOptions) },
    ])('should return the correct widget config for $widgetName', ({ widgetName, segmentSectionConfig, expected }: { widgetName: string, segmentSectionConfig: SegmentSectionConfiguration, expected: (config: SegmentSectionConfiguration) => WidgetConfig }) => {
        const widgetConfigs = new PersonTripsGroupConfigFactory(segmentSectionConfig, widgetFactoryOptions).getWidgetConfigs();
        const widgetConfig = widgetConfigs[widgetName];
        const expectedWidgetConfig = expected(segmentSectionConfig);
        expect(maskFunctions(widgetConfig)).toEqual(maskFunctions(expectedWidgetConfig));
    });
});

describe('PersonsTripsGroupConfigFactory main group config', () => {
    const widgetConfig = new PersonTripsGroupConfigFactory(segmentSectionConfig, widgetFactoryOptions).getWidgetConfigs()['personTrips'] as GroupConfig;
    
    describe('getPersonsTripsGroupConfig', () => {

        test('should return the correct widget config', () => {
            expect(widgetConfig).toEqual({
                type: 'group',
                path: 'household.persons.{_activePersonId}.journeys.{_activeJourneyId}.trips',
                title: expect.any(Function),
                filter: expect.any(Function),
                showTitle: false,
                showGroupedObjectDeleteButton: false,
                showGroupedObjectAddButton: false,
                widgets: [
                    'segmentIntro',
                    'segments',
                    'buttonSaveTrip'
                ]
            });
        });

    });

    describe('getPersonsTripsGroupConfig labels', () => {
        test('should return the right label for title', () => {
            const mockedT = jest.fn();
            const title = widgetConfig.title;
            expect(title).toBeDefined();
            utilHelpers.translateString(title, { t: mockedT } as any, interviewAttributesForTestCases, 'path');
            expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:TripsTitle', 'segments:TripsTitle']);
        });

    });

    describe('getPersonsTripsGroupConfig filter', () => {
        jest.spyOn(utilHelpers, 'getResponse').mockReturnValue({});
        const mockedGetResponse = utilHelpers.getResponse as jest.MockedFunction<typeof utilHelpers.getResponse>;
        
        const filter = widgetConfig.filter;

        const groupedObjects = {
            trip1: { _uuid: 'trip1', _sequence: 1 },
            trip2: { _uuid: 'trip2', _sequence: 2 }
        }

        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('should return empty element is no active trip ID', () => {
            mockedGetResponse.mockReturnValue(null);
            expect(filter!(interviewAttributesForTestCases, groupedObjects)).toEqual({})
            expect(mockedGetResponse).toHaveBeenCalledWith(interviewAttributesForTestCases, '_activeTripId', null);
        });

        test('should return empty object if active trip ID does not exist in group objects', () => {
            mockedGetResponse.mockReturnValue(null);
            expect(filter!(interviewAttributesForTestCases, groupedObjects)).toEqual({})
            expect(mockedGetResponse).toHaveBeenCalledWith(interviewAttributesForTestCases, '_activeTripId', null);
        });

        test('should return only the active trip if active trip ID exists', () => {
            mockedGetResponse.mockReturnValue('trip1');
            expect(filter!(interviewAttributesForTestCases, groupedObjects)).toEqual({ trip1: groupedObjects.trip1 });
            expect(mockedGetResponse).toHaveBeenCalledWith(interviewAttributesForTestCases, '_activeTripId', null);
        });

    });

});
