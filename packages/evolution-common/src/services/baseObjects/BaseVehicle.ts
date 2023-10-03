/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * A vehicle can be used to make trips or can be surveyed for a specific household or a specific company.
 */


import { Uuidable } from './Uuidable';
import { OptionalValidity, IValidatable } from './Validatable';
import { BasePerson } from './BasePerson';
import { Weightable, Weight } from './Weight';
import * as VAttr from './attributeTypes/VehicleAttributes';


export type BaseVehicleAttributes = {

    _uuid?: string;
    _weight?: Weight;

    make?: VAttr.Make; // TODO: remove and use Make inside model instead
    model?: VAttr.Model;
    licensePlateNumber?: string;
    capacitySeated?: number;
    capacityStanding?: number;

    /**
     * Departure and arrival time must be calculated from trips
     * */
} & Weightable;

export type ExtendedVehicleAttributes = BaseVehicleAttributes & { [key: string]: any };

export class BaseVehicle extends Uuidable implements IValidatable {

    _isValid: OptionalValidity;
    _weight?: Weight;

    make?: VAttr.Make;
    model?: VAttr.Model;
    licensePlateNumber?: string;
    capacitySeated?: number;
    capacityStanding?: number;

    constructor(params: BaseVehicleAttributes | ExtendedVehicleAttributes) {

        super(params._uuid);

        this._isValid = undefined;
        this._weight = params._weight;

        this.make = params.make;
        this.model = params.model;
        this.licensePlateNumber = params.licensePlateNumber;
        this.capacitySeated = params.capacitySeated;
        this.capacityStanding = params.capacityStanding;

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
     * @returns BaseVehicle
     */
    static create(dirtyParams: { [key: string]: any }) {
        const allParamsValid = true;
        // validate types and required attributes
        // TODO: implement dirtyParams validation:
        const params: BaseVehicleAttributes = {};
        if (allParamsValid === true) {
            return new BaseVehicle(params);
        }
    }

}
