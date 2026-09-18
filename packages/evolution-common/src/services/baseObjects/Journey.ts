/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _omit from 'lodash/omit';
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';

import { Optional } from '../../types/Optional.type';
import { PreData } from '../../types/shared';
import { validatableAttributeNames, type ValidatableAttributes } from './IValidatable';
import { completableAttributeNames, type CompletableAttributes } from './attributeTypes/CompletableAttributes';
import { SurveyObject } from './SurveyObject';
import { weightableAttributeNames, type WeightableAttributes, type Weight, validateWeights } from './Weight';
import { uuidableAttributeNames, type UuidableAttributes, Uuidable } from './Uuidable';
import * as JAttr from './attributeTypes/JourneyAttributes';
import * as PAttr from './attributeTypes/PersonAttributes';
import { Result, createErrors, createOk } from '../../types/Result.type';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { ConstructorUtils } from '../../utils/ConstructorUtils';
import { VisitedPlace, ExtendedVisitedPlaceAttributes, SerializedExtendedVisitedPlaceAttributes } from './VisitedPlace';
import { Trip, ExtendedTripAttributes, SerializedExtendedTripAttributes } from './Trip';
import { TripChain, ExtendedTripChainAttributes, SerializedExtendedTripChainAttributes } from './TripChain';
import { StartEndable, startEndDateAndTimesAttributes, StartEndDateAndTimesAttributes } from './StartEndable';
import { TimePeriod } from './attributeTypes/GenericAttributes';
import { type AnswerStatus, toBooleanAnswerStatus, validateAnswerStatus } from './attributeTypes/AnswerStatus';
import { SurveyObjectUnserializer } from './SurveyObjectUnserializer';
import { SurveyObjectsRegistry } from './SurveyObjectsRegistry';
import { Person } from './Person';
import { Household } from './Household';

export const journeyAttributes = [
    ...startEndDateAndTimesAttributes,
    ...weightableAttributeNames,
    ...validatableAttributeNames,
    ...uuidableAttributeNames,
    ...completableAttributeNames,
    '_sequence',
    'name',
    'type',
    'noSchoolTripReason',
    'noSchoolTripReasonSpecify',
    'noWorkTripReason',
    'noWorkTripReasonSpecify',
    'didTrips',
    '_skipTripDiary',
    'previousWeekRemoteWorkDays',
    'previousWeekTravelToWorkDays',
    'preData'
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
    /**
     * Whether the person declared any trips on this journey's date.
     * An empty journey with this set to false is a stay without travel, not a missing journey.
     */
    didTrips?: Optional<AnswerStatus<boolean>>;
    /**
     * When `true`, the survey skipped the trip diary for this journey and
     * `didTrips` is `not_applicable`. Absent or `false` means the diary follows
     * `didTrips` as usual.
     */
    _skipTripDiary?: Optional<boolean>;
    /** Remote work days for the complete week before the assigned date (Sunday to Saturday, excluding assigned date) */
    previousWeekRemoteWorkDays?: Optional<PAttr.WeekdaySchedule>;
    /** Travel to work days for the complete week before the assigned date (Sunday to Saturday, excluding assigned date) */
    previousWeekTravelToWorkDays?: Optional<PAttr.WeekdaySchedule>;
    preData?: Optional<PreData>;
} & StartEndDateAndTimesAttributes &
    UuidableAttributes &
    WeightableAttributes &
    ValidatableAttributes &
    CompletableAttributes;

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

/**
 * A journey is one person's travel on an assigned date.
 *
 * Visited places and trips may be empty. That is still a journey: the person
 * is immobile, or the diary was not opened. `didTrips` keeps the declaration
 * for that day, and `startDate` is the date the survey stored on the journey.
 */
export class Journey extends SurveyObject {
    private _surveyObjectsRegistry: SurveyObjectsRegistry;
    private _attributes: JourneyAttributes;
    private _customAttributes: { [key: string]: unknown };

    private _visitedPlaces?: Optional<VisitedPlace[]>;
    private _trips?: Optional<Trip[]>;
    private _tripChains?: Optional<TripChain[]>;

    private _personUuid?: Optional<string>; // allow reverse lookup: must be filled by Person.
    private _isJourneyClosed?: Optional<boolean>;
    private _isJourneyClosedMoreThanOnce?: Optional<boolean>;

    static _confidentialAttributes = ['preData'];

    constructor(params: ExtendedJourneyAttributes, surveyObjectsRegistry: SurveyObjectsRegistry) {
        super(params._uuid);

        this._surveyObjectsRegistry = surveyObjectsRegistry;

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
            VisitedPlace.unserialize,
            this._surveyObjectsRegistry
        );
        this.trips = ConstructorUtils.initializeComposedArrayAttributes(
            params._trips,
            Trip.unserialize,
            this._surveyObjectsRegistry
        );
        this.tripChains = ConstructorUtils.initializeComposedArrayAttributes(
            params._tripChains,
            TripChain.unserialize,
            this._surveyObjectsRegistry
        );
        this.personUuid = params._personUuid as Optional<string>;

