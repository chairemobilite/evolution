/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';

import { getSegmentsModeConfig } from '../groupSegments';
import { interviewAttributesForTestCases } from '../../../../tests/surveys';
import * as utilHelpers from '../../../../utils/helpers';

describe('getSegmentsModeConfig', () => {

    test('should return the correct widget config', () => {
        const widgetConfig = getSegmentsModeConfig();
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

});

describe('getSegmentsModeConfig labels', () => {
    const widgetConfig = getSegmentsModeConfig({});

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

describe('getSegmentsModeConfig show add button', () => {
    const widgetConfig = getSegmentsModeConfig({});

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

describe('getSegmentsModeConfig show delete button', () => {
    const widgetConfig = getSegmentsModeConfig({});

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
