/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _omit from 'lodash/omit';

import { Optional } from '../../types/Optional.type';
import { IValidatable, ValidatebleAttributes } from './IValidatable';
import { WeightableAttributes, Weight, validateWeights } from './Weight';
import { Uuidable, UuidableAttributes } from './Uuidable';
import * as JAttr from './attributeTypes/JourneyAttributes';
import * as PAttr from './attributeTypes/PersonAttributes';
import { Result, createErrors, createOk } from '../../types/Result.type';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { ConstructorUtils } from '../../utils/ConstructorUtils';
import { VisitedPlace, ExtendedVisitedPlaceAttributes, SerializedExtendedVisitedPlaceAttributes } from './VisitedPlace';
import { Trip, ExtendedTripAttributes, SerializedExtendedTripAttributes } from './Trip';
import { TripChain, ExtendedTripChainAttributes, SerializedExtendedTripChainAttributes } from './TripChain';
import { StartEndable, startEndDateAndTimesAttributes, StartEndDateAndTimesAttributes } from './StartEndable';
import { TimePeriod, YesNoDontKnow } from './attributeTypes/GenericAttributes';
import { SurveyObjectUnserializer } from './SurveyObjectUnserializer';
import { SurveyObjectsRegistry } from './SurveyObjectsRegistry';
import { Person } from './Person';
import { Household } from './Household';

