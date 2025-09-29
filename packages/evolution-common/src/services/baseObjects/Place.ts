/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _omit from 'lodash/omit';

import { isFeature, isPoint } from 'geojson-validation';
import { Optional } from '../../types/Optional.type';
import { GeocodingPrecisionCategory, LastAction } from './attributeTypes/PlaceAttributes';
import { ParkingType, ParkingFeeType } from './attributeTypes/PlaceAttributes';
import { Address, AddressAttributes } from './Address';
import { Device } from './attributeTypes/InterviewParadataAttributes';
import { Result, createErrors, createOk } from '../../types/Result.type';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { Uuidable, UuidableAttributes } from './Uuidable';
import { IValidatable, ValidatebleAttributes } from './IValidatable';
import { WeightableAttributes, Weight, validateWeights } from './Weight';
import { ConstructorUtils } from '../../utils/ConstructorUtils';
import { SerializedExtendedAddressAttributes } from './Address';
import { SurveyObjectUnserializer } from './SurveyObjectUnserializer';
import { SurveyObjectsRegistry } from './SurveyObjectsRegistry';

export const placeAttributes = [
    '_weights',
    '_isValid',
    '_uuid',
    'geography',
    'name',
    'shortname',
    'osmId',
    'propertyRegistryId',
    'buildingId',
    'internalId',
    'parkingType',
    'parkingFeeType',
    'geocodingPrecisionCategory',
    'geocodingPrecisionMeters',
    'geocodingQueryString',
    'geocodingName',
    'lastAction',
    'deviceUsed',
    'zoom'
];

export const placeComposedAttributes = [...placeAttributes, '_address'];

export type PlaceAttributes = {
    geography?: Optional<GeoJSON.Feature<GeoJSON.Point>>;
    name?: Optional<string>;
    shortname?: Optional<string>;
    osmId?: Optional<string>;
    propertyRegistryId?: Optional<string>;
    buildingId?: Optional<string>;
    internalId?: Optional<string>;
    parkingType?: Optional<ParkingType>;
    parkingFeeType?: Optional<ParkingFeeType>;
    geocodingPrecisionCategory?: Optional<GeocodingPrecisionCategory>;
    geocodingPrecisionMeters?: Optional<number>;
    geocodingQueryString?: Optional<string>;
    geocodingName?: Optional<string>;
    lastAction?: Optional<LastAction>;
    deviceUsed?: Optional<Device>;
    zoom?: Optional<number>;
} & UuidableAttributes &
    WeightableAttributes &
    ValidatebleAttributes;

export type PlaceWithComposedAttributes = PlaceAttributes & {
    _address?: Optional<AddressAttributes>;
};

export type ExtendedPlaceAttributes = PlaceWithComposedAttributes & { [key: string]: unknown };

export type SerializedExtendedPlaceAttributes = {
    _attributes?: ExtendedPlaceAttributes;
    _customAttributes?: { [key: string]: unknown };
    _address?: Optional<SerializedExtendedAddressAttributes>;
};

/**
 * A place is a location (GeoJSON point) with attributes.
 * Classes can inherit this class and add their own attributes (like a work place, a school place, a junction, etc.).
 */
export class Place extends Uuidable implements IValidatable {
    protected _attributes: ExtendedPlaceAttributes;
    protected _customAttributes: { [key: string]: unknown };

    private _address?: Optional<Address>;

    static _confidentialAttributes = [];

    constructor(params: ExtendedPlaceAttributes, childPlaceAttributes: string[] = placeAttributes) {
        super(params._uuid);

        this._attributes = {} as ExtendedPlaceAttributes;
        this._customAttributes = {};

        const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(
            _omit(params, ['_address', 'address']),
            childPlaceAttributes
        );
        this._attributes = attributes;
        this._customAttributes = customAttributes;

        this.address = ConstructorUtils.initializeComposedAttribute(params._address, Address.unserialize);

        SurveyObjectsRegistry.getInstance().registerPlace(this);
    }

    /**
     * Check if the geography attribute is valid and if it is a point feature
     * @returns {Optional<boolean>} - Returns true if the geography attribute is valid, false if not, or undefined if no geography
     */
    geographyIsValid(): Optional<boolean> {
        return this.geography
            ? isFeature(this.geography) && this.geography.geometry && isPoint(this.geography.geometry)
            : undefined;
    }

    get attributes(): ExtendedPlaceAttributes {
        return this._attributes;
    }

