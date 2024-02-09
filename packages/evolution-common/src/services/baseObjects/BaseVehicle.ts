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
import { Weightable, Weight, validateWeights } from './Weight';
import * as VAttr from './attributeTypes/VehicleAttributes';

export type BaseVehicleAttributes = {
    _uuid?: string;

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
    _weights?: Weight[];

    make?: VAttr.Make;
    model?: VAttr.Model;
    licensePlateNumber?: string;
    capacitySeated?: number;
    capacityStanding?: number;

    _confidentialAttributes: string[] = [
        // these attributes should be hidden when exporting
        'licensePlateNumber'
    ];

    constructor(params: BaseVehicleAttributes | ExtendedVehicleAttributes) {
        super(params._uuid);

        this._isValid = undefined;
        this._weights = params._weights;

        this.make = params.make;
        this.model = params.model;
        this.licensePlateNumber = params.licensePlateNumber;
        this.capacitySeated = params.capacitySeated;
        this.capacityStanding = params.capacityStanding;
    }

    // params must be sanitized and must be valid:
    static unserialize(params: BaseVehicleAttributes): BaseVehicle {
        return new BaseVehicle(params);
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
     * @returns BaseVehicle | Error[]
     */
    static create(dirtyParams: { [key: string]: any }): BaseVehicle | Error[] {
        const errors = BaseVehicle.validateParams(dirtyParams);
        return errors.length > 0 ? errors : new BaseVehicle(dirtyParams as ExtendedVehicleAttributes);
    }

    /**
     * Validates attributes types for BaseVehicle
     * @param dirtyParams The params input
     * @returns Error[] TODO: specialize this error class
     */
    static validateParams(dirtyParams: { [key: string]: any }): Error[] {
        const errors: Error[] = [];

        // Validate params object:
        if (!dirtyParams || typeof dirtyParams !== 'object') {
            errors.push(new Error('BaseVehicle validateParams: params is undefined or invalid'));
            return errors; // Stop now; other validations may crash if params are not valid
        }

        // Validate UUID
        const uuidErrors: Error[] = Uuidable.validateParams(dirtyParams);
        if (uuidErrors.length > 0) {
            errors.push(...uuidErrors);
        }

        // Validate make (if provided)
        if (dirtyParams.make !== undefined && typeof dirtyParams.make !== 'string') {
            errors.push(new Error('BaseVehicle validateParams: make should be a string'));
        }

        // Validate model (if provided)
        if (dirtyParams.model !== undefined && typeof dirtyParams.model !== 'string') {
            errors.push(new Error('BaseVehicle validateParams: model should be a string'));
        }

        // Validate licensePlateNumber (if provided)
        if (dirtyParams.licensePlateNumber !== undefined && typeof dirtyParams.licensePlateNumber !== 'string') {
            errors.push(new Error('BaseVehicle validateParams: licensePlateNumber should be a string'));
        }

        // Validate capacitySeated (if provided)
        if (
            dirtyParams.capacitySeated !== undefined &&
            (typeof dirtyParams.capacitySeated !== 'number' ||
                !Number.isInteger(dirtyParams.capacitySeated) ||
                dirtyParams.capacitySeated < 0)
        ) {
            errors.push(new Error('BaseVehicle validateParams: capacitySeated should be a positive integer'));
        }

        // Validate capacityStanding (if provided)
        if (
            dirtyParams.capacityStanding !== undefined &&
            (typeof dirtyParams.capacityStanding !== 'number' ||
                !Number.isInteger(dirtyParams.capacityStanding) ||
                dirtyParams.capacityStanding < 0)
        ) {
            errors.push(new Error('BaseVehicle validateParams: capacityStanding should be a positive integer'));
        }

        return errors;
    }
}
