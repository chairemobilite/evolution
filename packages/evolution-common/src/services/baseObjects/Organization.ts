/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Optional } from '../../types/Optional.type';
import { IValidatable, ValidatebleAttributes } from './IValidatable';
import { WeightableAttributes, Weight, validateWeights } from './Weight';
import { Uuidable, UuidableAttributes } from './Uuidable';
import * as OAttr from './attributeTypes/OrganizationAttributes';
import { Result, createErrors, createOk } from '../../types/Result.type';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { ConstructorUtils } from '../../utils/ConstructorUtils';
import { Vehicle, ExtendedVehicleAttributes } from './Vehicle';
import { Place, PlaceAttributes, ExtendedPlaceAttributes } from './Place';

export const organizationAttributes = [
    '_weights',
    '_isValid',
    '_uuid',
    'name',
    'shortname',
    'numberOfEmployees',
    'category',
    'contactFirstName',
    'contactLastName',
    'contactPhoneNumber',
    'contactEmail',
    'revenueLevel',
];

export const organizationAttributesWithComposedAttributes = [
    ...organizationAttributes,
    'vehicles',
    'places',
];

export type OrganizationAttributes = {
    name?: Optional<string>;
    shortname?: Optional<string>;
    numberOfEmployees?: Optional<number>;
    category?: Optional<OAttr.OrganizationCategory>;
    contactFirstName?: Optional<string>;
    contactLastName?: Optional<string>;
    contactPhoneNumber?: Optional<string>;
    contactEmail?: Optional<string>;
    revenueLevel?: Optional<OAttr.RevenueLevel>;
} & UuidableAttributes & WeightableAttributes & ValidatebleAttributes;

export type OrganizationWithComposedAttributes = OrganizationAttributes & {
    /**
     * These are the vehicles owned by the organization or surveyed in the active survey
     */
    vehicles?: Optional<ExtendedVehicleAttributes[]>;
    /**
     * These are the places owned/used by the organization or surveyed in the active survey
     * (factories, headquarters, offices, shops, garages, warehouses, etc.)
     */
    places?: Optional<ExtendedPlaceAttributes[]>;
};

export type ExtendedOrganizationAttributes = OrganizationWithComposedAttributes & { [key: string]: unknown };

/**
 * Organization is a base object that represents an organization,
 * a company, a place with employees, or a group of persons other than a household.
 */
export class Organization implements IValidatable {
    private _attributes: OrganizationAttributes;
    private _customAttributes: { [key: string]: unknown };

    private _vehicles?: Optional<Vehicle[]>;
    private _places?: Optional<Place<PlaceAttributes>[]>;

    static _confidentialAttributes = [
        'contactPhoneNumber',
        'contactEmail',
    ];

    constructor(params: ExtendedOrganizationAttributes) {
        params._uuid = Uuidable.getUuid(params._uuid);

        this._attributes = {} as OrganizationAttributes;
        this._customAttributes = {};

        const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(
            params,
            organizationAttributes,
            organizationAttributesWithComposedAttributes
        );
        this._attributes = attributes;
        this._customAttributes = customAttributes;

        this.vehicles = ConstructorUtils.initializeComposedArrayAttributes(params.vehicles, Vehicle.unserialize);
        this.places = ConstructorUtils.initializeComposedArrayAttributes(params.places, Place.unserialize);
    }

    get attributes(): OrganizationAttributes {
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

    get numberOfEmployees(): Optional<number> {
        return this._attributes.numberOfEmployees;
    }

    set numberOfEmployees(value: Optional<number>) {
        this._attributes.numberOfEmployees = value;
    }

    get category(): Optional<OAttr.OrganizationCategory> {
        return this._attributes.category;
    }

    set category(value: Optional<OAttr.OrganizationCategory>) {
        this._attributes.category = value;
    }

    get contactFirstName(): Optional<string> {
        return this._attributes.contactFirstName;
    }

    set contactFirstName(value: Optional<string>) {
        this._attributes.contactFirstName = value;
    }

    get contactLastName(): Optional<string> {
        return this._attributes.contactLastName;
    }

    set contactLastName(value: Optional<string>) {
        this._attributes.contactLastName = value;
    }

    get contactPhoneNumber(): Optional<string> {
        return this._attributes.contactPhoneNumber;
    }

    set contactPhoneNumber(value: Optional<string>) {
        this._attributes.contactPhoneNumber = value;
    }

    get contactEmail(): Optional<string> {
        return this._attributes.contactEmail;
    }

    set contactEmail(value: Optional<string>) {
        this._attributes.contactEmail = value;
    }

    get revenueLevel(): Optional<OAttr.RevenueLevel> {
        return this._attributes.revenueLevel;
    }

    set revenueLevel(value: Optional<OAttr.RevenueLevel>) {
        this._attributes.revenueLevel = value;
    }

    get vehicles(): Optional<Vehicle[]> {
        return this._vehicles;
    }

    set vehicles(value: Optional<Vehicle[]>) {
        this._vehicles = value;
    }

    get places(): Optional<Place<PlaceAttributes>[]> {
        return this._places;
    }

    set places(value: Optional<Place<PlaceAttributes>[]>) {
        this._places = value;
    }

    static unserialize(params: ExtendedOrganizationAttributes): Organization {
        return new Organization(params);
    }

    static create(dirtyParams: { [key: string]: unknown }): Result<Organization> {
        const errors = Organization.validateParams(dirtyParams);
        const organization = errors.length === 0 ? new Organization(dirtyParams) : undefined;
        if (errors.length > 0) {
            return createErrors(errors);
        }
        return createOk(organization as Organization);
    }

    validate(): Optional<boolean> {
        this._attributes._isValid = true;
        return true;
    }

    isValid(): Optional<boolean> {
        return this._isValid;
    }

    static validateParams(dirtyParams: { [key: string]: unknown }, displayName = 'Organization'): Error[] {
        const errors: Error[] = [];

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

        errors.push(...Uuidable.validateParams(dirtyParams));

        errors.push(
            ...ParamsValidatorUtils.isBoolean(
                '_isValid',
                dirtyParams._isValid,
                displayName
            )
        );

        errors.push(...validateWeights(dirtyParams._weights as Optional<Weight[]>));

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
            ...ParamsValidatorUtils.isPositiveInteger(
                'numberOfEmployees',
                dirtyParams.numberOfEmployees,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'category',
                dirtyParams.category,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'contactFirstName',
                dirtyParams.contactFirstName,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'contactLastName',
                dirtyParams.contactLastName,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'contactPhoneNumber',
                dirtyParams.contactPhoneNumber,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'contactEmail',
                dirtyParams.contactEmail,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'revenueLevel',
                dirtyParams.revenueLevel,
                displayName
            )
        );

        const vehiclesAttributes = dirtyParams.vehicles !== undefined ? dirtyParams.vehicles as { [key: string]: unknown }[] : [];
        for (let i = 0, countI = vehiclesAttributes.length; i < countI; i++) {
            const vehicleAttributes = vehiclesAttributes[i];
            errors.push(
                ...Vehicle.validateParams(vehicleAttributes, 'Vehicle')
            );
        }

        const placesAttributes = dirtyParams.places !== undefined ? dirtyParams.places as { [key: string]: unknown }[] : [];
        for (let i = 0, countI = placesAttributes.length; i < countI; i++) {
            const placeAttributes = placesAttributes[i];
            errors.push(
                ...Place.validateParams(placeAttributes, 'Place')
            );
        }

        return errors;
    }
}
