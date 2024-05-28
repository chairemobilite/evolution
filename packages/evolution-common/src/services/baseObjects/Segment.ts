/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Optional } from '../../types/Optional.type';
import { IValidatable, ValidatebleAttributes } from './IValidatable';
import { Uuidable, UuidableAttributes } from './Uuidable';
import { WeightableAttributes, Weight, validateWeights } from './Weight';
import * as SAttr from './attributeTypes/SegmentAttributes';
import { Junction, JunctionAttributes } from './Junction';
import { Routing, RoutingAttributes } from './Routing';
import { Result, createErrors, createOk } from '../../types/Result.type';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { ConstructorUtils } from '../../utils/ConstructorUtils';

export const segmentAttributes = [
    '_weights',
    '_isValid',
    '_uuid',
    'modeCategory',
    'mode',
    'modeOtherSpecify',
    'departureDate',
    'arrivalDate',
    'departureTime',
    'arrivalTime',
    'driver',
    'driverUuid',
    'carType',
    'vehicleOccupancy'
];

export const segmentAttributesWithComposedAttributes = [
    ...segmentAttributes,
    'origin',
    'destination',
    'transitDeclaredRouting',
    'walkingDeclaredRouting',
    'cyclingDeclaredRouting',
    'drivingDeclaredRouting',
    'transitCalculatedRoutings',
    'walkingCalculatedRoutings',
    'cyclingCalculatedRoutings',
    'drivingCalculatedRoutings'
];

export type SegmentWithComposedAttributes = {
    origin?: Optional<JunctionAttributes>;
    destination?: Optional<JunctionAttributes>;
    transitDeclaredRouting?: Optional<RoutingAttributes>;
    walkingDeclaredRouting?: Optional<RoutingAttributes>;
    cyclingDeclaredRouting?: Optional<RoutingAttributes>;
    drivingDeclaredRouting?: Optional<RoutingAttributes>;
    transitCalculatedRoutings?: Optional<RoutingAttributes[]>;
    walkingCalculatedRoutings?: Optional<RoutingAttributes[]>;
    cyclingCalculatedRoutings?: Optional<RoutingAttributes[]>;
    drivingCalculatedRoutings?: Optional<RoutingAttributes[]>;
};

export type SegmentAttributes = {
    modeCategory?: Optional<SAttr.ModeCategory>;
    mode?: Optional<SAttr.Mode>;
    modeOtherSpecify?: Optional<string>;
    departureDate?: Optional<string>; // string, YYYY-MM-DD
    arrivalDate?: Optional<string>; // string, YYYY-MM-DD
    departureTime?: Optional<number>; // seconds since midnight
    arrivalTime?: Optional<number>; // seconds since midnight
    driver?: Optional<SAttr.Driver>;
    driverUuid?: Optional<string>; // person uuid
    vehicleOccupancy?: Optional<number>; // positive integer
    carType?: Optional<SAttr.CarType>;
} & UuidableAttributes & WeightableAttributes & ValidatebleAttributes;

export type ExtendedSegmentAttributes = SegmentAttributes & SegmentWithComposedAttributes & { [key: string]: unknown };

export class Segment implements IValidatable {
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

    static _confidentialAttributes = [];

    constructor(params: ExtendedSegmentAttributes) {
        params._uuid = Uuidable.getUuid(params._uuid);
        this._attributes = {} as SegmentAttributes & SegmentWithComposedAttributes;
        this._customAttributes = {};

        const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(
            params,
            segmentAttributes,
            segmentAttributesWithComposedAttributes
        );
        this._attributes = attributes;
        this._customAttributes = customAttributes;

        this.origin = ConstructorUtils.initializeComposedAttribute(params.origin, Junction.unserialize);
        this.destination = ConstructorUtils.initializeComposedAttribute(params.destination, Junction.unserialize);
        this.transitDeclaredRouting = ConstructorUtils.initializeComposedAttribute(params.transitDeclaredRouting, Routing.unserialize);
        this.walkingDeclaredRouting = ConstructorUtils.initializeComposedAttribute(params.walkingDeclaredRouting, Routing.unserialize);
        this.cyclingDeclaredRouting = ConstructorUtils.initializeComposedAttribute(params.cyclingDeclaredRouting, Routing.unserialize);
        this.drivingDeclaredRouting = ConstructorUtils.initializeComposedAttribute(params.drivingDeclaredRouting, Routing.unserialize);
        this.transitCalculatedRoutings = ConstructorUtils.initializeComposedArrayAttributes(params.transitCalculatedRoutings, Routing.unserialize);
        this.walkingCalculatedRoutings = ConstructorUtils.initializeComposedArrayAttributes(params.walkingCalculatedRoutings, Routing.unserialize);
        this.cyclingCalculatedRoutings = ConstructorUtils.initializeComposedArrayAttributes(params.cyclingCalculatedRoutings, Routing.unserialize);
        this.drivingCalculatedRoutings = ConstructorUtils.initializeComposedArrayAttributes(params.drivingCalculatedRoutings, Routing.unserialize);
    }

