/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { useJsApiLoader } from '@react-google-maps/api';
import InputLoading from '../components/inputs/InputLoading';
import projectConfig from 'chaire-lib-common/lib/config/shared/project.config';

const googleMapConfigNew = {
    id: 'google-map-script',
    googleMapsApiKey: process.env.GOOGLE_API_KEY as string,
    libraries: ['places' as const, 'geometry' as const]
};

// Legacy google map configuration, still used in old PhotonOsmInputMap component
export default {
    apiKey: process.env.GOOGLE_API_KEY as string,
    LoadingContainer: InputLoading,
    libraries: ['places', 'geometry']
};

// The google map configuration needs to be global as the loading of the API
// takes place once for the whole survey and the configuration cannot change,
// even between sections, otherwise it throws an exception.
let currentGoogleMapConfig: Parameters<typeof useJsApiLoader>[0] | undefined = undefined;
export const getCurrentGoogleMapConfig = (
    language = projectConfig.defaultLocale
): Parameters<typeof useJsApiLoader>[0] => {
    if (currentGoogleMapConfig) {
        return currentGoogleMapConfig;
    }
    currentGoogleMapConfig = {
        region: projectConfig.region,
        language: language,
        ...googleMapConfigNew
    };
    return currentGoogleMapConfig;
};
