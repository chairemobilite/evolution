/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _omit from 'lodash/omit';

import { Optional } from '../../types/Optional.type';
import { IValidatable, ValidatebleAttributes } from './IValidatable';
import { WeightableAttributes, Weight, validateWeights } from './Weight';
import { Uuidable, UuidableAttributes } from './Uuidable';
import * as OAttr from './attributeTypes/OrganizationAttributes';
import { Result, createErrors, createOk } from '../../types/Result.type';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { ConstructorUtils } from '../../utils/ConstructorUtils';
import { Vehicle, ExtendedVehicleAttributes, SerializedExtendedVehicleAttributes } from './Vehicle';
import { Place, ExtendedPlaceAttributes, SerializedExtendedPlaceAttributes } from './Place';
import { SurveyObjectUnserializer } from './SurveyObjectUnserializer';
import { SurveyObjectsRegistry } from './SurveyObjectsRegistry';
import { Interview } from './interview/Interview';

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
    'revenueLevel'
];

export const organizationAttributesWithComposedAttributes = [...organizationAttributes, '_vehicles', '_places'];

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
} & UuidableAttributes &
    WeightableAttributes &
    ValidatebleAttributes;

export type OrganizationWithComposedAttributes = OrganizationAttributes & {
    /**
     * These are the vehicles owned by the organization or surveyed in the active survey
     */
    _vehicles?: Optional<ExtendedVehicleAttributes[]>;
    /**
     * These are the places owned/used by the organization or surveyed in the active survey
     * (factories, headquarters, offices, shops, garages, warehouses, etc.)
     */
    _places?: Optional<ExtendedPlaceAttributes[]>;
};

export type ExtendedOrganizationAttributes = OrganizationWithComposedAttributes & { [key: string]: unknown };

export type SerializedExtendedOrganizationAttributes = {
    _attributes?: ExtendedOrganizationAttributes;
    _customAttributes?: { [key: string]: unknown };
    _vehicles?: SerializedExtendedVehicleAttributes[];
    _places?: SerializedExtendedPlaceAttributes[];
};

/**
 * Organization is a base object that represents an organization,
 * a company, a place with employees, or a group of persons other than a household.
 */
export class Organization extends Uuidable implements IValidatable {
    private _surveyObjectsRegistry: SurveyObjectsRegistry;
    private _attributes: OrganizationAttributes;
    private _customAttributes: { [key: string]: unknown };

    private _vehicles?: Optional<Vehicle[]>;
    private _places?: Optional<Place[]>;

    private _interviewUuid?: Optional<string>; // allow reverse lookup

    static _confidentialAttributes = ['contactPhoneNumber', 'contactEmail'];

    constructor(params: ExtendedOrganizationAttributes, surveyObjectsRegistry: SurveyObjectsRegistry) {
        super(params._uuid);

        this._surveyObjectsRegistry = surveyObjectsRegistry;

        this._attributes = {} as OrganizationAttributes;
        this._customAttributes = {};

        const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(
            _omit(params, ['_vehicles', '_places', 'vehicles', 'places', '_interviewUuid']),
            organizationAttributes,
            organizationAttributesWithComposedAttributes
        );
        this._attributes = attributes;
        this._customAttributes = customAttributes;

        this.vehicles = ConstructorUtils.initializeComposedArrayAttributes(
            params._vehicles,
            (params) => Vehicle.unserialize(params, this._surveyObjectsRegistry),
            this._surveyObjectsRegistry
        );
        this.places = ConstructorUtils.initializeComposedArrayAttributes(
            params._places,
            (params) => Place.unserialize(params, this._surveyObjectsRegistry),
            this._surveyObjectsRegistry
        );
        this.interviewUuid = params._interviewUuid as Optional<string>;

        this._surveyObjectsRegistry.registerOrganization(this);
    }