    get attributes(): SegmentAttributes & SegmentWithComposedAttributes {
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

    get modeCategory(): Optional<SAttr.ModeCategory> {
        return this._attributes.modeCategory;
    }

    set modeCategory(value: Optional<SAttr.ModeCategory>) {
        this._attributes.modeCategory = value;
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

    get departureDate(): Optional<string> {
        return this._attributes.departureDate;
    }

    set departureDate(value: Optional<string>) {
        this._attributes.departureDate = value;
    }

    get arrivalDate(): Optional<string> {
        return this._attributes.arrivalDate;
    }

    set arrivalDate(value: Optional<string>) {
        this._attributes.arrivalDate = value;
    }

    get departureTime(): Optional<number> {
        return this._attributes.departureTime;
    }

    set departureTime(value: Optional<number>) {
        this._attributes.departureTime = value;
    }

    get arrivalTime(): Optional<number> {
        return this._attributes.arrivalTime;
    }

    set arrivalTime(value: Optional<number>) {
        this._attributes.arrivalTime = value;
    }

    get driver(): Optional<SAttr.Driver> {
        return this._attributes.driver;
    }

    set driver(value: Optional<SAttr.Driver>) {
        this._attributes.driver = value;
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

    static unserialize(params: ExtendedSegmentAttributes): Segment {
        return new Segment(params);
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
            ...ParamsValidatorUtils.isString(
                'modeCategory',
                dirtyParams.modeCategory,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'mode',
                dirtyParams.mode,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'modeOtherSpecify',
                dirtyParams.modeOtherSpecify,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isDateString(
                'departureDate',
                dirtyParams.departureDate,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isDateString(
                'arrivalDate',
                dirtyParams.arrivalDate,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isPositiveInteger(
                'departureTime',
                dirtyParams.departureTime,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isPositiveInteger(
                'arrivalTime',
                dirtyParams.arrivalTime,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'driver',
                dirtyParams.driver,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isUuid(
                'driverUuid',
                dirtyParams.driverUuid,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isPositiveInteger(
                'vehicleOccupancy',
                dirtyParams.vehicleOccupancy,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'carType',
                dirtyParams.carType,
                displayName
            )
        );

        const transitDeclaredRoutingAttributes = dirtyParams.transitDeclaredRouting;
        if (transitDeclaredRoutingAttributes !== undefined) {
            errors.push(
                ...Routing.validateParams(transitDeclaredRoutingAttributes as { [key: string]: unknown }, 'TransitRouting')
            );
        }
        const walkingDeclaredRoutingAttributes = dirtyParams.walkingDeclaredRouting;
        if (walkingDeclaredRoutingAttributes !== undefined) {
            errors.push(
                ...Routing.validateParams(walkingDeclaredRoutingAttributes as { [key: string]: unknown }, 'WalkingRouting')
            );
        }
        const cyclingDeclaredRoutingAttributes = dirtyParams.cyclingDeclaredRouting;
        if (cyclingDeclaredRoutingAttributes !== undefined) {
            errors.push(
                ...Routing.validateParams(cyclingDeclaredRoutingAttributes as { [key: string]: unknown }, 'CyclingRouting')
            );
        }
        const drivingDeclaredRoutingAttributes = dirtyParams.drivingDeclaredRouting;
        if (drivingDeclaredRoutingAttributes !== undefined) {
            errors.push(
                ...Routing.validateParams(drivingDeclaredRoutingAttributes as { [key: string]: unknown }, 'DrivingRouting')
            );
        }

        const transitCalculatedRoutingsAttributes = dirtyParams.transitCalculatedRoutings !== undefined ? dirtyParams.transitCalculatedRoutings as { [key: string]: unknown }[] : [];
        for (let i = 0, countI = transitCalculatedRoutingsAttributes.length; i < countI; i++) {
            errors.push(
                ...Routing.validateParams(transitCalculatedRoutingsAttributes[i] as { [key: string]: unknown }, 'TransitRouting')
            );
        }
        const walkingCalculatedRoutingsAttributes = dirtyParams.walkingCalculatedRoutings !== undefined ? dirtyParams.walkingCalculatedRoutings as { [key: string]: unknown }[] : [];
        for (let i = 0, countI = walkingCalculatedRoutingsAttributes.length; i < countI; i++) {
            errors.push(
                ...Routing.validateParams(walkingCalculatedRoutingsAttributes[i] as { [key: string]: unknown }, 'WalkingRouting')
            );
        }
        const cyclingCalculatedRoutingsAttributes = dirtyParams.cyclingCalculatedRoutings !== undefined ? dirtyParams.cyclingCalculatedRoutings as { [key: string]: unknown }[] : [];
        for (let i = 0, countI = cyclingCalculatedRoutingsAttributes.length; i < countI; i++) {
            errors.push(
                ...Routing.validateParams(cyclingCalculatedRoutingsAttributes[i] as { [key: string]: unknown }, 'CyclingRouting')
            );
        }
        const drivingCalculatedRoutingsAttributes = dirtyParams.drivingCalculatedRoutings !== undefined ? dirtyParams.drivingCalculatedRoutings as { [key: string]: unknown }[] : [];
        for (let i = 0, countI = drivingCalculatedRoutingsAttributes.length; i < countI; i++) {
            errors.push(
                ...Routing.validateParams(drivingCalculatedRoutingsAttributes[i] as { [key: string]: unknown }, 'DrivingRouting')
            );
        }

        return errors;
    }
}
