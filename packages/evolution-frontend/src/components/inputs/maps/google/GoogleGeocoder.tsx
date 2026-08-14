/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { FeatureGeocodedProperties, PlaceGeocodedProperties } from '../types';
import { geojson } from './GoogleMapUtils';
import { point as turfPoint, distance as turfDistance } from '@turf/turf';

// In meters:
const geocodingSearchRadiusMinimum = 500;
const geocodingSearchRadiusMaximum = 8000;

/**
 * @deprecated Used only by the deprecated `InputMapPoint` widget. Prefer
 * `geocodeMultiplePlaces`, which surfaces all candidate matches and avoids
 * silently picking the first result. Kept for backwards compatibility until
 * `InputMapPoint` is removed.
 */
export const geocodeSinglePoint = (
    addressQueryString: string,
    options: { bbox?: [number, number, number, number] }
): Promise<GeoJSON.Feature<GeoJSON.Point, FeatureGeocodedProperties> | undefined> => {
    return new Promise((resolve, reject) => {
        if (!google) {
            resolve(undefined);
        }
        const geocoder = new google.maps.Geocoder();
        const bounds = options.bbox
            ? new google.maps.LatLngBounds(
                { lat: options.bbox[0], lng: options.bbox[1] },
                { lat: options.bbox[2], lng: options.bbox[3] }
            )
            : undefined;
        geocoder.geocode({ address: addressQueryString, bounds }, (results, status) => {
            if (status === google.maps.GeocoderStatus.OK && results !== null) {
                const feature = geojson(results[0].geometry.location);
                if (feature) {
                    feature.properties.geocodingResultMetadata = {
                        formattedAddress: results[0].formatted_address,
                        precision: results[0].geometry.location_type,
                        types: results[0].types,
                        placeId: results[0].place_id
                    };
                    feature.properties.lastAction = 'geocoding';
                    feature.properties.geocodingQueryString = addressQueryString;
                }
                resolve(feature);
            } else if (status === google.maps.GeocoderStatus.ZERO_RESULTS) {
                // No result
                resolve(undefined);
            } else {
                reject(`Geocoding failed for ${addressQueryString}`);
            }
        });
    });
};

/**
 * Geocode a query with Google Places Text Search (legacy).
 *
 * Uses `PlacesService.textSearch` so MapFindPlace candidates stay those of
 * existing surveys. `Place.searchByText` (Places API New) is a different
 * product: Google does not guarantee the same places or the same order.
 * Do not switch search backends without a side-by-side comparison on the
 * queries this widget actually sends.
 *
 * How the two search APIs differ:
 * - Cloud product: Places API (legacy) vs Places API (New). This flow
 *   requires the relevant Places API products to be enabled and included
 *   in the key's restrictions. New keys often lack the legacy API.
 * - Ranking / area: `textSearch` takes `location` + `radius` as a soft bias
 *   (results can fall outside). `searchByText` uses `locationBias` or
 *   `locationRestriction`, plus optional `rankPreference` (RELEVANCE vs
 *   DISTANCE). Same query and viewport can yield a different set and order.
 * - Fields: `textSearch` returns a fixed `PlaceResult` (`name`,
 *   `formatted_address`, `types`, `photos`, …). `searchByText` requires a
 *   field mask; omitted fields are absent.
 * - Photos: `textSearch` may include `PlacePhoto` (`getUrl`). `searchByText`
 *   returns `Photo` (`getURI`) only if `photos` is requested. Loading the
 *   image is a separate Place Photos SKU in both cases.
 * - Runtime: `textSearch` needs a `Map`. `searchByText` does not.
 *
 * Place Details (`Place.fetchFields`) is not a search API. It loads extra
 * fields (e.g. photos) for a `place_id` already returned by `textSearch`.
 *
 * @param geocodingQueryString Text query sent to Places (address, name, …).
 * @param options.bbox Viewport used to compute the search-radius bias.
 * @param options.map Google map instance required by `PlacesService`.
 * @param options.language Optional language for result names/addresses.
 * @returns Matching point features, `[]` if none, `undefined` if Google or
 * the bbox is missing. Rejects if `map` is missing or the request fails.
 * @see https://developers.google.com/maps/documentation/javascript/places-migration-overview
 * @see https://developers.google.com/maps/documentation/javascript/place-search
 */
export const geocodeMultiplePlaces = (
    geocodingQueryString: string,
    options: { bbox?: [number, number, number, number]; map?: google.maps.Map; language?: string }
): Promise<GeoJSON.Feature<GeoJSON.Point, PlaceGeocodedProperties>[] | undefined> => {
    return new Promise((resolve, reject) => {
        if (!options.map) {
            reject('Undefined map: Cannot use Google geocoder without Google maps');
            return;
        }
        if (!google || !options.bbox) {
            resolve(undefined);
            return;
        }
        const geocoder = new google.maps.places.PlacesService(options.map);
        const bounds = new google.maps.LatLngBounds(
            { lat: options.bbox[0], lng: options.bbox[1] },
            { lat: options.bbox[2], lng: options.bbox[3] }
        );

        const upperBound = turfPoint([options.bbox[0], options.bbox[1]]);
        const lowerBound = turfPoint([options.bbox[2], options.bbox[3]]);
        const viewportRadius = turfDistance(upperBound, lowerBound, { units: 'meters' }) / 2;
        const searchRadius = Math.min(
            Math.max(viewportRadius, geocodingSearchRadiusMinimum),
            geocodingSearchRadiusMaximum
        );

        geocoder.textSearch(
            {
                query: geocodingQueryString,
                location: bounds.getCenter(),
                radius: searchRadius,
                language: options.language
            },
            (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results !== null) {
                    const places = results
                        .map(({ geometry, types, place_id, formatted_address, name, photos }) => {
                            const feature = geojson(geometry?.location) as GeoJSON.Feature<
                                GeoJSON.Point,
                                PlaceGeocodedProperties
                            >;
                            if (!feature) {
                                return undefined;
                            }
                            feature.id = place_id;
                            feature.properties.placeData = {
                                types,
                                place_id,
                                formatted_address,
                                name,
                                photos
                            };
                            return feature;
                        })
                        .filter((feature) => feature !== undefined) as GeoJSON.Feature<
                        GeoJSON.Point,
                        PlaceGeocodedProperties
                    >[];

                    resolve(places);
                } else if (
                    status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS ||
                    status === google.maps.places.PlacesServiceStatus.NOT_FOUND
                ) {
                    // No result
                    resolve([]);
                } else {
                    reject(`Geocoding failed for ${geocodingQueryString}`);
                }
            }
        );
    });
};
