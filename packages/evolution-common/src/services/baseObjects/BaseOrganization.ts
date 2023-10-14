/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * An organization is a company, an NGO, an institutiona,
 * a government entity, or any group of people that can be surveyed.
 */

import { OptionalValidity, IValidatable } from './Validatable';
import { BasePerson } from './BasePerson';
import { BasePlace } from './BasePlace';
import { Weightable, Weight, validateWeights } from './Weight';
import * as OAttr from './attributeTypes/OrganizationAttributes';
import { Uuidable } from './Uuidable';
import { Vehicleable } from './Vehicleable';
import { BaseVehicle } from './BaseVehicle';

type BaseOrganizationAttributes = {

    _uuid?: string;

    name?: string;
    shortname?: string;
    size?: number; // can be the number of employees or members or count of basePersons related to the organization
    category?: OAttr.OrganizationCategory;
    vehicleNumber?: number;
    pluginHybridVehicleNumber?: number;
    electricVehicleNumber?: number;

    basePersons?: BasePerson[]; // employees, clients or any person related to the organization
    baseLocations?: BasePlace[]; // all the baseLocations related to the organization
    baseHeadquarter?: BasePlace; // baseHeadquarter or the single location for this organization

    contactPerson?: BasePerson;
    contactPhoneNumber?: string;
    contactEmail?: string;

} & Weightable & Vehicleable;

type ExtendedOrganizationAttributes = BaseOrganizationAttributes & { [key: string]: any };

class BaseOrganization extends Uuidable implements IValidatable {

    _isValid: OptionalValidity;
    _weights?: Weight[];

    name?: string;
    shortname?: string;
    size?: number;
    category?: OAttr.OrganizationCategory;
    vehicleNumber?: number;
    pluginHybridVehicleNumber?: number;
    electricVehicleNumber?: number;

    basePersons: BasePerson[];
    baseLocations?: BasePlace[];
    baseHeadquarter?: BasePlace;

    baseVehicles?: BaseVehicle[];

    contactPerson?: BasePerson;
    contactPhoneNumber?: string;
    contactEmail?: string;

    _confidentialAttributes : string[] = [ // these attributes should be hidden when exporting
        'contactPhoneNumber',
        'contactEmail',
        'contactPerson',
    ];

