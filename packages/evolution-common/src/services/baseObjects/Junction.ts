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
import { WeightableAttributes, Weight } from './Weight';
import * as PlAttr from './attributeTypes/PlaceAttributes';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { Place, ExtendedPlaceAttributes, SerializedExtendedPlaceAttributes } from './Place';
import { Result, createErrors, createOk } from '../../types/Result.type';
import { StartEndable, startEndDateAndTimesAttributes, StartEndDateAndTimesAttributes } from './StartEndable';
import { TimePeriod } from './attributeTypes/GenericAttributes';
import { ConstructorUtils } from '../../utils/ConstructorUtils';
import { SurveyObjectUnserializer } from './SurveyObjectUnserializer';
import { SurveyObjectsRegistry } from './SurveyObjectsRegistry';
import { Trip } from './Trip';

export const junctionAttributes = [
    ...startEndDateAndTimesAttributes,
    '_weights',
    '_isValid',
    '_uuid',
    'parkingType',
    'parkingFeeType',
    'transitPlaceType'
];

export const junctionAttributesWithComposedAttributes = [...junctionAttributes, 'place'];

export type JunctionAttributes = {
    parkingType?: Optional<PlAttr.ParkingType>;
    parkingFeeType?: Optional<PlAttr.ParkingFeeType>;
    transitPlaceType?: Optional<PlAttr.TransitPlaceType>; // for transit junctions
} & StartEndDateAndTimesAttributes &
    UuidableAttributes &
    WeightableAttributes &
    ValidatebleAttributes;

export type JunctionWithComposedAttributes = JunctionAttributes & {
    _place?: Optional<ExtendedPlaceAttributes>;
};

export type ExtendedJunctionAttributes = JunctionWithComposedAttributes & { [key: string]: unknown };

export type SerializedExtendedJunctionAttributes = {
    _attributes?: ExtendedJunctionAttributes;
    _customAttributes?: { [key: string]: unknown };
    _place?: Optional<SerializedExtendedPlaceAttributes>;
};

/**
 * A junction is a place used to transfer between segments/modes by a person during a trip
 * Usually, junctions are used as origin and/or destination for segments
 * Junctions are optional in most surveys
 */
export class Junction extends Uuidable implements IValidatable {
    private _attributes: JunctionAttributes;
    private _customAttributes: { [key: string]: unknown };

    private _place?: Optional<Place>;

    private _tripUuid?: Optional<string>; // allow reverse lookup

    static _confidentialAttributes = [];

    constructor(params: ExtendedJunctionAttributes) {
        super(params._uuid);

        this._attributes = {} as JunctionAttributes;
        this._customAttributes = {};

        const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(
            _omit(params, ['_place', 'place', '_tripUuid']),
            junctionAttributes,
            junctionAttributesWithComposedAttributes
        );
        this._attributes = attributes;
        this._customAttributes = customAttributes;

        this.place = ConstructorUtils.initializeComposedAttribute(params._place, Place.unserialize);
        this.tripUuid = params._tripUuid as Optional<string>;

        SurveyObjectsRegistry.getInstance().registerJunction(this);
    }

    get attributes(): JunctionAttributes {
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

    get place(): Optional<Place> {
        return this._place;
    }

    set place(value: Optional<Place>) {
        this._place = value;
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

    /**
     * Creates a Junction object from sanitized parameters
     * @param {ExtendedJunctionAttributes | SerializedExtendedJunctionAttributes} params - Sanitized junction parameters
     * @returns {Junction} New Junction instance
     */
    static unserialize(params: ExtendedJunctionAttributes | SerializedExtendedJunctionAttributes): Junction {
        const flattenedParams = SurveyObjectUnserializer.flattenSerializedData(params);
        return new Junction(flattenedParams as ExtendedJunctionAttributes);
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

        // Validate params object:
        errors.push(...ParamsValidatorUtils.isRequired('params', dirtyParams, displayName));
        errors.push(...ParamsValidatorUtils.isObject('params', dirtyParams, displayName));

        // Validate _uuid:
        errors.push(...Uuidable.validateParams(dirtyParams));

        // Validate _isValid:
        errors.push(...ParamsValidatorUtils.isBoolean('_isValid', dirtyParams._isValid, displayName));

        // Validate StartEndable attributes:
        errors.push(...StartEndable.validateParams(dirtyParams, displayName));

        // Validate junction-specific attributes:
        errors.push(...ParamsValidatorUtils.isString('parkingType', dirtyParams.parkingType, displayName));
        errors.push(...ParamsValidatorUtils.isString('parkingFeeType', dirtyParams.parkingFeeType, displayName));
        errors.push(...ParamsValidatorUtils.isString('transitPlaceType', dirtyParams.transitPlaceType, displayName));

        // Validate composed place:
        const placeAttributes = dirtyParams._place as { [key: string]: unknown };
        if (placeAttributes) {
            errors.push(...Place.validateParams(placeAttributes, 'Junction Place'));
        }

        errors.push(...ParamsValidatorUtils.isUuid('_tripUuid', dirtyParams._tripUuid, displayName));

        return errors;
    }
}
