/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import type { SurveyMapTripProperties } from '../../components/admin/validations/InterviewMap';

type TripFeature = GeoJSON.Feature<GeoJSON.LineString, SurveyMapTripProperties>;

/** Color of a trip that has no color and whose person has no color either */
const DEFAULT_TRIP_COLOR = '#000000';

/**
 * Prepare the trips of the interview map for the layers that draw them. The active trips and the
 * other trips are drawn by 2 layers, which read the color of a trip in its `color` property.
 *
 * @param trips The trips of the interview map
 * @returns The active trips and the other trips. Each trip is a copy, with its `color` property
 * set to the color of the trip, otherwise the color of its person, otherwise black.
 */
export const prepareTripsForMapLayers = (
    trips: TripFeature[]
): { activeTrips: TripFeature[]; inactiveTrips: TripFeature[] } => {
    const tripsWithColor = trips.map((trip) => ({
        ...trip,
        properties: {
            ...trip.properties,
            color: trip.properties.color || trip.properties.personColor || DEFAULT_TRIP_COLOR
        }
    }));
    return {
        activeTrips: tripsWithColor.filter((trip) => trip.properties.active === true),
        inactiveTrips: tripsWithColor.filter((trip) => trip.properties.active !== true)
    };
};
