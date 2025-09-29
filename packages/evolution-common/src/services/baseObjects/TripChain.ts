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
import * as TCAttr from './attributeTypes/TripChainAttributes';
import * as VPAttr from './attributeTypes/VisitedPlaceAttributes';
import { Result, createErrors, createOk } from '../../types/Result.type';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { ConstructorUtils } from '../../utils/ConstructorUtils';
import { Trip, ExtendedTripAttributes, SerializedExtendedTripAttributes } from './Trip';
import { VisitedPlace, ExtendedVisitedPlaceAttributes, SerializedExtendedVisitedPlaceAttributes } from './VisitedPlace';
import { StartEndable, startEndDateAndTimesAttributes, StartEndDateAndTimesAttributes } from './StartEndable';
import { TimePeriod } from './attributeTypes/GenericAttributes';
import { SurveyObjectUnserializer } from './SurveyObjectUnserializer';
import { SurveyObjectsRegistry } from './SurveyObjectsRegistry';
import { Journey } from './Journey';
import { Person } from './Person';
import { Household } from './Household';

export const tripChainAttributes = [
    ...startEndDateAndTimesAttributes,
    '_weights',
    '_isValid',
    '_uuid',
    'category',
    'isMultiLoop',
    'isConstrained',
    'mainActivity',
    'mainActivityCategory'
];

export const tripChainAttributesWithComposedAttributes = [...tripChainAttributes, 'trips', 'visitedPlaces'];

export type TripChainAttributes = {
    category?: Optional<TCAttr.TripChainCategory>;
    isMultiLoop?: Optional<boolean>;
    isConstrained?: Optional<boolean>;
    mainActivity?: Optional<VPAttr.Activity>;
    mainActivityCategory?: Optional<VPAttr.ActivityCategory>;
} & StartEndDateAndTimesAttributes &
    UuidableAttributes &
    WeightableAttributes &
    ValidatebleAttributes;

export type TripChainWithComposedAttributes = TripChainAttributes & {
    _trips?: Optional<ExtendedTripAttributes[]>;
    _visitedPlaces?: Optional<ExtendedVisitedPlaceAttributes[]>;
};

export type ExtendedTripChainAttributes = TripChainWithComposedAttributes & { [key: string]: unknown };

export type SerializedExtendedTripChainAttributes = {
    _attributes?: ExtendedTripChainAttributes;
    _customAttributes?: { [key: string]: unknown };
    _trips?: SerializedExtendedTripAttributes[];
    _visitedPlaces?: SerializedExtendedVisitedPlaceAttributes[];
};

/**
 * A trip chain is a group or consecutive trips between two anchors
 * the anchors are usually home, work place or the main destination of
 * the trips group. A trip chain could be a closed (return to the same anchor)
 * or open (the end anchor is not the same as the start anchor)
 * trip chains can be unconstrained (like a shopping trip chain)
 * for which timing and/or location is usually flexible
 * or constrained (like a trip chain with the main anchor being a work or school place)
 * for which the timing and/or location is usually fixed/not flexible
 * TODO: document the official academic/students definition of the trip chain with more examples
 */
export class TripChain extends Uuidable implements IValidatable {
    private _attributes: TripChainAttributes;
    private _customAttributes: { [key: string]: unknown };

    private _trips?: Optional<Trip[]>;
    private _visitedPlaces?: Optional<VisitedPlace[]>;

    private _journeyUuid?: Optional<string>;

    static _confidentialAttributes = [];

    constructor(params: ExtendedTripChainAttributes) {
        super(params._uuid);

        this._attributes = {} as TripChainAttributes;
        this._customAttributes = {};

        const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(
            _omit(params, ['_trips', '_visitedPlaces', 'trips', 'visitedPlaces', '_journeyUuid']),
            tripChainAttributes,
            tripChainAttributesWithComposedAttributes
        );
        this._attributes = attributes;
        this._customAttributes = customAttributes;

        this.trips = ConstructorUtils.initializeComposedArrayAttributes(params._trips, Trip.unserialize);
        this.visitedPlaces = ConstructorUtils.initializeComposedArrayAttributes(
            params._visitedPlaces,
            VisitedPlace.unserialize
        );
        this.journeyUuid = params._journeyUuid as Optional<string>;

        SurveyObjectsRegistry.getInstance().registerTripChain(this);
    }

