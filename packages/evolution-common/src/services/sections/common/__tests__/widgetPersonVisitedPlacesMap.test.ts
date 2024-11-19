/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import _cloneDeep from 'lodash/cloneDeep';
import { getPersonVisitedPlacesMapConfig } from '../widgetPersonVisitedPlacesMap';
import { interviewAttributesForTestCases } from '../../../../tests/surveys';
import * as odHelpers from '../../../odSurvey/helpers';
import projectConfig from '../../../../config/project.config';
import { pointsToBezierCurve } from '../../../geodata/SurveyGeographyUtils';
import { VisitedPlace } from '../../../interviews/interview';

jest.mock('../../../odSurvey/helpers', () => ({
    getActivePerson: jest.fn().mockReturnValue({}),
    getActiveJourney: jest.fn().mockReturnValue({}),
    getCountOrSelfDeclared: jest.fn().mockReturnValue(1),
    getVisitedPlacesArray: jest.fn().mockReturnValue([]),
    getVisitedPlaceGeography: jest.fn().mockReturnValue(null)
}));
const mockedGetActivePerson = odHelpers.getActivePerson as jest.MockedFunction<typeof odHelpers.getActivePerson>;
const mockedGetActiveJourney = odHelpers.getActiveJourney as jest.MockedFunction<typeof odHelpers.getActiveJourney>;
const mockedGetCountOrSelfDeclared = odHelpers.getCountOrSelfDeclared as jest.MockedFunction<typeof odHelpers.getCountOrSelfDeclared>;
const mockedGetVisitedPlacesArray = odHelpers.getVisitedPlacesArray as jest.MockedFunction<typeof odHelpers.getVisitedPlacesArray>;
const mockedGetVisitedPlaceGeography = odHelpers.getVisitedPlaceGeography as jest.MockedFunction<typeof odHelpers.getVisitedPlaceGeography>;

// Mock points to Bezier by returning a simple line string with the coordinates
jest.mock('../../../geodata/SurveyGeographyUtils', () => ({
    pointsToBezierCurve: jest.fn().mockImplementation((points: GeoJSON.Point[]) => ({ type: 'Feature', geometry: { type: 'LineString', properties: {}, coordinates: points.map(point => point.coordinates) } }))
}));
const mockedPointsToBezierCurve = pointsToBezierCurve as jest.MockedFunction<typeof pointsToBezierCurve>;

const mockGetFormattedDate = jest.fn().mockReturnValue('formattedDate');

beforeEach(() => {
    jest.clearAllMocks();
});

describe('personVisitedPlacesMapConfig', () => {
    it('should return the correct widget config', () => {

        const options = {
            context: jest.fn(),
            getFormattedDate: mockGetFormattedDate
        };

        const widgetConfig = getPersonVisitedPlacesMapConfig(options);

        expect(widgetConfig).toEqual({
            type: 'infoMap',
            path: 'household.persons.{_activePersonId}.journeys.{_activeJourneyId}.visitedPlacesMap',
            defaultCenter: projectConfig.mapDefaultCenter,
            title: expect.any(Function),
            linestringColor: '#0000ff',
            geojsons: expect.any(Function)
        });
    });
});

