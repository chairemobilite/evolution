/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import InputLoading from '../components/inputs/InputLoading';

export const googleMapConfigNew = {
    id: 'google-map-script',
    googleMapsApiKey: process.env.GOOGLE_API_KEY as string,
    libraries: ['places' as const, 'geometry' as const]
};

export default {
    apiKey: process.env.GOOGLE_API_KEY as string,
    LoadingContainer: InputLoading,
    libraries: ['places', 'geometry']
};
