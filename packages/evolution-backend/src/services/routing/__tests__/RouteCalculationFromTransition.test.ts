/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import route from '../RouteCalculationFromTransition';
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

test('Get bearer token once', async () => {
    // This first should call the token endpoint first and it will be set for the next calls
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
    
    fetchMock.mockResponseOnce(bearerToken);
    fetchMock.mockResponseOnce(JSON.stringify(defaultResponse));
    await route(['walking'], params);
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
        await expect(route(['walking'], params))
            .rejects
            .toThrow('Transition URL not set in project config');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    test('Complete URL', async () => {
        projectConfig.transitionApi!.url = 'https://transition.url';
        fetchMock.mockResponseOnce(JSON.stringify(defaultResponse));
        await route(['walking'], params);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith('https://transition.url/api/v1/route?withGeojson=false', expect.objectContaining({ method: 'POST' }));

    });

    test('No HTTP', async () => {
        projectConfig.transitionApi!.url = 'transition.url';
        fetchMock.mockResponseOnce(JSON.stringify(defaultResponse));
        await route(['walking'], params);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith('http://transition.url/api/v1/route?withGeojson=false', expect.objectContaining({ method: 'POST' }));
    });

    test('With port', async () => {
        projectConfig.transitionApi!.url = 'https://localhost:8080';
        fetchMock.mockResponseOnce(JSON.stringify(defaultResponse));
        await route(['walking'], params);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith('https://localhost:8080/api/v1/route?withGeojson=false', expect.objectContaining({ method: 'POST' }));
    });
});

describe('Test various Transition calls', () => {
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
        const result = await route(['walking'], params);
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
        const result = await route(['walking'], params);
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
        const result = await route(['walking'], params);
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
        const result = await route(['walking', 'transit', 'cycling'], params);
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
        const result = await route(['walking', 'transit', 'cycling', 'driving'], params);
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

