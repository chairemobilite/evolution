/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';

import { SegmentsGroupConfigFactory } from '../groupSegments';
import { interviewAttributesForTestCases, maskFunctions, widgetFactoryOptions } from '../../../../../tests/surveys';
import * as utilHelpers from '../../../../../utils/helpers';
import { GroupConfig, SegmentSectionConfiguration, WidgetConfig } from '../../../types';
import { getModePreWidgetConfig } from '../widgetSegmentModePre';
import { getSameAsReverseTripWidgetConfig } from '../widgetSameAsReverseTrip';
import { getModeWidgetConfig } from '../widgetSegmentMode';
import { getSegmentHasNextModeWidgetConfig } from '../widgetSegmentHasNextMode';
import { Mode } from '../../../../odSurvey/types';

const segmentSectionConfig = {
    type: 'segments' as const,
    enabled: true
};

describe('SegmentsGroupConfigFactory widgets', () => {

    test.each([
        'segments',
        'segmentSameModeAsReverseTrip',
        'segmentModePre',
        'segmentMode',
        'segmentHasNextMode'
    ])('should have a widget named %s', (widgetName) => {
        const widgetConfigs = new SegmentsGroupConfigFactory(segmentSectionConfig, widgetFactoryOptions).getWidgetConfigs();
        const widgetNames = Object.keys(widgetConfigs);
        expect(widgetNames).toContain(widgetName);
    });

    test('should not return extra widgets', () => {
        const widgetConfigs = new SegmentsGroupConfigFactory(segmentSectionConfig, widgetFactoryOptions).getWidgetConfigs();
        const widgetNames = Object.keys(widgetConfigs);
        expect(widgetNames.length).toBe(5);
    });

    test.each([
        { widgetName: 'segmentSameModeAsReverseTrip', segmentSectionConfig, expected: (config: SegmentSectionConfiguration) => getSameAsReverseTripWidgetConfig(widgetFactoryOptions) },
        { widgetName: 'segmentModePre', segmentSectionConfig: { ...segmentSectionConfig, modesIncludeOnly: ['walking', 'bicycle'] as Mode[]}, expected: (config: SegmentSectionConfiguration) => getModePreWidgetConfig(config, widgetFactoryOptions) },
        { widgetName: 'segmentMode', segmentSectionConfig: { ...segmentSectionConfig, modesIncludeOnly: ['walking', 'bicycle'] as Mode[]}, expected: (config: SegmentSectionConfiguration) => getModeWidgetConfig(config, widgetFactoryOptions) },
        { widgetName: 'segmentHasNextMode', segmentSectionConfig, expected: (config: SegmentSectionConfiguration) => getSegmentHasNextModeWidgetConfig(widgetFactoryOptions) }
    ])('should return the correct widget config for $widgetName', ({ widgetName, segmentSectionConfig, expected }: { widgetName: string, segmentSectionConfig: SegmentSectionConfiguration, expected: (config: SegmentSectionConfiguration) => WidgetConfig }) => {
        const widgetConfigs = new SegmentsGroupConfigFactory(segmentSectionConfig, widgetFactoryOptions).getWidgetConfigs();
        const widgetConfig = widgetConfigs[widgetName];
        const expectedWidgetConfig = expected(segmentSectionConfig);
        expect(maskFunctions(widgetConfig)).toEqual(maskFunctions(expectedWidgetConfig));
    });
});

