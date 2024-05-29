/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Optional } from '../../types/Optional.type';
import { GeocodingPrecisionCategory, LastAction } from './attributeTypes/PlaceAttributes';
import { Address, AddressAttributes } from './Address';
import { Device } from './BaseInterview';
import { Result, createErrors, createOk } from '../../types/Result.type';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { Uuidable, UuidableAttributes } from './Uuidable';
import { IValidatable, ValidatebleAttributes } from './IValidatable';
import { WeightableAttributes, Weight, validateWeights } from './Weight';
import { ConstructorUtils } from '../../utils/ConstructorUtils';

/**
 * A place is a location (GeoJSON point) with attributes.
 * Classes can inherit this class and add their own attributes (like a work place, a school place, a junction, etc.).
 */

export const placeAttributes = [
    '_weights',
    '_isValid',
    '_uuid',
    'geography',
    'name',
    'shortname',
    'osmId',
    'landRoleId',
    'postalId',
    'buildingId',
    'internalId',
    'geocodingPrecisionCategory',
    'geocodingPrecisionMeters',
    'geocodingQueryString',
    'lastAction',
    'deviceUsed',
    'zoom',
];

export const placeComposedAttributes = [
    ...placeAttributes,
    'address'
];

export type PlaceAttributes = {
    geography?: Optional<GeoJSON.Feature<GeoJSON.Point>>;
    name?: Optional<string>;
    shortname?: Optional<string>;
    osmId?: Optional<string>;
    landRoleId?: Optional<string>;
    postalId?: Optional<string>;
    buildingId?: Optional<string>;
    internalId?: Optional<string>;
    geocodingPrecisionCategory?: Optional<GeocodingPrecisionCategory>;
    geocodingPrecisionMeters?: Optional<number>;
    geocodingQueryString?: Optional<string>;
    lastAction?: Optional<LastAction>;
    deviceUsed?: Optional<Device>;
    zoom?: Optional<number>;
} & UuidableAttributes & WeightableAttributes & ValidatebleAttributes;

export type PlaceWithComposedAttributes = PlaceAttributes & {
    address?: AddressAttributes;
};

export type ExtendedPlaceAttributes = PlaceWithComposedAttributes & { [key: string]: unknown };

export class Place<ChildAttributes> implements IValidatable {
    protected _attributes: ChildAttributes & PlaceAttributes;
    protected _customAttributes: { [key: string]: unknown };

    private _address?: Optional<Address>;

    static _confidentialAttributes = [];

    constructor(params: ChildAttributes & ExtendedPlaceAttributes, childPlaceAttributes: string[] = placeAttributes) {

        params._uuid = Uuidable.getUuid(params._uuid);

        this._attributes = {} as ChildAttributes & PlaceAttributes;
        this._customAttributes = {};

        const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(
            params,
            childPlaceAttributes
        );
        this._attributes = attributes;
        this._customAttributes = customAttributes;

        this.address = ConstructorUtils.initializeComposedAttribute(
            params.address,
            Address.unserialize
        );
    }

    get attributes(): ChildAttributes & PlaceAttributes {
        return this._attributes;
    }

    get customAttributes(): { [key: string]: unknown } {
        return this._customAttributes;
    }

    get _uuid(): Optional<string> {
        return this._attributes._uuid;
    }

    get _isValid(): Optional<boolean> {
        return this._attributes._isValid;
    }

    set _isValid(value: Optional<boolean>) {
        this._attributes._isValid = value;
    }

    get _weights(): Optional<Weight[]> {
        return this._attributes._weights;
    }

    set _weights(value: Optional<Weight[]>) {
        this._attributes._weights = value;
    }

    get address(): Optional<Address> {
        return this._address;
    }

    set address(value: Optional<Address>) {
        this._address = value;
    }

    get name(): Optional<string> {
        return this._attributes.name;
    }

    set name(value: Optional<string>) {
        this._attributes.name = value;
    }

    get shortname(): Optional<string> {
        return this._attributes.shortname;
    }

    set shortname(value: Optional<string>) {
        this._attributes.shortname = value;
    }

    get osmId(): Optional<string> {
        return this._attributes.osmId;
    }

    set osmId(value: Optional<string>) {
        this._attributes.osmId = value;
    }

    get landRoleId(): Optional<string> {
        return this._attributes.landRoleId;
    }

    set landRoleId(value: Optional<string>) {
        this._attributes.landRoleId = value;
    }

    get postalId(): Optional<string> {
        return this._attributes.postalId;
    }

    set postalId(value: Optional<string>) {
        this._attributes.postalId = value;
    }

    get buildingId(): Optional<string> {
        return this._attributes.buildingId;
    }

    set buildingId(value: Optional<string>) {
        this._attributes.buildingId = value;
    }

    get internalId(): Optional<string> {
        return this._attributes.internalId;
    }

