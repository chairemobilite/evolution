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
import { Weightable, Weight } from './Weight';
import * as TCAttr from './attributeTypes/TripChainAttributes';
import * as VPAttr from './attributeTypes/VisitedPlaceAttributes';

export type BaseTripChainAttributes = {

    _uuid?: string;

    isMultiloop: boolean;
    isConstrained: boolean;
    category: TCAttr.TripChainCategory;
    mainActivityCategory?: VPAttr.ActivityCategory; // TODO: This should maybe removed and included in the activity object
    mainActivity?: VPAttr.Activity;

    trips: BaseTrip[];

    /**
     * Departure and arrival time must be calculated from trips
     * */
} & Weightable;

export type ExtendedTripChainAttributes = BaseTripChainAttributes & {[key: string]: any};

export class BaseTripChain extends Uuidable implements IValidatable {

    _isValid: OptionalValidity;
    _weight?: Weight;

    category: TCAttr.TripChainCategory;
    isMultiloop: boolean;
    isConstrained: boolean;
    mainActivityCategory?: VPAttr.ActivityCategory; // TODO: This should maybe removed and included in the activity object
    mainActivity?: VPAttr.Activity;

    trips: BaseTrip[];

    constructor(params: BaseTripChainAttributes | ExtendedTripChainAttributes) {

        super(params._uuid);

        this._isValid = undefined;
        this._weight = params._weight;

        this.category = params.category;
        this.isMultiloop = params.isMultiloop;
        this.isConstrained = params.isConstrained;
        this.mainActivityCategory = params.mainActivityCategory;
        this.mainActivity = params.mainActivity;

        this.trips = params.trips || [];

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
     * @returns BaseTripChain
     */
    static create(dirtyParams: { [key: string]: any }) {
        const allParamsValid = true;
        // validate types and required attributes
        // TODO: implement dirtyParams validation:
        const params: BaseTripChainAttributes = {
            trips: dirtyParams.trips,
            category: dirtyParams.category,
            isMultiloop: dirtyParams.isMultiloop,
            isConstrained: dirtyParams.isConstrained
        };
        if (allParamsValid === true) {
            return new BaseTripChain(params);
        }
    }

}
