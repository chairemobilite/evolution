/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { calculateTimeDistanceByMode, getTransitSummary, getTransitAccessibilityMap } from '../';
import each from 'jest-each';
import { getTimeAndDistanceFromTransitionApi, summaryFromTransitionApi, transitAccessibilityMapFromTransitionApi } from '../RouteCalculationFromTransition';
import projectConfig from '../../../config/projectConfig';

jest.mock('../RouteCalculationFromTransition', () => ({
    getTimeAndDistanceFromTransitionApi: jest.fn(),
    summaryFromTransitionApi: jest.fn(),
    transitAccessibilityMapFromTransitionApi: jest.fn()
}));
const mockedRouteFromTransition = getTimeAndDistanceFromTransitionApi as jest.MockedFunction<typeof getTimeAndDistanceFromTransitionApi>;
const mockedSummaryFromTransition = summaryFromTransitionApi as jest.MockedFunction<typeof summaryFromTransitionApi>;
const mockedAccessibilityMapFromTransition = transitAccessibilityMapFromTransitionApi as jest.MockedFunction<typeof transitAccessibilityMapFromTransitionApi>;

beforeEach(() => {
    jest.clearAllMocks();
})

describe('calculateTimeDistanceByMode: invalid parameters', () => {

    each([
        ['Invalid origin', 'origin', { type: 'LineString' as const, coordinates: [[0, 0], [1, 1]] }, 'Invalid origin or destination'],
        ['Invalid destination', 'destination', { type: 'LineString' as const, coordinates: [[0, 0], [1, 1]] }, 'Invalid origin or destination'],
        ['Negative trip time', 'departureSecondsSinceMidnight', -1, 'Invalid departure time'],
        ['Mixed day/month in date', 'departureDateString', '2024-23-05', 'Invalid trip date'],
        ['Invalid date string', 'departureDateString', 'not a date', 'Invalid trip date'],
    ]).test('Invalid parameters: %s', async (_, testedParam, value, expected) => {
        const validParameters = {
            origin: { type: 'Point' as const, coordinates: [0, 0] },
            destination: { type: 'Point' as const, coordinates: [0, 0] },
            departureSecondsSinceMidnight: 10000,
            departureDateString: '2024-05-23'
        };
        const parameters = { ...validParameters, [testedParam]: value };
        await expect(calculateTimeDistanceByMode(['walking'], parameters)).rejects.toThrow(expected);
    });

    test('No scenario, but transit requested', async () => {
        const validParameters = {
            origin: { type: 'Point' as const, coordinates: [0, 0] },
            destination: { type: 'Point' as const, coordinates: [0, 0] },
            departureSecondsSinceMidnight: 10000,
            departureDateString: '2024-05-23'
        };
        await expect(calculateTimeDistanceByMode(['walking', 'transit'], validParameters)).rejects.toThrow('Transit mode requested without a scenario');
    });

});

describe('calculateTimeDistanceByMode with Transition', () => {

    beforeEach(() => {
        projectConfig.transitionApi = {
            url: 'http://transition',
            username: 'user',
            password: 'password'
        };
    });
    
    test('Throw an error', async () => {
        const validParameters = {
            origin: { type: 'Point' as const, coordinates: [0, 0] },
            destination: { type: 'Point' as const, coordinates: [0, 0] },
            departureSecondsSinceMidnight: 10000,
            departureDateString: '2024-05-23'
        };
        mockedRouteFromTransition.mockRejectedValueOnce(new Error('Transition URL not set in project config'));
        await expect(calculateTimeDistanceByMode(['walking'], validParameters)).rejects.toThrow('Transition URL not set in project config');
        expect(mockedRouteFromTransition).toHaveBeenCalledTimes(1);
        expect(mockedRouteFromTransition).toHaveBeenCalledWith(['walking'], validParameters);
    });

    test('Return calculation results', async () => {
        const validParameters = {
            origin: { type: 'Point' as const, coordinates: [0, 0] },
            destination: { type: 'Point' as const, coordinates: [0, 0] },
            departureSecondsSinceMidnight: 10000,
            departureDateString: '2024-05-23'
        };
        const routingResults = {
            walking: { status: 'success' as const, distanceM: 1000, travelTimeS: 600, source: 'transitionApi' }
        }
        mockedRouteFromTransition.mockResolvedValueOnce(routingResults);
        const result = await calculateTimeDistanceByMode(['walking'], validParameters);
        expect(mockedRouteFromTransition).toHaveBeenCalledTimes(1);
        expect(mockedRouteFromTransition).toHaveBeenCalledWith(['walking'], validParameters);
        expect(result).toEqual(routingResults);
    });

});

