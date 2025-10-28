/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _omit from 'lodash/omit';
import _uniq from 'lodash/uniq';

import { Optional } from '../../types/Optional.type';
import { PreData } from '../../types/shared';
import { IValidatable, ValidatebleAttributes } from './IValidatable';
import { WeightableAttributes, Weight, validateWeights } from './Weight';
import { Uuidable, UuidableAttributes } from './Uuidable';
import { Result, createErrors, createOk } from '../../types/Result.type';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { ConstructorUtils } from '../../utils/ConstructorUtils';
import { VisitedPlace, ExtendedVisitedPlaceAttributes, SerializedExtendedVisitedPlaceAttributes } from './VisitedPlace';
import { Segment, ExtendedSegmentAttributes, SerializedExtendedSegmentAttributes } from './Segment';
import { Mode, ModeCategory } from './attributeTypes/SegmentAttributes';
import { Junction, ExtendedJunctionAttributes, SerializedExtendedJunctionAttributes } from './Junction';
import { StartEndable, startEndDateAndTimesAttributes, StartEndDateAndTimesAttributes } from './StartEndable';
import { TimePeriod } from './attributeTypes/GenericAttributes';
import { getBirdDistanceMeters, getBirdSpeedKph } from '../../utils/PhysicsUtils';
import { SurveyObjectUnserializer } from './SurveyObjectUnserializer';
import { SurveyObjectsRegistry } from './SurveyObjectsRegistry';
import { Journey } from './Journey';
import { TripChain } from './TripChain';
import { Person } from './Person';
import { Household } from './Household';

export const tripAttributes = [
    ...startEndDateAndTimesAttributes,
    '_weights',
    '_isValid',
    '_uuid',
    '_sequence',
    'preData'
];

export const tripAttributesWithComposedAttributes = [
    ...tripAttributes,
    '_startPlace',
    '_endPlace',
    '_segments',
    '_junctions'
];

export type TripAttributes = {
    /**
     * Sequence number for ordering nested composed objects.
     * NOTE: This will be removed when we use objects directly inside the interview process.
     * Right now, since nested composed objects are still using hashMap with uuid as key,
     * they need a _sequence attribute to be able to order them.
     */
    _sequence?: Optional<number>;
    preData?: Optional<PreData>;
} & StartEndDateAndTimesAttributes &
    UuidableAttributes &
    WeightableAttributes &
    ValidatebleAttributes;

export type TripWithComposedAttributes = TripAttributes & {
    _startPlace?: Optional<ExtendedVisitedPlaceAttributes>; // origin
    _endPlace?: Optional<ExtendedVisitedPlaceAttributes>; // destination
    _segments?: Optional<ExtendedSegmentAttributes[]>;
    _junctions?: Optional<ExtendedJunctionAttributes[]>;
};

export type ExtendedTripAttributes = TripWithComposedAttributes & { [key: string]: unknown };

export type SerializedExtendedTripAttributes = {
    _attributes?: ExtendedTripAttributes;
    _customAttributes?: { [key: string]: unknown };
    _startPlace?: SerializedExtendedVisitedPlaceAttributes;
    _endPlace?: SerializedExtendedVisitedPlaceAttributes;
    _segments?: SerializedExtendedSegmentAttributes[];
    _junctions?: SerializedExtendedJunctionAttributes[];
};

/**
 * A trip include the travelling action between two places (visited places: origin|destination)
 * Start and end dates and times could be generated from the origin and destination data
 */
export class Trip extends Uuidable implements IValidatable {
    private _surveyObjectsRegistry: SurveyObjectsRegistry;
    private _attributes: TripAttributes;
    private _customAttributes: { [key: string]: unknown };

    private _startPlace?: Optional<VisitedPlace>;
    private _endPlace?: Optional<VisitedPlace>;
    private _segments?: Optional<Segment[]>;
    private _junctions?: Optional<Junction[]>;

    private _journeyUuid?: Optional<string>; // allow reverse lookup: must be filled by Journey.
    private _tripChainUuid?: Optional<string>; // allow reverse lookup: must be filled by TripChain.

    static _confidentialAttributes = ['preData'];

