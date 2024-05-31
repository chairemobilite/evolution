/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Optional } from '../../types/Optional.type';
import { IValidatable, ValidatebleAttributes } from './IValidatable';
import { WeightableAttributes, Weight, validateWeights } from './Weight';
import { Uuidable, UuidableAttributes } from './Uuidable';
import * as JAttr from './attributeTypes/JourneyAttributes';
import { Result, createErrors, createOk } from '../../types/Result.type';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { ConstructorUtils } from '../../utils/ConstructorUtils';
import { VisitedPlace, VisitedPlaceAttributes } from './VisitedPlace';
import { Trip, TripAttributes } from './Trip';
import { TripChain, TripChainAttributes } from './TripChain';

/** A journey is a sequence of visited places that form trips and trip chains.
 * They can be all the visited places for a single person for a day, part of a day,
 * a week, a weekend or a long distance trip */

export const journeyAttributes = [
    '_weights',
    '_isValid',
    '_uuid',
    'startDate',
    'startTime',
    'endDate',
    'endTime',
    'name',
    'type',
];

export const journeyAttributesWithComposedAttributes = [
    ...journeyAttributes,
    'visitedPlaces',
    'trips',
    'tripChains',
];

export type JourneyAttributes = {
    startDate?: Optional<string>;
    startTime?: Optional<number>;
    endDate?: Optional<string>;
    endTime?: Optional<number>;
    name?: Optional<string>;
    type?: Optional<JAttr.JourneyType>;
} & UuidableAttributes & WeightableAttributes & ValidatebleAttributes;

export type JourneyWithComposedAttributes = JourneyAttributes & {
    visitedPlaces?: Optional<VisitedPlaceAttributes[]>;
    trips?: Optional<TripAttributes[]>;
    tripChains?: Optional<TripChainAttributes[]>;
};

export type ExtendedJourneyAttributes = JourneyWithComposedAttributes & { [key: string]: unknown };

export class Journey implements IValidatable {
    private _attributes: JourneyAttributes;
    private _customAttributes: { [key: string]: unknown };

    private _visitedPlaces?: Optional<VisitedPlace[]>;
    private _trips?: Optional<Trip[]>;
    private _tripChains?: Optional<TripChain[]>;

    private _personUuid?: Optional<string>; // allow reverse lookup: must be filled by Person.

    static _confidentialAttributes = [];

    constructor(params: ExtendedJourneyAttributes) {
        params._uuid = Uuidable.getUuid(params._uuid);

        this._attributes = {} as JourneyAttributes;
        this._customAttributes = {};

        const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(
            params,
            journeyAttributes,
            journeyAttributesWithComposedAttributes
        );
        this._attributes = attributes;
        this._customAttributes = customAttributes;

        this.visitedPlaces = ConstructorUtils.initializeComposedArrayAttributes(
            params.visitedPlaces,
            VisitedPlace.unserialize
        );
        this.trips = ConstructorUtils.initializeComposedArrayAttributes(params.trips, Trip.unserialize);
        this.tripChains = ConstructorUtils.initializeComposedArrayAttributes(params.tripChains, TripChain.unserialize);
    }

    get attributes(): JourneyAttributes {
        return this._attributes;
    }

    get customAttributes(): { [key: string]: unknown } {
        return this._customAttributes;
    }

    get _uuid(): Optional<string> {
        return this._attributes._uuid;
    }

    get _isValid(): Optional<boolean> {
        return this._attributes._isValid;
    }

    set _isValid(value: Optional<boolean>) {
        this._attributes._isValid = value;
    }

    get _weights(): Optional<Weight[]> {
        return this._attributes._weights;
    }

    set _weights(value: Optional<Weight[]>) {
        this._attributes._weights = value;
    }

    get startDate(): Optional<string> {
        return this._attributes.startDate;
    }

    set startDate(value: Optional<string>) {
        this._attributes.startDate = value;
    }

    get startTime(): Optional<number> {
        return this._attributes.startTime;
    }

    set startTime(value: Optional<number>) {
        this._attributes.startTime = value;
    }

    get endDate(): Optional<string> {
        return this._attributes.endDate;
    }

    set endDate(value: Optional<string>) {
        this._attributes.endDate = value;
    }

