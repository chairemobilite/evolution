/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import * as React from 'react';
import GeoJSON from 'geojson';
import type { CliUser } from 'chaire-lib-common/lib/services/user/userType';
import type {
    InfoMapWidgetConfig,
    UserInterviewAttributes,
    WidgetStatus
} from 'evolution-common/lib/services/questionnaire/types';

export type FeatureGeocodedProperties = {
    lastAction?: string;
    geocodingQueryString?: string;
    zoom?: number;
    geocodingResultMetadata?: { [key: string]: any };
    geocodingResultsData?: { [key: string]: any };
    isGeocodingImprecise?: boolean;
    platform?: string;
};

export type PlaceGeocodedProperties = FeatureGeocodedProperties & {
    // FIXME These are typed directly from the google.maps.places.PlaceResult
    // interface. Make it more generic when we support more
    placeData: {
        types?: string[];
        place_id?: string;
        formatted_address?: string;
        name?: string;
        photos?: any[];
    };
};

export type MarkerData = {
    position: GeoJSON.Feature<GeoJSON.Point>;
    icon: { url: string; size: [number, number] };
    draggable: boolean;
    readonly onClick?: () => void;
};

export const defaultIconSize: [number, number] = [40, 40];

export type geocodeSingleFct = (
    addressQueryString: string,
    bbox: [number, number, number, number]
) => Promise<GeoJSON.Feature<GeoJSON.Point, FeatureGeocodedProperties> | undefined>;

export type InfoWindow = {
    position: GeoJSON.Feature<GeoJSON.Point>;
    content: string;
};

/**
 * Props consumed by the interactive input map component of any provider
 * (Google, MapLibre/OSM, ...). Each `MapProviderAdapter` implementation must
 * accept these props.
 * New props may be added later according to requirements or provider-specific needs.
 */
export type MapWidgetProps = {
    defaultCenter: { lat: number; lon: number };
    maxGeocodingResultsBounds?: [{ lat: number; lng: number }, { lat: number; lng: number }];
    value?: GeoJSON.Feature<GeoJSON.Point, FeatureGeocodedProperties>;
    defaultZoom?: number;
    maxZoom?: number;
    /** Height of the map container in any css unit, e.g. `28rem` or `550px`. */
    height?: string;
    markers: MarkerData[];
    onValueChange: (feature: GeoJSON.Feature<GeoJSON.Point, FeatureGeocodedProperties> | undefined) => void;
    onMapReady?: (bbox?: [number, number, number, number]) => void;
    onBoundsChanged?: (bbox?: [number, number, number, number]) => void;
    /** Increment to request the map to fit its bounds to the current markers. */
    shouldFitBounds?: number;
    infoWindow?: InfoWindow;
    /**
     * Allows the map widget to inject provider-specific options into the
     * geocoder (e.g. Google needs the map instance for the PlacesService).
     */
    setGeocodingOptions?: (options: { [key: string]: unknown }) => void;
};

export type GeocodeSingleOptions = {
    bbox?: [number, number, number, number];
    [key: string]: unknown;
};

export type GeocodeMultipleOptions = {
    bbox?: [number, number, number, number];
    language?: string;
    [key: string]: unknown;
};

/**
 * Props consumed by any provider's `InfoMap` component (non-interactive map
 * for the `infoMap` widget, e.g. the participant's trips map). The data fed
 * in (`widgetConfig.geojsons`) is already standard GeoJSON, so the adapter
 * only needs to translate it to its own render primitives.
 */
export type InfoMapProps = {
    widgetConfig: InfoMapWidgetConfig;
    widgetStatus: WidgetStatus;
    interview: UserInterviewAttributes;
    user?: CliUser;
    path: string;
};

/**
 * Adapter that plugs a map provider (Google, MapLibre/OSM, ...) into the
 * generic map input widgets (`InputMapPoint`, `InputMapFindPlace`).
 *
 * Each adapter exposes the rendering component and the two geocoding
 * functions the widgets need. New providers can be added by implementing this
 * interface; consumers should not import provider-specific modules directly.
 */
export type MapProviderAdapter = {
    /** Component that renders the interactive map and its markers. */
    InputMap: React.ComponentType<MapWidgetProps>;
    /**
     * Component that renders a non-interactive map for the `infoMap` widget
     * (e.g. the participant's trips map). The data consumed is standard
     * GeoJSON, so the adapter only needs to translate it to its own render
     * primitives.
     */
    InfoMap: React.ComponentType<InfoMapProps>;
    /**
     * Geocode a single address and return the best matching point, or
     * `undefined` if no result was found. Rejects on transport/API errors.
     *
     * @deprecated Used only by the deprecated `InputMapPoint` widget. New
     * code should rely on `geocodeMultiplePlaces` instead, which surfaces all
     * candidate matches and avoids silently picking the first result (see
     * deprecation notice on `InputMapPoint`). Kept for backwards compatibility
     * until `InputMapPoint` is removed.
     */
    geocodeSinglePoint: (
        addressQueryString: string,
        options: GeocodeSingleOptions
    ) => Promise<GeoJSON.Feature<GeoJSON.Point, FeatureGeocodedProperties> | undefined>;
    /**
     * Geocode a query and return the candidate places. May return `undefined`
     * if the geocoder cannot run (e.g. missing context) and an empty array
     * when the query simply has no matches.
     */
    geocodeMultiplePlaces: (
        geocodingQueryString: string,
        options: GeocodeMultipleOptions
    ) => Promise<GeoJSON.Feature<GeoJSON.Point, PlaceGeocodedProperties>[] | undefined>;
};