        this._surveyObjectsRegistry.registerJourney(this);
    }

    get attributes(): JourneyAttributes {
        return this._attributes;
    }

    get customAttributes(): { [key: string]: unknown } {
        return this._customAttributes;
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
     * Whether the person declared any trips on this journey's date.
     * `yes` and `no` from the questionnaire become a boolean; `dontKnow` stays a non-response.
     * Set from the declaration, not from the trip count: an unfinished interview can
     * have an empty diary while the person did intend to report trips, and a false
     * answer with an empty diary is a valid stay on `startDate`.
     */
    get didTrips(): Optional<AnswerStatus<boolean>> {
        return this._attributes.didTrips;
    }

    set didTrips(value: Optional<AnswerStatus<boolean>>) {
        this._attributes.didTrips = value;
    }

    get _skipTripDiary(): Optional<boolean> {
        return this._attributes._skipTripDiary;
    }

    set _skipTripDiary(value: Optional<boolean>) {
        this._attributes._skipTripDiary = value;
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

    get preData(): Optional<PreData> {
        return this._attributes.preData;
    }

    set preData(value: Optional<PreData>) {
        this._attributes.preData = value;
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

    /**
     * Whether the last questionnaire visited place closed this journey.
     *
     * `true` when the last place answers `nextPlaceCategory === 'stayedThereUntilTheNextDay'`.
     * `false` when there is a last place that did not close the journey.
     * Unset when the journey has no visited place.
     */
    get isJourneyClosed(): Optional<boolean> {
        return this._isJourneyClosed;
    }

    set isJourneyClosed(value: Optional<boolean>) {
        this._isJourneyClosed = value;
    }

    /**
     * Whether more than one questionnaire visited place closed this journey.
     *
     * `true` when more than one place answers `nextPlaceCategory === 'stayedThereUntilTheNextDay'`.
     * `false` when at most one place closed the journey.
     */
    get isJourneyClosedMoreThanOnce(): Optional<boolean> {
        return this._isJourneyClosedMoreThanOnce;
    }

    set isJourneyClosedMoreThanOnce(value: Optional<boolean>) {
        this._isJourneyClosedMoreThanOnce = value;
    }

    get person(): Optional<Person> {
        if (!this._personUuid) {
            return undefined;
        }
        return this._surveyObjectsRegistry.getPerson(this._personUuid);
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
     * Creates a Journey object from sanitized parameters.
     * `didTrips` is wrapped the same way as in `create`, so a value stored as
     * `yes` / `no` / `dontKnow` becomes an `AnswerStatus<boolean>`.
     * @param {ExtendedJourneyAttributes | SerializedExtendedJourneyAttributes} params - Sanitized journey parameters
     * @returns {Journey} New Journey instance
     */
    static unserialize(
        params: ExtendedJourneyAttributes | SerializedExtendedJourneyAttributes,
        surveyObjectsRegistry: SurveyObjectsRegistry
    ): Journey {
        const flattenedParams = SurveyObjectUnserializer.flattenSerializedData(params);
        const normalizedParams = Journey.wrapAnswerStatuses(flattenedParams);
        return new Journey(normalizedParams as ExtendedJourneyAttributes, surveyObjectsRegistry);
    }

    /**
     * Wrap `didTrips` as the questionnaire stores it (`yes`/`no`/`dontKnow` or
     * a boolean) in its status. A blank one is omitted so that it does not
     * read as an answer of the wrong shape. `_skipTripDiary` means the question
     * was not asked, so `didTrips` is `not_applicable` whatever was stored.
     *
     * @param {Object} dirtyParams The parameters as read from the response
     * @returns {Object} A copy of the parameters, with `didTrips` wrapped.
     * Parameters that are not an object are returned as they are, for
     * `validateParams` to report.
     */
    private static wrapAnswerStatuses(dirtyParams: { [key: string]: unknown }): { [key: string]: unknown } {
        if (typeof dirtyParams !== 'object' || dirtyParams === null) {
            return dirtyParams;
        }
        const didTrips =
            dirtyParams._skipTripDiary === true
                ? { status: 'not_applicable' as const }
                : toBooleanAnswerStatus(dirtyParams.didTrips);
        return didTrips === undefined ? _omit(dirtyParams, ['didTrips']) : { ...dirtyParams, didTrips };
    }

    static create(
        dirtyParams: { [key: string]: unknown },
        surveyObjectsRegistry: SurveyObjectsRegistry
    ): Result<Journey> {
        const params = Journey.wrapAnswerStatuses(dirtyParams);
        const errors = Journey.validateParams(params);
        const journey =
            errors.length === 0 ? new Journey(params as ExtendedJourneyAttributes, surveyObjectsRegistry) : undefined;
        if (errors.length > 0) {
            return createErrors(errors);
        }
        return createOk(journey as Journey);
    }

    static validateParams(dirtyParams: { [key: string]: unknown }, displayName = 'Journey'): Error[] {
        const errors: Error[] = [];

        errors.push(...ParamsValidatorUtils.isRequired('params', dirtyParams, displayName));
        errors.push(...ParamsValidatorUtils.isRecord('params', dirtyParams, displayName));

        errors.push(...Uuidable.validateParams(dirtyParams, displayName));
        errors.push(...StartEndable.validateParams(dirtyParams, displayName));

        errors.push(...ParamsValidatorUtils.isPositiveInteger('_sequence', dirtyParams._sequence, displayName));

        errors.push(...ParamsValidatorUtils.isBoolean('_isValid', dirtyParams._isValid, displayName));

        errors.push(...SurveyObject.validateCompletableParams(dirtyParams, displayName));

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
        errors.push(
            ...validateAnswerStatus('didTrips', dirtyParams.didTrips, displayName, ParamsValidatorUtils.isBoolean)
        );

        errors.push(...ParamsValidatorUtils.isBoolean('_skipTripDiary', dirtyParams._skipTripDiary, displayName));

        // Validate work schedule attributes
        errors.push(
            ...ParamsValidatorUtils.isRecord(
                'previousWeekRemoteWorkDays',
                dirtyParams.previousWeekRemoteWorkDays,
                displayName
            )
        );
        errors.push(
            ...ParamsValidatorUtils.isRecord(
                'previousWeekTravelToWorkDays',
                dirtyParams.previousWeekTravelToWorkDays,
                displayName
            )
        );

        errors.push(...ParamsValidatorUtils.isRecord('preData', dirtyParams.preData, displayName, false));

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
