/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * A trip is has an origin and a destination, which are visited places, and is made by a person
 */

import { Uuidable } from './Uuidable';
import { OptionalValidity, IValidatable } from './Validatable';
import { Weightable, Weight, validateWeights } from './Weight';

export type BaseTripAttributes = {
    _uuid?: string;

    /**
     * Departure and arrival time must be calculated from visited places,
     * so shortcuts must be converted to places and each visited place
     * cloned for each occurence before creating trips here
     * */
} & Weightable;

export type ExtendedTripAttributes = BaseTripAttributes & { [key: string]: any };

export class BaseTrip extends Uuidable implements IValidatable {
    _isValid: OptionalValidity;
    _weights?: Weight[];

    _confidentialAttributes: string[] = [
        // these attributes should be hidden when exporting
    ];

    constructor(params: BaseTripAttributes | ExtendedTripAttributes) {
        super(params._uuid);

        this._isValid = undefined;
        this._weights = params._weights;
    }

    // params must be sanitized and must be valid:
    static unserialize(params: BaseTripAttributes): BaseTrip {
        return new BaseTrip(params);
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
     * @returns BaseTrip | Error[]
     */
    static create(dirtyParams: { [key: string]: any }): BaseTrip | Error[] {
        const errors = BaseTrip.validateParams(dirtyParams);
        return errors.length > 0 ? errors : new BaseTrip(dirtyParams as ExtendedTripAttributes);
    }

    /**
     * Validates attributes types
     * @param dirtyParams The params input
     * @returns Error[] TODO: specialize this error class
     */
    static validateParams(dirtyParams: { [key: string]: any }): Error[] {
        const errors: Error[] = [];

        // Validate params object:
        if (!dirtyParams || typeof dirtyParams !== 'object') {
            errors.push(new Error('BaseTrip validateParams: params is undefined or invalid'));
            return errors; // stop now otherwise it will crash because params are not valid
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

        return errors;
    }
}
