/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * A visited place is a place visited by a person during a journey or specific day
 * Usually, visited palces are used as origin and/or destination for trips
 */


import { Uuidable } from './Uuidable';
import { OptionalValidity, IValidatable } from './Validatable';
import { BasePlace } from './BasePlace';
import { Weightable, Weight } from './Weight';
import * as VPAttr from './attributeTypes/VisitedPlaceAttributes';

export type BaseVisitedPlaceAttributes = {

    _uuid?: string;

    arrivalDate?: Date;
    departureDate?: Date;
    arrivalTime?: number;
    departureTime?: number;
    activityCategory: VPAttr.ActivityCategory;
    activity: VPAttr.Activity;

    /**
     * Departure and arrival time must be calculated from visited places,
     * so shortcuts must be converted to places and each visited place
     * cloned for each occurence before creating trips here
     * */

} & Weightable;

export type ExtendedVisitedPlaceAttributes = BaseVisitedPlaceAttributes & { [key: string]: any };

export class BaseVisitedPlace extends Uuidable implements IValidatable {

    _isValid: OptionalValidity;
    _weight?: Weight;

    place: BasePlace;

    arrivalDate?: Date;
    departureDate?: Date;
    arrivalTime?: number; // seconds since midnight
    departureTime?: number; // seconds since midnight
    activityCategory: VPAttr.ActivityCategory; // TODO: This should maybe removed and included in the activity object
    activity: VPAttr.Activity;

    constructor(place: BasePlace, params: BaseVisitedPlaceAttributes | ExtendedVisitedPlaceAttributes) {

        super(params._uuid);

        this._isValid = undefined;
        this._weight = params._weight;

        this.place = place;
        this.arrivalDate = params.arrivalDate;
        this.departureDate = params.departureDate;
        this.arrivalTime = params.arrivalTime;
        this.departureTime = params.departureTime;
        this.activityCategory = params.activityCategory;
        this.activity = params.activity;

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
     * @returns BaseVisitedPlace
     */
    static create(dirtyParams: { [key: string]: any }) {
        const allParamsValid = true;
        // validate types and required attributes
        // TODO: implement dirtyParams validation:
        const params: BaseVisitedPlaceAttributes = {
            arrivalDate: dirtyParams.arrivalDate,
            departureDate: dirtyParams.departureDate,
            arrivalTime: dirtyParams.arrivalTime,
            departureTime: dirtyParams.departureTime,
            activityCategory: dirtyParams.activityCategory,
            activity: dirtyParams.activity
        };
        if (allParamsValid === true) {
            // TODO: replace BasePlace constructor call by factory create static method:
            return new BaseVisitedPlace(new BasePlace(undefined, {}), params);
        }
    }

}
