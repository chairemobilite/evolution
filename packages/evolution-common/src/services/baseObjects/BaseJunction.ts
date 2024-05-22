/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * A junction is a place used to transfer between segments/modes by a person during a trip
 * Usually, junctions are used as origin and/or destination for segments
 * Junctions are optional in most surveys
 */

import { Optional } from '../../types/Optional.type';
import { Uuidable } from './Uuidable';
import { IValidatable } from './IValidatable';
import { BasePlace, BasePlaceAttributes } from './BasePlace';
import { BaseAddressAttributes } from './BaseAddress';
import { ExcludeFunctionPropertyNames } from '../../utils/TypeUtils';
import { parseDate } from '../../utils/DateUtils';
import { UuidableAttributes } from './Uuidable';

export type BaseJunctionAttributes = ExcludeFunctionPropertyNames<BaseJunction> & UuidableAttributes;
export type ExtendedJunctionAttributes = BaseJunctionAttributes & { [key: string]: unknown };

export class BaseJunction extends Uuidable implements IValidatable {
    _isValid?: Optional<boolean>;

    basePlace?: BasePlace;

    arrivalDate?: Optional<string>; // string, YYYY-MM-DD
    departureDate?: Optional<string>; // string, YYYY-MM-DD
    arrivalTime?: Optional<number>; // seconds since midnight
    departureTime?: Optional<number>; // seconds since midnight

    static _confidentialAttributes: string[] = [
        // these attributes should be hidden when exporting
    ];

    constructor(params: (BaseJunctionAttributes | ExtendedJunctionAttributes) & { basePlace: BasePlace }) {
        super(params._uuid);

        this._isValid = undefined;

        this.basePlace = params.basePlace;
        this.arrivalDate = params.arrivalDate;
        this.departureDate = params.departureDate;
        this.arrivalTime = params.arrivalTime;
        this.departureTime = params.departureTime;
    }

    // params must be sanitized and must be valid:
    static unserialize(
        params: BaseJunctionAttributes & { basePlace: BasePlaceAttributes & { address?: Optional<BaseAddressAttributes> } }
    ): BaseJunction {
        return new BaseJunction({ ...params, basePlace: BasePlace.unserialize(params.basePlace) });
    }

    validate(): Optional<boolean> {
        // TODO: implement:
        this._isValid = true;
        return true;
    }

    isValid(): Optional<boolean> {
        return this._isValid;
    }

    /**
     * Factory that validates input from an interview and makes
     * sure types and required fields are valid before returning a new object
     * @param dirtyParams
     * @returns BaseJunction | Error[]
     */
    static create(dirtyParams: { [key: string]: any }): BaseJunction | Error[] {
        const basePlaceParams = {
            ...dirtyParams,
            geography: dirtyParams.geography,
            geocodingQueryString: dirtyParams.geography?.properties?.geocodingQueryString,
            lastAction: dirtyParams.geography?.properties?.lastAction,
            deviceUsed: dirtyParams.geography?.properties?.platform,
            zoom: dirtyParams.geography?.properties?.zoom
        };

        // validate params for both baseJunction and basePlace:
        const errors = [...BasePlace.validateParams(basePlaceParams), ...BaseJunction.validateParams(dirtyParams)];
        if (errors.length > 0) {
            return errors;
        } else {
            const basePlace = BasePlace.create(basePlaceParams) as BasePlace;
            const baseJunction = new BaseJunction({
                basePlace,
                ...dirtyParams
            } as ExtendedJunctionAttributes & { basePlace: BasePlace });
            return baseJunction;
        }
    }

    /**
     * Validates attributes types for BaseJunction
     * @param dirtyParams The params input
     * @returns Error[] TODO: specialize this error class
     */
    static validateParams(dirtyParams: { [key: string]: any }): Error[] {
        const errors: Error[] = [];

        const arrivalDateObj = parseDate(dirtyParams.arrivalDate);
        const departureDateObj = parseDate(dirtyParams.departureDate);

        // Validate params object:
        if (!dirtyParams || typeof dirtyParams !== 'object') {
            errors.push(new Error('BaseJunction validateParams: params is undefined or invalid'));
            return errors; // stop now otherwise it will crash because params are not valid
        }

        // Validate uuid:
        const uuidErrors = Uuidable.validateParams(dirtyParams);
        if (uuidErrors.length > 0) {
            errors.push(...uuidErrors);
        }

        // Validate base place:
        if (dirtyParams.basePlace !== undefined) {
            const basePlaceErrors = BasePlace.validateParams(dirtyParams.basePlace);
            if (basePlaceErrors.length > 0) {
                errors.push(...basePlaceErrors);
            }
        }

        // Validate arrivalDate (if provided):
        if (
            dirtyParams.arrivalDate !== undefined &&
            (!(arrivalDateObj instanceof Date) || (arrivalDateObj !== undefined && isNaN(arrivalDateObj.getDate())))
        ) {
            errors.push(new Error('BaseJunction validateParams: arrivalDate should be a valid date string'));
        }

        // Validate departureDate (if provided):
        if (
            dirtyParams.departureDate !== undefined &&
            (!(departureDateObj instanceof Date) ||
                (departureDateObj !== undefined && isNaN(departureDateObj.getDate())))
        ) {
            errors.push(new Error('BaseJunction validateParams: departureDate should be a valid date string'));
        }

        // Validate arrivalTime (if provided):
        if (
            dirtyParams.arrivalTime !== undefined &&
            (!Number.isInteger(dirtyParams.arrivalTime) || dirtyParams.arrivalTime < 0)
        ) {
            errors.push(new Error('BaseJunction validateParams: arrivalTime should be a positive integer'));
        }

        // Validate departureTime (if provided):
        if (
            dirtyParams.departureTime !== undefined &&
            (!Number.isInteger(dirtyParams.departureTime) || dirtyParams.departureTime < 0)
        ) {
            errors.push(new Error('BaseJunction validateParams: departureTime should be a positive integer'));
        }

        return errors;
    }
}
