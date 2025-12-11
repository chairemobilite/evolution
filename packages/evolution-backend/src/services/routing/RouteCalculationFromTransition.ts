/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

// This file contains route calculation utilities that can be used by the
// survey. They call the Transition public API, with the instance configuration
// set in the project configuration or environment variables
import { RoutingOrTransitMode } from 'chaire-lib-common/lib/config/routingModes';
import {
    AccessibilityMapCalculationParameter,
    AccessibilityMapResult,
    RouteCalculationParameter,
    RoutingTimeDistanceResultByMode,
    SummaryResult
} from './types';
import projectConfig from '../../config/projectConfig';
import { URL } from 'url';
import { SummaryResponse } from 'chaire-lib-common/lib/api/TrRouting/trRoutingApiV2';
import { TrRoutingApiNode } from 'chaire-lib-common/lib/api/TrRouting';

// A name for this calculation source
const CALCULATION_SOURCE = 'transitionApi';

/**
 * A class that encapsulates the Transition URL and public API token. When the
 * token expires, or if the user is not authorized, it will attempt to fetch a
 * new token.
 */
class TransitionApiHandler {
    private token: string | undefined = undefined;
    private transitionUrl: URL;
    private tokenFetchPromise: Promise<string> | undefined = undefined;

    constructor(transitionUrl: string) {
        this.transitionUrl = new URL(transitionUrl.startsWith('http') ? transitionUrl : `http://${transitionUrl}`);
    }

    private async fetchToken(): Promise<string> {
        const tokenUrl = new URL(this.transitionUrl.toString());
        tokenUrl.pathname = '/token';
        const response = await fetch(tokenUrl.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                usernameOrEmail: projectConfig.transitionApi!.username,
                password: projectConfig.transitionApi!.password
            })
        });

        if (response.status !== 200) {
            throw new Error(`Cannot get token from transition: ${response.status}`);
        }

        const tokenResponse = await response.text();
        this.token = tokenResponse;
        return tokenResponse;
    }

    public async getToken(): Promise<string> {
        if (this.token !== undefined) {
            return this.token;
        }
        // FIXME Every request will attempt to get a token, even if the previous one
        // failed. Should we cache the error and not retry? Or retry only after x
        // time, possibly using an exponential backoff?

        // If we are already fetching the token, return the current fetch promise
        if (this.tokenFetchPromise !== undefined) {
            return this.tokenFetchPromise;
        }
        // Otherwise set the current promise and return it. This promise will
        // reset to undefined at the end of the fetch
        this.tokenFetchPromise = new Promise<string>((resolve, reject) => {
            this.fetchToken()
                .then((token) => resolve(token))
                .catch((error) => reject(error))
                .finally(() => {
                    this.tokenFetchPromise = undefined;
                });
        });
        return this.tokenFetchPromise;
    }

    public async fetchWithToken(url: string, options: RequestInit): Promise<Response> {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                Authorization: `Bearer ${await this.getToken()}`
            }
        });

        if (response.status === 401) {
            // Token might have expired, fetch a new one and retry
            this.token = undefined;
            const newToken = await this.getToken();
            return fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    Authorization: `Bearer ${newToken}`
                }
            });
        }

        return response;
    }

    public getTransitionUrl(pathname: string): URL {
        const url = new URL(this.transitionUrl.toString());
        url.pathname = pathname;
        return url;
    }
}

const transitionApiHandler: { [url: string]: TransitionApiHandler } = {} as { [url: string]: TransitionApiHandler };
const getTransitionApiHandler = (url: string | undefined): TransitionApiHandler | undefined => {
    if (url !== undefined && transitionApiHandler[url] === undefined) {
        transitionApiHandler[url] = new TransitionApiHandler(url);
    }
    return url === undefined ? undefined : transitionApiHandler[url];
};

/**
 * Calculate the routes for a list of modes
 * @param modes The list of modes to calculate the routes for
 * @param parameters The parameters for the route calculation
 */
