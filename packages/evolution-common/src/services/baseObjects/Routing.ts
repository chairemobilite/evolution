/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Optional } from '../../types/Optional.type';
import { Uuidable, UuidableAttributes } from './Uuidable';
import { ConstructorUtils } from '../../utils/ConstructorUtils';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { Result, createErrors, createOk } from '../../types/Result.type';

export const routingModes = [
    'walking',
    'cycling',
    'driving',
    'transit'
];
export type RoutingModes = (typeof routingModes)[number];

export const routingStatuses = [
    'success',
    'noRoutingFound',
    'error'
];
export type RoutingStatus = (typeof routingStatuses)[number];

// TODO: complete
export const routingAttributes = [
    '_uuid',
    'arrivalDate',
    'departureDate',
    'arrivalTime',
    'departureTime',
    'calculatedOn',
    'mode',
    'status',
    'travelTimeS',
    'travelDistanceM'
];

export type RoutingAttributes = {
    arrivalDate?: Optional<string>; // string, YYYY-MM-DD
    departureDate?: Optional<string>; // string, YYYY-MM-DD
    arrivalTime?: Optional<number>; // seconds since midnight
    departureTime?: Optional<number>; // seconds since midnight
    calculatedOn?: Optional<number>; // unix epoch timestamp (in seconds)
    mode?: Optional<RoutingModes>;
    status?: Optional<RoutingStatus>;
    travelTimeS?: Optional<number>; // seconds
    travelDistanceM?: Optional<number>; // meters
    //route?: Optional<GENERICROUTE>; // TODO: create a generic route result
} & UuidableAttributes;

export type ExtendedRoutingAttributes = RoutingAttributes & { [key: string]: unknown };


/**
 * A routing is a calculated route for a trip or a segment of trip
 */
export class Routing {
    protected _attributes: RoutingAttributes;
    protected _customAttributes: { [key: string]: unknown };

    constructor(params: ExtendedRoutingAttributes, childRoutingAttributes: string[] = routingAttributes) {

        params._uuid = Uuidable.getUuid(params._uuid);

        this._attributes = {} as RoutingAttributes;
        this._customAttributes = {};

        const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(
            params,
            childRoutingAttributes
        );
        this._attributes = attributes;
        this._customAttributes = customAttributes;

    }

    get attributes(): RoutingAttributes {
        return this._attributes;
    }

    get customAttributes(): { [key: string]: unknown } {
        return this._customAttributes;
    }

    get _uuid(): Optional<string> {
        return this._attributes._uuid;
    }

    get arrivalDate(): Optional<string> {
        return this._attributes.arrivalDate;
    }

    set arrivalDate(value: Optional<string>) {
        this._attributes.arrivalDate = value;
    }

    get departureDate(): Optional<string> {
        return this._attributes.departureDate;
    }

    set departureDate(value: Optional<string>) {
        this._attributes.departureDate = value;
    }

    get arrivalTime(): Optional<number> {
        return this._attributes.arrivalTime;
    }

    set arrivalTime(value: Optional<number>) {
        this._attributes.arrivalTime = value;
    }

    get departureTime(): Optional<number> {
        return this._attributes.departureTime;
    }

    set departureTime(value: Optional<number>) {
        this._attributes.departureTime = value;
    }

    get calculatedOn(): Optional<number> {
        return this._attributes.calculatedOn;
    }

    set calculatedOn(value: Optional<number>) {
        this._attributes.calculatedOn = value;
    }

    get mode(): Optional<RoutingModes> {
        return this._attributes.mode;
    }

    set mode(value: Optional<RoutingModes>) {
        this._attributes.mode = value;
    }

    get status(): Optional<RoutingStatus> {
        return this._attributes.status;
    }

    set status(value: Optional<RoutingStatus>) {
        this._attributes.status = value;
    }

    get travelTimeS(): Optional<number> {
        return this._attributes.travelTimeS;
    }

    set travelTimeS(value: Optional<number>) {
        this._attributes.travelTimeS = value;
    }

    get travelDistanceM(): Optional<number> {
        return this._attributes.travelDistanceM;
    }

    set travelDistanceM(value: Optional<number>) {
        this._attributes.travelDistanceM = value;
    }

    /*get route(): Optional<GENERICROUTE> {
        return this._attributes.route;
    }

    set route(value: Optional<GENERICROUTE>) {
        this._attributes.route = value;
    }*/

    // params must be sanitized and must be valid:
    static unserialize(params: ExtendedRoutingAttributes): Routing {
        return new Routing(params);
    }

    /**
     * Factory that validates input from an interview and makes
     * sure types and required fields are valid before returning a new object
     * Custom attributes must be validated in each survey project
     * @param dirtyParams
     * @returns Routing | Error[]
     */
    static create(dirtyParams: { [key: string]: unknown }): Result<Routing> {
        const errors = Routing.validateParams(dirtyParams);
        const place = errors.length === 0 ? new Routing(dirtyParams) : undefined;
        if (errors.length > 0) {
            return createErrors(errors);
        }
        return createOk(place as Routing);
    }

    /**
     * Validates attributes types
     * @param dirtyParams The params input
     * @param displayName The name of the object to validate, for error display
     * @returns Error[]
     */
    static validateParams(dirtyParams: { [key: string]: unknown }, displayName = 'Routing'): Error[] {
        const errors: Error[] = [];

        // Validate params object:
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

        // Validate _uuid:
        errors.push(...Uuidable.validateParams(dirtyParams));

        // Validate arrivalDate:
        errors.push(...ParamsValidatorUtils.isDateString(
            'arrivalDate',
            dirtyParams.arrivalDate,
            displayName
        ));

        // Validate departureDate:
        errors.push(...ParamsValidatorUtils.isDateString(
            'departureDate',
            dirtyParams.departureDate,
            displayName
        ));

        // Validate arrivalTime:
        errors.push(...ParamsValidatorUtils.isPositiveInteger(
            'arrivalTime',
            dirtyParams.arrivalTime,
            displayName
        ));

        // Validate departureTime:
        errors.push(...ParamsValidatorUtils.isPositiveInteger(
            'departureTime',
            dirtyParams.departureTime,
            displayName
        ));

        // Validate calculatedOn:
        errors.push(...ParamsValidatorUtils.isPositiveInteger(
            'calculatedOn',
            dirtyParams.calculatedOn,
            displayName
        ));

        // Validate mode:
        errors.push(...ParamsValidatorUtils.isString(
            'mode',
            dirtyParams.mode,
            displayName
        ));

        // Validate status:
        errors.push(...ParamsValidatorUtils.isString(
            'status',
            dirtyParams.status,
            displayName
        ));

        // Validate travelTimeS:
        errors.push(...ParamsValidatorUtils.isPositiveInteger(
            'travelTimeS',
            dirtyParams.travelTimeS,
            displayName
        ));

        // Validate travelDistanceM:
        errors.push(...ParamsValidatorUtils.isPositiveInteger(
            'travelDistanceM',
            dirtyParams.travelDistanceM,
            displayName
        ));

        // Validate params object:
        // TODO: verify all attributes from the route object
        /*errors.push(...ParamsValidatorUtils.isObject(
            'route',
            dirtyParams.route,
            displayName
        ));*/

        return errors;
    }

}