    get attributes(): OrganizationAttributes {
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

    get places(): Optional<Place[]> {
        return this._places;
    }

    set places(value: Optional<Place[]>) {
        this._places = value;
    }

    get interviewUuid(): Optional<string> {
        return this._interviewUuid;
    }

    set interviewUuid(value: Optional<string>) {
        this._interviewUuid = value;
    }

    get interview(): Optional<Interview> {
        if (!this._interviewUuid) {
            return undefined;
        }
        return this._surveyObjectsRegistry.getInterview(this._interviewUuid);
    }

    /**
     * Creates an Organization object from sanitized parameters
     * @param {ExtendedOrganizationAttributes | SerializedExtendedOrganizationAttributes} params - Sanitized organization parameters
     * @returns {Organization} New Organization instance
     */
    static unserialize(
        params: ExtendedOrganizationAttributes | SerializedExtendedOrganizationAttributes,
        surveyObjectsRegistry: SurveyObjectsRegistry
    ): Organization {
        const flattenedParams = SurveyObjectUnserializer.flattenSerializedData(params);
        return new Organization(flattenedParams as ExtendedOrganizationAttributes, surveyObjectsRegistry);
    }

    static create(
        dirtyParams: { [key: string]: unknown },
        surveyObjectsRegistry: SurveyObjectsRegistry
    ): Result<Organization> {
        const errors = Organization.validateParams(dirtyParams);
        const organization = errors.length === 0 ? new Organization(dirtyParams, surveyObjectsRegistry) : undefined;
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

        errors.push(...ParamsValidatorUtils.isRequired('params', dirtyParams, displayName));
        errors.push(...ParamsValidatorUtils.isObject('params', dirtyParams, displayName));

        errors.push(...Uuidable.validateParams(dirtyParams));

        errors.push(...ParamsValidatorUtils.isBoolean('_isValid', dirtyParams._isValid, displayName));

        errors.push(...validateWeights(dirtyParams._weights as Optional<Weight[]>));

        errors.push(...ParamsValidatorUtils.isString('name', dirtyParams.name, displayName));

        errors.push(...ParamsValidatorUtils.isString('shortname', dirtyParams.shortname, displayName));

        errors.push(
            ...ParamsValidatorUtils.isPositiveInteger('numberOfEmployees', dirtyParams.numberOfEmployees, displayName)
        );

        errors.push(...ParamsValidatorUtils.isString('category', dirtyParams.category, displayName));

        errors.push(...ParamsValidatorUtils.isString('contactFirstName', dirtyParams.contactFirstName, displayName));

        errors.push(...ParamsValidatorUtils.isString('contactLastName', dirtyParams.contactLastName, displayName));

        errors.push(
            ...ParamsValidatorUtils.isString('contactPhoneNumber', dirtyParams.contactPhoneNumber, displayName)
        );

        errors.push(...ParamsValidatorUtils.isString('contactEmail', dirtyParams.contactEmail, displayName));

        errors.push(...ParamsValidatorUtils.isString('revenueLevel', dirtyParams.revenueLevel, displayName));

        const vehiclesAttributes =
            dirtyParams._vehicles !== undefined ? (dirtyParams._vehicles as { [key: string]: unknown }[]) : [];
        for (let i = 0, countI = vehiclesAttributes.length; i < countI; i++) {
            const vehicleAttributes = vehiclesAttributes[i];
            errors.push(...Vehicle.validateParams(vehicleAttributes, 'Vehicle'));
        }

        const placesAttributes =
            dirtyParams._places !== undefined ? (dirtyParams._places as { [key: string]: unknown }[]) : [];
        for (let i = 0, countI = placesAttributes.length; i < countI; i++) {
            const placeAttributes = placesAttributes[i];
            errors.push(...Place.validateParams(placeAttributes, 'Place'));
        }

        errors.push(...ParamsValidatorUtils.isUuid('_interviewUuid', dirtyParams._interviewUuid, displayName));

        return errors;
    }
}