describe('getTransitSummary: invalid parameters', () => {

    each([
        ['Invalid origin', 'origin', { type: 'LineString' as const, coordinates: [[0, 0], [1, 1]] }, 'Invalid origin or destination'],
        ['Invalid destination', 'destination', { type: 'LineString' as const, coordinates: [[0, 0], [1, 1]] }, 'Invalid origin or destination'],
        ['Negative trip time', 'departureSecondsSinceMidnight', -1, 'Invalid departure time'],
        ['Mixed day/month in date', 'departureDateString', '2024-23-05', 'Invalid trip date'],
        ['Invalid date string', 'departureDateString', 'not a date', 'Invalid trip date'],
        ['No scenario', 'transitScenario', undefined, 'Transit summary requires a scenario'],
    ]).test('Invalid parameters: %s', async (_, testedParam, value, expected) => {
        const validParameters = {
            origin: { type: 'Point' as const, coordinates: [0, 0] },
            destination: { type: 'Point' as const, coordinates: [0, 0] },
            departureSecondsSinceMidnight: 10000,
            departureDateString: '2024-05-23',
            transitScenario: 'scenarioId'
        };
        const parameters = { ...validParameters, [testedParam]: value };
        await expect(getTransitSummary(parameters)).rejects.toThrow(expected);
    });

});

describe('getTransitSummary: with Transition', () => {
    beforeEach(() => {
        projectConfig.transitionApi = {
            url: 'http://transition',
            username: 'user',
            password: 'password'
        };
    });

    test('Throw an error', async () => {
        const validParameters = {
            origin: { type: 'Point' as const, coordinates: [0, 0] },
            destination: { type: 'Point' as const, coordinates: [0, 0] },
            departureSecondsSinceMidnight: 10000,
            departureDateString: '2024-05-23',
            transitScenario: 'scenarioId'
        };
        mockedSummaryFromTransition.mockRejectedValueOnce(new Error('Transition URL not set in project config'));
        await expect(getTransitSummary(validParameters)).rejects.toThrow('Transition URL not set in project config');
        expect(mockedSummaryFromTransition).toHaveBeenCalledTimes(1);
        expect(mockedSummaryFromTransition).toHaveBeenCalledWith(validParameters);
    });

    test('Return calculation results', async () => {
        const validParameters = {
            origin: { type: 'Point' as const, coordinates: [0, 0] },
            destination: { type: 'Point' as const, coordinates: [0, 0] },
            departureSecondsSinceMidnight: 10000,
            departureDateString: '2024-05-23',
            transitScenario: 'scenarioId'
        };
        const routingResults = {
            status: 'success' as const, 
            nbRoutes: 0,
            lines: [],
            source: 'transitionApi'
        };
        mockedSummaryFromTransition.mockResolvedValueOnce(routingResults);
        const result = await getTransitSummary(validParameters);
        expect(mockedSummaryFromTransition).toHaveBeenCalledTimes(1);
        expect(mockedSummaryFromTransition).toHaveBeenCalledWith(validParameters);
        expect(result).toEqual(routingResults);
    });

});

describe('getTransitAccessibilityMap: invalid parameters', () => {

    const validParameters = {
        point: { type: 'Point' as const, coordinates: [0, 0] },
        departureSecondsSinceMidnight: 10000,
        maxTotalTravelTimeMinutes: 30,
        numberOfPolygons: 3,
        transitScenario: 'scenarioId'
    };

    each([
        ['Invalid point', 'point', { type: 'LineString' as const, coordinates: [[0, 0], [1, 1]] }, 'Invalid point'],
        ['Negative trip time', 'departureSecondsSinceMidnight', -1, 'Invalid departure time'],
        ['Trip time too large', 'departureSecondsSinceMidnight', 29 * 3600, 'Invalid departure time'],
        ['No scenario', 'transitScenario', undefined, 'Transit accessibility map requires a scenario'],
        ['No max travel time', 'maxTotalTravelTimeMinutes', undefined, 'Invalid max total travel time'],
        ['Zero max travel time', 'maxTotalTravelTimeMinutes', 0, 'Invalid max total travel time'],
        ['Negative max travel time', 'maxTotalTravelTimeMinutes', -10, 'Invalid max total travel time'],
        ['Zero number of polygons', 'numberOfPolygons', 0, 'Invalid number of polygons'],
        ['Negative number of polygons', 'numberOfPolygons', -5, 'Invalid number of polygons'],
    ]).test('Invalid parameters: %s', async (_, testedParam, value, expected) => {
        const parameters = { ...validParameters, [testedParam]: value };
        await expect(getTransitAccessibilityMap(parameters)).rejects.toThrow(expected);
    });

});

