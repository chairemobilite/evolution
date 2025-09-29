/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import _omit from 'lodash/omit';

import { Optional } from '../../types/Optional.type';
import { IValidatable, ValidatebleAttributes } from './IValidatable';
import { Uuidable, UuidableAttributes } from './Uuidable';
import { WeightableAttributes, Weight, validateWeights } from './Weight';
import * as SAttr from './attributeTypes/SegmentAttributes';
import { Junction, ExtendedJunctionAttributes, SerializedExtendedJunctionAttributes } from './Junction';
import { Routing, RoutingAttributes, SerializedExtendedRoutingAttributes } from './Routing';
import { Result, createErrors, createOk } from '../../types/Result.type';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { ConstructorUtils } from '../../utils/ConstructorUtils';
import { StartEndable, startEndDateAndTimesAttributes, StartEndDateAndTimesAttributes } from './StartEndable';
import { TimePeriod } from './attributeTypes/GenericAttributes';
import { SurveyObjectUnserializer } from './SurveyObjectUnserializer';
import { SurveyObjectsRegistry } from './SurveyObjectsRegistry';
import { Trip } from './Trip';
import { Person } from './Person';
import { Journey } from './Journey';
import { Household } from './Household';

export const segmentAttributes = [
    ...startEndDateAndTimesAttributes,
    '_weights',
    '_isValid',
    '_uuid',
    '_sequence',
    'mode',
    'modeOtherSpecify',
    'driverType',
    'driverUuid',
    'carType',
    'vehicleOccupancy',
    'paidForParking',
    'onDemandType',
    'busLines'
];

export const segmentAttributesWithComposedAttributes = [
    ...segmentAttributes,
    '_origin',
    '_destination',
    '_transitDeclaredRouting',
    '_walkingDeclaredRouting',
    '_cyclingDeclaredRouting',
    '_drivingDeclaredRouting',
    '_transitCalculatedRoutings',
    '_walkingCalculatedRoutings',
    '_cyclingCalculatedRoutings',
    '_drivingCalculatedRoutings'
];

export type SegmentWithComposedAttributes = {
    _origin?: Optional<ExtendedJunctionAttributes>;
    _destination?: Optional<ExtendedJunctionAttributes>;
    _transitDeclaredRouting?: Optional<RoutingAttributes>;
    _walkingDeclaredRouting?: Optional<RoutingAttributes>;
    _cyclingDeclaredRouting?: Optional<RoutingAttributes>;
    _drivingDeclaredRouting?: Optional<RoutingAttributes>;
    _transitCalculatedRoutings?: Optional<RoutingAttributes[]>;
    _walkingCalculatedRoutings?: Optional<RoutingAttributes[]>;
    _cyclingCalculatedRoutings?: Optional<RoutingAttributes[]>;
    _drivingCalculatedRoutings?: Optional<RoutingAttributes[]>;
};

export type SegmentAttributes = {
    /**
     * Sequence number for ordering nested composed objects.
     * NOTE: This will be removed when we use objects directly inside the interview process.
     * Right now, since nested composed objects are still using objects with uuid as key,
     * they need a _sequence attribute to be able to order them.
     */
    _sequence?: Optional<number>;
    mode?: Optional<SAttr.Mode>;
    modeOtherSpecify?: Optional<string>;
    driverType?: Optional<SAttr.Driver>;
    driverUuid?: Optional<string>; // person uuid
    vehicleOccupancy?: Optional<number>; // positive integer
    carType?: Optional<SAttr.CarType>;
    paidForParking?: Optional<boolean>;
    onDemandType?: Optional<string>;
    busLines?: Optional<string[]>; // for now, the bus lines are the line slugified shortname. TODO: discuss if we want to change that.
} & StartEndDateAndTimesAttributes &
    UuidableAttributes &
    WeightableAttributes &
    ValidatebleAttributes;

export type ExtendedSegmentAttributes = SegmentAttributes & SegmentWithComposedAttributes & { [key: string]: unknown };

