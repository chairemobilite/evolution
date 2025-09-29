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
import { Person, ExtendedPersonAttributes, SerializedExtendedPersonAttributes } from './Person';
import * as HAttr from './attributeTypes/HouseholdAttributes';
import { Result, createErrors, createOk } from '../../types/Result.type';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { ConstructorUtils } from '../../utils/ConstructorUtils';
import { Vehicle, ExtendedVehicleAttributes, SerializedExtendedVehicleAttributes } from './Vehicle';
import { SurveyObjectUnserializer } from './SurveyObjectUnserializer';
import { SurveyObjectsRegistry } from './SurveyObjectsRegistry';
import { Home } from './Home';
import { Interview } from './interview/Interview';

export const householdAttributes = [
    '_weights',
    '_isValid',
    '_uuid',
    'size',
    'carNumber',
    'twoWheelNumber',
    'bicycleNumber',
    'electricBicycleNumber',
    'pluginHybridCarNumber',
    'electricCarNumber',
    'hybridCarNumber',
    'category',
    'homeCarParkings',
    'incomeLevel',
    'homeOwnership',
    'contactPhoneNumber',
    'contactEmail',
    'atLeastOnePersonWithDisability'
];

export const householdAttributesWithComposedAttributes = [...householdAttributes, '_members', '_vehicles'];

export type HouseholdAttributes = {
    size?: Optional<number>;
    carNumber?: Optional<number>;
    twoWheelNumber?: Optional<number>;
    bicycleNumber?: Optional<number>;
    electricBicycleNumber?: Optional<number>;
    pluginHybridCarNumber?: Optional<number>;
    electricCarNumber?: Optional<number>;
    hybridCarNumber?: Optional<number>;
    category?: Optional<HAttr.HouseholdCategory>;
    homeCarParkings?: Optional<HAttr.HomePrivateCarParkingType[]>;
    incomeLevel?: Optional<HAttr.IncomeLevel>;
    homeOwnership?: Optional<HAttr.HomeOwnership>;
    contactPhoneNumber?: Optional<string>;
    contactEmail?: Optional<string>;
    atLeastOnePersonWithDisability?: Optional<string>;
} & UuidableAttributes &
    WeightableAttributes &
    ValidatebleAttributes;

export type HouseholdWithComposedAttributes = HouseholdAttributes & {
    _members?: Optional<ExtendedPersonAttributes[]>;
    _vehicles?: Optional<ExtendedVehicleAttributes[]>;
};

export type ExtendedHouseholdAttributes = HouseholdWithComposedAttributes & { [key: string]: unknown };

export type SerializedExtendedHouseholdAttributes = {
    _attributes?: ExtendedHouseholdAttributes;
    _customAttributes?: { [key: string]: unknown };
    _members?: Optional<SerializedExtendedPersonAttributes[]>;
    _vehicles?: Optional<SerializedExtendedVehicleAttributes[]>;
};

/**
 * The Household class represents households with their members and attributes.
 * the members composed array includes Person objects.
 * uuid for the household must be equal to the uuid of the interview
 */
export class Household extends Uuidable implements IValidatable {
    private _surveyObjectsRegistry: SurveyObjectsRegistry;
    private _attributes: HouseholdAttributes;
    private _customAttributes: { [key: string]: unknown };

    private _members?: Optional<Person[]>;
    private _vehicles?: Optional<Vehicle[]>;

    private _homeUuid?: Optional<string>; // allow reverse lookup
    private _interviewUuid?: Optional<string>; // allow reverse lookup

    static _confidentialAttributes = ['contactPhoneNumber', 'contactEmail'];

    constructor(params: ExtendedHouseholdAttributes, surveyObjectsRegistry: SurveyObjectsRegistry) {
        super(params._uuid);

        this._surveyObjectsRegistry = surveyObjectsRegistry;

        this._attributes = {} as HouseholdAttributes;
        this._customAttributes = {};

        const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(
            _omit(params, ['_members', '_vehicles', 'members', 'vehicles', '_homeUuid', '_interviewUuid']),
            householdAttributes,
            householdAttributesWithComposedAttributes
        );
        this._attributes = attributes;
        this._customAttributes = customAttributes;

        this.members = ConstructorUtils.initializeComposedArrayAttributes(
            params._members,
            (params) => Person.unserialize(params, this._surveyObjectsRegistry),
            this._surveyObjectsRegistry
        );
        this.vehicles = ConstructorUtils.initializeComposedArrayAttributes(
            params._vehicles,
            (params) => Vehicle.unserialize(params, this._surveyObjectsRegistry),
            this._surveyObjectsRegistry
        );
        this.homeUuid = params._homeUuid as Optional<string>;
        this.interviewUuid = params._interviewUuid as Optional<string>;

        this._surveyObjectsRegistry.registerHousehold(this);
    }

