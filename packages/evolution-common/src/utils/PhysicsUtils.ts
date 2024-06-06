/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Optional } from '../types/Optional.type';
import { isFeature, isPoint } from 'geojson-validation';
import { distance as turfDistance } from '@turf/turf';

/**
 * Get the bird distance in meters, ceil to meters (integer)
 * @param originGeography - The origin geography
 * @param destinationGeography - The destination geography
 * @returns The distance in meters, or undefined if no origin or destination or if the origin or destination is not a valid point
 */
export const getBirdDistanceMeters = (
    originGeography: Optional<GeoJSON.Feature<GeoJSON.Point>>,
    destinationGeography: Optional<GeoJSON.Feature<GeoJSON.Point>>
): Optional<number> => {
    if (
        originGeography &&
        destinationGeography &&
        originGeography.geometry &&
        destinationGeography.geometry &&
        isFeature(originGeography) &&
        isPoint(originGeography.geometry) &&
        isFeature(destinationGeography) &&
        isPoint(destinationGeography.geometry)
    ) {
        return Math.ceil(turfDistance(originGeography, destinationGeography, { units: 'meters' }));
    }
    return undefined;
};

/**
 * Get the bird speed in km/h, not rounded
 * @param originGeography - The origin geography
 * @param destinationGeography - The destination geography
 * @param durationSeconds - The duration in seconds
 * @returns The speed in km/h, or undefined if no duration, origin or destination or if the origin or destination is not a valid point
 */
export const getBirdSpeedKph = (
    originGeography: Optional<GeoJSON.Feature<GeoJSON.Point>>,
    destinationGeography: Optional<GeoJSON.Feature<GeoJSON.Point>>,
    durationSeconds: Optional<number>
): Optional<number> => {
    const distanceMeters = getBirdDistanceMeters(originGeography, destinationGeography);
    if (durationSeconds !== undefined && durationSeconds > 0 && distanceMeters !== undefined && distanceMeters >= 0) {
        return (distanceMeters / durationSeconds) * 3.6;
    }
    return undefined;
};