export type SerializedExtendedSegmentAttributes = {
    _attributes?: ExtendedSegmentAttributes;
    _customAttributes?: { [key: string]: unknown };
    _origin?: SerializedExtendedJunctionAttributes;
    _destination?: SerializedExtendedJunctionAttributes;
    _transitDeclaredRouting?: SerializedExtendedRoutingAttributes;
    _walkingDeclaredRouting?: SerializedExtendedRoutingAttributes;
    _cyclingDeclaredRouting?: SerializedExtendedRoutingAttributes;
    _drivingDeclaredRouting?: SerializedExtendedRoutingAttributes;
    _transitCalculatedRoutings?: SerializedExtendedRoutingAttributes[];
    _walkingCalculatedRoutings?: SerializedExtendedRoutingAttributes[];
    _cyclingCalculatedRoutings?: SerializedExtendedRoutingAttributes[];
    _drivingCalculatedRoutings?: SerializedExtendedRoutingAttributes[];
};

/**
 * A segment is a part of a trip using a single unique mode
 * Segments can have a start junction and an end junction
 * which are the departure and arrival places of the segment
 * like subway station, a parking or another or the trip origin
 * and/or destination when the segment is first or last for the trip
 */
export class Segment extends Uuidable implements IValidatable {
    private _attributes: SegmentAttributes;
    private _customAttributes: { [key: string]: unknown };

    private _origin?: Optional<Junction>;
    private _destination?: Optional<Junction>;
    private _transitDeclaredRouting?: Optional<Routing>;
    private _walkingDeclaredRouting?: Optional<Routing>;
    private _cyclingDeclaredRouting?: Optional<Routing>;
    private _drivingDeclaredRouting?: Optional<Routing>;
    private _transitCalculatedRoutings?: Optional<Routing[]>;
    private _walkingCalculatedRoutings?: Optional<Routing[]>;
    private _cyclingCalculatedRoutings?: Optional<Routing[]>;
    private _drivingCalculatedRoutings?: Optional<Routing[]>;

    private _tripUuid?: Optional<string>;

    static _confidentialAttributes = [];

    constructor(params: ExtendedSegmentAttributes) {
        super(params._uuid);
        this._attributes = {} as SegmentAttributes & SegmentWithComposedAttributes;
        this._customAttributes = {};

        const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(
            _omit(params, [
                '_origin',
                '_destination',
                '_transitDeclaredRouting',
                '_walkingDeclaredRouting',
                '_cyclingDeclaredRouting',
                '_drivingDeclaredRouting',
                '_transitCalculatedRoutings',
                '_walkingCalculatedRoutings',
                '_cyclingCalculatedRoutings',
                '_drivingCalculatedRoutings',
                'origin',
                'destination',
                'transitDeclaredRouting',
                'walkingDeclaredRouting',
                'cyclingDeclaredRouting',
                'drivingDeclaredRouting',
                'transitCalculatedRoutings',
                'walkingCalculatedRoutings',
                'cyclingCalculatedRoutings',
                'drivingCalculatedRoutings',
                '_tripUuid'
            ]),
            segmentAttributes,
            segmentAttributesWithComposedAttributes
        );
        this._attributes = attributes;
        this._customAttributes = customAttributes;

        this.origin = ConstructorUtils.initializeComposedAttribute(params._origin, Junction.unserialize);
        this.destination = ConstructorUtils.initializeComposedAttribute(params._destination, Junction.unserialize);
        this.transitDeclaredRouting = ConstructorUtils.initializeComposedAttribute(
            params._transitDeclaredRouting,
            Routing.unserialize
        );
        this.walkingDeclaredRouting = ConstructorUtils.initializeComposedAttribute(
            params._walkingDeclaredRouting,
            Routing.unserialize
        );
        this.cyclingDeclaredRouting = ConstructorUtils.initializeComposedAttribute(
            params._cyclingDeclaredRouting,
            Routing.unserialize
        );
        this.drivingDeclaredRouting = ConstructorUtils.initializeComposedAttribute(
            params._drivingDeclaredRouting,
            Routing.unserialize
        );
        this.transitCalculatedRoutings = ConstructorUtils.initializeComposedArrayAttributes(
            params._transitCalculatedRoutings,
            Routing.unserialize
        );
        this.walkingCalculatedRoutings = ConstructorUtils.initializeComposedArrayAttributes(
            params._walkingCalculatedRoutings,
            Routing.unserialize
        );
        this.cyclingCalculatedRoutings = ConstructorUtils.initializeComposedArrayAttributes(
            params._cyclingCalculatedRoutings,
            Routing.unserialize
        );
        this.drivingCalculatedRoutings = ConstructorUtils.initializeComposedArrayAttributes(
            params._drivingCalculatedRoutings,
            Routing.unserialize
        );
        this.tripUuid = params._tripUuid as Optional<string>;

        SurveyObjectsRegistry.getInstance().registerSegment(this);
    }

