/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { OptionalValidity, IValidatable } from './Validatable';
import { BasePerson } from './BasePerson';
import { BasePlace } from './BasePlace';
import { Weightable, Weight } from './Weight';
import * as HAttr from './attributeTypes/HouseholdAttributes';
import { Uuidable } from './Uuidable';
import { Vehicleable } from './Vehicleable';
import { BaseVehicle } from './BaseVehicle';

type BaseHouseholdAttributes = {

    _uuid?: string;

    members?: BasePerson[];
    home?: BasePlace;

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

} & Weightable & Vehicleable;

type ExtendedHouseholdAttributes = BaseHouseholdAttributes & { [key: string]: any };

class BaseHousehold extends Uuidable implements IValidatable {

    _isValid: OptionalValidity;
    _weight?: Weight;

    members: BasePerson[];
    home?: BasePlace;

    vehicles?: BaseVehicle[];

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

    /**
     * TODO: make the constructor protected for all surveyed classes.
     * Only the factory create method should be able to generate a valid object
     * */
    constructor(params: BaseHouseholdAttributes | ExtendedHouseholdAttributes) {

        super(params._uuid);

        this._isValid = undefined;
        this._weight = params._weight;

        this.members = params.members || [];
        this.home = params.home;

        this.vehicles = params.vehicles || [];

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
     * @returns BaseHousehold
     */
    static create(dirtyParams: { [key: string]: any }) {
        const allParamsValid = true;
        // validate types and required attributes
        // TODO: implement dirtyParams validation:
        const params: BaseHouseholdAttributes = {};
        if (allParamsValid === true) {
            return new BaseHousehold(params);
        }
    }

}

export {
    BaseHousehold,
    BaseHouseholdAttributes,
    ExtendedHouseholdAttributes
};