    constructor(params: ExtendedTripAttributes, surveyObjectsRegistry: SurveyObjectsRegistry) {
        super(params._uuid);

        this._surveyObjectsRegistry = surveyObjectsRegistry;

        this._attributes = {} as TripAttributes;
        this._customAttributes = {};

        const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(
            _omit(params, [
                '_startPlace',
                '_endPlace',
                '_segments',
                '_junctions',
                'startPlace',
                'endPlace',
                'segments',
                'junctions',
                '_journeyUuid',
                '_tripChainUuid'
            ]),
            tripAttributes,
            tripAttributesWithComposedAttributes
        );
        this._attributes = attributes;
        this._customAttributes = customAttributes;

        this.startPlace = ConstructorUtils.initializeComposedAttribute(
            params._startPlace,
            VisitedPlace.unserialize,
            this._surveyObjectsRegistry
        );
        this.endPlace = ConstructorUtils.initializeComposedAttribute(
            params._endPlace,
            VisitedPlace.unserialize,
            this._surveyObjectsRegistry
        );
        this.segments = ConstructorUtils.initializeComposedArrayAttributes(
            params._segments,
            Segment.unserialize,
            this._surveyObjectsRegistry
        );
        this.junctions = ConstructorUtils.initializeComposedArrayAttributes(
            params._junctions,
            Junction.unserialize,
            this._surveyObjectsRegistry
        );
        this.journeyUuid = params._journeyUuid as Optional<string>;
        this.tripChainUuid = params._tripChainUuid as Optional<string>;

        this._surveyObjectsRegistry.registerTrip(this);
    }

    /**
     * Check if the trip has segments
     * @returns {boolean} - Returns true if the trip has segments, false otherwise
     */
    hasSegments(): boolean {
        return this.segments ? this.segments.length > 0 : false;
    }

    /**
     * Check if the trip has transit segments
     * @returns {boolean} - Returns true if the trip has at least one transit segment, false otherwise
     */
    hasTransit(): boolean {
        return this.segments ? this.segments.some((segment) => segment.isTransit()) : false;
    }

    /**
     * Get the modes from all segments
     * @returns {Mode[]} - Returns the modes used for the trip
     */
    getModes(): Mode[] {
        return this.segments ? this.segments.map((segment) => segment.mode as Mode) : [];
    }

    /**
     * Get the mode categories from all segments
     * @returns {ModeCategory[]} - Returns the mode categories used for the trip
     */
    getModeCategories(): ModeCategory[] {
        return this.segments ? this.segments.map((segment) => segment.modeCategory as ModeCategory) : [];
    }

    /**
     * Check if the trip is multimodal (more than one mode)
     * @returns {boolean} - Returns true if the trip is multimodal, false otherwise
     */
    isMultimodal(): boolean {
        return _uniq(this.getModes()).length > 1;
    }

    /**
     * Get the modes without walking
     * @returns {Mode[]} - Returns the modes ignoring walking
     */
    getModesWithoutWalk(): Mode[] {
        return this.getModes().filter((mode) => mode !== 'walk');
    }

    /**
     * Get the transit modes
     * @returns {Mode[]} - Returns the transit modes, ignoring other modes
     */
    getTransitModes(): Mode[] {
        return this.segments
            ? this.segments.filter((segment) => segment.isTransit()).map((segment) => segment.mode as Mode)
            : [];
    }

    /**
     * Get the non transit modes
     * @returns {Mode[]} - Returns the non transit modes (ignoring transit modes)
     */
    getNonTransitModes(): Mode[] {
        return this.segments
            ? this.segments.filter((segment) => !segment.isTransit()).map((segment) => segment.mode as Mode)
            : [];
    }

    /**
     * Check if the trip is transit multimodal (at least one transit mode + another non-walking mode)
     * @returns {boolean} - Returns true if the trip is transit multimodal, false otherwise
     */
    isTransitMultimodal(): boolean {
        return this.getNonTransitModes().length > 1 && this.hasTransit();
    }

    /**
     * Check if the trip is transit only (no non-transit mode, ignore any walking mode though)
     * @returns {boolean} - Returns true if the trip is transit only, false otherwise
     */
    isTransitOnly(): boolean {
        return this.hasTransit() && this.getTransitModes().length === this.getModesWithoutWalk().length;
    }

    /**
     * Get the duration of the trip in seconds
     * endTime must be >= startTime and both must exist
     * @returns {Optional<number>} - Returns the duration in seconds, or undefined if no start or end time
     */
    getDurationSeconds(): Optional<number> {
        return StartEndable.getDurationSeconds(this);
    }

    /**
     * Get the bird distance between the origin and destination in meters (euclidian distance or as the crow flies distance)
     * @returns {Optional<number>} - Returns the distance in meters, or undefined if no origin or destination or if the origin or destination is not a valid point
     */
    getBirdDistanceMeters(): number | undefined {
        return getBirdDistanceMeters(this.startPlace?.geography, this.endPlace?.geography);
    }

    /**
     * Get the bird speed in km/h, rounded to 2 decimal places
     * @returns {Optional<number>} - Returns the speed in km/h, or undefined if no origin or destination or if the origin or destination is not a valid point
     */
    getBirdSpeedKph(): number | undefined {
        return getBirdSpeedKph(this.startPlace?.geography, this.endPlace?.geography, this.getDurationSeconds());
    }