    /**
     * Checks if the segment is a transit segment
     * @returns True if the segment is a transit segment, false otherwise
     */
    isTransit(): Optional<boolean> {
        return this.modeCategory === 'transit';
    }

    get modeCategory(): Optional<SAttr.ModeCategory> {
        return this.mode ? (SAttr.mapModeToModeCategory[this.mode] as SAttr.ModeCategory) : undefined;
    }

    get attributes(): SegmentAttributes & SegmentWithComposedAttributes {
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

    get mode(): Optional<SAttr.Mode> {
        return this._attributes.mode;
    }

    set mode(value: Optional<SAttr.Mode>) {
        this._attributes.mode = value;
    }

    get modeOtherSpecify(): Optional<string> {
        return this._attributes.modeOtherSpecify;
    }

    set modeOtherSpecify(value: Optional<string>) {
        this._attributes.modeOtherSpecify = value;
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

    get driverType(): Optional<SAttr.Driver> {
        return this._attributes.driverType;
    }

    set driverType(value: Optional<SAttr.Driver>) {
        this._attributes.driverType = value;
    }

    get driverUuid(): Optional<string> {
        return this._attributes.driverUuid;
    }

    set driverUuid(value: Optional<string>) {
        this._attributes.driverUuid = value;
    }

    get vehicleOccupancy(): Optional<number> {
        return this._attributes.vehicleOccupancy;
    }

    set vehicleOccupancy(value: Optional<number>) {
        this._attributes.vehicleOccupancy = value;
    }

    get carType(): Optional<SAttr.CarType> {
        return this._attributes.carType;
    }

    set carType(value: Optional<SAttr.CarType>) {
        this._attributes.carType = value;
    }

    get paidForParking(): Optional<boolean> {
        return this._attributes.paidForParking;
    }

    set paidForParking(value: Optional<boolean>) {
        this._attributes.paidForParking = value;
    }

    get onDemandType(): Optional<string> {
        return this._attributes.onDemandType;
    }

    set onDemandType(value: Optional<string>) {
        this._attributes.onDemandType = value;
    }

    get busLines(): Optional<string[]> {
        return this._attributes.busLines;
    }

    set busLines(value: Optional<string[]>) {
        this._attributes.busLines = value;
    }

    get origin(): Optional<Junction> {
        return this._origin;
    }

    set origin(value: Optional<Junction>) {
        this._origin = value;
    }

    get destination(): Optional<Junction> {
        return this._destination;
    }

    set destination(value: Optional<Junction>) {
        this._destination = value;
    }

    get transitDeclaredRouting(): Optional<Routing> {
        return this._transitDeclaredRouting;
    }

    set transitDeclaredRouting(value: Optional<Routing>) {
        this._transitDeclaredRouting = value;
    }

    get walkingDeclaredRouting(): Optional<Routing> {
        return this._walkingDeclaredRouting;
    }

    set walkingDeclaredRouting(value: Optional<Routing>) {
        this._walkingDeclaredRouting = value;
    }

    get cyclingDeclaredRouting(): Optional<Routing> {
        return this._cyclingDeclaredRouting;
    }

    set cyclingDeclaredRouting(value: Optional<Routing>) {
        this._cyclingDeclaredRouting = value;
    }

    get drivingDeclaredRouting(): Optional<Routing> {
        return this._drivingDeclaredRouting;
    }

    set drivingDeclaredRouting(value: Optional<Routing>) {
        this._drivingDeclaredRouting = value;
    }

    get transitCalculatedRoutings(): Optional<Routing[]> {
        return this._transitCalculatedRoutings;
    }

    set transitCalculatedRoutings(value: Optional<Routing[]>) {
        this._transitCalculatedRoutings = value;
    }

    get walkingCalculatedRoutings(): Optional<Routing[]> {
        return this._walkingCalculatedRoutings;
    }

    set walkingCalculatedRoutings(value: Optional<Routing[]>) {
        this._walkingCalculatedRoutings = value;
    }

    get cyclingCalculatedRoutings(): Optional<Routing[]> {
        return this._cyclingCalculatedRoutings;
    }

    set cyclingCalculatedRoutings(value: Optional<Routing[]>) {
        this._cyclingCalculatedRoutings = value;
    }

    get drivingCalculatedRoutings(): Optional<Routing[]> {
        return this._drivingCalculatedRoutings;
    }

    set drivingCalculatedRoutings(value: Optional<Routing[]>) {
        this._drivingCalculatedRoutings = value;
    }

    get tripUuid(): Optional<string> {
        return this._tripUuid;
    }

    set tripUuid(value: Optional<string>) {
        this._tripUuid = value;
    }

    get trip(): Optional<Trip> {
        if (!this._tripUuid) {
            return undefined;
        }
        return SurveyObjectsRegistry.getInstance().getTrip(this._tripUuid);
    }

    get journey(): Optional<Journey> {
        return this.trip?.journey;
    }

    get person(): Optional<Person> {
        return this.trip?.journey?.person;
    }

    get household(): Optional<Household> {
        return this.trip?.journey?.person?.household;
    }

    /**
     * Creates a Segment object from sanitized parameters
     * @param {ExtendedSegmentAttributes | SerializedExtendedSegmentAttributes} params - Sanitized segment parameters
     * @returns {Segment} New Segment instance
     */
    static unserialize(params: ExtendedSegmentAttributes | SerializedExtendedSegmentAttributes): Segment {
        const flattenedParams = SurveyObjectUnserializer.flattenSerializedData(params);
        return new Segment(flattenedParams as ExtendedSegmentAttributes);
    }

    static create(dirtyParams: { [key: string]: unknown }): Result<Segment> {
        const errors = Segment.validateParams(dirtyParams);
        const segment = errors.length === 0 ? new Segment(dirtyParams as ExtendedSegmentAttributes) : undefined;
        if (errors.length > 0) {
            return createErrors(errors);
        }
        return createOk(segment as Segment);
    }

    validate(): Optional<boolean> {
        this._attributes._isValid = true;
        return true;
    }

    isValid(): Optional<boolean> {
        return this._isValid;
    }

    /**
     * Validates attributes types for Segment.
     * @param dirtyParams The parameters to validate.
     * @param displayName The name of the object to validate, for error display
     * @returns Error[]
     */
    static validateParams(dirtyParams: { [key: string]: unknown }, displayName = 'Segment'): Error[] {
        const errors: Error[] = [];

        errors.push(...ParamsValidatorUtils.isRequired('params', dirtyParams, displayName));
        errors.push(...ParamsValidatorUtils.isObject('params', dirtyParams, displayName));

        errors.push(...Uuidable.validateParams(dirtyParams, displayName));
        errors.push(...StartEndable.validateParams(dirtyParams, displayName));

        errors.push(...ParamsValidatorUtils.isPositiveInteger('_sequence', dirtyParams._sequence, displayName));

        errors.push(...ParamsValidatorUtils.isBoolean('_isValid', dirtyParams._isValid, displayName));

        errors.push(...validateWeights(dirtyParams._weights as Optional<Weight[]>));

        errors.push(...ParamsValidatorUtils.isString('mode', dirtyParams.mode, displayName));

        errors.push(...ParamsValidatorUtils.isString('modeOtherSpecify', dirtyParams.modeOtherSpecify, displayName));

        errors.push(...ParamsValidatorUtils.isString('driverType', dirtyParams.driverType, displayName));

        errors.push(...ParamsValidatorUtils.isUuid('driverUuid', dirtyParams.driverUuid, displayName));

        errors.push(
            ...ParamsValidatorUtils.isPositiveInteger('vehicleOccupancy', dirtyParams.vehicleOccupancy, displayName)
        );

        errors.push(...ParamsValidatorUtils.isString('carType', dirtyParams.carType, displayName));

        errors.push(...ParamsValidatorUtils.isBoolean('paidForParking', dirtyParams.paidForParking, displayName));

        errors.push(...ParamsValidatorUtils.isString('onDemandType', dirtyParams.onDemandType, displayName));

        errors.push(...ParamsValidatorUtils.isArrayOfStrings('busLines', dirtyParams.busLines, displayName));

        const transitDeclaredRoutingAttributes = dirtyParams._transitDeclaredRouting;
        if (transitDeclaredRoutingAttributes !== undefined) {
            errors.push(
                ...Routing.validateParams(
                    transitDeclaredRoutingAttributes as { [key: string]: unknown },
                    'TransitRouting'
                )
            );
        }
        const walkingDeclaredRoutingAttributes = dirtyParams._walkingDeclaredRouting;
        if (walkingDeclaredRoutingAttributes !== undefined) {
            errors.push(
                ...Routing.validateParams(
                    walkingDeclaredRoutingAttributes as { [key: string]: unknown },
                    'WalkingRouting'
                )
            );
        }
        const cyclingDeclaredRoutingAttributes = dirtyParams._cyclingDeclaredRouting;
        if (cyclingDeclaredRoutingAttributes !== undefined) {
            errors.push(
                ...Routing.validateParams(
                    cyclingDeclaredRoutingAttributes as { [key: string]: unknown },
                    'CyclingRouting'
                )
            );
        }
        const drivingDeclaredRoutingAttributes = dirtyParams._drivingDeclaredRouting;
        if (drivingDeclaredRoutingAttributes !== undefined) {
            errors.push(
                ...Routing.validateParams(
                    drivingDeclaredRoutingAttributes as { [key: string]: unknown },
                    'DrivingRouting'
                )
            );
        }

        const transitCalculatedRoutingsAttributes =
            dirtyParams._transitCalculatedRoutings !== undefined
                ? (dirtyParams._transitCalculatedRoutings as { [key: string]: unknown }[])
                : [];
        for (let i = 0, countI = transitCalculatedRoutingsAttributes.length; i < countI; i++) {
            errors.push(
                ...Routing.validateParams(
                    transitCalculatedRoutingsAttributes[i] as { [key: string]: unknown },
                    'TransitRouting'
                )
            );
        }
        const walkingCalculatedRoutingsAttributes =
            dirtyParams._walkingCalculatedRoutings !== undefined
                ? (dirtyParams._walkingCalculatedRoutings as { [key: string]: unknown }[])
                : [];
        for (let i = 0, countI = walkingCalculatedRoutingsAttributes.length; i < countI; i++) {
            errors.push(
                ...Routing.validateParams(
                    walkingCalculatedRoutingsAttributes[i] as { [key: string]: unknown },
                    'WalkingRouting'
                )
            );
        }
        const cyclingCalculatedRoutingsAttributes =
            dirtyParams._cyclingCalculatedRoutings !== undefined
                ? (dirtyParams._cyclingCalculatedRoutings as { [key: string]: unknown }[])
                : [];
        for (let i = 0, countI = cyclingCalculatedRoutingsAttributes.length; i < countI; i++) {
            errors.push(
                ...Routing.validateParams(
                    cyclingCalculatedRoutingsAttributes[i] as { [key: string]: unknown },
                    'CyclingRouting'
                )
            );
        }
        const drivingCalculatedRoutingsAttributes =
            dirtyParams._drivingCalculatedRoutings !== undefined
                ? (dirtyParams._drivingCalculatedRoutings as { [key: string]: unknown }[])
                : [];
        for (let i = 0, countI = drivingCalculatedRoutingsAttributes.length; i < countI; i++) {
            errors.push(
                ...Routing.validateParams(
                    drivingCalculatedRoutingsAttributes[i] as { [key: string]: unknown },
                    'DrivingRouting'
                )
            );
        }

        errors.push(...ParamsValidatorUtils.isUuid('_tripUuid', dirtyParams._tripUuid, displayName));

        return errors;
    }
}
