/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

// TODO: implement. We must be able to auto-generate trip chains from declared trips.

/**
 * A trip chain is a group of trips that create a closed-loop or an open-loop.
 * Examples of closed-loop: Home-Work-Home, Home-Grocery-Work-Home, Home-School-Visiting friends-Home, etc.
 * Examples of open-loop: Home-Leisure (staying there until the next day), Work-Home (worked a night shift), etc.
 */

import { Uuidable } from './Uuidable';
import { OptionalValidity, IValidatable } from './Validatable';
import { BaseTrip } from './BaseTrip';
import { Weightable, Weight, validateWeights } from './Weight';
import * as TCAttr from './attributeTypes/TripChainAttributes';
import * as VPAttr from './attributeTypes/VisitedPlaceAttributes';

export type BaseTripChainAttributes = {
    _uuid?: string;

    isMultiloop?: boolean;
    isConstrained?: boolean;
    category?: TCAttr.TripChainCategory;
    mainActivityCategory?: VPAttr.ActivityCategory; // TODO: This should maybe removed and included in the activity object
    mainActivity?: VPAttr.Activity;

    baseTrips?: BaseTrip[];

    /**
     * Departure and arrival time must be calculated from baseTrips
     * */
} & Weightable;

export type ExtendedTripChainAttributes = BaseTripChainAttributes & { [key: string]: any };

export class BaseTripChain extends Uuidable implements IValidatable {
    _isValid: OptionalValidity;
    _weights?: Weight[];

    category?: TCAttr.TripChainCategory;
    isMultiloop?: boolean;
    isConstrained?: boolean;
    mainActivityCategory?: VPAttr.ActivityCategory; // TODO: This should maybe removed and included in the activity object
    mainActivity?: VPAttr.Activity;

    baseTrips?: BaseTrip[];

    _confidentialAttributes: string[] = [
        // these attributes should be hidden when exporting
    ];

    constructor(params: BaseTripChainAttributes | ExtendedTripChainAttributes) {
        super(params._uuid);

        this._isValid = undefined;
        this._weights = params._weights;

        this.category = params.category;
        this.isMultiloop = params.isMultiloop;
        this.isConstrained = params.isConstrained;
        this.mainActivityCategory = params.mainActivityCategory;
        this.mainActivity = params.mainActivity;

        this.baseTrips = params.baseTrips || [];
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
     * @returns BaseTripChain | Error[]
     */
    static create(dirtyParams: { [key: string]: any }): BaseTripChain | Error[] {
        const errors = BaseTripChain.validateParams(dirtyParams);
        return errors.length > 0 ? errors : new BaseTripChain(dirtyParams as ExtendedTripChainAttributes);
    }

    /**
     * Validates attributes types and required fields for BaseTripChain
     * @param dirtyParams The params input
     * @returns Error[] TODO: specialize this error class
     */
    static validateParams(dirtyParams: { [key: string]: any }): Error[] {
        const errors: Error[] = [];

        // Validate params object:
        if (!dirtyParams || typeof dirtyParams !== 'object') {
            errors.push(new Error('BaseTripChain validateParams: params is undefined or invalid'));
            return errors; // Stop now, as params are not valid
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

        // Validate isMultiloop (if provided)
        if (dirtyParams.isMultiloop !== undefined && typeof dirtyParams.isMultiloop !== 'boolean') {
            errors.push(new Error('BaseTripChain validateParams: isMultiloop should be a boolean'));
        }

        // Validate isConstrained (if provided)
        if (dirtyParams.isConstrained !== undefined && typeof dirtyParams.isConstrained !== 'boolean') {
            errors.push(new Error('BaseTripChain validateParams: isConstrained should be a boolean'));
        }

        // Validate category (if provided)
        if (dirtyParams.category !== undefined && typeof dirtyParams.category !== 'string') {
            errors.push(new Error('BaseTripChain validateParams: category should be a string'));
        }

        // Validate mainActivityCategory (if provided)
        if (dirtyParams.mainActivityCategory !== undefined && typeof dirtyParams.mainActivityCategory !== 'string') {
            errors.push(new Error('BaseTripChain validateParams: mainActivityCategory should be a string'));
        }

        // Validate mainActivity (if provided)
        if (dirtyParams.mainActivity !== undefined && typeof dirtyParams.mainActivity !== 'string') {
            errors.push(new Error('BaseTripChain validateParams: mainActivity should be a string'));
        }

        // Validate baseTrips (if provided)
        if (dirtyParams.baseTrips !== undefined && !Array.isArray(dirtyParams.baseTrips)) {
            errors.push(new Error('BaseTripChain validateParams: baseTrips should be an array'));
        } else if (Array.isArray(dirtyParams.baseTrips)) {
            dirtyParams.baseTrips.forEach((trip: any, index: number) => {
                if (!(trip instanceof BaseTrip)) {
                    errors.push(
                        new Error(
                            `BaseTripChain validateParams: baseTrips at index ${index} should be an instance of BaseTrip`
                        )
                    );
                }
            });
        }

        return errors;
    }
}