    get endTime(): Optional<number> {
        return this._attributes.endTime;
    }

    set endTime(value: Optional<number>) {
        this._attributes.endTime = value;
    }

    get name(): Optional<string> {
        return this._attributes.name;
    }

    set name(value: Optional<string>) {
        this._attributes.name = value;
    }

    get type(): Optional<JAttr.JourneyType> {
        return this._attributes.type;
    }

    set type(value: Optional<JAttr.JourneyType>) {
        this._attributes.type = value;
    }

    get visitedPlaces(): Optional<VisitedPlace[]> {
        return this._visitedPlaces;
    }

    set visitedPlaces(value: Optional<VisitedPlace[]>) {
        this._visitedPlaces = value;
    }

    get trips(): Optional<Trip[]> {
        return this._trips;
    }

    set trips(value: Optional<Trip[]>) {
        this._trips = value;
    }

    get tripChains(): Optional<TripChain[]> {
        return this._tripChains;
    }

    set tripChains(value: Optional<TripChain[]>) {
        this._tripChains = value;
    }

    get personUuid(): Optional<string> {
        return this._personUuid;
    }

    set personUuid(value: Optional<string>) {
        this._personUuid = value;
    }

    static unserialize(params: ExtendedJourneyAttributes): Journey {
        return new Journey(params);
    }

    static create(dirtyParams: { [key: string]: unknown }): Result<Journey> {
        const errors = Journey.validateParams(dirtyParams);
        const journey = errors.length === 0 ? new Journey(dirtyParams) : undefined;
        if (errors.length > 0) {
            return createErrors(errors);
        }
        return createOk(journey as Journey);
    }

    validate(): Optional<boolean> {
        this._attributes._isValid = true;
        return true;
    }

    isValid(): Optional<boolean> {
        return this._isValid;
    }

    static validateParams(dirtyParams: { [key: string]: unknown }, displayName = 'Journey'): Error[] {
        const errors: Error[] = [];

        errors.push(...ParamsValidatorUtils.isRequired(
            'params',
            dirtyParams,
            displayName
        ));
        errors.push(...ParamsValidatorUtils.isObject(
            'params',
            dirtyParams,
            displayName
        ));

        errors.push(...Uuidable.validateParams(dirtyParams));

        errors.push(
            ...ParamsValidatorUtils.isBoolean(
                '_isValid',
                dirtyParams._isValid,
                displayName
            )
        );

        errors.push(...validateWeights(dirtyParams._weights as Optional<Weight[]>));

        errors.push(
            ...ParamsValidatorUtils.isDateString(
                'startDate',
                dirtyParams.startDate,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isPositiveInteger(
                'startTime',
                dirtyParams.startTime,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isDateString(
                'endDate',
                dirtyParams.endDate,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isPositiveInteger(
                'endTime',
                dirtyParams.endTime,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'name',
                dirtyParams.name,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'type',
                dirtyParams.type,
                displayName
            )
        );

        const visitedPlacesAttributes = dirtyParams.visitedPlaces !== undefined ? dirtyParams.visitedPlaces as { [key: string]: unknown }[] : [];
        for (let i = 0, countI = visitedPlacesAttributes.length; i < countI; i++) {
            const visitedPlaceAttributes = visitedPlacesAttributes[i];
            errors.push(
                ...VisitedPlace.validateParams(visitedPlaceAttributes, 'VisitedPlace')
            );
        }

        const tripsAttributes = dirtyParams.trips !== undefined ? dirtyParams.trips as { [key: string]: unknown }[] : [];
        for (let i = 0, countI = tripsAttributes.length; i < countI; i++) {
            const tripAttributes = tripsAttributes[i];
            errors.push(
                ...Trip.validateParams(tripAttributes, 'Trip')
            );
        }

        const tripChainsAttributes = dirtyParams.tripChains !== undefined ? dirtyParams.tripChains as { [key: string]: unknown }[] : [];
        for (let i = 0, countI = tripChainsAttributes.length; i < countI; i++) {
            const tripChainAttributes = tripChainsAttributes[i];
            errors.push(
                ...TripChain.validateParams(tripChainAttributes, 'TripChain')
            );
        }

        return errors;
    }
}