describe('personVisitedPlacesMapConfig title', () => {

    const options = {
        context: jest.fn().mockImplementation((context: string) => context),
        getFormattedDate: mockGetFormattedDate
    };

    const widgetTitle = getPersonVisitedPlacesMapConfig(options).title as any;
    const mockedT = jest.fn().mockReturnValue('translatedString');
   
    test('should call translation with correct parameters if no active person', () => {
        mockedGetActivePerson.mockReturnValueOnce(null);
        mockedGetActiveJourney.mockReturnValueOnce(null);
        expect(widgetTitle(mockedT, interviewAttributesForTestCases, 'path')).toEqual('translatedString');
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:survey:TripsMap', 'survey:TripsMap'], {
            context: 'undated',
            count: 1,
            nickname: '',
            journeyDates: null
        });
        expect(options.context).toHaveBeenCalledWith('undated');
    });

    test('should call translation with correct parameters if no active journey', () => {
        const nickname = 'Jane'
        mockedGetActivePerson.mockReturnValueOnce({ _uuid: 'person1', _sequence: 1, nickname });
        mockedGetActiveJourney.mockReturnValueOnce(null);
        expect(widgetTitle(mockedT, interviewAttributesForTestCases, 'path')).toEqual('translatedString');
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:survey:TripsMap', 'survey:TripsMap'], {
            context: 'undated',
            count: 1,
            nickname,
            journeyDates: null
        });
        expect(options.context).toHaveBeenCalledWith('undated');
    });

    test('should call translation with correct parameters if one person household and no journey dates', () => {
        mockedGetActivePerson.mockReturnValueOnce({ _uuid: 'person1', _sequence: 1 });
        mockedGetActiveJourney.mockReturnValueOnce({ _uuid: 'journey1', _sequence: 1 });
        expect(widgetTitle(mockedT, interviewAttributesForTestCases, 'path')).toEqual('translatedString');
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:survey:TripsMap', 'survey:TripsMap'], {
            context: 'undated',
            count: 1,
            nickname: '',
            journeyDates: null
        });
        expect(options.context).toHaveBeenCalledWith('undated');
    });

    test('should call translation with correct parameters if multiple person household and journey with start date', () => {
        const nickname = 'Jane'
        mockedGetActivePerson.mockReturnValueOnce({ _uuid: 'person1', _sequence: 1, nickname });
        mockedGetActiveJourney.mockReturnValueOnce({ _uuid: 'journey1', _sequence: 1, startDate: '2024-11-18' });
        mockedGetCountOrSelfDeclared.mockReturnValueOnce(2);
        expect(widgetTitle(mockedT, interviewAttributesForTestCases, 'path')).toEqual('translatedString');
        expect(mockedT).toHaveBeenCalledWith(['customSurvey:survey:TripsMap', 'survey:TripsMap'], {
            context: undefined,
            count: 2,
            nickname,
            journeyDates: 'formattedDate'
        });
        expect(options.context).toHaveBeenCalledWith(undefined);
    });

});

