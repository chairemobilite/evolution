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
import * as VAttr from './attributeTypes/VehicleAttributes';
import { Result, createErrors, createOk } from '../../types/Result.type';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';

export const vehicleAttributes = [
    '_weights',
    '_isValid',
    '_uuid',
    'make',
    'model',
    'type',
    'capacitySeated',
    'capacityStanding',
    'modelYear',
    'isElectric',
    'isPluginHybrid',
    'isHybrid',
    'isHydrogen',
    'acquiredYear',
    'licensePlateNumber',
    'internalId'
];

export type VehicleAttributes = {
    make?: Optional<VAttr.Make>;
    model?: Optional<VAttr.Model>;
    type?: Optional<VAttr.VehicleType>;
    capacitySeated?: Optional<number>;
    capacityStanding?: Optional<number>;
    modelYear?: Optional<number>;
    isElectric?: Optional<boolean>; // 100% electric, no internal combustion engine
    isPluginHybrid?: Optional<boolean>; // has a small/medium-sized battery that can be plugged in and charged to give a small 100% electric autonomy
    isHybrid?: Optional<boolean>; // cannot be plugged in
    isHydrogen?: Optional<boolean>; // uses hydrogen as fuel, can be hybrid electric/hydrogen
    acquiredYear?: Optional<number>; // date of acquisition by the owner or the organization
    licensePlateNumber?: Optional<string>;
    internalId?: Optional<string>; // This is an internal number used by an organization or a company to identify the vehicle
} & UuidableAttributes & WeightableAttributes & ValidatebleAttributes;

export type ExtendedVehicleAttributes = VehicleAttributes & { [key: string]: unknown };

export class Vehicle implements IValidatable {
    private _attributes: VehicleAttributes;
    private _customAttributes: { [key: string]: unknown };

    static _confidentialAttributes = [
        'licensePlateNumber',
        'internalId'
    ];

    private _organizationUuid?: Optional<string>; // allow reverse lookup: must be filled by Organization.
    private _ownerUuid?: Optional<string>; // allow reverse lookup: must be filled by Person.

    constructor(params: ExtendedVehicleAttributes) {
        params._uuid = Uuidable.getUuid(params._uuid);

        this._attributes = {} as VehicleAttributes;
        this._customAttributes = {};

        for (const attribute in params) {
            if (vehicleAttributes.includes(attribute)) {
                this._attributes[attribute] = params[attribute];
            } else {
                this._customAttributes[attribute] = params[attribute];
            }
        }
    }

    get attributes(): VehicleAttributes {
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

    get make(): Optional<VAttr.Make> {
        return this._attributes.make;
    }

    set make(value: Optional<VAttr.Make>) {
        this._attributes.make = value;
    }

    get model(): Optional<VAttr.Model> {
        return this._attributes.model;
    }

    set model(value: Optional<VAttr.Model>) {
        this._attributes.model = value;
    }

    get type(): Optional<VAttr.VehicleType> {
        return this._attributes.type;
    }

    set type(value: Optional<VAttr.VehicleType>) {
        this._attributes.type = value;
    }

    get capacitySeated(): Optional<number> {
        return this._attributes.capacitySeated;
    }

    set capacitySeated(value: Optional<number>) {
        this._attributes.capacitySeated = value;
    }

    get capacityStanding(): Optional<number> {
        return this._attributes.capacityStanding;
    }

    set capacityStanding(value: Optional<number>) {
        this._attributes.capacityStanding = value;
    }

    get modelYear(): Optional<number> {
        return this._attributes.modelYear;
    }

    set modelYear(value: Optional<number>) {
        this._attributes.modelYear = value;
    }

    get isElectric(): Optional<boolean> {
        return this._attributes.isElectric;
    }

    set isElectric(value: Optional<boolean>) {
        this._attributes.isElectric = value;
    }

    get isPluginHybrid(): Optional<boolean> {
        return this._attributes.isPluginHybrid;
    }

    set isPluginHybrid(value: Optional<boolean>) {
        this._attributes.isPluginHybrid = value;
    }

    get isHybrid(): Optional<boolean> {
        return this._attributes.isHybrid;
    }

    set isHybrid(value: Optional<boolean>) {
        this._attributes.isHybrid = value;
    }

    get isHydrogen(): Optional<boolean> {
        return this._attributes.isHydrogen;
    }

    set isHydrogen(value: Optional<boolean>) {
        this._attributes.isHydrogen = value;
    }

    get acquiredYear(): Optional<number> {
        return this._attributes.acquiredYear;
    }

    set acquiredYear(value: Optional<number>) {
        this._attributes.acquiredYear = value;
    }

    get licensePlateNumber(): Optional<string> {
        return this._attributes.licensePlateNumber;
    }

    set licensePlateNumber(value: Optional<string>) {
        this._attributes.licensePlateNumber = value;
    }

    get internalId(): Optional<string> {
        return this._attributes.internalId;
    }

    set internalId(value: Optional<string>) {
        this._attributes.internalId = value;
    }

    get ownerUuid(): Optional<string> {
        return this._ownerUuid;
    }

    set ownerUuid(value: Optional<string>) {
        this._ownerUuid = value;
    }

    get organizationUuid(): Optional<string> {
        return this._organizationUuid;
    }

    set organizationUuid(value: Optional<string>) {
        this._organizationUuid = value;
    }

    static unserialize(params: ExtendedVehicleAttributes): Vehicle {
        return new Vehicle(params);
    }

    static create(dirtyParams: { [key: string]: unknown }): Result<Vehicle> {
        const errors = Vehicle.validateParams(dirtyParams);
        const vehicle = errors.length === 0 ? new Vehicle(dirtyParams) : undefined;
        if (errors.length > 0) {
            return createErrors(errors);
        }
        return createOk(vehicle as Vehicle);
    }

    validate(): Optional<boolean> {
        this._attributes._isValid = true;
        return true;
    }

    isValid(): Optional<boolean> {
        return this._isValid;
    }

    static validateParams(dirtyParams: { [key: string]: unknown }, displayName = 'Vehicle'): Error[] {
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
                'make',
                dirtyParams.make,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'model',
                dirtyParams.model,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'type',
                dirtyParams.type,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isPositiveInteger(
                'capacitySeated',
                dirtyParams.capacitySeated,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isPositiveInteger(
                'capacityStanding',
                dirtyParams.capacityStanding,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isPositiveInteger(
                'modelYear',
                dirtyParams.modelYear,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isBoolean(
                'isElectric',
                dirtyParams.isElectric,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isBoolean(
                'isPluginHybrid',
                dirtyParams.isPluginHybrid,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isBoolean(
                'isHybrid',
                dirtyParams.isHybrid,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isBoolean(
                'isHydrogen',
                dirtyParams.isHydrogen,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isPositiveInteger(
                'acquiredYear',
                dirtyParams.acquiredYear,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'licensePlateNumber',
                dirtyParams.licensePlateNumber,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'internalId',
                dirtyParams.internalId,
                displayName
            )
        );

        return errors;
    }
}
