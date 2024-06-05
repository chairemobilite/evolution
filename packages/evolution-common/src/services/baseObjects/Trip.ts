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
import { Result, createErrors, createOk } from '../../types/Result.type';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { ConstructorUtils } from '../../utils/ConstructorUtils';
import { VisitedPlace, VisitedPlaceAttributes } from './VisitedPlace';
import { Segment, SegmentAttributes } from './Segment';
import { Junction, JunctionAttributes } from './Junction';
import { StartEndable, startEndDateAndTimesAttributes, StartEndDateAndTimesAttributes } from './StartEndable';
import { TimePeriod } from './attributeTypes/GenericAttributes';

export const tripAttributes = [
    ...startEndDateAndTimesAttributes,
    '_weights',
    '_isValid',
    '_uuid'
];

export const tripAttributesWithComposedAttributes = [
    ...tripAttributes,
    'startPlace',
    'endPlace',
    'segments',
    'junctions',
];

export type TripAttributes = StartEndDateAndTimesAttributes & UuidableAttributes & WeightableAttributes & ValidatebleAttributes;

export type TripWithComposedAttributes = TripAttributes & {
    startPlace?: Optional<VisitedPlaceAttributes>; // origin
    endPlace?: Optional<VisitedPlaceAttributes>; // destination
    segments?: Optional<SegmentAttributes[]>;
    junctions?: Optional<JunctionAttributes[]>;
};

export type ExtendedTripAttributes = TripWithComposedAttributes & { [key: string]: unknown };


/**
 * A trip include the travelling action between two places (visited places: origin|destination)
 * Start and end dates and times could be generated from the origin and destination data
 */
export class Trip implements IValidatable {
    private _attributes: TripAttributes;
    private _customAttributes: { [key: string]: unknown };

    private _startPlace?: Optional<VisitedPlace>;
    private _endPlace?: Optional<VisitedPlace>;
    private _segments?: Optional<Segment[]>;
    private _junctions?: Optional<Junction[]>;

    private _journeyUuid?: Optional<string>; // allow reverse lookup: must be filled by Journey.
    private _tripChainUuid?: Optional<string>; // allow reverse lookup: must be filled by TripChain.

    static _confidentialAttributes = [];

    constructor(params: ExtendedTripAttributes) {
        params._uuid = Uuidable.getUuid(params._uuid);

        this._attributes = {} as TripAttributes;
        this._customAttributes = {};

        const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(
            params,
            tripAttributes,
            tripAttributesWithComposedAttributes
        );
        this._attributes = attributes;
        this._customAttributes = customAttributes;

        this.startPlace = ConstructorUtils.initializeComposedAttribute(params.startPlace, VisitedPlace.unserialize);
        this.endPlace = ConstructorUtils.initializeComposedAttribute(params.endPlace, VisitedPlace.unserialize);
        this.segments = ConstructorUtils.initializeComposedArrayAttributes(params.segments, Segment.unserialize);
        this.junctions = ConstructorUtils.initializeComposedArrayAttributes(params.junctions, Junction.unserialize);
    }

    get attributes(): TripAttributes {
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

    get tripChainUuid(): Optional<string> {
        return this._tripChainUuid;
    }

    set tripChainUuid(value: Optional<string>) {
        this._tripChainUuid = value;
    }

    static unserialize(params: ExtendedTripAttributes): Trip {
        return new Trip(params);
    }

    static create(dirtyParams: { [key: string]: unknown }): Result<Trip> {
        const errors = Trip.validateParams(dirtyParams);
        const trip = errors.length === 0 ? new Trip(dirtyParams) : undefined;
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

        errors.push(...Uuidable.validateParams(dirtyParams, displayName));
        errors.push(...StartEndable.validateParams(dirtyParams, displayName));

        errors.push(
            ...ParamsValidatorUtils.isBoolean(
                '_isValid',
                dirtyParams._isValid,
                displayName
            )
        );

        errors.push(...validateWeights(dirtyParams._weights as Optional<Weight[]>));

        const startPlaceAttributes = dirtyParams.startPlace as { [key: string]: unknown };
        if (startPlaceAttributes !== undefined) {
            errors.push(
                ...VisitedPlace.validateParams(startPlaceAttributes, 'StartVisitedPlace')
            );
        }

        const endPlaceAttributes = dirtyParams.endPlace as { [key: string]: unknown };
        if (endPlaceAttributes !== undefined) {
            errors.push(
                ...VisitedPlace.validateParams(endPlaceAttributes, 'EndVisitedPlace')
            );
        }

        const segmentsAttributes = dirtyParams.segments !== undefined ? dirtyParams.segments as { [key: string]: unknown }[] : [];
        for (let i = 0, countI = segmentsAttributes.length; i < countI; i++) {
            const segmentAttributes = segmentsAttributes[i];
            errors.push(
                ...Segment.validateParams(segmentAttributes, `Segment ${i}`)
            );
        }

        const junctionsAttributes = dirtyParams.junctions !== undefined ? dirtyParams.junctions as { [key: string]: unknown }[] : [];
        for (let i = 0, countI = junctionsAttributes.length; i < countI; i++) {
            const junctionAttributes = junctionsAttributes[i];
            errors.push(
                ...Junction.validateParams(junctionAttributes, `Junction ${i}`)
            );
        }

        return errors;
    }
}
