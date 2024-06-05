/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Optional } from '../../types/Optional.type';
import { IValidatable } from './IValidatable';
import * as PlAttr from './attributeTypes/PlaceAttributes';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { Place, PlaceAttributes, placeAttributes } from './Place';
import { Result, createErrors, createOk } from '../../types/Result.type';
import { StartEndable, startEndDateAndTimesAttributes, StartEndDateAndTimesAttributes } from './StartEndable';
import { TimePeriod } from './attributeTypes/GenericAttributes';

export const junctionAttributes = [
    ...placeAttributes,
    ...startEndDateAndTimesAttributes,
    'parkingType',
    'parkingFeeType',
    'transitPlaceType'
];

export type JunctionAttributes = {
    parkingType?: Optional<PlAttr.ParkingType>;
    parkingFeeType?: Optional<PlAttr.ParkingFeeType>;
    transitPlaceType?: Optional<PlAttr.TransitPlaceType>; // for transit junctions
} & StartEndDateAndTimesAttributes & PlaceAttributes;

export type ExtendedJunctionAttributes = JunctionAttributes & { [key: string]: unknown };

/**
 * A junction is a place used to transfer between segments/modes by a person during a trip
 * Usually, junctions are used as origin and/or destination for segments
 * Junctions are optional in most surveys
 */
export class Junction extends Place<JunctionAttributes> implements IValidatable {

    static _confidentialAttributes = [];

    constructor(params: ExtendedJunctionAttributes) {
        super(params, junctionAttributes);
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

    get parkingType(): Optional<PlAttr.ParkingType> {
        return this._attributes.parkingType;
    }

    set parkingType(value: Optional<PlAttr.ParkingType>) {
        this._attributes.parkingType = value;
    }

    get parkingFeeType(): Optional<PlAttr.ParkingFeeType> {
        return this._attributes.parkingFeeType;
    }

    set parkingFeeType(value: Optional<PlAttr.ParkingFeeType>) {
        this._attributes.parkingFeeType = value;
    }

    get transitPlaceType(): Optional<PlAttr.TransitPlaceType> {
        return this._attributes.transitPlaceType;
    }

    set transitPlaceType(value: Optional<PlAttr.TransitPlaceType>) {
        this._attributes.transitPlaceType = value;
    }

    static unserialize(params: ExtendedJunctionAttributes): Junction {
        return new Junction(params);
    }

    static create(dirtyParams: { [key: string]: unknown }): Result<Junction> {
        const errors = Junction.validateParams(dirtyParams);
        const junction = errors.length === 0 ? new Junction(dirtyParams) : undefined;
        if (errors.length > 0) {
            return createErrors(errors);
        }
        return createOk(junction as Junction);
    }

    validate(): Optional<boolean> {
        this._attributes._isValid = true;
        return true;
    }

    isValid(): Optional<boolean> {
        return this._isValid;
    }

    /**
     * Validates attributes types for Junction.
     * @param dirtyParams The parameters to validate.
     * @param displayName The name of the object to validate, for error display
     * @returns Error[]
     */
    static validateParams(dirtyParams: { [key: string]: unknown }, displayName = 'Junction'): Error[] {
        const errors: Error[] = [];

        errors.push(...Place.validateParams(dirtyParams, displayName));
        errors.push(...StartEndable.validateParams(dirtyParams, displayName));

        errors.push(
            ...ParamsValidatorUtils.isString(
                'parkingType',
                dirtyParams.parkingType,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'parkingFeeType',
                dirtyParams.parkingFeeType,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'transitPlaceType',
                dirtyParams.transitPlaceType,
                displayName
            )
        );

        return errors;
    }
}