export const journeyAttributes = [
    ...startEndDateAndTimesAttributes,
    '_weights',
    '_isValid',
    '_uuid',
    '_sequence',
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

export const journeyAttributesWithComposedAttributes = [
    ...journeyAttributes,
    '_visitedPlaces',
    '_trips',
    '_tripChains'
];

export type JourneyAttributes = {
    /**
     * Sequence number for ordering nested composed objects.
     * NOTE: This will be removed when we use objects directly inside the interview process.
     * Right now, since nested composed objects are still using objects with uuid as key,
     * they need a _sequence attribute to be able to order them.
     */
    _sequence?: Optional<number>;
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
    _visitedPlaces?: Optional<ExtendedVisitedPlaceAttributes[]>;
    _trips?: Optional<ExtendedTripAttributes[]>;
    _tripChains?: Optional<ExtendedTripChainAttributes[]>;
};

export type ExtendedJourneyAttributes = JourneyWithComposedAttributes & { [key: string]: unknown };

export type SerializedExtendedJourneyAttributes = {
    _attributes?: ExtendedJourneyAttributes;
    _customAttributes?: { [key: string]: unknown };
    _visitedPlaces?: Optional<SerializedExtendedVisitedPlaceAttributes[]>;
    _trips?: Optional<SerializedExtendedTripAttributes[]>;
    _tripChains?: Optional<SerializedExtendedTripChainAttributes[]>;
};

/** A journey is a sequence of visited places that form trips and trip chains.
 * They can be all the visited places for a single person for a day, part of a day,
 * a week, a weekend or a long distance trip
 */
export class Journey extends Uuidable implements IValidatable {
    private _attributes: JourneyAttributes;
    private _customAttributes: { [key: string]: unknown };

    private _visitedPlaces?: Optional<VisitedPlace[]>;
    private _trips?: Optional<Trip[]>;
    private _tripChains?: Optional<TripChain[]>;

    private _personUuid?: Optional<string>; // allow reverse lookup: must be filled by Person.

    static _confidentialAttributes = [];

    constructor(params: ExtendedJourneyAttributes) {
        super(params._uuid);

        this._attributes = {} as JourneyAttributes;
        this._customAttributes = {};

        const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(
            _omit(params, [
                '_visitedPlaces',
                '_trips',
                '_tripChains',
                'visitedPlaces',
                'trips',
                'tripChains',
                '_personUuid'
            ]),
            journeyAttributes,
            journeyAttributesWithComposedAttributes
        );
        this._attributes = attributes;
        this._customAttributes = customAttributes;

        this.visitedPlaces = ConstructorUtils.initializeComposedArrayAttributes(
            params._visitedPlaces,
            VisitedPlace.unserialize
        );
        this.trips = ConstructorUtils.initializeComposedArrayAttributes(params._trips, Trip.unserialize);
        this.tripChains = ConstructorUtils.initializeComposedArrayAttributes(params._tripChains, TripChain.unserialize);
        this.personUuid = params._personUuid as Optional<string>;

        SurveyObjectsRegistry.getInstance().registerJourney(this);
    }

    get attributes(): JourneyAttributes {
        return this._attributes;
    }

    get customAttributes(): { [key: string]: unknown } {
        return this._customAttributes;
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

    get person(): Optional<Person> {
        if (!this._personUuid) {
            return undefined;
        }
        return SurveyObjectsRegistry.getInstance().getPerson(this._personUuid);
    }

    get household(): Optional<Household> {
        return this.person?.household;
    }

    /**
     * Add a visited place to this journey
     */
    addVisitedPlace(visitedPlace: VisitedPlace): void {
        if (!this._visitedPlaces) {
            this._visitedPlaces = [];
        }
        this._visitedPlaces.push(visitedPlace);
    }

    /**
     * Insert a visited place at a specific index
     */
    insertVisitedPlace(visitedPlace: VisitedPlace, index: number): void {
        if (!this._visitedPlaces) {
            this._visitedPlaces = [];
        }
        this._visitedPlaces.splice(index, 0, visitedPlace);
    }

    /**
     * Insert a visited place after another visited place with the specified UUID
     */
    insertVisitedPlaceAfterUuid(visitedPlace: VisitedPlace, afterUuid: string): boolean {
        if (!this._visitedPlaces) {
            this._visitedPlaces = [];
        }

        // If array is empty, add the visited place
        if (this._visitedPlaces.length === 0) {
            this._visitedPlaces.push(visitedPlace);
            return true;
        }

        const index = this._visitedPlaces.findIndex((vp) => vp._uuid === afterUuid);
        if (index >= 0) {
            this._visitedPlaces.splice(index + 1, 0, visitedPlace);
            return true;
        }
        // If UUID not found in non-empty array, return false
        return false;
    }

    /**
     * Insert a visited place before another visited place with the specified UUID
     */
    insertVisitedPlaceBeforeUuid(visitedPlace: VisitedPlace, beforeUuid: string): boolean {
        if (!this._visitedPlaces) {
            this._visitedPlaces = [];
        }

        // If array is empty, add the visited place
        if (this._visitedPlaces.length === 0) {
            this._visitedPlaces.push(visitedPlace);
            return true;
        }

        const index = this._visitedPlaces.findIndex((vp) => vp._uuid === beforeUuid);
        if (index >= 0) {
            this._visitedPlaces.splice(index, 0, visitedPlace);
            return true;
        }
        // If UUID not found in non-empty array, return false
        return false;
    }

    /**
     * Remove a visited place from this journey by UUID
     */
    removeVisitedPlace(visitedPlaceUuid: string): boolean {
        if (!this._visitedPlaces) {
            return false;
        }
        const index = this._visitedPlaces.findIndex((vp) => vp._uuid === visitedPlaceUuid);
        if (index >= 0) {
            this._visitedPlaces.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Get a visited place by UUID
     */
    getVisitedPlaceByUuid(visitedPlaceUuid: string): VisitedPlace | undefined {
        if (!this._visitedPlaces) {
            return undefined;
        }
        return this._visitedPlaces.find((vp) => vp._uuid === visitedPlaceUuid);
    }

    /**
     * Add a trip to this journey
     */
    addTrip(trip: Trip): void {
        if (!this._trips) {
            this._trips = [];
        }
        this._trips.push(trip);
    }

    /**
     * Insert a trip at a specific index
     */
    insertTrip(trip: Trip, index: number): void {
        if (!this._trips) {
            this._trips = [];
        }
        this._trips.splice(index, 0, trip);
    }

    /**
     * Insert a trip after another trip with the specified UUID
     */
    insertTripAfterUuid(trip: Trip, afterUuid: string): boolean {
        if (!this._trips) {
            this._trips = [];
        }

        // If array is empty, add the trip
        if (this._trips.length === 0) {
            this._trips.push(trip);
            return true;
        }

        const index = this._trips.findIndex((t) => t._uuid === afterUuid);
        if (index >= 0) {
            this._trips.splice(index + 1, 0, trip);
            return true;
        }
        // If UUID not found in non-empty array, return false
        return false;
    }

    /**
     * Insert a trip before another trip with the specified UUID
     */
    insertTripBeforeUuid(trip: Trip, beforeUuid: string): boolean {
        if (!this._trips) {
            this._trips = [];
        }

        // If array is empty, add the trip
        if (this._trips.length === 0) {
            this._trips.push(trip);
            return true;
        }

        const index = this._trips.findIndex((t) => t._uuid === beforeUuid);
        if (index >= 0) {
            this._trips.splice(index, 0, trip);
            return true;
        }
        // If UUID not found in non-empty array, return false
        return false;
    }

    /**
     * Remove a trip from this journey by UUID
     */
    removeTrip(tripUuid: string): boolean {
        if (!this._trips) {
            return false;
        }
        const index = this._trips.findIndex((trip) => trip._uuid === tripUuid);
        if (index >= 0) {
            this._trips.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Get a trip by UUID
     */
    getTripByUuid(tripUuid: string): Trip | undefined {
        if (!this._trips) {
            return undefined;
        }
        return this._trips.find((trip) => trip._uuid === tripUuid);
    }

    /**
     * Creates a Journey object from sanitized parameters
     * @param {ExtendedJourneyAttributes | SerializedExtendedJourneyAttributes} params - Sanitized journey parameters
     * @returns {Journey} New Journey instance
     */
    static unserialize(params: ExtendedJourneyAttributes | SerializedExtendedJourneyAttributes): Journey {
        const flattenedParams = SurveyObjectUnserializer.flattenSerializedData(params);
        return new Journey(flattenedParams as ExtendedJourneyAttributes);
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

        errors.push(...ParamsValidatorUtils.isPositiveInteger('_sequence', dirtyParams._sequence, displayName));

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
            dirtyParams._visitedPlaces !== undefined
                ? (dirtyParams._visitedPlaces as { [key: string]: unknown }[])
                : [];
        for (let i = 0, countI = visitedPlacesAttributes.length; i < countI; i++) {
            const visitedPlaceAttributes = visitedPlacesAttributes[i];
            errors.push(...VisitedPlace.validateParams(visitedPlaceAttributes, 'VisitedPlace'));
        }

        const tripsAttributes =
            dirtyParams._trips !== undefined ? (dirtyParams._trips as { [key: string]: unknown }[]) : [];
        for (let i = 0, countI = tripsAttributes.length; i < countI; i++) {
            const tripAttributes = tripsAttributes[i];
            errors.push(...Trip.validateParams(tripAttributes, 'Trip'));
        }

        const tripChainsAttributes =
            dirtyParams._tripChains !== undefined ? (dirtyParams._tripChains as { [key: string]: unknown }[]) : [];
        for (let i = 0, countI = tripChainsAttributes.length; i < countI; i++) {
            const tripChainAttributes = tripChainsAttributes[i];
            errors.push(...TripChain.validateParams(tripChainAttributes, 'TripChain'));
        }

        errors.push(...ParamsValidatorUtils.isUuid('_personUuid', dirtyParams._personUuid, displayName));

        return errors;
    }
}
