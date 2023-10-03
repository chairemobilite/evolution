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
import { Weightable, Weight } from './Weight';
import * as OAttr from './attributeTypes/OrganizationAttributes';
import { Uuidable } from './Uuidable';
import { Vehicleable } from './Vehicleable';
import { BaseVehicle } from './BaseVehicle';

type BaseOrganizationAttributes = {

    _uuid?: string;

    name?: string;
    shortname?: string;
    size?: number; // can be the number of employees or members or count of persons related to the organization
    category?: OAttr.OrganizationCategory;
    vehicleNumber?: number;
    pluginHybridVehicleNumber?: number;
    electricVehicleNumber?: number;

    persons?: BasePerson[]; // employees, clients or any person related to the organization
    locations?: BasePlace[]; // all the locations related to the organization
    headquarter?: BasePlace; // headquarter or the single location for this organization

    contactPerson?: BasePerson;
    contactPhoneNumber?: string;
    contactEmail?: string;

} & Weightable & Vehicleable;

type ExtendedOrganizationAttributes = BaseOrganizationAttributes & { [key: string]: any };

class BaseOrganization extends Uuidable implements IValidatable {

    _isValid: OptionalValidity;
    _weight?: Weight;

    name?: string;
    shortname?: string;
    size?: number;
    category?: OAttr.OrganizationCategory;
    vehicleNumber?: number;
    pluginHybridVehicleNumber?: number;
    electricVehicleNumber?: number;

    persons: BasePerson[];
    locations?: BasePlace[];
    headquarter?: BasePlace;

    vehicles?: BaseVehicle[];

    contactPerson?: BasePerson;
    contactPhoneNumber?: string;
    contactEmail?: string;

    constructor(params: BaseOrganizationAttributes | ExtendedOrganizationAttributes) {

        super(params._uuid);

        this._isValid = undefined;
        this._weight = params._weight;

        this.name = params.name;
        this.shortname = params.shortname;
        this.size = params.size;
        this.category = params.category;
        this.vehicleNumber = params.vehicleNumber;
        this.pluginHybridVehicleNumber = params.pluginHybridVehicleNumber;
        this.electricVehicleNumber = params.electricVehicleNumber;

        this.persons = params.persons || [];
        this.locations = params.locations || [];
        this.headquarter = params.headquarter;

        this.vehicles = params.vehicles || [];

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
     * @returns BaseOrganization
     */
    static create(dirtyParams: { [key: string]: any }) {
        const allParamsValid = true;
        // validate types and required attributes
        // TODO: implement dirtyParams validation:
        const params: BaseOrganizationAttributes = {};
        if (allParamsValid === true) {
            return new BaseOrganization(params);
        }
    }

}

export {
    BaseOrganization,
    BaseOrganizationAttributes,
    ExtendedOrganizationAttributes
};
