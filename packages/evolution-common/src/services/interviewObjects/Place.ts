/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { SingleGeoFeature } from 'chaire-lib-common/lib/services/geodata/GeoJSONUtils';
import { ResponseObject } from './ResponseObject';

/**
 * Type a geo location. Can be a home, a visited place, a trip origin or destination, etc.
 *
 * @export
 * @interface Place
 */
export type Place<CustomPlace> = ResponseObject & {
    name?: string;
    osmId?: string; // format: way/1234 or node/1234 or relation/1234
    idProvinc?: number; // quebec land role main id
    mergedId?: string; // uuid: generated validated merged address id (from chaire address validation still under development)
    civicNumber?: string;
    unit?: string;
    streetName?: string;
    address?: string;
    city?: string;
    region?: string;
    country?: string;
    postalCode?: string;
    geography?: SingleGeoFeature; // normally a dingle point, but in some surveys, could represent a building or an area.
} & CustomPlace;
