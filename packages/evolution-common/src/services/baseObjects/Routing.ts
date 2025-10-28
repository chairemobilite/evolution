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
import { SurveyObjectUnserializer } from './SurveyObjectUnserializer';
import { SurveyObjectsRegistry } from './SurveyObjectsRegistry';

export const routingModes = ['walking', 'cycling', 'driving', 'transit'];
export type RoutingModes = (typeof routingModes)[number];

export const routingStatuses = ['success', 'noRoutingFound', 'error'];
export type RoutingStatus = (typeof routingStatuses)[number];

// TODO: complete
export const routingAttributes = [
    '_uuid',
    'endDate',
    'startDate',
    'endTime',
    'startTime',
    'calculatedOn',
    'mode',
    'status',
    'travelTimeS',
    'travelDistanceM'
];

export type RoutingAttributes = {
    endDate?: Optional<string>; // string, YYYY-MM-DD
    startDate?: Optional<string>; // string, YYYY-MM-DD
    endTime?: Optional<number>; // seconds since midnight
    startTime?: Optional<number>; // seconds since midnight
    calculatedOn?: Optional<number>; // unix epoch timestamp (in seconds)
    mode?: Optional<RoutingModes>;
    status?: Optional<RoutingStatus>;
    travelTimeS?: Optional<number>; // seconds
    travelDistanceM?: Optional<number>; // meters
    //route?: Optional<GENERICROUTE>; // TODO: create a generic route result
} & UuidableAttributes;

export type ExtendedRoutingAttributes = RoutingAttributes & { [key: string]: unknown };

export type SerializedExtendedRoutingAttributes = {
    _attributes?: ExtendedRoutingAttributes;
    _customAttributes?: { [key: string]: unknown };
};

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

        const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(params, childRoutingAttributes);
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

    get endDate(): Optional<string> {
        return this._attributes.endDate;
    }

    set endDate(value: Optional<string>) {
        this._attributes.endDate = value;
    }

    get startDate(): Optional<string> {
        return this._attributes.startDate;
    }

    set startDate(value: Optional<string>) {
        this._attributes.startDate = value;
    }

    get endTime(): Optional<number> {
        return this._attributes.endTime;
    }

    set endTime(value: Optional<number>) {
        this._attributes.endTime = value;
    }

    get startTime(): Optional<number> {
        return this._attributes.startTime;
    }

    set startTime(value: Optional<number>) {
        this._attributes.startTime = value;
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

    /**
     * Creates a Routing object from sanitized parameters
     * @param {ExtendedRoutingAttributes | SerializedExtendedRoutingAttributes} params - Sanitized routing parameters
     * @param {SurveyObjectsRegistry} _surveyObjectsRegistry - unused since Routing is not composed of other objects, but unserializer will send the optional param.
     * @returns {Routing} New Routing instance
     */
    static unserialize(
        params: ExtendedRoutingAttributes | SerializedExtendedRoutingAttributes,
        _surveyObjectsRegistry: SurveyObjectsRegistry
    ): Routing {
        const flattenedParams = SurveyObjectUnserializer.flattenSerializedData(params);
        return new Routing(flattenedParams);
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
        errors.push(...ParamsValidatorUtils.isRequired('params', dirtyParams, displayName));
        errors.push(...ParamsValidatorUtils.isRecord('params', dirtyParams, displayName));

        // Validate _uuid:
        errors.push(...Uuidable.validateParams(dirtyParams));

        // Validate endDate:
        errors.push(...ParamsValidatorUtils.isDateString('endDate', dirtyParams.endDate, displayName));

        // Validate startDate:
        errors.push(...ParamsValidatorUtils.isDateString('startDate', dirtyParams.startDate, displayName));

        // Validate endTime:
        errors.push(...ParamsValidatorUtils.isPositiveInteger('endTime', dirtyParams.endTime, displayName));

        // Validate startTime:
        errors.push(...ParamsValidatorUtils.isPositiveInteger('startTime', dirtyParams.startTime, displayName));

        // Validate calculatedOn:
        errors.push(...ParamsValidatorUtils.isPositiveInteger('calculatedOn', dirtyParams.calculatedOn, displayName));

        // Validate mode:
        errors.push(...ParamsValidatorUtils.isString('mode', dirtyParams.mode, displayName));

        // Validate status:
        errors.push(...ParamsValidatorUtils.isString('status', dirtyParams.status, displayName));

        // Validate travelTimeS:
        errors.push(...ParamsValidatorUtils.isPositiveInteger('travelTimeS', dirtyParams.travelTimeS, displayName));

        // Validate travelDistanceM:
        errors.push(
            ...ParamsValidatorUtils.isPositiveInteger('travelDistanceM', dirtyParams.travelDistanceM, displayName)
        );

        // Validate params object:
        // TODO: verify all attributes from the route object
        /*errors.push(...ParamsValidatorUtils.isRecord(
            'route',
            dirtyParams.route,
            displayName
        ));*/

        return errors;
    }
}
