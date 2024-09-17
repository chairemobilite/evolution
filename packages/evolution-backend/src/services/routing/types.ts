/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { RoutingOrTransitMode } from 'chaire-lib-common/lib/config/routingModes';
import { SummaryResponse, SummarySuccessResult } from 'chaire-lib-common/lib/api/TrRouting/trRoutingApiV2';

export type RouteCalculationParameter = {
    /**
     * The origin of the route to calculate
     */
    origin: GeoJSON.Point | GeoJSON.Feature<GeoJSON.Point>;
    /**
     * The destination of the route to calculate
     */
    destination: GeoJSON.Point | GeoJSON.Feature<GeoJSON.Point>;
    /**
     * The time of the trip, in seconds since midnight
     */
    departureSecondsSinceMidnight: number;
    /**
     * The date of the trip, in the format 'YYYY-MM-DD'
     */
    departureDateString: string;
    /**
     * If `transit` mode is requested, the scenario to use for calculations
     */
    transitScenario?: string;
};

type RoutingTimeDistanceResult = {
    // The source of the routing calculation. Can be used to identify the method
    // called for this calculation
    source: string;
} & (
    | {
          status: 'no_routing_found';
      }
    | {
          status: 'error';
          error: string;
      }
    | {
          status: 'success';
          distanceM: number;
          travelTimeS: number;
      }
);

export type RoutingTimeDistanceResultByMode = {
    [mode in RoutingOrTransitMode]?: RoutingTimeDistanceResult;
};

export type SummaryResult = {
    // The source of the summary calculation. Can be used to identify the method
    // called for this calculation
    source: string;
} & (
    | {
          status: 'no_routing_found';
      }
    | {
          status: 'error';
          error: string;
      }
    | {
          status: 'success';
          nbRoutes: number;
          lines: SummarySuccessResult['result']['lines'];
      }
);
