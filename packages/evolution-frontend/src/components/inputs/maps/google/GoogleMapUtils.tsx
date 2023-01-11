/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { FeatureGeocodedProperties } from '../InputMapTypes';
import { point as turfPoint } from '@turf/turf';

export const geojson = (
    latLng: google.maps.LatLng | null | undefined
): GeoJSON.Feature<GeoJSON.Point, FeatureGeocodedProperties> | undefined => {
    return latLng && latLng.lat() && latLng.lng() ? turfPoint([latLng.lng(), latLng.lat()], {}) : undefined;
};

export const toLatLng = (feature: GeoJSON.Feature<GeoJSON.Point>): google.maps.LatLng => {
    return new google.maps.LatLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]);
};
