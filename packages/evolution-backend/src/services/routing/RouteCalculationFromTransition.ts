/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

// This file contains route calculation utilities that can be used by the
// survey. The should call chaire-lib's routing services to calculate the route.
import { RoutingOrTransitMode } from 'chaire-lib-common/lib/config/routingModes';
import { RouteCalculationParameter, RoutingTimeDistanceResultByMode } from './types';
import projectConfig from '../../config/projectConfig';
import { URL } from 'url';

// A name for this calculation source
const CALCULATION_SOURCE = 'transitionApi';

// Cache the authentication token, as global variable for this file
// FIXME Consider using a class to encapsulate the token and calculation method
// TODO Handle token expiration. For now though, the evolution app will restart more often than the token expiration
let token: string | undefined = undefined;

const getTransitionUrl = (transitionUrl: string) =>
    new URL(transitionUrl.startsWith('http') ? transitionUrl : `http://${transitionUrl}`);

const getToken = async () => {
    if (token !== undefined) {
        return token;
    }

    const transitionUrlObj = getTransitionUrl(projectConfig.transitionApi!.url);
    transitionUrlObj.pathname = '/token';
    const response = await fetch(transitionUrlObj.toString(), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            usernameOrEmail: projectConfig.transitionApi!.username,
            password: projectConfig.transitionApi!.password
        })
    });

    // FIXME Every request will try to get a token, even if the previous one
    // failed. Should we cache the error and not retry? Or retry only after x
    // time, possibly using an exponential backoff?
    if (response.status !== 200) {
        throw new Error(`Cannot get token from transition: ${response.status}`);
    }

    const tokenResponse = await response.text();
    token = tokenResponse;
    return token;
};

/**
 * Calculate the routes for a list of modes
 * @param modes The list of modes to calculate the routes for
 * @param parameters The parameters for the route calculation
 * @param withGeojson Whether to include the GeoJSON in the response
 */
export const getTimeAndDistanceFromTransitionApi = async (
    modes: RoutingOrTransitMode[],
    parameters: RouteCalculationParameter
): Promise<RoutingTimeDistanceResultByMode> => {
    const transitionUrl = projectConfig.transitionApi?.url;
    if (transitionUrl === undefined) {
        throw new Error('Transition URL not set in project config');
    }

    const transitionUrlObj = getTransitionUrl(transitionUrl);
    transitionUrlObj.pathname = '/api/v1/route';
    transitionUrlObj.searchParams.append('withGeojson', 'false');

    try {
        const response = await fetch(transitionUrlObj.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${await getToken()}`
            },
            body: JSON.stringify({
                routingModes: modes,
                originGeojson: parameters.origin,
                destinationGeojson: parameters.destination,
                departureTimeSecondsSinceMidnight: parameters.departureSecondsSinceMidnight,
                scenarioId: parameters.transitScenario
            })
        });

        if (response.status !== 200) {
            throw new Error(`Unsuccessful response code from transition: ${response.status}`);
        }
        const routingResponse = await response.json();
        const routingResultsByMode: RoutingTimeDistanceResultByMode = {};
        modes.forEach((mode) => {
            const routingForMode = routingResponse.result[mode];

            routingResultsByMode[mode] =
                routingForMode === undefined || routingForMode.paths === undefined || routingForMode.paths.length === 0
                    ? {
                        status: 'no_routing_found',
                        source: CALCULATION_SOURCE
                    }
                    : {
                        status: 'success',
                        source: CALCULATION_SOURCE,
                        distanceM:
                              mode === 'transit'
                                  ? routingForMode.paths[0].totalDistance
                                  : routingForMode.paths[0].distanceMeters,
                        travelTimeS:
                              mode === 'transit'
                                  ? routingForMode.paths[0].totalTravelTime
                                  : routingForMode.paths[0].travelTimeSeconds
                    };
        });
        return routingResultsByMode;
    } catch (error) {
        console.error('Error fetching transition route', error);
        const routingResultsByMode: RoutingTimeDistanceResultByMode = {};
        modes.forEach((mode) => {
            routingResultsByMode[mode] = {
                status: 'error',
                error: String(error),
                source: CALCULATION_SOURCE
            };
        });
        return routingResultsByMode;
    }
};