    constructor(params: BaseOrganizationAttributes | ExtendedOrganizationAttributes) {

        super(params._uuid);

        this._isValid = undefined;
        this._weights = params._weights;

        this.name = params.name;
        this.shortname = params.shortname;
        this.size = params.size;
        this.category = params.category;
        this.vehicleNumber = params.vehicleNumber;
        this.pluginHybridVehicleNumber = params.pluginHybridVehicleNumber;
        this.electricVehicleNumber = params.electricVehicleNumber;

        this.basePersons = params.basePersons || [];
        this.baseLocations = params.baseLocations || [];
        this.baseHeadquarter = params.baseHeadquarter;

        this.baseVehicles = params.baseVehicles || [];

        this.contactPerson = params.contactPerson;
        this.contactPhoneNumber = params.contactPhoneNumber;
        this.contactEmail = params.contactEmail;

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
     * @returns BaseOrganization | Error[]
     */
    static create(dirtyParams: { [key: string]: any }): BaseOrganization | Error[] {
        const errors = BaseOrganization.validateParams(dirtyParams);
        return errors.length > 0 ? errors : new BaseOrganization(dirtyParams as ExtendedOrganizationAttributes);
    }

    /**
 * Validates attributes types for BaseOrganization.
 * @param dirtyParams The parameters to validate.
 * @returns Error[] TODO: specialize this error class
 */
    static validateParams(dirtyParams: { [key: string]: any }): Error[] {
        const errors: Error[] = [];

        // Validate params object:
        if (!dirtyParams || typeof dirtyParams !== 'object') {
            errors.push(new Error('BaseOrganization validateParams: params is undefined or invalid'));
            return errors; // Stop now; further validation depends on valid params object.
        }

        // Validate UUID
        const uuidErrors: Error[] = Uuidable.validateParams(dirtyParams);
        if (uuidErrors.length > 0) {
            errors.push(...uuidErrors);
        }

        // Validate weights:
        const weightsErrors = validateWeights(dirtyParams._weights);
        if (weightsErrors.length > 0) {
            errors.push(...weightsErrors);
        }

        // Validate name (if provided)
        if (dirtyParams.name !== undefined && typeof dirtyParams.name !== 'string') {
            errors.push(new Error('BaseOrganization validateParams: name should be a string'));
        }

        // Validate shortname (if provided)
        if (dirtyParams.shortname !== undefined && typeof dirtyParams.shortname !== 'string') {
            errors.push(new Error('BaseOrganization validateParams: shortname should be a string'));
        }

        // Validate size (if provided)
        if (dirtyParams.size !== undefined && (!Number.isInteger(dirtyParams.size) || dirtyParams.size < 0)) {
            errors.push(new Error('BaseOrganization validateParams: size should be a positive integer'));
        }

        // Validate category (if provided)
        if (dirtyParams.category !== undefined && typeof dirtyParams.category !== 'string') {
            errors.push(new Error('BaseOrganization validateParams: category is not a valid organization category'));
        }

        // Validate vehicleNumber (if provided)
        if (dirtyParams.vehicleNumber !== undefined && (!Number.isInteger(dirtyParams.vehicleNumber) || dirtyParams.vehicleNumber < 0)) {
            errors.push(new Error('BaseOrganization validateParams: vehicleNumber should be a positive integer'));
        }

        // Validate pluginHybridVehicleNumber (if provided)
        if (dirtyParams.pluginHybridVehicleNumber !== undefined && (!Number.isInteger(dirtyParams.pluginHybridVehicleNumber) || dirtyParams.pluginHybridVehicleNumber < 0)) {
            errors.push(new Error('BaseOrganization validateParams: pluginHybridVehicleNumber should be a positive integer'));
        }

        // Validate electricVehicleNumber (if provided)
        if (dirtyParams.electricVehicleNumber !== undefined && (!Number.isInteger(dirtyParams.electricVehicleNumber) || dirtyParams.electricVehicleNumber < 0)) {
            errors.push(new Error('BaseOrganization validateParams: electricVehicleNumber should be a positive integer'));
        }

        // Validate basePersons (if provided)
        if (dirtyParams.basePersons !== undefined && (!Array.isArray(dirtyParams.basePersons) || !dirtyParams.basePersons.every((person) => person instanceof BasePerson))) {
            errors.push(new Error('BaseOrganization validateParams: basePersons should be an array of BasePerson'));
        }

        // Validate baseLocations (if provided)
        if (dirtyParams.baseLocations !== undefined && (!Array.isArray(dirtyParams.baseLocations) || !dirtyParams.baseLocations.every((location) => location instanceof BasePlace))) {
            errors.push(new Error('BaseOrganization validateParams: baseLocations should be an array of BasePlace'));
        }

        // Validate baseHeadquarter (if provided)
        if (dirtyParams.baseHeadquarter !== undefined && !(dirtyParams.baseHeadquarter instanceof BasePlace)) {
            errors.push(new Error('BaseOrganization validateParams: baseHeadquarter should be an instance of BasePlace'));
        }

        // Validate baseVehicles (if provided)
        if (dirtyParams.baseVehicles !== undefined && (!Array.isArray(dirtyParams.baseVehicles) || !dirtyParams.baseVehicles.every((vehicle) => vehicle instanceof BaseVehicle))) {
            errors.push(new Error('BaseOrganization validateParams: baseVehicles should be an array of BaseVehicle'));
        }

        // Validate contactPerson (if provided)
        if (dirtyParams.contactPerson !== undefined && !(dirtyParams.contactPerson instanceof BasePerson)) {
            errors.push(new Error('BaseOrganization validateParams: contactPerson should be an instance of BasePerson'));
        }

        // Validate contactPhoneNumber (if provided)
        if (dirtyParams.contactPhoneNumber !== undefined && typeof dirtyParams.contactPhoneNumber !== 'string') {
            errors.push(new Error('BaseOrganization validateParams: contactPhoneNumber should be a string'));
        }

        // Validate contactEmail (if provided)
        if (dirtyParams.contactEmail !== undefined && typeof dirtyParams.contactEmail !== 'string') {
            errors.push(new Error('BaseOrganization validateParams: contactEmail should be a string'));
        }

        return errors;
    }

}

export {
    BaseOrganization,
    BaseOrganizationAttributes,
    ExtendedOrganizationAttributes
};