    set internalId(value: Optional<string>) {
        this._attributes.internalId = value;
    }

    get geocodingPrecisionCategory(): Optional<GeocodingPrecisionCategory> {
        return this._attributes.geocodingPrecisionCategory;
    }

    set geocodingPrecisionCategory(value: Optional<GeocodingPrecisionCategory>) {
        this._attributes.geocodingPrecisionCategory = value;
    }

    get geocodingPrecisionMeters(): Optional<number> {
        return this._attributes.geocodingPrecisionMeters;
    }

    set geocodingPrecisionMeters(value: Optional<number>) {
        this._attributes.geocodingPrecisionMeters = value;
    }

    get geocodingQueryString(): Optional<string> {
        return this._attributes.geocodingQueryString;
    }

    set geocodingQueryString(value: Optional<string>) {
        this._attributes.geocodingQueryString = value;
    }

    get lastAction(): Optional<LastAction> {
        return this._attributes.lastAction;
    }

    set lastAction(value: Optional<LastAction>) {
        this._attributes.lastAction = value;
    }

    get deviceUsed(): Optional<Device> {
        return this._attributes.deviceUsed;
    }

    set deviceUsed(value: Optional<Device>) {
        this._attributes.deviceUsed = value;
    }

    get zoom(): Optional<number> {
        return this._attributes.zoom;
    }

    set zoom(value: Optional<number>) {
        this._attributes.zoom = value;
    }

    get geography(): Optional<GeoJSON.Feature<GeoJSON.Point>> {
        return this._attributes.geography;
    }

    set geography(value: Optional<GeoJSON.Feature<GeoJSON.Point>>) {
        this._attributes.geography = value;
    }

    // params must be sanitized and must be valid:
    static unserialize(params: ExtendedPlaceAttributes): Place<PlaceAttributes> {
        return new Place(params);
    }

    /**
     * Factory that validates input from an interview and makes
     * sure types and required fields are valid before returning a new object
     * Custom attributes must be validated in each survey project
     * @param dirtyParams
     * @returns Place | Error[]
     */
    static create(dirtyParams: { [key: string]: unknown }): Result<Place<PlaceAttributes>> {
        const errors = Place.validateParams(dirtyParams);
        const place = errors.length === 0 ? new Place(dirtyParams) : undefined;
        if (errors.length > 0) {
            return createErrors(errors);
        }
        return createOk(place as Place<PlaceAttributes>);
    }

    validate(): Optional<boolean> {
        // TODO: implement:
        this._attributes._isValid = true;
        return true;
    }

    isValid(): Optional<boolean> {
        return this._isValid;
    }

    /**
     * Validates attributes types
     * @param dirtyParams The params input
     * @param displayName The name of the object to validate, for error display
     * @returns Error[]
     */
    static validateParams(dirtyParams: { [key: string]: unknown }, displayName = 'Place'): Error[] {
        const errors: Error[] = [];

        // Validate params object:
        errors.push(...ParamsValidatorUtils.isRequired(
            'params',
            dirtyParams,
            displayName
        ));
        errors.push(...ParamsValidatorUtils.isObject(
            'params',
            dirtyParams,
            displayName
        ));

        // Validate _uuid:
        errors.push(...Uuidable.validateParams(dirtyParams));

        // Validate _isValid:
        errors.push(
            ...ParamsValidatorUtils.isBoolean(
                '_isValid',
                dirtyParams._isValid,
                displayName
            )
        );

        // Validate _weights:
        errors.push(...validateWeights(dirtyParams._weights as Optional<Weight[]>));

        errors.push(
            ...ParamsValidatorUtils.isGeojsonPoint(
                'geography',
                dirtyParams.geography,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'name',
                dirtyParams.name,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'shortname',
                dirtyParams.shortname,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'osmId',
                dirtyParams.osmId,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'landRoleId',
                dirtyParams.landRoleId,
                displayName
            )
        );


        errors.push(
            ...ParamsValidatorUtils.isString(
                'postalId',
                dirtyParams.postalId,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'buildingId',
                dirtyParams.buildingId,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'internalId',
                dirtyParams.internalId,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'geocodingPrecisionCategory',
                dirtyParams.geocodingPrecisionCategory,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isPositiveNumber(
                'geocodingPrecisionMeters',
                dirtyParams.geocodingPrecisionMeters,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'geocodingQueryString',
                dirtyParams.geocodingQueryString,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'lastAction',
                dirtyParams.lastAction,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'deviceUsed',
                dirtyParams.deviceUsed,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isPositiveInteger(
                'zoom',
                dirtyParams.zoom,
                displayName
            )
        );

        const addressAttributes = dirtyParams.address as { [key: string]: unknown };
        if (addressAttributes) {
            errors.push(...Address.validateParams(addressAttributes, 'Address'));
        }

        return errors;
    }

}