export const getTimeAndDistanceFromTransitionApi = async (
    modes: RoutingOrTransitMode[],
    parameters: RouteCalculationParameter
): Promise<RoutingTimeDistanceResultByMode> => {
    const transitionApiHandler = getTransitionApiHandler(projectConfig.transitionApi?.url);
    if (transitionApiHandler === undefined) {
        throw new Error('Transition URL not set in project config');
    }

    const transitionUrlObj = transitionApiHandler.getTransitionUrl('/api/v1/route');
    transitionUrlObj.searchParams.append('withGeojson', 'false');

    try {
        const response = await transitionApiHandler.fetchWithToken(transitionUrlObj.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
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

/**
 * Get a summary of the possibles lines to use for a route
 * @param parameters The parameters for the summary calculation
 */
export const summaryFromTransitionApi = async (parameters: RouteCalculationParameter): Promise<SummaryResult> => {
    const transitionApiHandler = getTransitionApiHandler(projectConfig.transitionApi?.url);
    if (transitionApiHandler === undefined) {
        throw new Error('Transition URL not set in project config');
    }

    const transitionUrlObj = transitionApiHandler.getTransitionUrl('/api/v1/summary');

    try {
        const response = await transitionApiHandler.fetchWithToken(transitionUrlObj.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                originGeojson: parameters.origin,
                destinationGeojson: parameters.destination,
                departureTimeSecondsSinceMidnight: parameters.departureSecondsSinceMidnight,
                scenarioId: parameters.transitScenario
            })
        });

        if (response.status !== 200) {
            throw new Error(`Unsuccessful response code from transition: ${response.status}`);
        }
        const routingResponse = (await response.json()) as SummaryResponse;
        return routingResponse.status === 'success'
            ? {
                status: 'success',
                nbRoutes: routingResponse.result.nbRoutes,
                lines: routingResponse.result.lines,
                source: CALCULATION_SOURCE
            }
            : {
                status: 'error',
                error: routingResponse.errorCode,
                source: CALCULATION_SOURCE
            };
    } catch (error) {
        console.error('Error fetching transition summary', error);
        return {
            status: 'error',
            error: String(error),
            source: CALCULATION_SOURCE
        };
    }
};

// FIXME Those types come from transit API, they should be in chaire-lib so we can import them
type AccessibilityMapAPIResultResponse = {
    nodes: TrRoutingApiNode[];
    polygons: {
        type: 'FeatureCollection';
        features: Array<{
            type: 'Feature';
            geometry: GeoJSON.MultiPolygon;
            properties: {
                durationSeconds: number;
                areaSqM: number;
                accessiblePlacesCountByCategory?: { [category: string]: number };
                accessiblePlacesCountByDetailedCategory?: { [detailedCategory: string]: number };
            };
        }>;
    };
};

export type AccessibilityMapAPIResponse = {
    result: AccessibilityMapAPIResultResponse;
};

/**
 * Return the transit accessibility maps from a given location
 * @param parameters The parameters for the accessibility map calculation
 */
export const transitAccessibilityMapFromTransitionApi = async function (
    parameters: AccessibilityMapCalculationParameter
): Promise<AccessibilityMapResult> {
    const transitionApiHandler = getTransitionApiHandler(projectConfig.transitionApi?.url);
    if (transitionApiHandler === undefined) {
        throw new Error('Transition URL not set in project config');
    }

    const transitionUrlObj = transitionApiHandler.getTransitionUrl('/api/v1/accessibility');
    // We need the geojson query parameter for the accessibility map polygons
    transitionUrlObj.searchParams.append('withGeojson', 'true');

    try {
        const response = await transitionApiHandler.fetchWithToken(transitionUrlObj.toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                locationGeojson: parameters.point,
                departureTimeSecondsSinceMidnight: parameters.departureSecondsSinceMidnight,
                scenarioId: parameters.transitScenario,
                numberOfPolygons: parameters.numberOfPolygons ?? 1,
                maxTotalTravelTimeSeconds: parameters.maxTotalTravelTimeMinutes * 60,
                calculatePois: parameters.calculatePois === true
            })
        });

        if (response.status !== 200) {
            throw new Error(`Unsuccessful response code from transition: ${response.status}`);
        }
        const routingResponse = (await response.json()) as AccessibilityMapAPIResponse;
        return {
            status: 'success',
            polygons: routingResponse.result.polygons,
            source: CALCULATION_SOURCE
        };
    } catch (error) {
        console.error('Error fetching transition accessibility map', error);
        return {
            status: 'error',
            error: String(error),
            source: CALCULATION_SOURCE
        };
    }
};
