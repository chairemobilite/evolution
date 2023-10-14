/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { OptionalValidity, IValidatable } from './Validatable';
import { BasePerson } from './BasePerson';
import { BasePlace } from './BasePlace';
import { Weightable, Weight, validateWeights } from './Weight';
import * as HAttr from './attributeTypes/HouseholdAttributes';
import { Uuidable } from './Uuidable';
import { Vehicleable } from './Vehicleable';
import { BaseVehicle } from './BaseVehicle';


type BaseHouseholdAttributes = {

    _uuid?: string;

    baseMembers?: BasePerson[];
    baseHome?: BasePlace;

    size?: number;
    carNumber?: number;
    twoWheelNumber?: number;
    pluginHybridCarNumber?: number;
    electricCarNumber?: number;
    category?: HAttr.HouseholdCategory;
    wouldLikeToParticipateToOtherSurveys?: boolean;
    homeCarParkings?: HAttr.HomePrivateCarParkingType[];

    // must be anonymized:
    contactPhoneNumber?: string; // TODO: normalize and/or validate phone numbers
    contactEmail?: string;

} & Weightable & Vehicleable;

type ExtendedHouseholdAttributes = BaseHouseholdAttributes & { [key: string]: any };

class BaseHousehold extends Uuidable implements IValidatable {

    _isValid: OptionalValidity;
    _weights?: Weight[];

    baseMembers?: BasePerson[];
    baseHome?: BasePlace;

    baseVehicles?: BaseVehicle[];

    /**
     * Here it would be better to just calculate from household members,
     * but in most surveys, we first ask the respondent for the household
     * size and then we create the persons using this value. However, in the
     * questionnaire, it is often possible to increase the number of persons
     * after having declared the household size at the beginning. So the size
     * attribute and the persons array must be checked for consistency.
     * See documentation (baseObjectsDoc.md) for more details.
     */
    size?: number;
    carNumber?: number;
    twoWheelNumber?: number;
    pluginHybridCarNumber?: number;
    electricCarNumber?: number;
    category?: HAttr.HouseholdCategory;
    wouldLikeToParticipateToOtherSurveys?: boolean;
    homeCarParkings?: HAttr.HomePrivateCarParkingType[];

    // must be anonymized:
    contactPhoneNumber?: string;
    contactEmail?: string;

    _confidentialAttributes : string[] = [ // these attributes should be hidden when exporting
        'contactPhoneNumber',
        'contactEmail',
    ];

    /**
     * TODO: make the constructor protected for all surveyed classes.
     * Only the factory create method should be able to generate a valid object
     * */
    constructor(params: BaseHouseholdAttributes | ExtendedHouseholdAttributes) {

        super(params._uuid);

        this._isValid = undefined;
        this._weights = params._weights;

        this.baseMembers = params.baseMembers || [];
        this.baseHome = params.baseHome;

        this.baseVehicles = params.baseVehicles || [];

        this.size = params.size;
        this.carNumber = params.carNumber;
        this.twoWheelNumber = params.twoWheelNumber;
        this.pluginHybridCarNumber = params.pluginHybridCarNumber;
        this.electricCarNumber = params.electricCarNumber;
        this.category = params.category;
        this.wouldLikeToParticipateToOtherSurveys = params.wouldLikeToParticipateToOtherSurveys;
        this.homeCarParkings = params.homeCarParkings;
        this.contactPhoneNumber = params.contactPhoneNumber;
        this.contactEmail = params.contactEmail;

    }

    validate(): OptionalValidity {
        // TODO: implement:
        this._isValid = true;
        return true;
    }

    isValid(): OptionalValidity {
        return this._isValid;
    }

    /**
     * Factory that validates input from an interview and makes
     * sure types and required fields are valid before returning a new object
     * @param dirtyParams
     * @returns BaseHousehold | Error[]
     */
    static create(dirtyParams: { [key: string]: any }): BaseHousehold | Error[] {
        const errors = BaseHousehold.validateParams(dirtyParams);
        return errors.length > 0 ? errors : new BaseHousehold(dirtyParams as ExtendedHouseholdAttributes);
    }

