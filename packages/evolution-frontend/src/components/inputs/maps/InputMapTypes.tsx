/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
export interface FeatureGeocodedProperties {
    lastAction?: string;
    geocodingQueryString?: string;
    zoom?: number;
    geocodingResultMetadata?: { [key: string]: any };
}

export type PlaceGeocodedProperties = FeatureGeocodedProperties & {
    // TODO type this when we support more than google geocoders
    placeData: { [key: string]: unknown };
};

export interface MarkerData {
    position: GeoJSON.Feature<GeoJSON.Point>;
    icon: { url: string };
    draggable: boolean;
    readonly onClick?: () => void;
}

export type geocodeSingleFct = (
    addressQueryString: string,
    bbox: [number, number, number, number]
) => Promise<GeoJSON.Feature<GeoJSON.Point, FeatureGeocodedProperties> | undefined>;

export type InfoWindow = {
    position: GeoJSON.Feature<GeoJSON.Point>;
    content: string;
};
