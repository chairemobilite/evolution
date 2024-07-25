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
import { RouteCalculationParameter, RoutingTimeDistanceResultByMode } from './types';
import projectConfig from '../../config/projectConfig';
import routeWithTransitionApi from './RouteCalculationFromTransition';

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
    // Departure time since midnight should be between 0 and 28 hours, not 24 as
    // transit days can be longer and it will be useful to determine the
    // scenario to use
    if (parameters.departureSecondsSinceMidnight < 0 || parameters.departureSecondsSinceMidnight >= 28 * 3600) {
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
        return routeWithTransitionApi(modes, parameters);
    }
    // TODO Implement other routing methods
    // FIXME Should we fallback to turf and bird distance, with default speeds by mode if no routing found for a given mode?
    throw new Error('No routing method available');
};