    /**
     * validates attributes types
     * @param dirtyParams the params input
     * @returns Error[] TODO: specialize this error class
     */
    static validateParams(dirtyParams: { [key: string]: any }): Error[] {
        const errors: Error[] = [];

        // Validate params object:
        if (!dirtyParams || typeof dirtyParams !== 'object') {
            errors.push(new Error('BaseHousehold validateParams: params is undefined or invalid'));
            return errors; // stop now otherwise it will crash because params are not valid
        }

        // Validate uuid:
        const uuidErrors = Uuidable.validateParams(dirtyParams);
        if (uuidErrors.length > 0) {
            errors.push(...uuidErrors);
        }

        // Validate weights:
        const weightsErrors = validateWeights(dirtyParams._weights);
        if (weightsErrors.length > 0) {
            errors.push(...weightsErrors);
        }

        // Validate baseMembers:
        if (dirtyParams.baseMembers !== undefined && !Array.isArray(dirtyParams.baseMembers)) {
            errors.push(new Error('BaseHousehold validateParams: baseMembers should be an array'));
        } else if (dirtyParams.baseMembers !== undefined && dirtyParams.baseMembers.length > 0) {
            for (let i = 0, countI = dirtyParams.baseMembers.length; i < countI; i++) {
                if (!dirtyParams.baseMembers[i] || !(dirtyParams.baseMembers[i] instanceof BasePerson)) {
                    errors.push(new Error(`BaseHousehold validateParams: baseMembers index ${i} is not an instance of BasePerson`));
                }
            }
        }

        // Validate baseVehicles:
        if (dirtyParams.baseVehicles !== undefined && !Array.isArray(dirtyParams.baseVehicles)) {
            errors.push(new Error('BaseHousehold validateParams: baseVehicles should be an array'));
        } else if (dirtyParams.baseVehicles !== undefined && dirtyParams.baseVehicles.length > 0) {
            for (let i = 0, countI = dirtyParams.baseVehicles.length; i < countI; i++) {
                if (!dirtyParams.baseVehicles[i] || !(dirtyParams.baseVehicles[i] instanceof BaseVehicle)) {
                    errors.push(new Error(`BaseHousehold validateParams: baseVehicles index ${i} is not an instance of BaseVehicle`));
                }
            }
        }

        // Validate baseHome:
        if (dirtyParams.baseHome !== undefined) {
            if (!(dirtyParams.baseHome instanceof BasePlace)) {
                errors.push(new Error('BaseHousehold validateParams: baseHome is not an instance of BasePlace'));
            }
        }

        // Validate size:
        if (dirtyParams.size !== undefined && (!Number.isInteger(dirtyParams.size) || dirtyParams.size < 0)) {
            errors.push(new Error('BaseHousehold validateParams: size should be a positive integer'));
        }

        // Validate carNumber:
        if (dirtyParams.carNumber !== undefined && (!Number.isInteger(dirtyParams.carNumber) || dirtyParams.carNumber < 0)) {
            errors.push(new Error('BaseHousehold validateParams: carNumber should be a positive integer'));
        }

        // Validate twoWheelNumber:
        if (dirtyParams.twoWheelNumber !== undefined && (!Number.isInteger(dirtyParams.twoWheelNumber) || dirtyParams.twoWheelNumber < 0)) {
            errors.push(new Error('BaseHousehold validateParams: twoWheelNumber should be a positive integer'));
        }

        // Validate pluginHybridCarNumber:
        if (dirtyParams.pluginHybridCarNumber !== undefined && (!Number.isInteger(dirtyParams.pluginHybridCarNumber) || dirtyParams.pluginHybridCarNumber < 0)) {
            errors.push(new Error('BaseHousehold validateParams: pluginHybridCarNumber should be a positive integer'));
        }

        // Validate electricCarNumber:
        if (dirtyParams.electricCarNumber !== undefined && (!Number.isInteger(dirtyParams.electricCarNumber) || dirtyParams.electricCarNumber < 0)) {
            errors.push(new Error('BaseHousehold validateParams: electricCarNumber should be a positive integer'));
        }

        // Validate category:
        if (dirtyParams.category !== undefined && typeof dirtyParams.category !== 'string') {
            errors.push(new Error('BaseHousehold validateParams: category should be a string'));
        }

        // Validate wouldLikeToParticipateToOtherSurveys:
        if (dirtyParams.wouldLikeToParticipateToOtherSurveys !== undefined && typeof dirtyParams.wouldLikeToParticipateToOtherSurveys !== 'boolean') {
            errors.push(new Error('BaseHousehold validateParams: wouldLikeToParticipateToOtherSurveys should be a boolean'));
        }

        // Validate homeCarParkings:
        if (dirtyParams.homeCarParkings !== undefined) {
            if (!Array.isArray(dirtyParams.homeCarParkings)) {
                errors.push(new Error('BaseHousehold validateParams: homeCarParkings should be an array'));
            } else {
                for (let i = 0, countI = dirtyParams.homeCarParkings.length; i < countI; i++) {
                    if (typeof dirtyParams.homeCarParkings[i] !== 'string') {
                        errors.push(new Error(`BaseHousehold validateParams: homeCarParkings index ${i} should be a string`));
                    }
                }
            }
        }

        // Validate contactPhoneNumber:
        if (dirtyParams.contactPhoneNumber !== undefined && typeof dirtyParams.contactPhoneNumber !== 'string') {
            errors.push(new Error('BaseHousehold validateParams: contactPhoneNumber should be a string'));
        }

        // Validate contactEmail:
        if (dirtyParams.contactEmail !== undefined && typeof dirtyParams.contactEmail !== 'string') {
            errors.push(new Error('BaseHousehold validateParams: contactEmail should be a string'));
        }

        return errors;
    }

}

export {
    BaseHousehold,
    BaseHouseholdAttributes,
    ExtendedHouseholdAttributes
};
