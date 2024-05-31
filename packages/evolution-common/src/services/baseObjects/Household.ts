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
import { Person, PersonAttributes } from './Person';
import { Place, PlaceAttributes } from './Place';
import * as HAttr from './attributeTypes/HouseholdAttributes';
import { Result, createErrors, createOk } from '../../types/Result.type';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { ConstructorUtils } from '../../utils/ConstructorUtils';

/**
 * The Household class represents households with their members and attributes.
 * the members composed array includes Person objects.
 */

export const householdAttributes = [
    '_weights',
    '_isValid',
    '_uuid',
    'size',
    'carNumber',
    'twoWheelNumber',
    'pluginHybridCarNumber',
    'electricCarNumber',
    'category',
    'wouldLikeToParticipateToOtherSurveys',
    'homeCarParkings',
    'incomeLevel',
    'contactPhoneNumber',
    'contactEmail'
];

export const householdAttributesWithComposedAttributes = [
    ...householdAttributes,
    'members',
    //'vehicles',
    'home'
];

export type HouseholdAttributes = {
    size?: Optional<number>;
    carNumber?: Optional<number>;
    twoWheelNumber?: Optional<number>;
    pluginHybridCarNumber?: Optional<number>;
    electricCarNumber?: Optional<number>;
    category?: Optional<HAttr.HouseholdCategory>;
    wouldLikeToParticipateToOtherSurveys?: Optional<boolean>;
    homeCarParkings?: Optional<HAttr.HomePrivateCarParkingType[]>;
    incomeLevel?: Optional<HAttr.IncomeLevel>;
    contactPhoneNumber?: Optional<string>;
    contactEmail?: Optional<string>;
} & UuidableAttributes & WeightableAttributes & ValidatebleAttributes;

export type HouseholdWithComposedAttributes = HouseholdAttributes & {
    members?: Optional<PersonAttributes[]>;
    //vehicles?: Optional<VehicleAttributes[]>;
    home?: Optional<PlaceAttributes>;
};

export type ExtendedHouseholdAttributes = HouseholdWithComposedAttributes & { [key: string]: unknown };

export class Household implements IValidatable {
    private _attributes: HouseholdAttributes;
    private _customAttributes: { [key: string]: unknown };

    private _members?: Optional<Person[]>;
    private _home?: Optional<Place<PlaceAttributes>>;
    //private _vehicles?: Optional<Vehicle[]>;

    static _confidentialAttributes = [
        'contactPhoneNumber',
        'contactEmail'
    ];

    constructor(params: ExtendedHouseholdAttributes) {
        params._uuid = Uuidable.getUuid(params._uuid);

        this._attributes = {} as HouseholdAttributes;
        this._customAttributes = {};

        const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(
            params,
            householdAttributes,
            householdAttributesWithComposedAttributes
        );
        this._attributes = attributes;
        this._customAttributes = customAttributes;

        this.members = ConstructorUtils.initializeComposedArrayAttributes(
            params.members,
            Person.unserialize
        );

        /*this.vehicles = ConstructorUtils.initializeComposedArrayAttributes(
            params.vehicles,
            Vehicle.unserialize
        );*/

        this.home = ConstructorUtils.initializeComposedAttribute(
            params.home,
            Place.unserialize
        );
    }

    get attributes(): HouseholdAttributes {
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

    get category(): Optional<HAttr.HouseholdCategory> {
        return this._attributes.category;
    }

    set category(value: Optional<HAttr.HouseholdCategory>) {
        this._attributes.category = value;
    }

    get wouldLikeToParticipateToOtherSurveys(): Optional<boolean> {
        return this._attributes.wouldLikeToParticipateToOtherSurveys;
    }

    set wouldLikeToParticipateToOtherSurveys(value: Optional<boolean>) {
        this._attributes.wouldLikeToParticipateToOtherSurveys = value;
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

    get members(): Optional<Person[]> {
        return this._members;
    }

    set members(value: Optional<Person[]>) {
        this._members = value;
    }

    /*get vehicles(): Optional<Vehicle[]> {
        return this._vehicles;
    }

    set vehicles(value: Optional<Vehicle[]>) {
        this._vehicles = value;
    }*/

    get home(): Optional<Place<PlaceAttributes>> {
        return this._home;
    }

    set home(value: Optional<Place<PlaceAttributes>>) {
        this._home = value;
    }

    static unserialize(params: HouseholdWithComposedAttributes): Household {
        return new Household(params);
    }

    static create(dirtyParams: { [key: string]: unknown }): Result<Household> {
        const errors = Household.validateParams(dirtyParams);
        const household = errors.length === 0 ? new Household(dirtyParams) : undefined;
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
            ...ParamsValidatorUtils.isPositiveInteger(
                'size',
                dirtyParams.size,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isPositiveInteger(
                'carNumber',
                dirtyParams.carNumber,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isPositiveInteger(
                'twoWheelNumber',
                dirtyParams.twoWheelNumber,
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
            ...ParamsValidatorUtils.isPositiveInteger(
                'electricCarNumber',
                dirtyParams.electricCarNumber,
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
                'wouldLikeToParticipateToOtherSurveys',
                dirtyParams.wouldLikeToParticipateToOtherSurveys,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isArrayOfStrings(
                'homeCarParkings',
                dirtyParams.homeCarParkings,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'incomeLevel',
                dirtyParams.incomeLevel,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'contactPhoneNumber',
                dirtyParams.contactPhoneNumber,
                displayName
            )
        );

        errors.push(
            ...ParamsValidatorUtils.isString(
                'contactEmail',
                dirtyParams.contactEmail,
                displayName
            )
        );

        const membersAttributes = dirtyParams.members !== undefined ? dirtyParams.members as { [key: string]: unknown }[] : [];
        for (let i = 0, countI = membersAttributes.length; i < countI; i++) {
            const memberAttributes = membersAttributes[i];
            errors.push(
                ...Person.validateParams(memberAttributes, `Person ${i}`)
            );
        }

        /*const vehiclesAttributes = dirtyParams.vehicles !== undefined ? dirtyParams.vehicles as { [key: string]: unknown }[] : [];
        for (let i = 0, countI = vehiclesAttributes.length; i < countI; i++) {
            const vehicleAttributes = vehiclesAttributes[i];
            errors.push(
                ...Vehicle.validateParams(vehicleAttributes, 'Vehicle')
            );
        }*/

        const homeAttributes = dirtyParams.home !== undefined ? dirtyParams.home as { [key: string]: unknown } : {};
        errors.push(
            ...Place.validateParams(homeAttributes, 'Home')
        );

        return errors;
    }
}
