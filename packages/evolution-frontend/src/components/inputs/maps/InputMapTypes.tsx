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
    geocodingResultsData?: { [key: string]: any };
    isGeocodingImprecise?: boolean;
    platform?: string;
}

export type PlaceGeocodedProperties = FeatureGeocodedProperties & {
    // TODO type this when we support more than google geocoders
    placeData: { [key: string]: unknown };
};

export interface MarkerData {
    position: GeoJSON.Feature<GeoJSON.Point>;
    icon: { url: string; size: [number, number] };
    draggable: boolean;
    readonly onClick?: () => void;
}

export const defaultIconSize: [number, number] = [40, 40];

export type geocodeSingleFct = (
    addressQueryString: string,
    bbox: [number, number, number, number]
) => Promise<GeoJSON.Feature<GeoJSON.Point, FeatureGeocodedProperties> | undefined>;

export type InfoWindow = {
    position: GeoJSON.Feature<GeoJSON.Point>;
    content: string;
};
