/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import projectConfig from 'chaire-lib-common/lib/config/shared/project.config';

export type GoogleMapApiConfig = {
    apiKey: string;
    libraries: string[];
    region: string;
    language: string;
};

const baseConfig = (): Pick<GoogleMapApiConfig, 'apiKey' | 'libraries' | 'region'> => ({
    apiKey: process.env.GOOGLE_API_KEY as string,
    libraries: ['places', 'geometry'],
    region: projectConfig.region as string
});

// The google map configuration needs to be global as the loading of the API
// takes place once for the whole survey and the configuration cannot change,
// even between sections, otherwise it throws an exception.
let currentGoogleMapConfig: GoogleMapApiConfig | undefined = undefined;

/**
 * Returns the configuration to feed to `<APIProvider>` from `@vis.gl/react-google-maps`.
 * The result is memoized on the first call: the Google Maps JavaScript API can only be
 * loaded once per page session, so subsequent calls (e.g. on language change) return
 * the configuration that was used the first time.
 *
 * @param language Locale to load the API with. Defaults to `projectConfig.defaultLocale`.
 */
export const getCurrentGoogleMapConfig = (language = projectConfig.defaultLocale): GoogleMapApiConfig => {
    if (currentGoogleMapConfig) {
        return currentGoogleMapConfig;
    }
    currentGoogleMapConfig = {
        ...baseConfig(),
        language: language as string
    };
    return currentGoogleMapConfig;
};

/**
 * Returns the Google Cloud Map ID configured via the `GOOGLE_MAP_ID` env var, or
 * `undefined` when not set. Required to enable `<AdvancedMarker>`; when absent,
 * the map widgets fall back to the legacy `<Marker>` component.
 *
 * See https://developers.google.com/maps/documentation/get-map-id
 */
export const getGoogleMapId = (): string | undefined => process.env.GOOGLE_MAP_ID || undefined;
