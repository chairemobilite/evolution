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

import { isFeature, isPoint } from 'geojson-validation';
import { Uuidable } from './Uuidable';
import { GeocodingPrecisionCategory, LastAction } from './attributeTypes/PlaceAttributes';
import { BaseAddress, BaseAddressAttributes } from './BaseAddress';
import { OptionalValidity, IValidatable } from './Validatable';
import { Device } from './BaseInterview';

// TODO: move these to chaire-lib

export type BasePlaceAttributes = {
    _uuid?: string;

    geography?: GeoJSON.Feature<GeoJSON.Point> | undefined;
    name?: string;
    shortname?: string;
    osmId?: string;
    landRoleId?: string;
    postalId?: string;
    buildingId?: string;
    internalId?: string;
    geocodingPrecisionCategory?: GeocodingPrecisionCategory;
    geocodingPrecisionMeters?: number;
    geocodingQueryString?: string;
    lastAction?: LastAction;
    deviceUsed?: Device;
    zoom?: number;
};

export type ExtendedPlaceAttributes = BasePlaceAttributes & { [key: string]: any };

export class BasePlace extends Uuidable implements IValidatable {
    _isValid: OptionalValidity;

    geography?: GeoJSON.Feature<GeoJSON.Point>;
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
    lastAction?: LastAction; // how the location was geocoded or pinpointed on map
    deviceUsed?: Device; // which device was used to pinpoint the location (only useful if not geocoded)
    zoom?: number; // the zoom used when pinpointing the location on the map (only useful if not geocoded)

    _confidentialAttributes: string[] = [
        // these attributes should be hidden when exporting
    ];

    constructor(params: (BasePlaceAttributes | ExtendedPlaceAttributes) & { address?: BaseAddress }) {
        super(params._uuid);

        this._isValid = undefined;

        this.geography = params.geography;
        this.name = params.name;
        this.shortname = params.shortname;
        this.address = params.address;
        this.osmId = params.osmId;
        this.landRoleId = params.landRoleId;
        this.postalId = params.postalId;
        this.buildingId = params.buildingId;
        this.internalId = params.internalId;
        this.geocodingPrecisionCategory = params.geocodingPrecisionCategory;
        this.geocodingPrecisionMeters = params.geocodingPrecisionMeters;
        this.geocodingQueryString = params.geocodingQueryString;
        this.lastAction = params.lastAction;
        this.deviceUsed = params.deviceUsed;
        this.zoom = params.zoom;
    }

    // params must be sanitized and must be valid:
    static unserialize(params: BasePlaceAttributes & { address?: BaseAddressAttributes }): BasePlace {
        const address = params.address ? BaseAddress.unserialize(params.address) : undefined;
        const geography = params.geography ? (params.geography as GeoJSON.Feature<GeoJSON.Point>) : undefined;
        return new BasePlace({ ...params, address, geography });
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
     * @returns BasePlace | Error[]
     */
    static create(dirtyParams: { [key: string]: any }): BasePlace | Error[] {
        const errors = BasePlace.validateParams(dirtyParams);
        return errors.length > 0
            ? errors
            : new BasePlace(dirtyParams as ExtendedPlaceAttributes & { address: BaseAddress });
    }

    /**
     * Validates attributes types
     * @param dirtyParams The params input
     * @returns Error[] TODO: specialize this error class
     */
    static validateParams(dirtyParams: { [key: string]: any }): Error[] {
        const errors: Error[] = [];

        // Validate params object:
        if (!dirtyParams || typeof dirtyParams !== 'object') {
            errors.push(new Error('BasePlace validateParams: params is undefined or invalid'));
            return errors; // stop now otherwise it will crash because params are not valid
        }

        // Validate UUID
        const uuidErrors: Error[] = Uuidable.validateParams(dirtyParams);
        if (uuidErrors.length > 0) {
            errors.push(...uuidErrors);
        }

        // Validate geography
        if (dirtyParams.geography !== undefined) {
            if (!isFeature(dirtyParams.geography) || !isPoint(dirtyParams.geography.geometry)) {
                errors.push(new Error('BasePlace validateParams: geography should be a GeoJSON Point feature'));
            }
        }

        // Validate name (if provided)
        if (dirtyParams.name !== undefined && typeof dirtyParams.name !== 'string') {
            errors.push(new Error('BasePlace validateParams: name should be a string'));
        }

        // Validate shortname (if provided)
        if (dirtyParams.shortname !== undefined && typeof dirtyParams.shortname !== 'string') {
            errors.push(new Error('BasePlace validateParams: shortname should be a string'));
        }

        // Validate osmId (if provided)
        // TODO: validate valid osmId
        if (dirtyParams.osmId !== undefined && typeof dirtyParams.osmId !== 'string') {
            errors.push(new Error('BasePlace validateParams: osmId should be a string'));
        }

        // Validate landRoleId (if provided)
        if (dirtyParams.landRoleId !== undefined && typeof dirtyParams.landRoleId !== 'string') {
            errors.push(new Error('BasePlace validateParams: landRoleId should be a string'));
        }

        // Validate postalId (if provided)
        if (dirtyParams.postalId !== undefined && typeof dirtyParams.postalId !== 'string') {
            errors.push(new Error('BasePlace validateParams: postalId should be a string'));
        }

        // Validate buildingId (if provided)
        if (dirtyParams.buildingId !== undefined && typeof dirtyParams.buildingId !== 'string') {
            errors.push(new Error('BasePlace validateParams: buildingId should be a string'));
        }

        // Validate internalId (if provided)
        if (dirtyParams.internalId !== undefined && typeof dirtyParams.internalId !== 'string') {
            errors.push(new Error('BasePlace validateParams: internalId should be a string'));
        }

        // Validate geocodingPrecisionCategory (if provided)
        if (
            dirtyParams.geocodingPrecisionCategory !== undefined &&
            typeof dirtyParams.geocodingPrecisionCategory !== 'string'
        ) {
            errors.push(new Error('BasePlace validateParams: geocodingPrecisionCategory should be a string'));
        }

        // Validate geocodingPrecisionMeters (if provided)
        if (
            dirtyParams.geocodingPrecisionMeters !== undefined &&
            (typeof dirtyParams.geocodingPrecisionMeters !== 'number' || isNaN(dirtyParams.geocodingPrecisionMeters))
        ) {
            errors.push(new Error('BasePlace validateParams: geocodingPrecisionMeters should be a number'));
        }

        // Validate geocodingQueryString (if provided)
        if (dirtyParams.geocodingQueryString !== undefined && typeof dirtyParams.geocodingQueryString !== 'string') {
            errors.push(new Error('BasePlace validateParams: geocodingQueryString should be a string'));
        }

        // Validate lastAction (if provided)
        if (dirtyParams.lastAction !== undefined && typeof dirtyParams.lastAction !== 'string') {
            errors.push(new Error('BasePlace validateParams: lastAction should be a string'));
        }

        // Validate internalId (if provided)
        if (dirtyParams.deviceUsed !== undefined && typeof dirtyParams.deviceUsed !== 'string') {
            errors.push(new Error('BasePlace validateParams: deviceUsed should be a string'));
        }

        // Validate zoom (if provided)
        if (dirtyParams.zoom !== undefined && (!Number.isInteger(dirtyParams.zoom) || dirtyParams.zoom < 0)) {
            errors.push(new Error('BasePlace validateParams: zoom should be a positive number'));
        }

        return errors;
    }
}