    get attributes(): HouseholdAttributes {
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

    get size(): Optional<number> {
        return this._attributes.size;
    }

    set size(value: Optional<number>) {
        this._attributes.size = value;
    }

    get carNumber(): Optional<number> {
        return this._attributes.carNumber;
    }

    set carNumber(value: Optional<number>) {
        this._attributes.carNumber = value;
    }

    get twoWheelNumber(): Optional<number> {
        return this._attributes.twoWheelNumber;
    }

    set twoWheelNumber(value: Optional<number>) {
        this._attributes.twoWheelNumber = value;
    }

    get bicycleNumber(): Optional<number> {
        return this._attributes.bicycleNumber;
    }

    set bicycleNumber(value: Optional<number>) {
        this._attributes.bicycleNumber = value;
    }

    get electricBicycleNumber(): Optional<number> {
        return this._attributes.electricBicycleNumber;
    }

    set electricBicycleNumber(value: Optional<number>) {
        this._attributes.electricBicycleNumber = value;
    }

    get pluginHybridCarNumber(): Optional<number> {
        return this._attributes.pluginHybridCarNumber;
    }

    set pluginHybridCarNumber(value: Optional<number>) {
        this._attributes.pluginHybridCarNumber = value;
    }

    get electricCarNumber(): Optional<number> {
        return this._attributes.electricCarNumber;
    }

    set electricCarNumber(value: Optional<number>) {
        this._attributes.electricCarNumber = value;
    }

    get hybridCarNumber(): Optional<number> {
        return this._attributes.hybridCarNumber;
    }

    set hybridCarNumber(value: Optional<number>) {
        this._attributes.hybridCarNumber = value;
    }

    get category(): Optional<HAttr.HouseholdCategory> {
        return this._attributes.category;
    }

    set category(value: Optional<HAttr.HouseholdCategory>) {
        this._attributes.category = value;
    }

    get homeCarParkings(): Optional<HAttr.HomePrivateCarParkingType[]> {
        return this._attributes.homeCarParkings;
    }

    set homeCarParkings(value: Optional<HAttr.HomePrivateCarParkingType[]>) {
        this._attributes.homeCarParkings = value;
    }

    get incomeLevel(): Optional<HAttr.IncomeLevel> {
        return this._attributes.incomeLevel;
    }

    set incomeLevel(value: Optional<HAttr.IncomeLevel>) {
        this._attributes.incomeLevel = value;
    }

    get homeOwnership(): Optional<HAttr.HomeOwnership> {
        return this._attributes.homeOwnership;
    }

    set homeOwnership(value: Optional<HAttr.HomeOwnership>) {
        this._attributes.homeOwnership = value;
    }

    get contactPhoneNumber(): Optional<string> {
        return this._attributes.contactPhoneNumber;
    }

    set contactPhoneNumber(value: Optional<string>) {
        this._attributes.contactPhoneNumber = value;
    }

    get contactEmail(): Optional<string> {
        return this._attributes.contactEmail;
    }

    set contactEmail(value: Optional<string>) {
        this._attributes.contactEmail = value;
    }

    get atLeastOnePersonWithDisability(): Optional<string> {
        return this._attributes.atLeastOnePersonWithDisability;
    }

    set atLeastOnePersonWithDisability(value: Optional<string>) {
        this._attributes.atLeastOnePersonWithDisability = value;
    }

    get members(): Optional<Person[]> {
        return this._members;
    }

    set members(value: Optional<Person[]>) {
        this._members = value;
    }

    get vehicles(): Optional<Vehicle[]> {
        return this._vehicles;
    }

    set vehicles(value: Optional<Vehicle[]>) {
        this._vehicles = value;
    }

    get homeUuid(): Optional<string> {
        return this._homeUuid;
    }

    set homeUuid(value: Optional<string>) {
        this._homeUuid = value;
    }

    get home(): Optional<Home> {
        if (!this._homeUuid) {
            return undefined;
        }
        return this._surveyObjectsRegistry.getPlace(this._homeUuid) as Home;
    }

    get interviewUuid(): Optional<string> {
        return this._interviewUuid;
    }

    set interviewUuid(value: Optional<string>) {
        this._interviewUuid = value;
    }

    get interview(): Optional<Interview> {
        if (!this._interviewUuid) {
            return undefined;
        }
        return this._surveyObjectsRegistry.getInterview(this._interviewUuid);
    }

    /**
     * Creates a Household object from sanitized parameters
     * @param {ExtendedHouseholdAttributes | SerializedExtendedHouseholdAttributes} params - Sanitized household parameters
     * @returns {Household} New Household instance
     */
    static unserialize(
        params: ExtendedHouseholdAttributes | SerializedExtendedHouseholdAttributes,
        surveyObjectsRegistry: SurveyObjectsRegistry
    ): Household {
        const flattenedParams = SurveyObjectUnserializer.flattenSerializedData(params);
        return new Household(flattenedParams as ExtendedHouseholdAttributes, surveyObjectsRegistry);
    }

    static create(
        dirtyParams: { [key: string]: unknown },
        surveyObjectsRegistry: SurveyObjectsRegistry
    ): Result<Household> {
        const errors = Household.validateParams(dirtyParams);
        const household = errors.length === 0 ? new Household(dirtyParams, surveyObjectsRegistry) : undefined;
        if (errors.length > 0) {
            return createErrors(errors);
        }
        return createOk(household as Household);
    }

    validate(): Optional<boolean> {
        this._attributes._isValid = true;
        return true;
    }

    isValid(): Optional<boolean> {
        return this._isValid;
    }

    static validateParams(dirtyParams: { [key: string]: unknown }, displayName = 'Household'): Error[] {
        const errors: Error[] = [];

        errors.push(...ParamsValidatorUtils.isRequired('params', dirtyParams, displayName));
        errors.push(...ParamsValidatorUtils.isObject('params', dirtyParams, displayName));

        errors.push(...Uuidable.validateParams(dirtyParams));

        errors.push(...ParamsValidatorUtils.isBoolean('_isValid', dirtyParams._isValid, displayName));

        errors.push(...validateWeights(dirtyParams._weights as Optional<Weight[]>));

        errors.push(...ParamsValidatorUtils.isPositiveInteger('size', dirtyParams.size, displayName));

        errors.push(...ParamsValidatorUtils.isPositiveInteger('carNumber', dirtyParams.carNumber, displayName));

        errors.push(
            ...ParamsValidatorUtils.isPositiveInteger('twoWheelNumber', dirtyParams.twoWheelNumber, displayName)
        );

        errors.push(...ParamsValidatorUtils.isPositiveInteger('bicycleNumber', dirtyParams.bicycleNumber, displayName));

        errors.push(
            ...ParamsValidatorUtils.isPositiveInteger(
                'electricBicycleNumber',
                dirtyParams.electricBicycleNumber,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isPositiveInteger(
                'pluginHybridCarNumber',
                dirtyParams.pluginHybridCarNumber,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isPositiveInteger('electricCarNumber', dirtyParams.electricCarNumber, displayName)
        );

        errors.push(
            ...ParamsValidatorUtils.isPositiveInteger('hybridCarNumber', dirtyParams.hybridCarNumber, displayName)
        );

        errors.push(...ParamsValidatorUtils.isString('category', dirtyParams.category, displayName));

        errors.push(
            ...ParamsValidatorUtils.isArrayOfStrings('homeCarParkings', dirtyParams.homeCarParkings, displayName)
        );

        errors.push(...ParamsValidatorUtils.isString('incomeLevel', dirtyParams.incomeLevel, displayName));

        errors.push(...ParamsValidatorUtils.isString('homeOwnership', dirtyParams.homeOwnership, displayName));

        errors.push(
            ...ParamsValidatorUtils.isString('contactPhoneNumber', dirtyParams.contactPhoneNumber, displayName)
        );

        errors.push(...ParamsValidatorUtils.isString('contactEmail', dirtyParams.contactEmail, displayName));

        errors.push(
            ...ParamsValidatorUtils.isString(
                'atLeastOnePersonWithDisability',
                dirtyParams.atLeastOnePersonWithDisability,
                displayName
            )
        );

        const membersAttributes =
            dirtyParams._members !== undefined ? (dirtyParams._members as { [key: string]: unknown }[]) : [];
        for (let i = 0, countI = membersAttributes.length; i < countI; i++) {
            const memberAttributes = membersAttributes[i];
            errors.push(...Person.validateParams(memberAttributes, `Person ${i}`));
        }

        const vehiclesAttributes =
            dirtyParams._vehicles !== undefined ? (dirtyParams._vehicles as { [key: string]: unknown }[]) : [];
        for (let i = 0, countI = vehiclesAttributes.length; i < countI; i++) {
            const vehicleAttributes = vehiclesAttributes[i];
            errors.push(...Vehicle.validateParams(vehicleAttributes, `Vehicle ${i}`));
        }

        errors.push(...ParamsValidatorUtils.isUuid('_homeUuid', dirtyParams._homeUuid, displayName));
        errors.push(...ParamsValidatorUtils.isUuid('_interviewUuid', dirtyParams._interviewUuid, displayName));

        return errors;
    }
}