    get customAttributes(): { [key: string]: unknown } {
        return this._customAttributes;
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

    get propertyRegistryId(): Optional<string> {
        return this._attributes.propertyRegistryId;
    }

    set propertyRegistryId(value: Optional<string>) {
        this._attributes.propertyRegistryId = value;
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

    get parkingType(): Optional<ParkingType> {
        return this._attributes.parkingType;
    }

    set parkingType(value: Optional<ParkingType>) {
        this._attributes.parkingType = value;
    }

    get parkingFeeType(): Optional<ParkingFeeType> {
        return this._attributes.parkingFeeType;
    }

    set parkingFeeType(value: Optional<ParkingFeeType>) {
        this._attributes.parkingFeeType = value;
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

    get geocodingName(): Optional<string> {
        return this._attributes.geocodingName;
    }

    set geocodingName(value: Optional<string>) {
        this._attributes.geocodingName = value;
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

    /**
     * Creates a Place object from sanitized parameters
     * @param {ExtendedPlaceAttributes | SerializedExtendedPlaceAttributes} params - Sanitized place parameters
     * @returns {Place} New Place instance
     */
    static unserialize(params: ExtendedPlaceAttributes | SerializedExtendedPlaceAttributes): Place {
        const flattenedParams = SurveyObjectUnserializer.flattenSerializedData(params);
        return new Place(flattenedParams as ExtendedPlaceAttributes);
    }

    /**
     * Factory that validates input from an interview and makes
     * sure types and required fields are valid before returning a new object
     * Custom attributes must be validated in each survey project
     * @param dirtyParams
     * @returns Place | Error[]
     */
    static create(dirtyParams: { [key: string]: unknown }): Result<Place> {
        const errors = Place.validateParams(dirtyParams);
        const place = errors.length === 0 ? new Place(dirtyParams as ExtendedPlaceAttributes) : undefined;
        if (errors.length > 0) {
            return createErrors(errors);
        }
        return createOk(place as Place);
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
        errors.push(...ParamsValidatorUtils.isRequired('params', dirtyParams, displayName));
        errors.push(...ParamsValidatorUtils.isObject('params', dirtyParams, displayName));

        // Validate _uuid:
        errors.push(...Uuidable.validateParams(dirtyParams));

        // Validate _isValid:
        errors.push(...ParamsValidatorUtils.isBoolean('_isValid', dirtyParams._isValid, displayName));

        // Validate _weights:
        errors.push(...validateWeights(dirtyParams._weights as Optional<Weight[]>));

        errors.push(...ParamsValidatorUtils.isGeojsonPoint('geography', dirtyParams.geography, displayName));

        errors.push(...ParamsValidatorUtils.isString('name', dirtyParams.name, displayName));

        errors.push(...ParamsValidatorUtils.isString('shortname', dirtyParams.shortname, displayName));

        errors.push(...ParamsValidatorUtils.isString('osmId', dirtyParams.osmId, displayName));

        errors.push(
            ...ParamsValidatorUtils.isString('propertyRegistryId', dirtyParams.propertyRegistryId, displayName)
        );

        errors.push(...ParamsValidatorUtils.isString('buildingId', dirtyParams.buildingId, displayName));

        errors.push(...ParamsValidatorUtils.isString('internalId', dirtyParams.internalId, displayName));

        errors.push(...ParamsValidatorUtils.isString('parkingType', dirtyParams.parkingType, displayName));

        errors.push(...ParamsValidatorUtils.isString('parkingFeeType', dirtyParams.parkingFeeType, displayName));

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
            ...ParamsValidatorUtils.isString('geocodingQueryString', dirtyParams.geocodingQueryString, displayName)
        );

        errors.push(...ParamsValidatorUtils.isString('geocodingName', dirtyParams.geocodingName, displayName));

        errors.push(...ParamsValidatorUtils.isString('lastAction', dirtyParams.lastAction, displayName));

        errors.push(...ParamsValidatorUtils.isString('deviceUsed', dirtyParams.deviceUsed, displayName));

        errors.push(...ParamsValidatorUtils.isPositiveInteger('zoom', dirtyParams.zoom, displayName));

        const addressAttributes = dirtyParams._address as { [key: string]: unknown };
        if (addressAttributes) {
            errors.push(...Address.validateParams(addressAttributes, 'Address'));
        }

        return errors;
    }
}
