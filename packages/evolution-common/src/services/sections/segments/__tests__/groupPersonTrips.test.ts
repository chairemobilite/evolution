/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';

import { getPersonsTripsGroupConfig } from '../groupPersonTrips';
import { interviewAttributesForTestCases } from '../../../../tests/surveys';
import * as utilHelpers from '../../../../utils/helpers';
import { t } from 'i18next';

describe('getPersonsTripsGroupConfig', () => {

    test('should return the correct widget config', () => {
        const widgetConfig = getPersonsTripsGroupConfig();
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
    const widgetConfig = getPersonsTripsGroupConfig({});

    test('should return the right label for title', () => {
        const mockedT = jest.fn();
        const title = widgetConfig.title;
        expect(title).toBeDefined();
        utilHelpers.translateString(title, { t: mockedT } as any, interviewAttributesForTestCases, 'path');
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:segments:TripsTitle', 'segments:TripsTitle']);
    });

});

describe('getPersonsTripsGroupConfig filter', () => {
    const widgetConfig = getPersonsTripsGroupConfig({});

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
