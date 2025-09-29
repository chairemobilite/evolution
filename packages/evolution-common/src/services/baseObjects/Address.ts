/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Optional } from '../../types/Optional.type';
import { IValidatable, ValidatebleAttributes } from './IValidatable';
import { Uuidable, UuidableAttributes } from './Uuidable';
import { Result, createErrors, createOk } from '../../types/Result.type';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { ConstructorUtils } from '../../utils/ConstructorUtils';
import { SurveyObjectUnserializer } from './SurveyObjectUnserializer';

// TODO: make this class more international. For now, it fits Canadian addresses only.

export const addressAttributes = [
    '_uuid',
    '_isValid',
    'fullAddress', // full address string, when coming from the survey and/or entered by humans
    'civicNumber',
    'civicNumberSuffix',
    'unitNumber',
    'streetName',
    'streetNameHomogenized',
    'combinedStreetUuid',
    'municipalityName',
    'municipalityCode',
    'postalMunicipalityName',
    'region',
    'country',
    'postalCode',
    'postalId',
    'combinedAddressUuid'
] as const;

/**
 * Note about ? and Optional type:
 * We keep the ? so it accepts empty params
 * We add the Optional type to make it obvious that the attribute is optional everywhere it appears
 */
export type AddressAttributes = {
    fullAddress?: Optional<string>; // full address string, when coming from the survey and/or entered by humans
    civicNumber?: Optional<number>;
    civicNumberSuffix?: Optional<string>; // example: A, B, C
    unitNumber?: Optional<string>; // example: 101, 202
    streetName?: Optional<string>; // no abbreviation, with latin characters and capital letters
    /** homogenized street name:
     * - replace latin characters with their non-latin equivalent (remove french accents, etc.)
     * - lowercase
     * - keep dashes and spaces
     * - includes non-abbreviated street type/prefix and/or suffix (e.g. "rue", "avenue", "boulevard", etc.)
     * - includes non-abbreviated orientation
     * - non-abbreviated saint/sainte
     * - trimmed and trimmed start
     * example: 30th street | saint john boulevard | rue de la gauchetiere ouest | 5e avenue nord | rang du petit saint jean | 30e rue
     */
    streetNameHomogenized?: Optional<string>; // should be unique by municipality
    /** Combined street UUID from the address integrator repository
     * Links to all matched data sources from https://github.com/chairemobilite/address_integrator
     */
    combinedStreetUuid?: Optional<string>;
    municipalityName?: Optional<string>;
    municipalityCode?: Optional<string>; // official code for the municipality
    postalMunicipalityName?: Optional<string>; // some municipalities have a different name for postal addresses
    region?: Optional<string>;
    country?: Optional<string>;
    postalCode?: Optional<string>;
    postalId?: Optional<string>; // postal identifier
    /** Combined address UUID from the address integrator repository
     * Links to all matched data sources from https://github.com/chairemobilite/address_integrator
     */
    combinedAddressUuid?: Optional<string>;
} & UuidableAttributes &
    ValidatebleAttributes;

export type ExtendedAddressAttributes = AddressAttributes & { [key: string]: unknown };

export type SerializedExtendedAddressAttributes = {
    _attributes?: ExtendedAddressAttributes;
    _customAttributes?: { [key: string]: unknown };
};

/**
 * Address objects are created from official data sources and are used
 * to match geolocations with a civic address.
 */
export class Address extends Uuidable implements IValidatable {
    private _attributes: AddressAttributes;
    private _customAttributes: { [key: string]: unknown };

    static _confidentialAttributes = [];

    constructor(params: ExtendedAddressAttributes) {
        super(params._uuid);

        this._attributes = {} as AddressAttributes;
        this._customAttributes = {};

        const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(params, addressAttributes);
        this._attributes = attributes;
        this._customAttributes = customAttributes;
    }