    /**
     * Setup the start and end times if they are not set
     */
    setupStartAndEndTimes(): void {
        if (this.startTime === undefined && this.startPlace?.endTime) {
            this.startTime = this.startPlace.endTime;
        }
        if (this.endTime === undefined && this.endPlace?.startTime) {
            this.endTime = this.endPlace.startTime;
        }
    }

    get origin(): Optional<VisitedPlace> {
        return this.startPlace;
    }

    set origin(value: Optional<VisitedPlace>) {
        this.startPlace = value;
    }

    get destination(): Optional<VisitedPlace> {
        return this.endPlace;
    }

    set destination(value: Optional<VisitedPlace>) {
        this.endPlace = value;
    }

    get attributes(): TripAttributes {
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

    get preData(): Optional<PreData> {
        return this._attributes.preData;
    }

    set preData(value: Optional<PreData>) {
        this._attributes.preData = value;
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

    get startPlace(): Optional<VisitedPlace> {
        return this._startPlace;
    }

    set startPlace(value: Optional<VisitedPlace>) {
        this._startPlace = value;
    }

    get endPlace(): Optional<VisitedPlace> {
        return this._endPlace;
    }

    set endPlace(value: Optional<VisitedPlace>) {
        this._endPlace = value;
    }

    get segments(): Optional<Segment[]> {
        return this._segments;
    }

    set segments(value: Optional<Segment[]>) {
        this._segments = value;
    }

    get junctions(): Optional<Junction[]> {
        return this._junctions;
    }

    set junctions(value: Optional<Junction[]>) {
        this._junctions = value;
    }

    get journeyUuid(): Optional<string> {
        return this._journeyUuid;
    }

    set journeyUuid(value: Optional<string>) {
        this._journeyUuid = value;
    }

    get journey(): Optional<Journey> {
        if (!this._journeyUuid) {
            return undefined;
        }
        return this._surveyObjectsRegistry.getJourney(this._journeyUuid);
    }

    get tripChainUuid(): Optional<string> {
        return this._tripChainUuid;
    }

    set tripChainUuid(value: Optional<string>) {
        this._tripChainUuid = value;
    }

    get tripChain(): Optional<TripChain> {
        if (!this._tripChainUuid) {
            return undefined;
        }
        return this._surveyObjectsRegistry.getTripChain(this._tripChainUuid);
    }

    get person(): Optional<Person> {
        return this.journey?.person;
    }

    get household(): Optional<Household> {
        return this.journey?.person?.household;
    }

    /**
     * Add a segment to this trip
     */
    addSegment(segment: Segment): void {
        if (!this._segments) {
            this._segments = [];
        }
        this._segments.push(segment);
    }

    /**
     * Insert a segment at a specific index
     */
    insertSegment(segment: Segment, index: number): void {
        if (!this._segments) {
            this._segments = [];
        }
        this._segments.splice(index, 0, segment);
    }

    /**
     * Insert a segment after another segment with the specified UUID
     */
    insertSegmentAfterUuid(segment: Segment, afterUuid: string): boolean {
        if (!this._segments) {
            this._segments = [];
        }

        // If array is empty, add the segment
        if (this._segments.length === 0) {
            this._segments.push(segment);
            return true;
        }

        const index = this._segments.findIndex((s) => s._uuid === afterUuid);
        if (index >= 0) {
            this._segments.splice(index + 1, 0, segment);
            return true;
        }
        // If UUID not found in non-empty array, return false
        return false;
    }

    /**
     * Insert a segment before another segment with the specified UUID
     */
    insertSegmentBeforeUuid(segment: Segment, beforeUuid: string): boolean {
        if (!this._segments) {
            this._segments = [];
        }

        // If array is empty, add the segment
        if (this._segments.length === 0) {
            this._segments.push(segment);
            return true;
        }

        const index = this._segments.findIndex((s) => s._uuid === beforeUuid);
        if (index >= 0) {
            this._segments.splice(index, 0, segment);
            return true;
        }
        // If UUID not found in non-empty array, return false
        return false;
    }

    /**
     * Get segments without walking segments in multimodal trips
     * Walking segments are implicit and excluded unless the entire trip is on foot
     * @returns Array of segments with walking segments filtered out if other modes exist
     */
    getSegmentsWithoutWalkingInMultimode(): Segment[] {
        const segments = this.segments || [];

        if (segments.length === 0) {
            return segments;
        }

        // Get unique modes to determine if this is truly multimodal, we don't want to filter walk,walk for instance (this would be audited though)
        const uniqueModes = new Set(segments.map((segment) => segment.mode));

        // Filter out walking segments if there are multiple unique modes and non-walking modes exist
        const newSegmentsWithoutWalking =
            uniqueModes.size > 1 && segments.some((segment) => segment.mode !== 'walk')
                ? segments.filter((segment) => segment.mode !== 'walk')
                : segments;

        return newSegmentsWithoutWalking;
    }

    /**
     * Remove a segment from this trip by UUID
     */
    removeSegment(segmentUuid: string): boolean {
        if (!this._segments) {
            return false;
        }
        const index = this._segments.findIndex((segment) => segment._uuid === segmentUuid);
        if (index >= 0) {
            this._segments.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Get a segment by UUID
     */
    getSegmentByUuid(segmentUuid: string): Segment | undefined {
        if (!this._segments) {
            return undefined;
        }
        return this._segments.find((segment) => segment._uuid === segmentUuid);
    }

    /**
     * Creates a Trip object from sanitized parameters
     * @param {ExtendedTripAttributes | SerializedExtendedTripAttributes} params - Sanitized trip parameters
     * @returns {Trip} New Trip instance
     */
    static unserialize(
        params: ExtendedTripAttributes | SerializedExtendedTripAttributes,
        surveyObjectsRegistry: SurveyObjectsRegistry
    ): Trip {
        const flattenedParams = SurveyObjectUnserializer.flattenSerializedData(params);
        return new Trip(flattenedParams as ExtendedTripAttributes, surveyObjectsRegistry);
    }

    static create(dirtyParams: { [key: string]: unknown }, surveyObjectsRegistry: SurveyObjectsRegistry): Result<Trip> {
        const errors = Trip.validateParams(dirtyParams);
        const trip = errors.length === 0 ? new Trip(dirtyParams, surveyObjectsRegistry) : undefined;
        if (errors.length > 0) {
            return createErrors(errors);
        }
        return createOk(trip as Trip);
    }

    validate(): Optional<boolean> {
        this._attributes._isValid = true;
        return true;
    }

    isValid(): Optional<boolean> {
        return this._isValid;
    }

    static validateParams(dirtyParams: { [key: string]: unknown }, displayName = 'Trip'): Error[] {
        const errors: Error[] = [];

        errors.push(...ParamsValidatorUtils.isRequired('params', dirtyParams, displayName));
        errors.push(...ParamsValidatorUtils.isRecord('params', dirtyParams, displayName));

        errors.push(...Uuidable.validateParams(dirtyParams, displayName));
        errors.push(...StartEndable.validateParams(dirtyParams, displayName));

        errors.push(...ParamsValidatorUtils.isPositiveInteger('_sequence', dirtyParams._sequence, displayName));

        errors.push(...ParamsValidatorUtils.isBoolean('_isValid', dirtyParams._isValid, displayName));

        errors.push(...validateWeights(dirtyParams._weights as Optional<Weight[]>));

        errors.push(...ParamsValidatorUtils.isRecord('preData', dirtyParams.preData, displayName, false));

        const startPlaceAttributes = dirtyParams.startPlace as { [key: string]: unknown };
        if (startPlaceAttributes !== undefined) {
            errors.push(...VisitedPlace.validateParams(startPlaceAttributes, 'StartVisitedPlace'));
        }

        const endPlaceAttributes = dirtyParams.endPlace as { [key: string]: unknown };
        if (endPlaceAttributes !== undefined) {
            errors.push(...VisitedPlace.validateParams(endPlaceAttributes, 'EndVisitedPlace'));
        }

        const segmentsAttributes =
            dirtyParams._segments !== undefined ? (dirtyParams._segments as { [key: string]: unknown }[]) : [];
        for (let i = 0, countI = segmentsAttributes.length; i < countI; i++) {
            const segmentAttributes = segmentsAttributes[i];
            errors.push(...Segment.validateParams(segmentAttributes, `Segment ${i}`));
        }

        const junctionsAttributes =
            dirtyParams._junctions !== undefined ? (dirtyParams._junctions as { [key: string]: unknown }[]) : [];
        for (let i = 0, countI = junctionsAttributes.length; i < countI; i++) {
            const junctionAttributes = junctionsAttributes[i];
            errors.push(...Junction.validateParams(junctionAttributes, `Junction ${i}`));
        }

        errors.push(...ParamsValidatorUtils.isUuid('_journeyUuid', dirtyParams._journeyUuid, displayName));
        errors.push(...ParamsValidatorUtils.isUuid('_tripChainUuid', dirtyParams._tripChainUuid, displayName));

        return errors;
    }
}
