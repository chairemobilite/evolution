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
import * as PAttr from './attributeTypes/PersonAttributes';
import { Result, createErrors, createOk } from '../../types/Result.type';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { ConstructorUtils } from '../../utils/ConstructorUtils';
import { VisitedPlace, ExtendedVisitedPlaceAttributes } from './VisitedPlace';
import { Trip, ExtendedTripAttributes } from './Trip';
import { TripChain, ExtendedTripChainAttributes } from './TripChain';
import { StartEndable, startEndDateAndTimesAttributes, StartEndDateAndTimesAttributes } from './StartEndable';
import { TimePeriod, YesNoDontKnow } from './attributeTypes/GenericAttributes';

export const journeyAttributes = [
    ...startEndDateAndTimesAttributes,
    '_weights',
    '_isValid',
    '_uuid',
    'name',
    'type',
    'noSchoolTripReason',
    'noSchoolTripReasonSpecify',
    'noWorkTripReason',
    'noWorkTripReasonSpecify',
    'didTrips',
    'previousWeekRemoteWorkDays',
    'previousWeekTravelToWorkDays'
];

export const journeyAttributesWithComposedAttributes = [...journeyAttributes, 'visitedPlaces', 'trips', 'tripChains'];

export type JourneyAttributes = {
    name?: Optional<string>;
    type?: Optional<JAttr.JourneyType>;
    noSchoolTripReason?: Optional<string>;
    noSchoolTripReasonSpecify?: Optional<string>;
    noWorkTripReason?: Optional<string>;
    noWorkTripReasonSpecify?: Optional<string>;
    /** Boolean indicating if the person declared doing any trips on the assigned date.
     * This preserves the intent even if the trip list is incomplete due to an unfinished interview. */
    didTrips?: Optional<YesNoDontKnow>;
    /** Remote work days for the complete week before the assigned date (Sunday to Saturday, excluding assigned date) */
    previousWeekRemoteWorkDays?: Optional<PAttr.WeekdaySchedule>;
    /** Travel to work days for the complete week before the assigned date (Sunday to Saturday, excluding assigned date) */
    previousWeekTravelToWorkDays?: Optional<PAttr.WeekdaySchedule>;
} & StartEndDateAndTimesAttributes &
    UuidableAttributes &
    WeightableAttributes &
    ValidatebleAttributes;

export type JourneyWithComposedAttributes = JourneyAttributes & {
    visitedPlaces?: Optional<ExtendedVisitedPlaceAttributes[]>;
    trips?: Optional<ExtendedTripAttributes[]>;
    tripChains?: Optional<ExtendedTripChainAttributes[]>;
};

export type ExtendedJourneyAttributes = JourneyWithComposedAttributes & { [key: string]: unknown };