describe('getTransitAccessibilityMap: with Transition', () => {
    beforeEach(() => {
        projectConfig.transitionApi = {
            url: 'http://transition',
            username: 'user',
            password: 'password'
        };
    });

    test('Throw an error', async () => {
        const validParameters = {
            point: { type: 'Point' as const, coordinates: [0, 0] },
            departureSecondsSinceMidnight: 10000,
            maxTotalTravelTimeMinutes: 30,
            numberOfPolygons: 3,
            transitScenario: 'scenarioId'
        };
        mockedAccessibilityMapFromTransition.mockRejectedValueOnce(new Error('Transition URL not set in project config'));
        await expect(getTransitAccessibilityMap(validParameters)).rejects.toThrow('Transition URL not set in project config');
        expect(mockedAccessibilityMapFromTransition).toHaveBeenCalledTimes(1);
        expect(mockedAccessibilityMapFromTransition).toHaveBeenCalledWith(validParameters);
    });

    test('Return calculation results', async () => {
        const validParameters = {
            point: { type: 'Point' as const, coordinates: [0, 0] },
            departureSecondsSinceMidnight: 10000,
            maxTotalTravelTimeMinutes: 30,
            numberOfPolygons: 3,
            transitScenario: 'scenarioId'
        };
        const accessibilityResult = {
            status: 'success' as const,
            polygons: {
                type: 'FeatureCollection' as const,
                features: [
                    {
                        type: 'Feature' as const,
                        geometry: {
                            type: 'MultiPolygon' as const,
                            coordinates: [[[[-73.5, 45.5], [-73.4, 45.5], [-73.4, 45.4], [-73.5, 45.4], [-73.5, 45.5]]]]
                        },
                        properties: {
                            durationSeconds: 600,
                            areaSqM: 1000000
                        }
                    }
                ]
            },
            source: 'transitionApi'
        };
        mockedAccessibilityMapFromTransition.mockResolvedValueOnce(accessibilityResult);
        const result = await getTransitAccessibilityMap(validParameters);
        expect(mockedAccessibilityMapFromTransition).toHaveBeenCalledTimes(1);
        expect(mockedAccessibilityMapFromTransition).toHaveBeenCalledWith(validParameters);
        expect(result).toEqual(accessibilityResult);
    });
});

describe('No method specified', () => {
    beforeEach(() => {
        projectConfig.transitionApi = undefined;
    });

    test('calculateTimeDistanceByMode', async () => {
        const validParameters = {
            origin: { type: 'Point' as const, coordinates: [0, 0] },
            destination: { type: 'Point' as const, coordinates: [0, 0] },
            departureSecondsSinceMidnight: 10000,
            departureDateString: '2024-05-23'
        };
        await expect(calculateTimeDistanceByMode(['walking'], validParameters)).rejects.toThrow('No routing method available');
        expect(mockedRouteFromTransition).not.toHaveBeenCalled();
    });

    test('getTransitSummary', async () => {    
        const validParameters = {
            origin: { type: 'Point' as const, coordinates: [0, 0] },
            destination: { type: 'Point' as const, coordinates: [0, 0] },
            departureSecondsSinceMidnight: 10000,
            departureDateString: '2024-05-23',
            transitScenario: 'scenarioId'
        };
        await expect(getTransitSummary(validParameters)).rejects.toThrow('No summary method available');
        expect(mockedSummaryFromTransition).not.toHaveBeenCalled();
    });

    test('getTransitAccessibilityMap', async () => {
        const validParameters = {
            point: { type: 'Point' as const, coordinates: [0, 0] },
            departureSecondsSinceMidnight: 10000,
            maxTotalTravelTimeMinutes: 30,
            numberOfPolygons: 3,
            transitScenario: 'scenarioId'
        };
        await expect(getTransitAccessibilityMap(validParameters)).rejects.toThrow('No accessibility map method available');
        expect(mockedAccessibilityMapFromTransition).not.toHaveBeenCalled();
    });
});
