/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Optional } from '../../types/Optional.type';
import { IValidatable } from './IValidatable';
import { Place, PlaceAttributes, placeAttributes } from './Place';
import * as VPAttr from './attributeTypes/VisitedPlaceAttributes';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { Result, createErrors, createOk } from '../../types/Result.type';

export const visitedPlaceAttributes = [
    ...placeAttributes,
    'startDate',
    'endDate',
    'startTime',
    'endTime',
    'activity',
    'activityCategory'
];

export type VisitedPlaceAttributes = {
    startDate?: Optional<string>;
    endDate?: Optional<string>;
    startTime?: Optional<number>;
    endTime?: Optional<number>;
    activity?: Optional<VPAttr.Activity>;
    activityCategory?: Optional<VPAttr.ActivityCategory>;
} & PlaceAttributes;

export type ExtendedVisitedPlaceAttributes = VisitedPlaceAttributes & { [key: string]: unknown };

export class VisitedPlace extends Place<VisitedPlaceAttributes> implements IValidatable {
    private _journeyUuid?: Optional<string>;

    static _confidentialAttributes = [];

    constructor(params: ExtendedVisitedPlaceAttributes) {
        super(params, visitedPlaceAttributes);
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

    get activity(): Optional<VPAttr.Activity> {
        return this._attributes.activity;
    }

    set activity(value: Optional<VPAttr.Activity>) {
        this._attributes.activity = value;
    }

    get activityCategory(): Optional<VPAttr.ActivityCategory> {
        return this._attributes.activityCategory;
    }

    set activityCategory(value: Optional<VPAttr.ActivityCategory>) {
        this._attributes.activityCategory = value;
    }

    get journeyUuid(): Optional<string> {
        return this._journeyUuid;
    }

    set journeyUuid(value: Optional<string>) {
        this._journeyUuid = value;
    }

    static unserialize(params: ExtendedVisitedPlaceAttributes): VisitedPlace {
        return new VisitedPlace(params);
    }

    static create(dirtyParams: { [key: string]: unknown }): Result<VisitedPlace> {
        const errors = VisitedPlace.validateParams(dirtyParams);
        const visitedPlace = errors.length === 0 ? new VisitedPlace(dirtyParams) : undefined;
        if (errors.length > 0) {
            return createErrors(errors);
        }
        return createOk(visitedPlace as VisitedPlace);
    }

    validate(): Optional<boolean> {
        this._attributes._isValid = true;
        return true;
    }

    isValid(): Optional<boolean> {
        return this._isValid;
    }

    static validateParams(dirtyParams: { [key: string]: unknown }, displayName = 'VisitedPlace'): Error[] {
        const errors: Error[] = [];

        errors.push(...Place.validateParams(dirtyParams, displayName));

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
                'activity',
                dirtyParams.activity,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'activityCategory',
                dirtyParams.activityCategory,
                displayName
            )
        );

        return errors;
    }
}