    get attributes(): TripChainAttributes {
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

    get category(): Optional<TCAttr.TripChainCategory> {
        return this._attributes.category;
    }

    set category(value: Optional<TCAttr.TripChainCategory>) {
        this._attributes.category = value;
    }

    get isMultiLoop(): Optional<boolean> {
        return this._attributes.isMultiLoop;
    }

    set isMultiLoop(value: Optional<boolean>) {
        this._attributes.isMultiLoop = value;
    }

    get isConstrained(): Optional<boolean> {
        return this._attributes.isConstrained;
    }

    set isConstrained(value: Optional<boolean>) {
        this._attributes.isConstrained = value;
    }

    get mainActivity(): Optional<VPAttr.Activity> {
        return this._attributes.mainActivity;
    }

    set mainActivity(value: Optional<VPAttr.Activity>) {
        this._attributes.mainActivity = value;
    }

    get mainActivityCategory(): Optional<VPAttr.ActivityCategory> {
        return this._attributes.mainActivityCategory;
    }

    set mainActivityCategory(value: Optional<VPAttr.ActivityCategory>) {
        this._attributes.mainActivityCategory = value;
    }

    get trips(): Optional<Trip[]> {
        return this._trips;
    }

    set trips(value: Optional<Trip[]>) {
        this._trips = value;
    }

    get visitedPlaces(): Optional<VisitedPlace[]> {
        return this._visitedPlaces;
    }

    set visitedPlaces(value: Optional<VisitedPlace[]>) {
        this._visitedPlaces = value;
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
        return SurveyObjectsRegistry.getInstance().getJourney(this._journeyUuid);
    }

    get person(): Optional<Person> {
        return this.journey?.person;
    }

    get household(): Optional<Household> {
        return this.journey?.person?.household;
    }

    /**
     * Creates a TripChain object from sanitized parameters
     * @param {ExtendedTripChainAttributes | SerializedExtendedTripChainAttributes} params - Sanitized trip chain parameters
     * @returns {TripChain} New TripChain instance
     */
    static unserialize(params: ExtendedTripChainAttributes | SerializedExtendedTripChainAttributes): TripChain {
        const flattenedParams = SurveyObjectUnserializer.flattenSerializedData(params);
        return new TripChain(flattenedParams as ExtendedTripChainAttributes);
    }

    static create(dirtyParams: { [key: string]: unknown }): Result<TripChain> {
        const errors = TripChain.validateParams(dirtyParams);
        const tripChain = errors.length === 0 ? new TripChain(dirtyParams) : undefined;
        if (errors.length > 0) {
            return createErrors(errors);
        }
        return createOk(tripChain as TripChain);
    }

    validate(): Optional<boolean> {
        this._attributes._isValid = true;
        return true;
    }

    isValid(): Optional<boolean> {
        return this._isValid;
    }

    static validateParams(dirtyParams: { [key: string]: unknown }, displayName = 'TripChain'): Error[] {
        const errors: Error[] = [];

        errors.push(...ParamsValidatorUtils.isRequired('params', dirtyParams, displayName));
        errors.push(...ParamsValidatorUtils.isObject('params', dirtyParams, displayName));

        errors.push(...Uuidable.validateParams(dirtyParams, displayName));
        errors.push(...StartEndable.validateParams(dirtyParams, displayName));

        errors.push(...ParamsValidatorUtils.isBoolean('_isValid', dirtyParams._isValid, displayName));

        errors.push(...validateWeights(dirtyParams._weights as Optional<Weight[]>));

        errors.push(...ParamsValidatorUtils.isString('category', dirtyParams.category, displayName));

        errors.push(...ParamsValidatorUtils.isBoolean('isMultiLoop', dirtyParams.isMultiLoop, displayName));

        errors.push(...ParamsValidatorUtils.isBoolean('isConstrained', dirtyParams.isConstrained, displayName));

        errors.push(...ParamsValidatorUtils.isString('mainActivity', dirtyParams.mainActivity, displayName));

        errors.push(
            ...ParamsValidatorUtils.isString('mainActivityCategory', dirtyParams.mainActivityCategory, displayName)
        );

        const tripsAttributes =
            dirtyParams._trips !== undefined ? (dirtyParams._trips as { [key: string]: unknown }[]) : [];
        for (let i = 0, countI = tripsAttributes.length; i < countI; i++) {
            const tripAttributes = tripsAttributes[i];
            errors.push(...Trip.validateParams(tripAttributes, 'Trip'));
        }

        const visitedPlacesAttributes =
            dirtyParams._visitedPlaces !== undefined
                ? (dirtyParams._visitedPlaces as { [key: string]: unknown }[])
                : [];
        for (let i = 0, countI = visitedPlacesAttributes.length; i < countI; i++) {
            const visitedPlaceAttributes = visitedPlacesAttributes[i];
            errors.push(...VisitedPlace.validateParams(visitedPlaceAttributes, 'VisitedPlace'));
        }

        errors.push(...ParamsValidatorUtils.isUuid('_journeyUuid', dirtyParams._journeyUuid, displayName));

        return errors;
    }
}
