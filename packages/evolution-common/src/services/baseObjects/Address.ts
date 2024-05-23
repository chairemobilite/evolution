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

// TODO: make this class more international. For now, it fits Canadian addresses only.

/**
 * Address objects are created from official data sources and are used
 * to match geolocations with a civic address.
 */

export const addressAttributes = [
    '_uuid',
    '_isValid',
    'civicNumber',
    'civicNumberSuffix',
    'unitNumber',
    'streetName',
    'streetNameHomogenized',
    'streetNameId',
    'municipalityName',
    'municipalityCode',
    'postalMunicipalityName',
    'region',
    'country',
    'postalCode',
    'addressId'
] as const;

/**
 * Note about ? and Optional type:
 * We keep the ? so it accepts empty params
 * We add the Optional type to make it obvious that the attribute is optional everywhere it appears
 */
export type AddressAttributes = {
    civicNumber: number;
    civicNumberSuffix?: Optional<string>; // example: A, B, C
    unitNumber?: Optional<string>; // example: 101, 202
    streetName: string; // no abbreviation, with latin characters and capital letters
    /** homogenized street name:
     * - replace latin characters with their non-latin equivalent
     * - lowercase
     * - no dash
     * - includes non-abbreviated street type/prefix and/or suffix (e.g. "rue", "avenue", "boulevard", etc.)
     * - includes non-abbreviated orientation
     * - non-abbreviated saint/sainte
     * - trimed and trimed start
     * example: 30th street | saint john boulevard | rue de la gauchetiere ouest | 5e avenue nord | rang du petit saint jean | 30e rue
     */
    streetNameHomogenized?: Optional<string>; // should be unique by municipality
    streetNameId?: Optional<string>; // official street name id
    municipalityName: string;
    municipalityCode?: Optional<string>; // official code for the municipality
    postalMunicipalityName?: Optional<string>; // some municipalities have a different name for postal addresses
    region: string;
    country: string;
    postalCode?: Optional<string>;
    addressId?: Optional<string>; // official address id, linking to governmental or postal data
} & UuidableAttributes & ValidatebleAttributes;

export type ExtendedAddressAttributes = AddressAttributes & { [key: string]: unknown };

export class Address implements IValidatable {
    private _attributes: AddressAttributes;
    private _customAttributes: { [key: string]: unknown };

    static _confidentialAttributes = [];

    constructor(params: ExtendedAddressAttributes) {

        params._uuid = Uuidable.getUuid(params._uuid);

        this._attributes = {} as AddressAttributes;
        this._customAttributes = {};

        const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(
            params,
            addressAttributes
        );
        this._attributes = attributes;
        this._customAttributes = customAttributes;
    }

    get attributes(): AddressAttributes {
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

    get civicNumber(): number {
        return this._attributes.civicNumber;
    }

    set civicNumber(value: number) {
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

    get streetName(): string {
        return this._attributes.streetName;
    }

    set streetName(value: string) {
        this._attributes.streetName = value;
    }

    get streetNameHomogenized(): Optional<string> {
        return this._attributes.streetNameHomogenized;
    }

    set streetNameHomogenized(value: Optional<string>) {
        this._attributes.streetNameHomogenized = value;
    }

    get streetNameId(): Optional<string> {
        return this._attributes.streetNameId;
    }

    set streetNameId(value: Optional<string>) {
        this._attributes.streetNameId = value;
    }

    get municipalityName(): string {
        return this._attributes.municipalityName;
    }

    set municipalityName(value: string) {
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

    get region(): string {
        return this._attributes.region;
    }

    set region(value: string) {
        this._attributes.region = value;
    }

    get country(): string {
        return this._attributes.country;
    }

    set country(value: string) {
        this._attributes.country = value;
    }

    get postalCode(): Optional<string> {
        return this._attributes.postalCode;
    }

    set postalCode(value: Optional<string>) {
        this._attributes.postalCode = value;
    }

    get addressId(): Optional<string> {
        return this._attributes.addressId;
    }

    set addressId(value: Optional<string>) {
        this._attributes.addressId = value;
    }

    // params must be sanitized and must be valid:
    static unserialize(params: ExtendedAddressAttributes): Address {
        return new Address(params);
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

        // Validate _uuid
        errors.push(...Uuidable.validateParams(dirtyParams));

        // Validate _isValid
        errors.push(
            ...ParamsValidatorUtils.isBoolean(
                '_isValid',
                dirtyParams._isValid,
                displayName
            )
        );

        // Validate attributes
        errors.push(
            ...ParamsValidatorUtils.isPositiveInteger(
                'civicNumber',
                dirtyParams.civicNumber,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'civicNumberSuffix',
                dirtyParams.civicNumberSuffix,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'unitNumber',
                dirtyParams.unitNumber,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isNonEmptyString(
                'streetName',
                dirtyParams.streetName,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'streetNameHomogenized',
                dirtyParams.streetNameHomogenized,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'streetNameId',
                dirtyParams.streetNameId,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isNonEmptyString(
                'municipalityName',
                dirtyParams.municipalityName,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'municipalityCode',
                dirtyParams.municipalityCode,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'postalMunicipalityName',
                dirtyParams.postalMunicipalityName,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isNonEmptyString(
                'region',
                dirtyParams.region,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isNonEmptyString(
                'country',
                dirtyParams.country,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'postalCode',
                dirtyParams.postalCode,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'addressId',
                dirtyParams.addressId,
                displayName
            )
        );

        return errors;
    }
}
