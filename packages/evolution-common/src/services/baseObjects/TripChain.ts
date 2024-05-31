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
import * as TCAttr from './attributeTypes/TripChainAttributes';
import * as VPAttr from './attributeTypes/VisitedPlaceAttributes';
import { Result, createErrors, createOk } from '../../types/Result.type';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { ConstructorUtils } from '../../utils/ConstructorUtils';
import { Trip, TripAttributes } from './Trip';
import { VisitedPlace, VisitedPlaceAttributes } from './VisitedPlace';

export const tripChainAttributes = [
    '_weights',
    '_isValid',
    '_uuid',
    'startDate',
    'endDate',
    'startTime',
    'endTime',
    'category',
    'isMultiLoop',
    'isConstrained',
    'mainActivity',
    'mainActivityCategory',
];

export const tripChainAttributesWithComposedAttributes = [
    ...tripChainAttributes,
    'trips',
    'visitedPlaces',
];

export type TripChainAttributes = {
    startDate?: Optional<string>;
    endDate?: Optional<string>;
    startTime?: Optional<number>;
    endTime?: Optional<number>;
    category?: Optional<TCAttr.TripChainCategory>;
    isMultiLoop?: Optional<boolean>;
    isConstrained?: Optional<boolean>;
    mainActivity?: Optional<VPAttr.Activity>;
    mainActivityCategory?: Optional<VPAttr.ActivityCategory>;
} & UuidableAttributes & WeightableAttributes & ValidatebleAttributes;

export type TripChainWithComposedAttributes = TripChainAttributes & {
    trips?: Optional<TripAttributes[]>;
    visitedPlaces?: Optional<VisitedPlaceAttributes[]>;
};

export type ExtendedTripChainAttributes = TripChainWithComposedAttributes & { [key: string]: unknown };

export class TripChain implements IValidatable {
    private _attributes: TripChainAttributes;
    private _customAttributes: { [key: string]: unknown };

    private _trips?: Optional<Trip[]>;
    private _visitedPlaces?: Optional<VisitedPlace[]>;

    private _journeyUuid?: Optional<string>;

    static _confidentialAttributes = [];

    constructor(params: ExtendedTripChainAttributes) {
        params._uuid = Uuidable.getUuid(params._uuid);

        this._attributes = {} as TripChainAttributes;
        this._customAttributes = {};

        const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(
            params,
            tripChainAttributes,
            tripChainAttributesWithComposedAttributes
        );
        this._attributes = attributes;
        this._customAttributes = customAttributes;

        this.trips = ConstructorUtils.initializeComposedArrayAttributes(params.trips, Trip.unserialize);
        this.visitedPlaces = ConstructorUtils.initializeComposedArrayAttributes(params.visitedPlaces, VisitedPlace.unserialize);
    }

    get attributes(): TripChainAttributes {
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

    get endDate(): Optional<string> {
        return this._attributes.endDate;
    }

    set endDate(value: Optional<string>) {
        this._attributes.endDate = value;
    }

    get startTime(): Optional<number> {
        return this._attributes.startTime;
    }

    set startTime(value: Optional<number>) {
        this._attributes.startTime = value;
    }

    get endTime(): Optional<number> {
        return this._attributes.endTime;
    }

    set endTime(value: Optional<number>) {
        this._attributes.endTime = value;
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

    static unserialize(params: ExtendedTripChainAttributes): TripChain {
        return new TripChain(params);
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
            ...ParamsValidatorUtils.isDateString(
                'startDate',
                dirtyParams.startDate,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isDateString(
                'endDate',
                dirtyParams.endDate,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isPositiveInteger(
                'startTime',
                dirtyParams.startTime,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isPositiveInteger(
                'endTime',
                dirtyParams.endTime,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'category',
                dirtyParams.category,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isBoolean(
                'isMultiLoop',
                dirtyParams.isMultiLoop,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isBoolean(
                'isConstrained',
                dirtyParams.isConstrained,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'mainActivity',
                dirtyParams.mainActivity,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'mainActivityCategory',
                dirtyParams.mainActivityCategory,
                displayName
            )
        );

        const tripsAttributes = dirtyParams.trips !== undefined ? dirtyParams.trips as { [key: string]: unknown }[] : [];
        for (let i = 0, countI = tripsAttributes.length; i < countI; i++) {
            const tripAttributes = tripsAttributes[i];
            errors.push(
                ...Trip.validateParams(tripAttributes, 'Trip')
            );
        }

        const visitedPlacesAttributes = dirtyParams.visitedPlaces !== undefined ? dirtyParams.visitedPlaces as { [key: string]: unknown }[] : [];
        for (let i = 0, countI = visitedPlacesAttributes.length; i < countI; i++) {
            const visitedPlaceAttributes = visitedPlacesAttributes[i];
            errors.push(
                ...VisitedPlace.validateParams(visitedPlaceAttributes, 'VisitedPlace')
            );
        }

        return errors;
    }
}