/** A journey is a sequence of visited places that form trips and trip chains.
 * They can be all the visited places for a single person for a day, part of a day,
 * a week, a weekend or a long distance trip
 */
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

    get startTimePeriod(): Optional<TimePeriod> {
        return this._attributes.startTimePeriod;
    }

    set startTimePeriod(value: Optional<TimePeriod>) {
        this._attributes.startTimePeriod = value;
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

    get endTimePeriod(): Optional<TimePeriod> {
        return this._attributes.endTimePeriod;
    }

    set endTimePeriod(value: Optional<TimePeriod>) {
        this._attributes.endTimePeriod = value;
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

    get noSchoolTripReason(): Optional<string> {
        return this._attributes.noSchoolTripReason;
    }

    set noSchoolTripReason(value: Optional<string>) {
        this._attributes.noSchoolTripReason = value;
    }

    get noSchoolTripReasonSpecify(): Optional<string> {
        return this._attributes.noSchoolTripReasonSpecify;
    }

    set noSchoolTripReasonSpecify(value: Optional<string>) {
        this._attributes.noSchoolTripReasonSpecify = value;
    }

    get noWorkTripReason(): Optional<string> {
        return this._attributes.noWorkTripReason;
    }

    set noWorkTripReason(value: Optional<string>) {
        this._attributes.noWorkTripReason = value;
    }

    get noWorkTripReasonSpecify(): Optional<string> {
        return this._attributes.noWorkTripReasonSpecify;
    }

    set noWorkTripReasonSpecify(value: Optional<string>) {
        this._attributes.noWorkTripReasonSpecify = value;
    }

    /**
     * Boolean indicating if the person declared doing any trips on the assigned date.
     * This preserves the intent even if the trip list is incomplete due to an unfinished interview.
     * Important: This should be set based on the person's declaration, not calculated from the trip count,
     * as incomplete interviews may have empty trips but the person did intend to report trips.
     */
    get didTrips(): Optional<YesNoDontKnow> {
        return this._attributes.didTrips;
    }

    set didTrips(value: Optional<YesNoDontKnow>) {
        this._attributes.didTrips = value;
    }

    /**
     * Remote work days for the complete week before the assigned date.
     * If the assigned date is a Monday, this represents Sunday to Saturday
     * of the previous week (not including the assigned Monday).
     * Each day indicates whether the person worked remotely on that day.
     */
    get previousWeekRemoteWorkDays(): Optional<PAttr.WeekdaySchedule> {
        return this._attributes.previousWeekRemoteWorkDays;
    }

    set previousWeekRemoteWorkDays(value: Optional<PAttr.WeekdaySchedule>) {
        this._attributes.previousWeekRemoteWorkDays = value;
    }

    /**
     * Travel to work days for the complete week before the assigned date.
     * If the assigned date is a Monday, this represents Sunday to Saturday
     * of the previous week (not including the assigned Monday).
     * Each day indicates whether the person traveled to work on that day.
     */
    get previousWeekTravelToWorkDays(): Optional<PAttr.WeekdaySchedule> {
        return this._attributes.previousWeekTravelToWorkDays;
    }

    set previousWeekTravelToWorkDays(value: Optional<PAttr.WeekdaySchedule>) {
        this._attributes.previousWeekTravelToWorkDays = value;
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

        errors.push(...ParamsValidatorUtils.isRequired('params', dirtyParams, displayName));
        errors.push(...ParamsValidatorUtils.isObject('params', dirtyParams, displayName));

        errors.push(...Uuidable.validateParams(dirtyParams, displayName));
        errors.push(...StartEndable.validateParams(dirtyParams, displayName));

        errors.push(...ParamsValidatorUtils.isBoolean('_isValid', dirtyParams._isValid, displayName));

        errors.push(...validateWeights(dirtyParams._weights as Optional<Weight[]>));

        errors.push(...ParamsValidatorUtils.isString('name', dirtyParams.name, displayName));

        errors.push(...ParamsValidatorUtils.isString('type', dirtyParams.type, displayName));

        // Validate new attributes
        errors.push(
            ...ParamsValidatorUtils.isString('noSchoolTripReason', dirtyParams.noSchoolTripReason, displayName)
        );
        errors.push(
            ...ParamsValidatorUtils.isString(
                'noSchoolTripReasonSpecify',
                dirtyParams.noSchoolTripReasonSpecify,
                displayName
            )
        );
        errors.push(...ParamsValidatorUtils.isString('noWorkTripReason', dirtyParams.noWorkTripReason, displayName));
        errors.push(
            ...ParamsValidatorUtils.isString(
                'noWorkTripReasonSpecify',
                dirtyParams.noWorkTripReasonSpecify,
                displayName
            )
        );
        errors.push(...ParamsValidatorUtils.isString('didTrips', dirtyParams.didTrips, displayName));

        // Validate work schedule attributes
        errors.push(
            ...ParamsValidatorUtils.isObject(
                'previousWeekRemoteWorkDays',
                dirtyParams.previousWeekRemoteWorkDays,
                displayName
            )
        );
        errors.push(
            ...ParamsValidatorUtils.isObject(
                'previousWeekTravelToWorkDays',
                dirtyParams.previousWeekTravelToWorkDays,
                displayName
            )
        );

        const visitedPlacesAttributes =
            dirtyParams.visitedPlaces !== undefined ? (dirtyParams.visitedPlaces as { [key: string]: unknown }[]) : [];
        for (let i = 0, countI = visitedPlacesAttributes.length; i < countI; i++) {
            const visitedPlaceAttributes = visitedPlacesAttributes[i];
            errors.push(...VisitedPlace.validateParams(visitedPlaceAttributes, 'VisitedPlace'));
        }

        const tripsAttributes =
            dirtyParams.trips !== undefined ? (dirtyParams.trips as { [key: string]: unknown }[]) : [];
        for (let i = 0, countI = tripsAttributes.length; i < countI; i++) {
            const tripAttributes = tripsAttributes[i];
            errors.push(...Trip.validateParams(tripAttributes, 'Trip'));
        }

        const tripChainsAttributes =
            dirtyParams.tripChains !== undefined ? (dirtyParams.tripChains as { [key: string]: unknown }[]) : [];
        for (let i = 0, countI = tripChainsAttributes.length; i < countI; i++) {
            const tripChainAttributes = tripChainsAttributes[i];
            errors.push(...TripChain.validateParams(tripChainAttributes, 'TripChain'));
        }

        return errors;
    }
}
