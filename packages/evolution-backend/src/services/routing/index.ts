/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

// This file contains route calculation utilities that can be used by the
// survey.
import moment from 'moment';
import { RoutingOrTransitMode } from 'chaire-lib-common/lib/config/routingModes';
import { getPointCoordinates } from 'chaire-lib-common/lib/services/geodata/GeoJSONUtils';
import {
    AccessibilityMapCalculationParameter,
    AccessibilityMapResult,
    RouteCalculationParameter,
    RoutingTimeDistanceResultByMode,
    SummaryResult
} from './types';
import projectConfig from '../../config/projectConfig';
import {
    getTimeAndDistanceFromTransitionApi,
    summaryFromTransitionApi,
    transitAccessibilityMapFromTransitionApi
} from './RouteCalculationFromTransition';

/**
 * Inclusive upper bound for departure time, in seconds since midnight.
 * 28h (4am the next day) is the current default, matching typical
 * `tripDiaryMaxTimeOfDay` and transit service days that run past midnight.
 * Other surveys may end at a different hour (1am, 5am, …). This bound may
 * become configurable.
 */
const MAX_DEPARTURE_SECONDS_SINCE_MIDNIGHT = 28 * 3600;

const hasInvalidDepartureTime = (departureSecondsSinceMidnight: number): boolean =>
    departureSecondsSinceMidnight < 0 || departureSecondsSinceMidnight > MAX_DEPARTURE_SECONDS_SINCE_MIDNIGHT;

/**
 * Calculate the times and distances between 2 points for a list of modes
 * @param modes The list of modes to calculate the routes for
 * @param parameters The parameters for the route calculation
 */
export const calculateTimeDistanceByMode = async function (
    modes: RoutingOrTransitMode[],
    parameters: RouteCalculationParameter
): Promise<RoutingTimeDistanceResultByMode> {
    // Validate parameters first
    const originCoordinates = getPointCoordinates(parameters.origin);
    const destinationCoordinates = getPointCoordinates(parameters.destination);

    if (!originCoordinates || !destinationCoordinates) {
        throw new Error('Invalid origin or destination');
    }
    if (hasInvalidDepartureTime(parameters.departureSecondsSinceMidnight)) {
        throw new Error('Invalid departure time');
    }
    const tripDateMoment = moment(parameters.departureDateString, 'YYYY-MM-DD');
    if (!tripDateMoment.isValid()) {
        throw new Error('Invalid trip date');
    }

    if (modes.includes('transit') && parameters.transitScenario === undefined) {
        throw new Error('Transit mode requested without a scenario');
    }

    // All parameters are valid, dispatch to the proper routing function. Only
    // supporting transition public API for now, but we could have more
    // eventually
    if (projectConfig.transitionApi !== undefined) {
        return getTimeAndDistanceFromTransitionApi(modes, parameters);
    }
    // TODO Implement other routing methods
    // FIXME Should we fallback to turf and bird distance, with default speeds by mode if no routing found for a given mode?
    throw new Error('No routing method available');
};

/**
 * Return the transit summary for a given route calculation
 * @param parameters The parameters for the route calculation
 */
export const getTransitSummary = async function (parameters: RouteCalculationParameter): Promise<SummaryResult> {
    // Validate parameters first
    const originCoordinates = getPointCoordinates(parameters.origin);
    const destinationCoordinates = getPointCoordinates(parameters.destination);

    if (!originCoordinates || !destinationCoordinates) {
        throw new Error('Invalid origin or destination');
    }
    if (hasInvalidDepartureTime(parameters.departureSecondsSinceMidnight)) {
        throw new Error('Invalid departure time');
    }
    const tripDateMoment = moment(parameters.departureDateString, 'YYYY-MM-DD');
    if (!tripDateMoment.isValid()) {
        throw new Error('Invalid trip date');
    }

    if (parameters.transitScenario === undefined) {
        throw new Error('Transit summary requires a scenario');
    }

    // All parameters are valid, dispatch to the proper summary function. Only
    // supporting transition public API for now, but we could have more
    // eventually
    if (projectConfig.transitionApi !== undefined) {
        return summaryFromTransitionApi(parameters);
    }
    // TODO Implement other summary methods
    throw new Error('No summary method available');
};

/**
 * Return the transit accessibility maps from a given location
 * @param parameters The parameters for the accessibility map calculation
 */
export const getTransitAccessibilityMap = async function (
    parameters: AccessibilityMapCalculationParameter
): Promise<AccessibilityMapResult> {
    // Validate parameters first
    const pointCoordinates = getPointCoordinates(parameters.point);

    if (!pointCoordinates) {
        throw new Error('Invalid point');
    }
    if (hasInvalidDepartureTime(parameters.departureSecondsSinceMidnight)) {
        throw new Error('Invalid departure time');
    }

    if (parameters.transitScenario === undefined) {
        throw new Error('Transit accessibility map requires a scenario');
    }

    if (parameters.maxTotalTravelTimeMinutes === undefined || parameters.maxTotalTravelTimeMinutes <= 0) {
        throw new Error('Invalid max total travel time');
    }

    if (parameters.numberOfPolygons !== undefined && parameters.numberOfPolygons <= 0) {
        throw new Error('Invalid number of polygons');
    }

    if (parameters.maxAccessEgressTravelTimeMinutes !== undefined && parameters.maxAccessEgressTravelTimeMinutes <= 0) {
        throw new Error('Invalid max access/egress travel time');
    }

    if (parameters.walkingSpeedKmPerHour !== undefined && parameters.walkingSpeedKmPerHour <= 0) {
        throw new Error('Invalid walking speed');
    }

    // All parameters are valid, dispatch to the proper accessibility map
    // function. Only supporting transition public API for now, but we could
    // have more eventually
    if (projectConfig.transitionApi !== undefined) {
        return transitAccessibilityMapFromTransitionApi(parameters);
    }
    // TODO Implement other accessibility map methods
    throw new Error('No accessibility map method available');
};
