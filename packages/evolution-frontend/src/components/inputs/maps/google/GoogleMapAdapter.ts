/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { MapProviderAdapter } from '../types';
import InputMapGoogle from './InputMapGoogle';
import InfoMapGoogle from './InfoMapGoogle';
import { geocodeSinglePoint, geocodeMultiplePlaces } from './GoogleGeocoder';

/**
 * Google Maps implementation of `MapProviderAdapter`. Delegates to the
 * existing `InputMapGoogle` component and `GoogleGeocoder` functions; this
 * indirection lets the input widgets be provider-agnostic.
 *
 * Note: per Google Maps Platform Service Specific Terms §5.2, results from
 * this adapter must be displayed on a Google map only. Using its geocoder
 * with a non-Google renderer is not allowed.
 */
const googleMapAdapter: MapProviderAdapter = {
    InputMap: InputMapGoogle,
    InfoMap: InfoMapGoogle,
    geocodeSinglePoint,
    geocodeMultiplePlaces
};

export default googleMapAdapter;
