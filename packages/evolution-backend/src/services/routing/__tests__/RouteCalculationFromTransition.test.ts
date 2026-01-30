/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { getTimeAndDistanceFromTransitionApi, summaryFromTransitionApi, transitAccessibilityMapFromTransitionApi } from '../RouteCalculationFromTransition';
import fetchMock from 'jest-fetch-mock';
import projectConfig from '../../../config/projectConfig';

beforeEach(() => {
    jest.clearAllMocks();
    // Default value for transition URL
    projectConfig.transitionApi = {
        url: 'https://transition.url',
        username: 'username',
        password: 'password'
    };
});

const bearerToken = 'tokenDataFromTransition';

describe('Test various values for the Transition URL', () => {
    const params = {
        origin: {
            type: 'Point' as const,
            coordinates: [0, 0]
        },
        destination: {
            type: 'Point' as const,
            coordinates: [1, 1]
        },
        departureSecondsSinceMidnight: 0,
        departureDateString: '2022-01-01'
    }
    const defaultResponse = {
        result: {
            'walking': {
                paths: [{
                    distanceMeters: 100,
                    travelTimeSeconds: 120
                }]
            }
        }
    }

    test('Undefined URL', async () => {
        projectConfig.transitionApi = undefined;
        await expect(getTimeAndDistanceFromTransitionApi(['walking'], params))
            .rejects
            .toThrow('Transition URL not set in project config');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    test('Complete URL', async () => {
        // Prepare test data
        projectConfig.transitionApi!.url = 'https://transition.url';
        fetchMock.mockResponseOnce(bearerToken);
        fetchMock.mockResponseOnce(JSON.stringify(defaultResponse));

        // Call the function
        await getTimeAndDistanceFromTransitionApi(['walking'], params);

        // Fetch mock should be called twice, once for the token, once for the route
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock).toHaveBeenCalledWith(
            'https://transition.url/token', 
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ usernameOrEmail: 'username', password: 'password' })
            })
        );
        expect(fetchMock).toHaveBeenCalledWith('https://transition.url/api/v1/route?withGeojson=false', expect.objectContaining({ 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${bearerToken}`
            }
        }));
    });

    test('No HTTP', async () => {
        // Prepare test data
        projectConfig.transitionApi!.url = 'transition.url';
        fetchMock.mockResponseOnce(bearerToken);
        fetchMock.mockResponseOnce(JSON.stringify(defaultResponse));

        // Call the function
        await getTimeAndDistanceFromTransitionApi(['walking'], params);

        // Fetch mock should be called twice, once for the token, once for the route
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock).toHaveBeenCalledWith(
            'http://transition.url/token', 
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ usernameOrEmail: 'username', password: 'password' })
            })
        );
        expect(fetchMock).toHaveBeenCalledWith('http://transition.url/api/v1/route?withGeojson=false', expect.objectContaining({ 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${bearerToken}`
            }
        }));
    });

    test('With port', async () => {
        // Prepare test data
        projectConfig.transitionApi!.url = 'https://localhost:8080';
        fetchMock.mockResponseOnce(bearerToken);
        fetchMock.mockResponseOnce(JSON.stringify(defaultResponse));

        // Call the function
        await getTimeAndDistanceFromTransitionApi(['walking'], params);

        // Fetch mock should be called twice, once for the token, once for the route
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock).toHaveBeenCalledWith(
            'https://localhost:8080/token', 
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ usernameOrEmail: 'username', password: 'password' })
            })
        );
        expect(fetchMock).toHaveBeenCalledWith('https://localhost:8080/api/v1/route?withGeojson=false', expect.objectContaining({ 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${bearerToken}`
            }
        }));
    });

    test('Expired token', async () => {
        const newBearerToken = 'newTokenForTheHttpUrl';
        // Prepare test data, this url already exists and should have a token already
        projectConfig.transitionApi!.url = 'transition.url';
        // First call will return 401, second call return a token, this call should be ok
        const tokenExpiredMessage = 'DatabaseTokenExpired';
        fetchMock.mockResponseOnce(JSON.stringify(tokenExpiredMessage), { status: 401 });
        fetchMock.mockResponseOnce(newBearerToken);
        fetchMock.mockResponseOnce(JSON.stringify(defaultResponse));

        // Call the function
        await getTimeAndDistanceFromTransitionApi(['walking'], params);

        // Fetch mock should be called 3 times, once for the token and twice for the route, with different tokens
        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(fetchMock).toHaveBeenCalledWith(
            'http://transition.url/token', 
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({ usernameOrEmail: 'username', password: 'password' })
            })
        );
        expect(fetchMock).toHaveBeenCalledWith('http://transition.url/api/v1/route?withGeojson=false', expect.objectContaining({ 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${bearerToken}`
            }
        }));
        expect(fetchMock).toHaveBeenCalledWith('http://transition.url/api/v1/route?withGeojson=false', expect.objectContaining({ 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${newBearerToken}`
            }
        }));
    });
});

describe('getTimeAndDistanceFromTransitionApi: Test various Transition calls', () => {
    const params = {
        origin: {
            type: 'Point' as const,
            coordinates: [0, 0]
        },
        destination: {
            type: 'Point' as const,
            coordinates: [1, 1]
        },
        departureSecondsSinceMidnight: 0,
        departureDateString: '2022-01-01'
    }

    test('fetch failing', async () => {
        fetchMock.mockRejectedValueOnce(new Error('Failed to fetch'));
        const result = await getTimeAndDistanceFromTransitionApi(['walking'], params);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            'https://transition.url/api/v1/route?withGeojson=false',
            expect.objectContaining({ 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${bearerToken}`
                },
                body: JSON.stringify({
                    routingModes: ['walking'],
                    originGeojson: params.origin,
                    destinationGeojson: params.destination,
                    departureTimeSecondsSinceMidnight: 0,
                    scenarioId: undefined
                })
            })
        );
        expect(result).toEqual({
            walking: { status: 'error', error: 'Error: Failed to fetch', source: 'transitionApi' }
        });
    });

    test('Bad request response', async () => {
        const badRequestMessage = 'Some parameter error';
        fetchMock.mockResponseOnce(JSON.stringify(badRequestMessage), { status: 400 });
        const result = await getTimeAndDistanceFromTransitionApi(['walking'], params);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            'https://transition.url/api/v1/route?withGeojson=false',
            expect.objectContaining({ 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${bearerToken}`
                },
                body: JSON.stringify({
                    routingModes: ['walking'],
                    originGeojson: params.origin,
                    destinationGeojson: params.destination,
                    departureTimeSecondsSinceMidnight: 0,
                    scenarioId: undefined
                })
            })
        );
        expect(result).toEqual({
            walking: { status: 'error', error: `Error: Unsuccessful response code from transition: 400`, source: 'transitionApi' }
        });
    });

    test('Server error response', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}), { status: 500 });
        const result = await getTimeAndDistanceFromTransitionApi(['walking'], params);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            'https://transition.url/api/v1/route?withGeojson=false',
            expect.objectContaining({ 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${bearerToken}`
                },
                body: JSON.stringify({
                    routingModes: ['walking'],
                    originGeojson: params.origin,
                    destinationGeojson: params.destination,
                    departureTimeSecondsSinceMidnight: 0,
                    scenarioId: undefined
                })
            })
        );
        expect(result).toEqual({
            walking: { status: 'error', error: `Error: Unsuccessful response code from transition: 500`, source: 'transitionApi' }
        });
    });

    test('Correct response, but somes modes unresponded', async () => {
        const response = {
            result: {
                'walking': {
                    paths: [{
                        distanceMeters: 100,
                        travelTimeSeconds: 120
                    }]
                },
                'cycling': {
                    paths: [{
                        distanceMeters: 105,
                        travelTimeSeconds: 60
                    }]
                }
            }
        }

        fetchMock.mockResponseOnce(JSON.stringify(response));
        const result = await getTimeAndDistanceFromTransitionApi(['walking', 'transit', 'cycling'], params);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            'https://transition.url/api/v1/route?withGeojson=false',
            expect.objectContaining({ 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${bearerToken}`
                },
                body: JSON.stringify({
                    routingModes: ['walking', 'transit', 'cycling'],
                    originGeojson: params.origin,
                    destinationGeojson: params.destination,
                    departureTimeSecondsSinceMidnight: 0,
                    scenarioId: undefined
                })
            })
        );
        expect(result).toEqual({
            walking: { status: 'success', distanceM: 100, travelTimeS: 120, geojson: undefined, source: 'transitionApi' },
            cycling: { status: 'success', distanceM: 105, travelTimeS: 60, geojson: undefined, source: 'transitionApi' },
            transit: { status: 'no_routing_found', source: 'transitionApi' }
        });
    });

    test('Correct and complete response', async () => {
        const response = {
            result: {
                walking: {
                    paths: [{
                        distanceMeters: 100,
                        travelTimeSeconds: 120
                    }]
                },
                cycling: {
                    paths: [{
                        distanceMeters: 105,
                        travelTimeSeconds: 60
                    }]
                },
                transit: {
                    paths: [{
                        totalTravelTime: 300,
                        totalDistance: 200,
                        departureTime: 5
                    }]
                },
                driving: {
                    paths: []
                }
            }
        }

        fetchMock.mockResponseOnce(JSON.stringify(response));
        const result = await getTimeAndDistanceFromTransitionApi(['walking', 'transit', 'cycling', 'driving'], params);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            'https://transition.url/api/v1/route?withGeojson=false',
            expect.objectContaining({ 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${bearerToken}`
                },
                body: JSON.stringify({
                    routingModes: ['walking', 'transit', 'cycling', 'driving'],
                    originGeojson: params.origin,
                    destinationGeojson: params.destination,
                    departureTimeSecondsSinceMidnight: 0,
                    scenarioId: undefined
                })
            })
        );
        expect(result).toEqual({
            walking: { status: 'success', distanceM: 100, travelTimeS: 120, source: 'transitionApi' },
            cycling: { status: 'success', distanceM: 105, travelTimeS: 60, source: 'transitionApi' },
            transit: { status: 'success', distanceM: 200, travelTimeS: 300, source: 'transitionApi' },
            driving: { status: 'no_routing_found', source: 'transitionApi' }
        });
    });

});

