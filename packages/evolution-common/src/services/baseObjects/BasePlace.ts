/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * A place is a specific location on the map, usually stored as a geojson object.
 * When possible, it should also contains some way to associated it with official databases
 * like postal data, landrole data or OpenStreetMap ids.
 */

import { Uuidable } from './Uuidable';
import { GeocodingPrecisionCategory } from './attributeTypes/PlaceAttributes';
import { BaseAddress } from './BaseAddress';
import { OptionalValidity, IValidatable } from './Validatable';

// TODO: move these to chaire-lib

export type BasePlaceAttributes = {

    _uuid?: string;

    name?: string;
    shortname?: string;
    address?: BaseAddress;
    osmId?: string;
    landRoleId?: string;
    postalId?: string;
    buildingId?: string;
    internalId?: string;
    geocodingPrecisionCategory?: GeocodingPrecisionCategory;
    geocodingPrecisionMeters?: number;
    geocodingQueryString?: string;

};

export type ExtendedPlaceAttributes = BasePlaceAttributes & {[key: string]: any};

export class BasePlace extends Uuidable implements IValidatable {

    _isValid: OptionalValidity;

    geography: GeoJSON.Feature<GeoJSON.Point> | undefined;
    name?: string;
    shortname?: string;
    address?: BaseAddress;
    osmId?: string; // OpenStreetMap id (can be a node, way or relation). This is the short version: n1234, w2345, r3456
    landRoleId?: string; // official land role building/location id
    postalId?: string; // official postal id
    buildingId?: string; // official building id
    internalId?: string; // internal id used as the primary key for places by the survey administrator
    geocodingPrecisionCategory?: GeocodingPrecisionCategory;
    geocodingPrecisionMeters?: number; // the max distance in meters between the geocoded point and the real location
    geocodingQueryString?: string; // in most surveys, this would be the query used to geocode the location

    constructor(geography: GeoJSON.Feature<GeoJSON.Point> | undefined, params?: BasePlaceAttributes | ExtendedPlaceAttributes) {

        if (!params && geography && geography.properties) {
            params = geography.properties;
        }

        super(params?._uuid);

        this._isValid = undefined;

        this.geography = geography;
        this.name = params?.name;
        this.shortname = params?.shortname;
        this.address = params?.address;
        this.osmId = params?.osmId;
        this.landRoleId = params?.landRoleId;
        this.postalId = params?.postalId;
        this.buildingId = params?.buildingId;
        this.internalId = params?.internalId;
        this.geocodingPrecisionCategory = params?.geocodingPrecisionCategory;
        this.geocodingPrecisionMeters = params?.geocodingPrecisionMeters;
        this.geocodingQueryString = params?.geocodingQueryString;

    }

    validate(): OptionalValidity {
        // TODO: implement:
        this._isValid = true;
        return true;
    }

    isValid(): OptionalValidity {
        return this._isValid;
    }

    /**
     * Factory that validates input from an interview and makes
     * sure types and required fields are valid before returning a new object
     * @param dirtyParams
     * @returns BasePlace
     */
    static create(geography = undefined, dirtyParams: { [key: string]: any }) {
        const allParamsValid = true;
        // validate types and required attributes
        // TODO: implement dirtyParams validation:
        const params: BasePlaceAttributes = {};
        if (allParamsValid === true) {
            return new BasePlace(geography, params);
        }
    }

}