describe('SegmentsGroupConfigFactory segments GroupConfig widget', () => {
    const widgetConfig = new SegmentsGroupConfigFactory(segmentSectionConfig, widgetFactoryOptions).getWidgetConfigs()['segments'] as GroupConfig;

    test('should return the correct widget config', () => {

        expect(widgetConfig).toEqual({
            type: 'group',
            path: 'segments',
            title: expect.any(Function),
            name: expect.any(Function),
            showTitle: false,
            showGroupedObjectDeleteButton: expect.any(Function),
            showGroupedObjectAddButton: expect.any(Function),
            groupedObjectAddButtonLabel: expect.any(Function),
            addButtonLocation: 'bottom' as const,
            widgets: [
                'segmentSameModeAsReverseTrip',
                'segmentModePre',
                'segmentMode',
                'segmentHasNextMode'
            ]
        });
    });

    describe('getSegmentsGroupConfig labels', () => {

        test('should return the right label for title', () => {
            const mockedT = jest.fn();
            const title = widgetConfig.title;
            expect(title).toBeDefined();
            utilHelpers.translateString(title, { t: mockedT } as any, interviewAttributesForTestCases, 'path');
            expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:GroupTitle', 'segments:GroupTitle']);
        });

        test('should return the right label for group name', () => {
            const mockedT = jest.fn();
            const name = widgetConfig.name;
            expect(name).toBeDefined();
            (name as any)(mockedT, {}, 2);
            expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:GroupName', 'segments:GroupName'], { sequence: 2 });
        });

        test('should return the right label for add button', () => {
            const mockedT = jest.fn();
            const addButtonLabel = widgetConfig.groupedObjectAddButtonLabel;
            expect(addButtonLabel).toBeDefined();

            // Call the function with a path with no segments
            jest.spyOn(utilHelpers, 'getResponse').mockReturnValue({});
            utilHelpers.translateString(addButtonLabel, { t: mockedT } as any, interviewAttributesForTestCases, 'path');
            expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:AddButtonLabel', 'segments:AddButtonLabel'], { count: 0 });

            // Call the function with a path with segments
            jest.spyOn(utilHelpers, 'getResponse').mockReturnValue({ segment1: { _uuid: 'segment1', _sequence: 1}});
            utilHelpers.translateString(addButtonLabel, { t: mockedT } as any, interviewAttributesForTestCases, 'path');
            expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:AddButtonLabel', 'segments:AddButtonLabel'], { count: 1 });
        });

        test('should return the right label for delete button', () => {
            const deleteButtonLabel = widgetConfig.groupedObjectDeleteButtonLabel;
            expect(deleteButtonLabel).toBeUndefined();
        });
    });

    describe('getSegmentsGroupConfig show add button', () => {

        jest.spyOn(utilHelpers, 'getResponse').mockReturnValue({});
        const mockedGetResponse = utilHelpers.getResponse as jest.MockedFunction<typeof utilHelpers.getResponse>;

        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('should show the add button if no segments yet', () => {
            mockedGetResponse.mockReturnValue({});
            const showAddButton = widgetConfig.showGroupedObjectAddButton;
            expect(showAddButton).toBeDefined();
            expect((showAddButton as any)(interviewAttributesForTestCases, 'path')).toBe(true);
            expect(mockedGetResponse).toHaveBeenCalledWith(interviewAttributesForTestCases, 'path', {});
        });

        test('shoud show the add button if the last segment has next mode', () => {
            mockedGetResponse.mockReturnValue({ segment1: { _uuid: 'segment1', _sequence: 1, hasNextMode: true }, segment2: { _uuid: 'segment2', _sequence: 2, hasNextMode: true }});
            const showAddButton = widgetConfig.showGroupedObjectAddButton;
            expect(showAddButton).toBeDefined();
            expect((showAddButton as any)(interviewAttributesForTestCases, 'path')).toBe(true);
            expect(mockedGetResponse).toHaveBeenCalledWith(interviewAttributesForTestCases, 'path', {});
        });

        test('shoud not show add button if the last segment has no next mode', () => {
            mockedGetResponse.mockReturnValue({ segment1: { _uuid: 'segment1', _sequence: 1, hasNextMode: false }});
            const showAddButton = widgetConfig.showGroupedObjectAddButton;
            expect(showAddButton).toBeDefined();
            expect((showAddButton as any)(interviewAttributesForTestCases, 'path')).toBe(false);
            expect(mockedGetResponse).toHaveBeenCalledWith(interviewAttributesForTestCases, 'path', {});
        });

        test('shoud not show add button if the last segment has next mode not set', () => {
            mockedGetResponse.mockReturnValue({ segment1: { _uuid: 'segment1', _sequence: 1 }});
            const showAddButton = widgetConfig.showGroupedObjectAddButton;
            expect(showAddButton).toBeDefined();
            expect((showAddButton as any)(interviewAttributesForTestCases, 'path')).toBe(false);
            expect(mockedGetResponse).toHaveBeenCalledWith(interviewAttributesForTestCases, 'path', {});
        });

    });

    describe('getSegmentsGroupConfig show delete button', () => {

        jest.spyOn(utilHelpers, 'getResponse').mockReturnValue({});
        const mockedGetResponse = utilHelpers.getResponse as jest.MockedFunction<typeof utilHelpers.getResponse>;

        beforeEach(() => {
            jest.clearAllMocks();
        });

        test('should show the delete button if segment is not first', () => {
            mockedGetResponse.mockReturnValue({ _uuid: 'segment2', _sequence: 2 });
            const showDeleteButton = widgetConfig.showGroupedObjectDeleteButton;
            expect(showDeleteButton).toBeDefined();
            expect((showDeleteButton as any)(interviewAttributesForTestCases, 'path')).toBe(true);
            expect(mockedGetResponse).toHaveBeenCalledWith(interviewAttributesForTestCases, 'path', null);
        });

        test('shoud not show the delete button if segment is first', () => {
            mockedGetResponse.mockReturnValue({ _uuid: 'segment2', _sequence: 1 });
            const showDeleteButton = widgetConfig.showGroupedObjectDeleteButton;
            expect(showDeleteButton).toBeDefined();
            expect((showDeleteButton as any)(interviewAttributesForTestCases, 'path')).toBe(false);
            expect(mockedGetResponse).toHaveBeenCalledWith(interviewAttributesForTestCases, 'path', null);
        });

        test('shoud not show delete button if segment does not exist', () => {
            mockedGetResponse.mockReturnValue(null);
            const showDeleteButton = widgetConfig.showGroupedObjectDeleteButton;
            expect(showDeleteButton).toBeDefined();
            expect((showDeleteButton as any)(interviewAttributesForTestCases, 'path')).toBe(false);
            expect(mockedGetResponse).toHaveBeenCalledWith(interviewAttributesForTestCases, 'path', null);
        });

    });
});