describe('summaryFromTransitionApi', () => {
    const params = {
        origin: {
            type: 'Point' as const,
            coordinates: [0, 0]
        },
        destination: {
            type: 'Point' as const,
            coordinates: [1, 1]
        },
        departureSecondsSinceMidnight: 0,
        departureDateString: '2022-01-01',
        transitScenario: 'scenarioId'
    }

    test('fetch failing', async () => {
        fetchMock.mockRejectedValueOnce(new Error('Failed to fetch'));
        const result = await summaryFromTransitionApi(params);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            'https://transition.url/api/v1/summary',
            expect.objectContaining({ 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${bearerToken}`
                },
                body: JSON.stringify({
                    originGeojson: params.origin,
                    destinationGeojson: params.destination,
                    departureTimeSecondsSinceMidnight: 0,
                    scenarioId: params.transitScenario
                })
            })
        );
        expect(result).toEqual({ status: 'error', error: 'Error: Failed to fetch', source: 'transitionApi' });
    });

    test('Bad request response', async () => {
        const badRequestMessage = 'Some parameter error';
        fetchMock.mockResponseOnce(JSON.stringify(badRequestMessage), { status: 400 });
        const result = await summaryFromTransitionApi(params);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            'https://transition.url/api/v1/summary',
            expect.objectContaining({ 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${bearerToken}`
                },
                body: JSON.stringify({
                    originGeojson: params.origin,
                    destinationGeojson: params.destination,
                    departureTimeSecondsSinceMidnight: 0,
                    scenarioId: params.transitScenario
                })
            })
        );
        expect(result).toEqual({ status: 'error', error: `Error: Unsuccessful response code from transition: 400`, source: 'transitionApi' });
    });

    test('Server error response', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}), { status: 500 });
        const result = await summaryFromTransitionApi(params);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            'https://transition.url/api/v1/summary',
            expect.objectContaining({ 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${bearerToken}`
                },
                body: JSON.stringify({
                    originGeojson: params.origin,
                    destinationGeojson: params.destination,
                    departureTimeSecondsSinceMidnight: 0,
                    scenarioId: params.transitScenario
                })
            })
        );
        expect(result).toEqual({ status: 'error', error: `Error: Unsuccessful response code from transition: 500`, source: 'transitionApi' });
    });

    test('Correct and complete response', async () => {
        const response = {
            status: 'success',
            query: {
                origin: params.origin,
                destination: params.destination,
                timeOfTrip: params.departureSecondsSinceMidnight,
                timeType: 0
            },
            result: {
                nbRoutes: 3,
                lines: [
                    {
                        lineUuid: 'line1',
                        lineShortname: 'l1',
                        lineLongname: 'Line 1',
                        agencyUuid: 'agency1',
                        agencyName: 'Agency 1',
                        agencyAcronym: 'AG',
                        alternativeCount: 2
                    },
                    {
                        lineUuid: 'line2',
                        lineShortname: 'l2',
                        lineLongname: 'Line 2',
                        agencyUuid: 'agency1',
                        agencyName: 'Agency 1',
                        agencyAcronym: 'AG',
                        alternativeCount: 1
                    }
                ]
            }
        }

        fetchMock.mockResponseOnce(JSON.stringify(response));
        const result = await summaryFromTransitionApi(params);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            'https://transition.url/api/v1/summary',
            expect.objectContaining({ 
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${bearerToken}`
                },
                body: JSON.stringify({
                    originGeojson: params.origin,
                    destinationGeojson: params.destination,
                    departureTimeSecondsSinceMidnight: 0,
                    scenarioId: params.transitScenario
                })
            })
        );
        expect(result).toEqual({
            status: 'success', 
            nbRoutes: response.result.nbRoutes,
            lines: response.result.lines,
            source: 'transitionApi'
        });
    });

});

