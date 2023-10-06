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
import { BaseSegment } from './BaseSegment';
import { BaseVisitedPlace } from './BaseVisitedPlace';
import { Weightable, Weight } from './Weight';

export type BaseTripAttributes = {

    _uuid?: string;

    origin?: BaseVisitedPlace;
    destination?: BaseVisitedPlace;
    segments: BaseSegment[];

    /**
     * Departure and arrival time must be calculated from visited places,
     * so shortcuts must be converted to places and each visited place
     * cloned for each occurence before creating trips here
     * */

} & Weightable;

export type ExtendedTripAttributes = BaseTripAttributes & {[key: string]: any};

export class BaseTrip extends Uuidable implements IValidatable {

    _isValid: OptionalValidity;
    _weight?: Weight;

    origin?: BaseVisitedPlace;
    destination?: BaseVisitedPlace;
    segments: BaseSegment[];

    constructor(params: BaseTripAttributes | ExtendedTripAttributes) {

        super(params._uuid);

        this._isValid = undefined;
        this._weight = params._weight;

        this.origin = params.origin;
        this.destination = params.destination;
        this.segments = params.segments || [];

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
     * @returns BaseTrip
     */
    static create(dirtyParams: { [key: string]: any }) {
        const allParamsValid = true;
        // validate types and required attributes
        // TODO: implement dirtyParams validation:
        const params: BaseTripAttributes = {
            origin: dirtyParams.origin,
            destination: dirtyParams.destination,
            segments: dirtyParams.segments
        };
        if (allParamsValid === true) {
            return new BaseTrip(params);
        }
    }

}