describe('personVisitedPlacesMapConfig geojsons', () => {

    const options = {
        context: jest.fn().mockImplementation((context: string) => context),
        getFormattedDate: mockGetFormattedDate
    };

    const widgetGeojsons = getPersonVisitedPlacesMapConfig(options).geojsons as any;
    const mockedT = jest.fn().mockReturnValue('translatedString');
    const person = { _uuid: 'person1', _sequence: 1 };
    const journey = { _uuid: 'journeyId1', _sequence: 1 };
   
    test('should return empty features collections when no person', () => {
        mockedGetActivePerson.mockReturnValueOnce(null);
        mockedGetActiveJourney.mockReturnValueOnce(journey);
        expect(widgetGeojsons(interviewAttributesForTestCases)).toEqual({
            points: {
                type: 'FeatureCollection',
                features: []
            },
            linestrings: {
                type: 'FeatureCollection',
                features: []
            }
        });
        expect(mockedGetVisitedPlacesArray).not.toHaveBeenCalled();
        expect(mockedGetVisitedPlaceGeography).not.toHaveBeenCalled();
    });

    test('should return empty features collections if no active journey', () => {
        mockedGetActivePerson.mockReturnValueOnce(person);
        mockedGetActiveJourney.mockReturnValueOnce(null);
        expect(widgetGeojsons(interviewAttributesForTestCases)).toEqual({
            points: {
                type: 'FeatureCollection',
                features: []
            },
            linestrings: {
                type: 'FeatureCollection',
                features: []
            }
        });
        expect(mockedGetVisitedPlacesArray).not.toHaveBeenCalled();
        expect(mockedGetVisitedPlaceGeography).not.toHaveBeenCalled();
    });

    test('should return empty features collections if no active visitedPlaces', () => {
        mockedGetActivePerson.mockReturnValueOnce(person);
        mockedGetActiveJourney.mockReturnValueOnce(journey);
        mockedGetVisitedPlacesArray.mockReturnValueOnce([]);
        expect(widgetGeojsons(interviewAttributesForTestCases)).toEqual({
            points: {
                type: 'FeatureCollection',
                features: []
            },
            linestrings: {
                type: 'FeatureCollection',
                features: []
            }
        });
        expect(mockedGetVisitedPlacesArray).toHaveBeenCalledWith({ journey });
        expect(mockedGetVisitedPlaceGeography).not.toHaveBeenCalled();
    });

    test('should return points and lines features if visited places with geography', () => {
        const visitedPlaces: VisitedPlace[] = [{
            _uuid: 'place1',
            _sequence: 1,
            name: 'home',
            activity: 'home',
            geography: { type: 'Feature', properties: { lastAction: 'mapClicked' }, geometry: { type: 'Point', coordinates: [0, 0] } }
        }, {
            _uuid: 'place2',
            _sequence: 2,
            name: 'place2',
            activity: 'work',
            geography: { type: 'Feature', properties: { lastAction: 'mapClicked' }, geometry: { type: 'Point', coordinates: [1, 1] } }
        }, {
            _uuid: 'place3',
            _sequence: 3,
            name: 'place3',
            activity: 'shopping',
            geography: { type: 'Feature', properties: { lastAction: 'mapClicked' }, geometry: { type: 'Point', coordinates: [0, 1] } }
        }, {
            _uuid: 'place4',
            _sequence: 3,
            name: 'home',
            activity: 'home',
            geography: { type: 'Feature', properties: { lastAction: 'mapClicked' }, geometry: { type: 'Point', coordinates: [0, 0] } }
        }]
        mockedGetActivePerson.mockReturnValueOnce(person);
        mockedGetActiveJourney.mockReturnValueOnce(journey);
        mockedGetVisitedPlacesArray.mockReturnValueOnce(visitedPlaces);
        // Mock geographies for each visited place
        mockedGetVisitedPlaceGeography.mockReturnValueOnce(visitedPlaces[0].geography!);
        mockedGetVisitedPlaceGeography.mockReturnValueOnce(visitedPlaces[1].geography!);
        mockedGetVisitedPlaceGeography.mockReturnValueOnce(visitedPlaces[2].geography!);
        mockedGetVisitedPlaceGeography.mockReturnValueOnce(visitedPlaces[3].geography!);

        // Do the test
        expect(widgetGeojsons(interviewAttributesForTestCases)).toEqual({
            points: {
                type: 'FeatureCollection',
                features: [
                    { ...visitedPlaces[0].geography!, properties: { ...visitedPlaces[0].geography!.properties, icon: { url: '/dist/images/activities_icons/home_marker.svg', size: [40, 40] }, highlighted: false, label: 'home', sequence: 1 } },
                    { ...visitedPlaces[1].geography!, properties: { ...visitedPlaces[1].geography!.properties, icon: { url: '/dist/images/activities_icons/work_marker.svg', size: [40, 40] }, highlighted: false, label: 'place2', sequence: 2 } },
                    { ...visitedPlaces[2].geography!, properties: { ...visitedPlaces[2].geography!.properties, icon: { url: '/dist/images/activities_icons/shopping_marker.svg', size: [40, 40] }, highlighted: false, label: 'place3', sequence: 3 } },
                    { ...visitedPlaces[3].geography!, properties: { ...visitedPlaces[3].geography!.properties, icon: { url: '/dist/images/activities_icons/home_marker.svg', size: [40, 40] }, highlighted: false, label: 'home', sequence: 3 } }
                ]
            },
            linestrings: {
                type: 'FeatureCollection',
                features: [
                    { type: 'Feature', geometry: { type: 'LineString', properties: {}, coordinates: [[0, 0], [1, 1]] } },
                    { type: 'Feature', geometry: { type: 'LineString', properties: {}, coordinates: [[1, 1], [0, 1]] } },
                    { type: 'Feature', geometry: { type: 'LineString', properties: {}, coordinates: [[0, 1], [0, 0]] } }
                ]
            }
        });

        // Validate the function called
        expect(mockedGetVisitedPlacesArray).toHaveBeenCalledWith({ journey });
        expect(mockedGetVisitedPlaceGeography).toHaveBeenCalledTimes(visitedPlaces.length);
        expect(mockedGetVisitedPlaceGeography).toHaveBeenCalledWith({ visitedPlace: visitedPlaces[0], interview: interviewAttributesForTestCases, person });
        expect(mockedGetVisitedPlaceGeography).toHaveBeenCalledWith({ visitedPlace: visitedPlaces[1], interview: interviewAttributesForTestCases, person });
        expect(mockedGetVisitedPlaceGeography).toHaveBeenCalledWith({ visitedPlace: visitedPlaces[2], interview: interviewAttributesForTestCases, person });
        expect(mockedGetVisitedPlaceGeography).toHaveBeenCalledWith({ visitedPlace: visitedPlaces[3], interview: interviewAttributesForTestCases, person });
        expect(mockedPointsToBezierCurve).toHaveBeenCalledTimes(3);
        expect(mockedPointsToBezierCurve).toHaveBeenCalledWith([visitedPlaces[0].geography!.geometry, visitedPlaces[1].geography!.geometry], { superposedSequence: 0 });
        expect(mockedPointsToBezierCurve).toHaveBeenCalledWith([visitedPlaces[1].geography!.geometry, visitedPlaces[2].geography!.geometry], { superposedSequence: 0 });
        expect(mockedPointsToBezierCurve).toHaveBeenCalledWith([visitedPlaces[2].geography!.geometry, visitedPlaces[3].geography!.geometry], { superposedSequence: 0 });
    });

    test('should return correct points and lines features if some visited places without geography', () => {
        // Places 0 and 2 have no geography and should be ignored from map
        const visitedPlaces: VisitedPlace[] = [{
            _uuid: 'place1',
            _sequence: 1,
            name: 'home',
            activity: 'home',
        }, {
            _uuid: 'place2',
            _sequence: 2,
            name: 'place2',
            activity: 'work',
            geography: { type: 'Feature', properties: { lastAction: 'mapClicked' }, geometry: { type: 'Point', coordinates: [1, 1] } }
        }, {
            _uuid: 'place3',
            _sequence: 3,
            name: 'place3',
            activity: 'shopping',
        }, {
            _uuid: 'place4',
            _sequence: 3,
            name: 'home',
            activity: 'home',
            geography: { type: 'Feature', properties: { lastAction: 'mapClicked' }, geometry: { type: 'Point', coordinates: [0, 0] } }
        }]
        mockedGetActivePerson.mockReturnValueOnce(person);
        mockedGetActiveJourney.mockReturnValueOnce(journey);
        mockedGetVisitedPlacesArray.mockReturnValueOnce(visitedPlaces);
        // Mock geographies for each visited place
        mockedGetVisitedPlaceGeography.mockReturnValueOnce(null);
        mockedGetVisitedPlaceGeography.mockReturnValueOnce(visitedPlaces[1].geography!);
        mockedGetVisitedPlaceGeography.mockReturnValueOnce(null);
        mockedGetVisitedPlaceGeography.mockReturnValueOnce(visitedPlaces[3].geography!);

        // Do the test
        expect(widgetGeojsons(interviewAttributesForTestCases)).toEqual({
            points: {
                type: 'FeatureCollection',
                features: [
                    { ...visitedPlaces[1].geography!, properties: { ...visitedPlaces[1].geography!.properties, icon: { url: '/dist/images/activities_icons/work_marker.svg', size: [40, 40] }, highlighted: false, label: 'place2', sequence: 2 } },
                    { ...visitedPlaces[3].geography!, properties: { ...visitedPlaces[3].geography!.properties, icon: { url: '/dist/images/activities_icons/home_marker.svg', size: [40, 40] }, highlighted: false, label: 'home', sequence: 3 } }
                ]
            },
            linestrings: {
                type: 'FeatureCollection',
                features: [
                    { type: 'Feature', geometry: { type: 'LineString', properties: {}, coordinates: [[1, 1], [0, 0]] } }
                ]
            }
        });

        // Validate the function called
        expect(mockedGetVisitedPlacesArray).toHaveBeenCalledWith({ journey });
        expect(mockedGetVisitedPlaceGeography).toHaveBeenCalledTimes(visitedPlaces.length);
        expect(mockedGetVisitedPlaceGeography).toHaveBeenCalledWith({ visitedPlace: visitedPlaces[0], interview: interviewAttributesForTestCases, person });
        expect(mockedGetVisitedPlaceGeography).toHaveBeenCalledWith({ visitedPlace: visitedPlaces[1], interview: interviewAttributesForTestCases, person });
        expect(mockedGetVisitedPlaceGeography).toHaveBeenCalledWith({ visitedPlace: visitedPlaces[2], interview: interviewAttributesForTestCases, person });
        expect(mockedGetVisitedPlaceGeography).toHaveBeenCalledWith({ visitedPlace: visitedPlaces[3], interview: interviewAttributesForTestCases, person });
        expect(mockedPointsToBezierCurve).toHaveBeenCalledTimes(1);
        expect(mockedPointsToBezierCurve).toHaveBeenCalledWith([visitedPlaces[1].geography!.geometry, visitedPlaces[3].geography!.geometry], { superposedSequence: 0 });
    });

});