describe('transitAccessibilityMapFromTransitionApi', () => {
    const params = {
        point: {
            type: 'Point' as const,
            coordinates: [-73.5, 45.5]
        },
        departureSecondsSinceMidnight: 28800,
        maxTotalTravelTimeMinutes: 30,
        numberOfPolygons: 3,
        transitScenario: 'scenarioId'
    };

    test('Undefined URL', async () => {
        projectConfig.transitionApi = undefined;
        await expect(transitAccessibilityMapFromTransitionApi(params))
            .rejects
            .toThrow('Transition URL not set in project config');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    test('fetch failing', async () => {
        fetchMock.mockRejectedValueOnce(new Error('Failed to fetch'));
        const result = await transitAccessibilityMapFromTransitionApi(params);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            'https://transition.url/api/v1/accessibility?withGeojson=true',
            expect.objectContaining({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${bearerToken}`
                },
                body: JSON.stringify({
                    locationGeojson: params.point,
                    departureTimeSecondsSinceMidnight: params.departureSecondsSinceMidnight,
                    scenarioId: params.transitScenario,
                    numberOfPolygons: params.numberOfPolygons,
                    maxTotalTravelTimeSeconds: params.maxTotalTravelTimeMinutes * 60,
                    calculatePois: false
                })
            })
        );
        expect(result).toEqual({ status: 'error', error: 'Error: Failed to fetch', source: 'transitionApi' });
    });

    test('Bad request response', async () => {
        const badRequestMessage = 'Some parameter error';
        fetchMock.mockResponseOnce(JSON.stringify(badRequestMessage), { status: 400 });
        const result = await transitAccessibilityMapFromTransitionApi(params);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            'https://transition.url/api/v1/accessibility?withGeojson=true',
            expect.objectContaining({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${bearerToken}`
                },
                body: JSON.stringify({
                    locationGeojson: params.point,
                    departureTimeSecondsSinceMidnight: params.departureSecondsSinceMidnight,
                    scenarioId: params.transitScenario,
                    numberOfPolygons: params.numberOfPolygons,
                    maxTotalTravelTimeSeconds: params.maxTotalTravelTimeMinutes * 60,
                    calculatePois: false
                })
            })
        );
        expect(result).toEqual({ status: 'error', error: `Error: Bad request to transition: "${badRequestMessage}"`, source: 'transitionApi' });
    });

    test('Server error response', async () => {
        fetchMock.mockResponseOnce(JSON.stringify({}), { status: 500 });
        const result = await transitAccessibilityMapFromTransitionApi(params);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            'https://transition.url/api/v1/accessibility?withGeojson=true',
            expect.objectContaining({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${bearerToken}`
                },
                body: JSON.stringify({
                    locationGeojson: params.point,
                    departureTimeSecondsSinceMidnight: params.departureSecondsSinceMidnight,
                    scenarioId: params.transitScenario,
                    numberOfPolygons: params.numberOfPolygons,
                    maxTotalTravelTimeSeconds: params.maxTotalTravelTimeMinutes * 60,
                    calculatePois: false
                })
            })
        );
        expect(result).toEqual({ status: 'error', error: `Error: Unsuccessful response code from transition: 500`, source: 'transitionApi' });
    });

    test.each([
        {
            description: 'without POIs',
            testParams: params,
            expectedParams: { locationGeojson: params.point, departureTimeSecondsSinceMidnight: params.departureSecondsSinceMidnight, scenarioId: params.transitScenario, numberOfPolygons: params.numberOfPolygons, maxTotalTravelTimeSeconds: params.maxTotalTravelTimeMinutes * 60, calculatePois: false },
            response: {
                result: {
                    nodes: [
                        {
                            id: 'node1',
                            code: '001',
                            name: 'Station A'
                        },
                        {
                            id: 'node2',
                            code: '002',
                            name: 'Station B'
                        }
                    ],
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
                            },
                            {
                                type: 'Feature' as const,
                                geometry: {
                                    type: 'MultiPolygon' as const,
                                    coordinates: [[[[-73.6, 45.6], [-73.5, 45.6], [-73.5, 45.5], [-73.6, 45.5], [-73.6, 45.6]]]]
                                },
                                properties: {
                                    durationSeconds: 1200,
                                    areaSqM: 2000000
                                }
                            }
                        ]
                    }
                }
            },
            expectPoiVerification: false
        },
        {
            description: 'with POIs',
            testParams: { ...params, calculatePois: true },
            expectedParams: { locationGeojson: params.point, departureTimeSecondsSinceMidnight: params.departureSecondsSinceMidnight, scenarioId: params.transitScenario, numberOfPolygons: params.numberOfPolygons, maxTotalTravelTimeSeconds: params.maxTotalTravelTimeMinutes * 60, calculatePois: true },
            response: {
                result: {
                    nodes: [
                        {
                            id: 'node1',
                            code: '001',
                            name: 'Station A'
                        }
                    ],
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
                                    areaSqM: 1000000,
                                    accessiblePlacesCountByCategory: {
                                        'restaurant': 25,
                                        'cafe': 15
                                    },
                                    accessiblePlacesCountByDetailedCategory: {
                                        'italian_restaurant': 10,
                                        'french_restaurant': 15,
                                        'coffee_shop': 15
                                    }
                                }
                            }
                        ]
                    }
                }
            },
            expectPoiVerification: true
        }, {
            description: 'with optional parameters',
            testParams: { ...params, calculatePois: false, maxAccessEgressTravelTimeMinutes: 10, walkingSpeedKmPerHour: 3.6 },
            expectedParams: {
                locationGeojson: params.point,
                departureTimeSecondsSinceMidnight: params.departureSecondsSinceMidnight,
                scenarioId: params.transitScenario,
                numberOfPolygons: params.numberOfPolygons,
                maxTotalTravelTimeSeconds: params.maxTotalTravelTimeMinutes * 60,
                calculatePois: false,
                maxAccessEgressTravelTimeSeconds: 10 * 60,
                walkingSpeedMps: 1
            },
            response: {
                result: {
                    nodes: [
                        {
                            id: 'node1',
                            code: '001',
                            name: 'Station A'
                        },
                        {
                            id: 'node2',
                            code: '002',
                            name: 'Station B'
                        }
                    ],
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
                            },
                            {
                                type: 'Feature' as const,
                                geometry: {
                                    type: 'MultiPolygon' as const,
                                    coordinates: [[[[-73.6, 45.6], [-73.5, 45.6], [-73.5, 45.5], [-73.6, 45.5], [-73.6, 45.6]]]]
                                },
                                properties: {
                                    durationSeconds: 1200,
                                    areaSqM: 2000000
                                }
                            }
                        ]
                    }
                }
            },
            expectPoiVerification: false
        },
    ])('Correct and complete response $description', async ({ testParams, expectedParams, response, expectPoiVerification }) => {
        fetchMock.mockResponseOnce(JSON.stringify(response));
        const result = await transitAccessibilityMapFromTransitionApi(testParams);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith(
            'https://transition.url/api/v1/accessibility?withGeojson=true',
            expect.objectContaining({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${bearerToken}`
                },
                body: JSON.stringify(expectedParams)
            })
        );
        expect(result).toEqual({
            status: 'success',
            polygons: response.result.polygons,
            source: 'transitionApi'
        });
        
        // Verify POI data is preserved when expected
        if (expectPoiVerification && result.status === 'success' && result.polygons.features[0].properties) {
            expect(result.polygons.features[0].properties.accessiblePlacesCountByCategory).toEqual({
                'restaurant': 25,
                'cafe': 15
            });
        }
    });

});