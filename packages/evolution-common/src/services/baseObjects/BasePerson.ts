/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { OptionalValidity, IValidatable } from './Validatable';
import { Weightable, Weight, validateWeights } from './Weight';
import { Tripable } from './Tripable';
import { Uuidable } from './Uuidable';
import { BasePlace } from './BasePlace';
import { BaseVisitedPlace } from './BaseVisitedPlace';
import { BaseTrip } from './BaseTrip';
import { BaseVehicle } from './BaseVehicle';
import * as PAttr from './attributeTypes/PersonAttributes';
import { Vehicleable } from './Vehicleable';
import { _isEmail } from 'chaire-lib-common/lib/utils/LodashExtensions';

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

    baseWorkPlaces?: BasePlace[];
    baseSchoolPlaces?: BasePlace[];
    baseHome?: BasePlace;

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
    _weights?: Weight[];

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

    baseWorkPlaces?: BasePlace[];
    baseSchoolPlaces?: BasePlace[];
    baseHome?: BasePlace;

    baseVisitedPlaces?: BaseVisitedPlace[];
    baseTrips?: BaseTrip[];

    baseVehicles?: BaseVehicle[];

    // must be anonymized:
    nickname?: string;
    contactPhoneNumber?: string;
    contactEmail?: string;

    _confidentialAttributes : string[] = [ // these attributes should be hidden when exporting
        'contactPhoneNumber',
        'contactEmail',
        'nickname',
    ];

    constructor(params: BasePersonAttributes | ExtendedPersonAttributes) {

        super(params._uuid);

        this._isValid = undefined;
        this._weights = params._weights;

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

        this.baseWorkPlaces = params.baseWorkPlaces;
        this.baseSchoolPlaces = params.baseSchoolPlaces;

        this.baseVisitedPlaces = params.baseVisitedPlaces || [];
        this.baseTrips = params.baseTrips || [];

        this.baseVehicles = params.baseVehicles || [];

        this.baseHome = params.baseHome;

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
 * Validates attributes types for BasePerson.
 * @param dirtyParams The parameters to validate.
 * @returns Error[] TODO: specialize this error class
 */
    static validateParams(dirtyParams: { [key: string]: any }): Error[] {
        const errors: Error[] = [];

        // Validate params object:
        if (!dirtyParams || typeof dirtyParams !== 'object') {
            errors.push(new Error('BasePerson validateParams: params is undefined or invalid'));
            return errors; // Stop now; further validation depends on valid params object.
        }

        // Validate UUID
        const uuidErrors: Error[] = Uuidable.validateParams(dirtyParams);
        if (uuidErrors.length > 0) {
            errors.push(...uuidErrors);
        }

        // Validate weights:
        const weightsErrors = validateWeights(dirtyParams._weights);
        if (weightsErrors.length > 0) {
            errors.push(...weightsErrors);
        }

        // Validate age (if provided)
        if (dirtyParams.age !== undefined && (!Number.isInteger(dirtyParams.age) || dirtyParams.age < 0)) {
            errors.push(new Error('BasePerson validateParams: age must be a positive integer'));
        }

        // Validate ageGroup (if provided)
        if (dirtyParams.ageGroup !== undefined && typeof dirtyParams.ageGroup !== 'string') {
            errors.push(new Error('BasePerson validateParams: ageGroup is not a valid value'));
        }

        // Validate gender (if provided)
        if (dirtyParams.gender !== undefined && typeof dirtyParams.gender !== 'string') {
            errors.push(new Error('BasePerson validateParams: gender is not a valid value'));
        }

        // Validate drivingLicenseOwnership (if provided)
        if (dirtyParams.drivingLicenseOwnership !== undefined && typeof dirtyParams.drivingLicenseOwnership !== 'string') {
            errors.push(new Error('BasePerson validateParams: drivingLicenseOwnership is not a valid value'));
        }

        // Validate transitPassOwnership (if provided)
        if (dirtyParams.transitPassOwnership !== undefined && typeof dirtyParams.transitPassOwnership !== 'string') {
            errors.push(new Error('BasePerson validateParams: transitPassOwnership is not a valid value'));
        }

        // Validate carsharingMember (if provided)
        if (dirtyParams.carsharingMember !== undefined && typeof dirtyParams.carsharingMember !== 'string') {
            errors.push(new Error('BasePerson validateParams: carsharingMember is not a valid value'));
        }

        // Validate carsharingUser (if provided)
        if (dirtyParams.carsharingUser !== undefined && typeof dirtyParams.carsharingUser !== 'string') {
            errors.push(new Error('BasePerson validateParams: carsharingUser is not a valid value'));
        }

        // Validate bikesharingMember (if provided)
        if (dirtyParams.bikesharingMember !== undefined && typeof dirtyParams.bikesharingMember !== 'string') {
            errors.push(new Error('BasePerson validateParams: bikesharingMember is not a valid value'));
        }

        // Validate bikesharingUser (if provided)
        if (dirtyParams.bikesharingUser !== undefined && typeof dirtyParams.bikesharingUser !== 'string') {
            errors.push(new Error('BasePerson validateParams: bikesharingUser is not a valid value'));
        }

        // Validate ridesharingMember (if provided)
        if (dirtyParams.ridesharingMember !== undefined && typeof dirtyParams.ridesharingMember !== 'string') {
            errors.push(new Error('BasePerson validateParams: ridesharingMember is not a valid value'));
        }

        // Validate ridesharingUser (if provided)
        if (dirtyParams.ridesharingUser !== undefined && typeof dirtyParams.ridesharingUser !== 'string') {
            errors.push(new Error('BasePerson validateParams: ridesharingUser is not a valid value'));
        }

        // Validate occupation (if provided)
        if (dirtyParams.occupation !== undefined && typeof dirtyParams.occupation !== 'string') {
            errors.push(new Error('BasePerson validateParams: occupation is not a valid value'));
        }

        // Validate jobCategory (if provided)
        if (dirtyParams.jobCategory !== undefined && typeof dirtyParams.jobCategory !== 'string') {
            errors.push(new Error('BasePerson validateParams: jobCategory is not a valid value'));
        }

        // Validate jobName (if provided)
        if (dirtyParams.jobName !== undefined && typeof dirtyParams.jobName !== 'string') {
            errors.push(new Error('BasePerson validateParams: jobName should be a string'));
        }

        // Validate isOnTheRoadWorker (if provided)
        if (dirtyParams.isOnTheRoadWorker !== undefined && typeof dirtyParams.isOnTheRoadWorker !== 'boolean') {
            errors.push(new Error('BasePerson validateParams: isOnTheRoadWorker should be a boolean'));
        }

        // Validate isJobTelecommuteCompatible (if provided)
        if (dirtyParams.isJobTelecommuteCompatible !== undefined && typeof dirtyParams.isJobTelecommuteCompatible !== 'boolean') {
            errors.push(new Error('BasePerson validateParams: isJobTelecommuteCompatible should be a boolean'));
        }

        // Validate educationalAttainment (if provided)
        if (dirtyParams.educationalAttainment !== undefined && typeof dirtyParams.educationalAttainment !== 'string') {
            errors.push(new Error('BasePerson validateParams: educationalAttainment is not a valid value'));
        }

        // Validate baseWorkPlaces (if provided)
        if (dirtyParams.baseWorkPlaces !== undefined && (!Array.isArray(dirtyParams.baseWorkPlaces) || !dirtyParams.baseWorkPlaces.every((place) => place instanceof BasePlace))) {
            errors.push(new Error('BasePerson validateParams: baseWorkPlaces should be an array of BasePlace'));
        }

        // Validate baseSchoolPlaces (if provided)
        if (dirtyParams.baseSchoolPlaces !== undefined && (!Array.isArray(dirtyParams.baseSchoolPlaces) || !dirtyParams.baseSchoolPlaces.every((place) => place instanceof BasePlace))) {
            errors.push(new Error('BasePerson validateParams: baseSchoolPlaces should be an array of BasePlace'));
        }

        // Validate baseHome (if provided)
        if (dirtyParams.baseHome !== undefined && !(dirtyParams.baseHome instanceof BasePlace)) {
            errors.push(new Error('BasePerson validateParams: baseHome should be an instance of BasePlace'));
        }

        // Validate baseVisitedPlaces (if provided)
        if (dirtyParams.baseVisitedPlaces !== undefined && (!Array.isArray(dirtyParams.baseVisitedPlaces) || !dirtyParams.baseVisitedPlaces.every((place) => place instanceof BaseVisitedPlace))) {
            errors.push(new Error('BasePerson validateParams: baseVisitedPlaces should be an array of BaseVisitedPlace'));
        }

        // Validate baseTrips (if provided)
        if (dirtyParams.baseTrips !== undefined && (!Array.isArray(dirtyParams.baseTrips) || !dirtyParams.baseTrips.every((trip) => trip instanceof BaseTrip))) {
            errors.push(new Error('BasePerson validateParams: baseTrips should be an array of BaseTrip'));
        }

        // Validate baseVehicles (if provided)
        if (dirtyParams.baseVehicles !== undefined && (!Array.isArray(dirtyParams.baseVehicles) || !dirtyParams.baseVehicles.every((vehicle) => vehicle instanceof BaseVehicle))) {
            errors.push(new Error('BasePerson validateParams: baseVehicles should be an array of BaseVehicle'));
        }

        // Validate nickname (if provided)
        if (dirtyParams.nickname !== undefined && typeof dirtyParams.nickname !== 'string') {
            errors.push(new Error('BasePerson validateParams: nickname should be a string'));
        }

        // Validate contactPhoneNumber (if provided)
        if (dirtyParams.contactPhoneNumber !== undefined && typeof dirtyParams.contactPhoneNumber !== 'string') {
            errors.push(new Error('BasePerson validateParams: contactPhoneNumber should be a string'));
        }

        // Validate contactEmail (if provided)
        if (dirtyParams.contactEmail !== undefined && !_isEmail(dirtyParams.contactEmail)) {
            errors.push(new Error('BasePerson validateParams: contactEmail is invalid'));
        }

        return errors;
    }

}

export {
    BasePerson,
    BasePersonAttributes,
    ExtendedPersonAttributes
};
