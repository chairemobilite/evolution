/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * A journey is a group of trips/trip chains used for a long-distance travel, or a surveyed day of travel.
 * Journeys must be used for travel surveys when a specific household is part of a panel and is interviewed
 * multiple times in the survey period. It can also be used if in a single survey, the questionnaire asks
 * for trips made on mutiple distinct days.
 */

import { OptionalValidity, IValidatable } from './Validatable';
import { Weightable, Weight } from './Weight';
import { Uuidable } from './Uuidable';
import { BaseVisitedPlace } from './BaseVisitedPlace';
import { BaseTripChain } from './BaseTripChain';
import { BaseTrip } from './BaseTrip';

type BaseJourneyAttributes = {

    _uuid?: string;

    startDate: Date;
    startTime: number;
    endDate: Date;
    endTime: number;
    name?: string;
    visitedPlaces?: BaseVisitedPlace[];
    trips?: BaseTrip[];
    tripChains?: BaseTripChain[];

} & Weightable;

type ExtendedJourneyAttributes = BaseJourneyAttributes & { [key: string]: any };

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface IBaseJourneyAttributes extends BaseJourneyAttributes {}

class BaseJourney extends Uuidable implements IBaseJourneyAttributes, IValidatable {

    _isValid: OptionalValidity;
    _weight?: Weight;

    startDate: Date;
    startTime: number;
    endDate: Date;
    endTime: number;
    name?: string;
    visitedPlaces?: BaseVisitedPlace[];
    trips?: BaseTrip[];
    tripChains?: BaseTripChain[];

    constructor(params: BaseJourneyAttributes | ExtendedJourneyAttributes) {

        super(params._uuid);

        this._isValid = undefined;
        this._weight = params._weight;

        this.startDate = params.startDate;
        this.startTime = params.startTime;
        this.endDate = params.endDate;
        this.endTime = params.endTime;
        this.name = params.name;
        this.visitedPlaces = params.visitedPlaces;
        this.tripChains = params.tripChains;
        this.trips = params.trips;

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
     * @returns BaseJourney
     */
    static create(dirtyParams: { [key: string]: any }) {
        const allParamsValid = true;
        // validate types and required attributes
        // TODO: implement dirtyParams validation:
        const params: BaseJourneyAttributes = {
            startDate: dirtyParams.startDate,
            startTime: dirtyParams.startTime,
            endDate: dirtyParams.endDate,
            endTime: dirtyParams.endTime
        };
        if (allParamsValid === true) {
            return new BaseJourney(params);
        }
    }

}

export {
    BaseJourney,
    BaseJourneyAttributes,
    ExtendedJourneyAttributes
};

