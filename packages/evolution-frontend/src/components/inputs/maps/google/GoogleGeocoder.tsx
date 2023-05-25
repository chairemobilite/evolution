/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { FeatureGeocodedProperties, PlaceGeocodedProperties } from '../InputMapTypes';
import { geojson } from './GoogleMapUtils';

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
            } else {
                reject(`Geocoding failed for ${addressQueryString}`);
            }
        });
    });
};

export const geocodeMultiplePlaces = (
    geocodingQueryString: string,
    options: { bbox?: [number, number, number, number]; map?: google.maps.Map; language?: string; }
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
        geocoder.textSearch(
            { query: geocodingQueryString, location: bounds.getCenter(), radius: 5000, language: options.language },
            (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results !== null) {
                    const places = results
                        .map(({ geometry, ...googlePlace }) => {
                            const feature = geojson(geometry?.location) as GeoJSON.Feature<
                                GeoJSON.Point,
                                PlaceGeocodedProperties
                            >;
                            if (!feature) {
                                return undefined;
                            }
                            feature.id = googlePlace.place_id;
                            feature.properties.placeData = {
                                ...googlePlace
                            };
                            return feature;
                        })
                        .filter((feature) => feature !== undefined) as GeoJSON.Feature<
                        GeoJSON.Point,
                        PlaceGeocodedProperties
                    >[];

                    resolve(places);
                } else {
                    reject(`Geocoding failed for ${geocodingQueryString}`);
                }
            }
        );
    });
};
