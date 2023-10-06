/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { OptionalValidity, IValidatable } from './Validatable';
import { Weightable, Weight } from './Weight';
import { Tripable } from './Tripable';
import { Uuidable } from './Uuidable';
import { BasePlace } from './BasePlace';
import { BaseVisitedPlace } from './BaseVisitedPlace';
import { BaseTrip } from './BaseTrip';
import { BaseVehicle } from './BaseVehicle';
import * as PAttr from './attributeTypes/PersonAttributes';
import { Vehicleable } from './Vehicleable';

type BasePersonAttributes = {

    _uuid?: string;

    age?: PAttr.Age;
    ageGroup?: PAttr.AgeGroup;
    gender?: PAttr.Gender;
    drivingLicenseOwnership?: PAttr.DrivingLicenseOwnership;
    transitPassOwnership?: PAttr.TransitPassOwnership;
    carsharingMember?: PAttr.CarsharingMember;
    carsharingUser?: PAttr.CarsharingUser;
    bikesharingMember?: PAttr.BikesharingMember;
    bikesharingUser?: PAttr.BikesharingUser;
    ridesharingMember?: PAttr.RidesharingMember;
    ridesharingUser?: PAttr.RidesharingUser;
    occupation?: PAttr.Occupation;
    jobCategory?: PAttr.JobCategory;
    jobName?: PAttr.JobName;
    isOnTheRoadWorker?: PAttr.IsOnTheRoadWorker;
    isJobTelecommuteCompatible?: PAttr.IsJobTelecommuteCompatible;
    educationalAttainment?: PAttr.EducationalAttainment;

    workPlaces?: BasePlace[];
    schoolPlaces?: BasePlace[];
    home?: BasePlace;

    // must be anonymized:
    nickname?: string;
    contactPhoneNumber?: string;
    contactEmail?: string;

} & Weightable & Tripable & Vehicleable;

type ExtendedPersonAttributes = BasePersonAttributes & { [key: string]: any };

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface IBasePersonAttributes extends BasePersonAttributes { }

class BasePerson extends Uuidable implements IBasePersonAttributes, IValidatable {

    _isValid: OptionalValidity;
    _weight?: Weight;

    age?: PAttr.Age;
    ageGroup?: PAttr.AgeGroup;
    gender?: PAttr.Gender;
    drivingLicenseOwnership?: PAttr.DrivingLicenseOwnership;
    transitPassOwnership?: PAttr.TransitPassOwnership;
    carsharingMember?: PAttr.CarsharingMember;
    carsharingUser?: PAttr.CarsharingUser;
    bikesharingMember?: PAttr.BikesharingMember;
    bikesharingUser?: PAttr.BikesharingUser;
    ridesharingMember?: PAttr.RidesharingMember;
    ridesharingUser?: PAttr.RidesharingUser;
    occupation?: PAttr.Occupation;
    jobCategory?: PAttr.JobCategory;
    jobName?: PAttr.JobName;
    isOnTheRoadWorker?: PAttr.IsOnTheRoadWorker;
    isJobTelecommuteCompatible?: PAttr.IsJobTelecommuteCompatible;
    educationalAttainment?: PAttr.EducationalAttainment;

    workPlaces?: BasePlace[];
    schoolPlaces?: BasePlace[];
    home?: BasePlace;

    visitedPlaces?: BaseVisitedPlace[];
    trips?: BaseTrip[];

    vehicles?: BaseVehicle[];

    // must be anonymized:
    nickname?: string;
    contactPhoneNumber?: string;
    contactEmail?: string;

    constructor(params: BasePersonAttributes | ExtendedPersonAttributes) {

        super(params._uuid);

        this._isValid = undefined;
        this._weight = params._weight;

        this.age = params.age;
        this.ageGroup = params.ageGroup;
        this.gender = params.gender;
        this.drivingLicenseOwnership = params.drivingLicenseOwnership;
        this.transitPassOwnership = params.transitPassOwnership;
        this.carsharingMember = params.carsharingMember;
        this.carsharingUser = params.carsharingUser;
        this.bikesharingMember = params.bikesharingMember;
        this.bikesharingUser = params.bikesharingUser;
        this.ridesharingMember = params.ridesharingMember;
        this.ridesharingUser = params.ridesharingUser;
        this.occupation = params.occupation;
        this.jobCategory = params.jobCategory;
        this.jobName = params.jobName;
        this.isOnTheRoadWorker = params.isOnTheRoadWorker;
        this.isJobTelecommuteCompatible = params.isJobTelecommuteCompatible;
        this.educationalAttainment = params.educationalAttainment;

        this.nickname = params.nickname;
        this.contactPhoneNumber = params.contactPhoneNumber;
        this.contactEmail = params.contactEmail;

        this.workPlaces = params.workPlaces;
        this.schoolPlaces = params.schoolPlaces;

        this.visitedPlaces = params.visitedPlaces || [];
        this.trips = params.trips || [];

        this.vehicles = params.vehicles || [];

        this.home = params.home;

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
         * @returns BasePerson
         */
    static create(dirtyParams: { [key: string]: any }) {
        const allParamsValid = true;
        // validate types and required attributes
        // TODO: implement dirtyParams validation:
        const params: BasePersonAttributes = {};
        if (allParamsValid === true) {
            return new BasePerson(params);
        }
    }

}

export {
    BasePerson,
    BasePersonAttributes,
    ExtendedPersonAttributes
};