    get attributes(): AddressAttributes {
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

    get fullAddress(): Optional<string> {
        return this._attributes.fullAddress;
    }

    set fullAddress(value: Optional<string>) {
        this._attributes.fullAddress = value;
    }

    get civicNumber(): Optional<number> {
        return this._attributes.civicNumber;
    }

    set civicNumber(value: Optional<number>) {
        this._attributes.civicNumber = value;
    }

    get civicNumberSuffix(): Optional<string> {
        return this._attributes.civicNumberSuffix;
    }

    set civicNumberSuffix(value: Optional<string>) {
        this._attributes.civicNumberSuffix = value;
    }

    get unitNumber(): Optional<string> {
        return this._attributes.unitNumber;
    }

    set unitNumber(value: Optional<string>) {
        this._attributes.unitNumber = value;
    }

    get streetName(): Optional<string> {
        return this._attributes.streetName;
    }

    set streetName(value: Optional<string>) {
        this._attributes.streetName = value;
    }

    get streetNameHomogenized(): Optional<string> {
        return this._attributes.streetNameHomogenized;
    }

    set streetNameHomogenized(value: Optional<string>) {
        this._attributes.streetNameHomogenized = value;
    }

    get combinedStreetUuid(): Optional<string> {
        return this._attributes.combinedStreetUuid;
    }

    set combinedStreetUuid(value: Optional<string>) {
        this._attributes.combinedStreetUuid = value;
    }

    get municipalityName(): Optional<string> {
        return this._attributes.municipalityName;
    }

    set municipalityName(value: Optional<string>) {
        this._attributes.municipalityName = value;
    }

    get municipalityCode(): Optional<string> {
        return this._attributes.municipalityCode;
    }

    set municipalityCode(value: Optional<string>) {
        this._attributes.municipalityCode = value;
    }

    get postalMunicipalityName(): Optional<string> {
        return this._attributes.postalMunicipalityName;
    }

    set postalMunicipalityName(value: Optional<string>) {
        this._attributes.postalMunicipalityName = value;
    }

    get region(): Optional<string> {
        return this._attributes.region;
    }

    set region(value: Optional<string>) {
        this._attributes.region = value;
    }

    get country(): Optional<string> {
        return this._attributes.country;
    }

    set country(value: Optional<string>) {
        this._attributes.country = value;
    }

    get postalCode(): Optional<string> {
        return this._attributes.postalCode;
    }

    set postalCode(value: Optional<string>) {
        this._attributes.postalCode = value;
    }

    get postalId(): Optional<string> {
        return this._attributes.postalId;
    }

    set postalId(value: Optional<string>) {
        this._attributes.postalId = value;
    }

    get combinedAddressUuid(): Optional<string> {
        return this._attributes.combinedAddressUuid;
    }

    set combinedAddressUuid(value: Optional<string>) {
        this._attributes.combinedAddressUuid = value;
    }

    /**
     * Creates an Address object from sanitized parameters
     * @param {ExtendedAddressAttributes | SerializedExtendedAddressAttributes} params - Sanitized address parameters
     * @returns {Address} New Address instance
     */
    static unserialize(params: ExtendedAddressAttributes | SerializedExtendedAddressAttributes): Address {
        const flattenedParams = SurveyObjectUnserializer.flattenSerializedData(params);
        return new Address(flattenedParams as ExtendedAddressAttributes);
    }

    /**
     * Factory that validates input from an interview and makes
     * sure types and required fields are valid before returning a new object
     * Custom attributes must be validated in each survey project
     * @param dirtyParams
     * @returns Address | Error[]
     */
    static create(dirtyParams: { [key: string]: unknown }): Result<Address> {
        const errors = Address.validateParams(dirtyParams);
        const address = errors.length === 0 ? new Address(dirtyParams as ExtendedAddressAttributes) : undefined;
        if (errors.length > 0) {
            return createErrors(errors);
        }
        return createOk(address as Address);
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
     * Validates attributes types for Address.
     * @param dirtyParams The parameters to validate.
     * @param displayName The name of the object to validate, for error display
     * @returns Error[] TODO: specialize this error class
     */
    static validateParams(dirtyParams: { [key: string]: unknown }, displayName = 'Address'): Error[] {
        const errors: Error[] = [];

        // Validate params object:
        errors.push(...ParamsValidatorUtils.isRequired('params', dirtyParams, displayName));
        errors.push(...ParamsValidatorUtils.isObject('params', dirtyParams, displayName));

        // Validate _uuid
        errors.push(...Uuidable.validateParams(dirtyParams));

        // Validate _isValid
        errors.push(...ParamsValidatorUtils.isBoolean('_isValid', dirtyParams._isValid, displayName));

        // Validate attributes
        errors.push(...ParamsValidatorUtils.isString('fullAddress', dirtyParams.fullAddress, displayName));

        errors.push(...ParamsValidatorUtils.isPositiveInteger('civicNumber', dirtyParams.civicNumber, displayName));

        errors.push(...ParamsValidatorUtils.isString('civicNumberSuffix', dirtyParams.civicNumberSuffix, displayName));

        errors.push(...ParamsValidatorUtils.isString('unitNumber', dirtyParams.unitNumber, displayName));

        errors.push(...ParamsValidatorUtils.isNonEmptyString('streetName', dirtyParams.streetName, displayName));

        errors.push(
            ...ParamsValidatorUtils.isString('streetNameHomogenized', dirtyParams.streetNameHomogenized, displayName)
        );

        errors.push(...ParamsValidatorUtils.isUuid('combinedStreetUuid', dirtyParams.combinedStreetUuid, displayName));

        errors.push(
            ...ParamsValidatorUtils.isNonEmptyString('municipalityName', dirtyParams.municipalityName, displayName)
        );

        errors.push(...ParamsValidatorUtils.isString('municipalityCode', dirtyParams.municipalityCode, displayName));

        errors.push(
            ...ParamsValidatorUtils.isString('postalMunicipalityName', dirtyParams.postalMunicipalityName, displayName)
        );

        errors.push(...ParamsValidatorUtils.isNonEmptyString('region', dirtyParams.region, displayName));

        errors.push(...ParamsValidatorUtils.isNonEmptyString('country', dirtyParams.country, displayName));

        errors.push(...ParamsValidatorUtils.isString('postalCode', dirtyParams.postalCode, displayName));

        errors.push(...ParamsValidatorUtils.isString('postalId', dirtyParams.postalId, displayName));

        errors.push(
            ...ParamsValidatorUtils.isUuid('combinedAddressUuid', dirtyParams.combinedAddressUuid, displayName)
        );

        return errors;
    }
}
