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
import { WorkPlace, ExtendedWorkPlaceAttributes } from './WorkPlace';
import { SchoolPlace, ExtendedSchoolPlaceAttributes } from './SchoolPlace';
import * as PAttr from './attributeTypes/PersonAttributes';
import { Result, createErrors, createOk } from '../../types/Result.type';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { ConstructorUtils } from '../../utils/ConstructorUtils';
import { Vehicle, ExtendedVehicleAttributes } from './Vehicle';
import { Journey, ExtendedJourneyAttributes } from './Journey';

export const personAttributes = [
    '_weights',
    '_isValid',
    '_uuid',
    'age',
    'ageGroup',
    'gender',
    'sexAssignedAtBirth',
    'drivingLicenseOwnership',
    'transitPassOwnership',
    'transitPasses',
    'hasDisability',
    'carsharingMember',
    'carsharingUser',
    'bikesharingMember',
    'bikesharingUser',
    'ridesharingMember',
    'ridesharingUser',
    'occupation',
    'schoolType',
    'schoolPlaceType',
    'studentType',
    'workerType',
    'workPlaceType',
    'jobCategory',
    'jobName',
    'isOnTheRoadWorker',
    'hasTelecommuteCompatibleJob',
    'educationalAttainment',
    'genderCustom',
    'previousWeekRemoteWorkDays',
    'previousWeekTravelToWorkDays',
    'schoolTypeOtherSpecify',
    'whoWillAnswerForThisPerson',
    'isProxy',
    'nickname',
    'contactPhoneNumber',
    'contactEmail'
];

export const personAttributesWithComposedAttributes = [
    ...personAttributes,
    'workPlaces',
    'schoolPlaces',
    'journeys',
    'vehicles'
];

export const nonStringAttributes = [
    '_weights',
    '_isValid',
    '_uuid',
    'age',
    'transitPasses',
    'previousWeekRemoteWorkDays',
    'previousWeekTravelToWorkDays',
    'whoWillAnswerForThisPerson',
    'isProxy'
];

export const stringAttributes = personAttributes.filter((attr) => !nonStringAttributes.includes(attr));

export type PersonAttributes = {
    age?: Optional<PAttr.Age>;
    ageGroup?: Optional<PAttr.AgeGroup>; // generated, do not use as a widget
    gender?: Optional<PAttr.Gender>;
    sexAssignedAtBirth?: Optional<PAttr.SexAssignedAtBirth>;
    drivingLicenseOwnership?: Optional<PAttr.DrivingLicenseOwnership>;
    transitPassOwnership?: Optional<PAttr.TransitPassOwnership>;
    transitPasses?: Optional<string[]>; // choices distinct by survey
    hasDisability?: Optional<PAttr.HasDisability>;
    carsharingMember?: Optional<PAttr.CarsharingMember>;
    carsharingUser?: Optional<PAttr.CarsharingUser>;
    bikesharingMember?: Optional<PAttr.BikesharingMember>;
    bikesharingUser?: Optional<PAttr.BikesharingUser>;
    ridesharingMember?: Optional<PAttr.RidesharingMember>;
    ridesharingUser?: Optional<PAttr.RidesharingUser>;
    occupation?: Optional<PAttr.Occupation>;
    schoolType?: Optional<PAttr.SchoolType>;
    schoolPlaceType?: Optional<PAttr.SchoolPlaceType>;
    studentType?: Optional<PAttr.StudentType>;
    workerType?: Optional<PAttr.WorkerType>;
    workPlaceType?: Optional<PAttr.WorkPlaceType>;
    jobCategory?: Optional<PAttr.JobCategory>;
    jobName?: Optional<PAttr.JobName>;
    isOnTheRoadWorker?: Optional<PAttr.IsOnTheRoadWorker>;
    hasTelecommuteCompatibleJob?: Optional<PAttr.HasTelecommuteCompatibleJob>;
    educationalAttainment?: Optional<PAttr.EducationalAttainment>;
    genderCustom?: Optional<string>;
    /** Remote work days for the complete week before the assigned date (Sunday to Saturday, excluding assigned date) */
    previousWeekRemoteWorkDays?: Optional<PAttr.WeekdaySchedule>;
    /** Travel to work days for the complete week before the assigned date (Sunday to Saturday, excluding assigned date) */
    previousWeekTravelToWorkDays?: Optional<PAttr.WeekdaySchedule>;
    schoolTypeOtherSpecify?: Optional<string>;
    /** UUID of the household member who will answer for this person (used to determine if isProxy = true) */
    whoWillAnswerForThisPerson?: Optional<string>;
    isProxy?: Optional<boolean>;

    // confidential:
    nickname?: Optional<string>;
    contactPhoneNumber?: Optional<string>;
    contactEmail?: Optional<string>;
} & UuidableAttributes &
    WeightableAttributes &
    ValidatebleAttributes;

export type PersonWithComposedAttributes = PersonAttributes & {
    workPlaces?: Optional<ExtendedWorkPlaceAttributes[]>;
    schoolPlaces?: Optional<ExtendedSchoolPlaceAttributes[]>;
    journeys?: Optional<ExtendedJourneyAttributes[]>;
    vehicles?: Optional<ExtendedVehicleAttributes[]>;
};

export type ExtendedPersonAttributes = PersonWithComposedAttributes & { [key: string]: unknown };

/**
 * A person is a member of a household. it can have these composed objects:
 * workPlaces, schoolPlaces, journeys, vehicles
 */
export class Person implements IValidatable {
    private _attributes: PersonAttributes;
    private _customAttributes: { [key: string]: unknown };

    private _workPlaces?: Optional<WorkPlace[]>;
    private _schoolPlaces?: Optional<SchoolPlace[]>;
    private _journeys?: Optional<Journey[]>;
    private _vehicles?: Optional<Vehicle[]>;

    private _householdUuid?: Optional<string>; // allow reverse lookup: must be filled by Household.

    static _confidentialAttributes = [
        // these attributes should be hidden when exporting
        'contactPhoneNumber',
        'contactEmail',
        'nickname'
    ];

    constructor(params: ExtendedPersonAttributes) {
        params._uuid = Uuidable.getUuid(params._uuid);

        this._attributes = {};
        this._customAttributes = {};

        const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(
            params,
            personAttributes,
            personAttributesWithComposedAttributes
        );
        this._attributes = attributes;
        this._customAttributes = customAttributes;

        this.workPlaces = ConstructorUtils.initializeComposedArrayAttributes(params.workPlaces, WorkPlace.unserialize);
        this.schoolPlaces = ConstructorUtils.initializeComposedArrayAttributes(
            params.schoolPlaces,
            SchoolPlace.unserialize
        );
        this.journeys = ConstructorUtils.initializeComposedArrayAttributes(params.journeys, Journey.unserialize);
        this.vehicles = ConstructorUtils.initializeComposedArrayAttributes(params.vehicles, Vehicle.unserialize);
    }

    get attributes(): PersonAttributes {
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

    get age(): Optional<PAttr.Age> {
        return this._attributes.age;
    }

    set age(value: Optional<PAttr.Age>) {
        this._attributes.age = value;
    }

    get ageGroup(): Optional<PAttr.AgeGroup> {
        return this._attributes.ageGroup;
    }

    set ageGroup(value: Optional<PAttr.AgeGroup>) {
        this._attributes.ageGroup = value;
    }

    get gender(): Optional<PAttr.Gender> {
        return this._attributes.gender;
    }

    set gender(value: Optional<PAttr.Gender>) {
        this._attributes.gender = value;
    }

    get sexAssignedAtBirth(): Optional<PAttr.SexAssignedAtBirth> {
        return this._attributes.sexAssignedAtBirth;
    }

    set sexAssignedAtBirth(value: Optional<PAttr.SexAssignedAtBirth>) {
        this._attributes.sexAssignedAtBirth = value;
    }

    get drivingLicenseOwnership(): Optional<PAttr.DrivingLicenseOwnership> {
        return this._attributes.drivingLicenseOwnership;
    }

    set drivingLicenseOwnership(value: Optional<PAttr.DrivingLicenseOwnership>) {
        this._attributes.drivingLicenseOwnership = value;
    }

    get transitPassOwnership(): Optional<PAttr.TransitPassOwnership> {
        return this._attributes.transitPassOwnership;
    }

    set transitPassOwnership(value: Optional<PAttr.TransitPassOwnership>) {
        this._attributes.transitPassOwnership = value;
    }

    get transitPasses(): Optional<string[]> {
        return this._attributes.transitPasses;
    }

    set transitPasses(value: Optional<string[]>) {
        this._attributes.transitPasses = value;
    }

    get hasDisability(): Optional<PAttr.HasDisability> {
        return this._attributes.hasDisability;
    }

    set hasDisability(value: Optional<PAttr.HasDisability>) {
        this._attributes.hasDisability = value;
    }

    get carsharingMember(): Optional<PAttr.CarsharingMember> {
        return this._attributes.carsharingMember;
    }

    set carsharingMember(value: Optional<PAttr.CarsharingMember>) {
        this._attributes.carsharingMember = value;
    }

    get carsharingUser(): Optional<PAttr.CarsharingUser> {
        return this._attributes.carsharingUser;
    }

    set carsharingUser(value: Optional<PAttr.CarsharingUser>) {
        this._attributes.carsharingUser = value;
    }

    get bikesharingMember(): Optional<PAttr.BikesharingMember> {
        return this._attributes.bikesharingMember;
    }

    set bikesharingMember(value: Optional<PAttr.BikesharingMember>) {
        this._attributes.bikesharingMember = value;
    }

    get bikesharingUser(): Optional<PAttr.BikesharingUser> {
        return this._attributes.bikesharingUser;
    }

    set bikesharingUser(value: Optional<PAttr.BikesharingUser>) {
        this._attributes.bikesharingUser = value;
    }

    get ridesharingMember(): Optional<PAttr.RidesharingMember> {
        return this._attributes.ridesharingMember;
    }

    set ridesharingMember(value: Optional<PAttr.RidesharingMember>) {
        this._attributes.ridesharingMember = value;
    }

    get ridesharingUser(): Optional<PAttr.RidesharingUser> {
        return this._attributes.ridesharingUser;
    }

    set ridesharingUser(value: Optional<PAttr.RidesharingUser>) {
        this._attributes.ridesharingUser = value;
    }

    get occupation(): Optional<PAttr.Occupation> {
        return this._attributes.occupation;
    }

    set occupation(value: Optional<PAttr.Occupation>) {
        this._attributes.occupation = value;
    }

    get jobCategory(): Optional<PAttr.JobCategory> {
        return this._attributes.jobCategory;
    }

    set jobCategory(value: Optional<PAttr.JobCategory>) {
        this._attributes.jobCategory = value;
    }

    get jobName(): Optional<PAttr.JobName> {
        return this._attributes.jobName;
    }

    set jobName(value: Optional<PAttr.JobName>) {
        this._attributes.jobName = value;
    }

    get isOnTheRoadWorker(): Optional<PAttr.IsOnTheRoadWorker> {
        return this._attributes.isOnTheRoadWorker;
    }

    set isOnTheRoadWorker(value: Optional<PAttr.IsOnTheRoadWorker>) {
        this._attributes.isOnTheRoadWorker = value;
    }

    get hasTelecommuteCompatibleJob(): Optional<PAttr.HasTelecommuteCompatibleJob> {
        return this._attributes.hasTelecommuteCompatibleJob;
    }

    set hasTelecommuteCompatibleJob(value: Optional<PAttr.HasTelecommuteCompatibleJob>) {
        this._attributes.hasTelecommuteCompatibleJob = value;
    }

    get educationalAttainment(): Optional<PAttr.EducationalAttainment> {
        return this._attributes.educationalAttainment;
    }

    set educationalAttainment(value: Optional<PAttr.EducationalAttainment>) {
        this._attributes.educationalAttainment = value;
    }

    get genderCustom(): Optional<string> {
        return this._attributes.genderCustom;
    }

    set genderCustom(value: Optional<string>) {
        this._attributes.genderCustom = value;
    }

    /**
     * Remote work days for the complete week before the assigned date.
     * If the assigned date is a Monday, this represents Sunday to Saturday
     * of the previous week (not including the assigned Monday).
     * Each day indicates whether the person worked remotely on that day.
     */
    get previousWeekRemoteWorkDays(): Optional<PAttr.WeekdaySchedule> {
        return this._attributes.previousWeekRemoteWorkDays;
    }

    set previousWeekRemoteWorkDays(value: Optional<PAttr.WeekdaySchedule>) {
        this._attributes.previousWeekRemoteWorkDays = value;
    }

    /**
     * Travel to work days for the complete week before the assigned date.
     * If the assigned date is a Monday, this represents Sunday to Saturday
     * of the previous week (not including the assigned Monday).
     * Each day indicates whether the person traveled to work on that day.
     */
    get previousWeekTravelToWorkDays(): Optional<PAttr.WeekdaySchedule> {
        return this._attributes.previousWeekTravelToWorkDays;
    }

    set previousWeekTravelToWorkDays(value: Optional<PAttr.WeekdaySchedule>) {
        this._attributes.previousWeekTravelToWorkDays = value;
    }

    get schoolTypeOtherSpecify(): Optional<string> {
        return this._attributes.schoolTypeOtherSpecify;
    }

    set schoolTypeOtherSpecify(value: Optional<string>) {
        this._attributes.schoolTypeOtherSpecify = value;
    }

    /**
     * UUID of the household member who will answer for this person.
     * Used to determine if this person's responses are provided by a proxy.
     * If this UUID differs from the person's own UUID, then isProxy should be true.
     */
    get whoWillAnswerForThisPerson(): Optional<string> {
        return this._attributes.whoWillAnswerForThisPerson;
    }

    set whoWillAnswerForThisPerson(value: Optional<string>) {
        this._attributes.whoWillAnswerForThisPerson = value;
    }

    get isProxy(): Optional<boolean> {
        return this._attributes.isProxy;
    }

    set isProxy(value: Optional<boolean>) {
        this._attributes.isProxy = value;
    }

    get nickname(): Optional<string> {
        return this._attributes.nickname;
    }

    set nickname(value: Optional<string>) {
        this._attributes.nickname = value;
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

    get workPlaceType(): Optional<PAttr.WorkPlaceType> {
        return this._attributes.workPlaceType;
    }

    set workPlaceType(value: Optional<PAttr.WorkPlaceType>) {
        this._attributes.workPlaceType = value;
    }

    get schoolPlaceType(): Optional<PAttr.SchoolPlaceType> {
        return this._attributes.schoolPlaceType;
    }

    set schoolPlaceType(value: Optional<PAttr.SchoolPlaceType>) {
        this._attributes.schoolPlaceType = value;
    }

    get studentType(): Optional<PAttr.StudentType> {
        return this._attributes.studentType;
    }

    set studentType(value: Optional<PAttr.StudentType>) {
        this._attributes.studentType = value;
    }

    get workerType(): Optional<PAttr.WorkerType> {
        return this._attributes.workerType;
    }

    set workerType(value: Optional<PAttr.WorkerType>) {
        this._attributes.workerType = value;
    }

    get schoolType(): Optional<PAttr.SchoolType> {
        return this._attributes.schoolType;
    }

    set schoolType(value: Optional<PAttr.SchoolType>) {
        this._attributes.schoolType = value;
    }

    get workPlaces(): Optional<WorkPlace[]> {
        return this._workPlaces;
    }

    set workPlaces(value: Optional<WorkPlace[]>) {
        this._workPlaces = value;
    }

    get schoolPlaces(): Optional<SchoolPlace[]> {
        return this._schoolPlaces;
    }

    set schoolPlaces(value: Optional<SchoolPlace[]>) {
        this._schoolPlaces = value;
    }

    get journeys(): Optional<Journey[]> {
        return this._journeys;
    }

    set journeys(value: Optional<Journey[]>) {
        this._journeys = value;
    }

    get vehicles(): Optional<Vehicle[]> {
        return this._vehicles;
    }

    set vehicles(value: Optional<Vehicle[]>) {
        this._vehicles = value;
    }

    get householdUuid(): Optional<string> {
        return this._householdUuid;
    }

    set householdUuid(value: Optional<string>) {
        // must only be used by Household object
        this._householdUuid = value;
    }

    // params must be sanitized and must be valid:
    static unserialize(params: PersonWithComposedAttributes): Person {
        return new Person(params);
    }

    /**
     * Factory that validates input from an interview and makes
     * sure types and required fields are valid before returning a new object
     * Custom attributes must be validated in each survey project
     * @param dirtyParams
     * @returns Person | Error[]
     */
    static create(dirtyParams: { [key: string]: unknown }): Result<Person> {
        const errors = Person.validateParams(dirtyParams);
        const person = errors.length === 0 ? new Person(dirtyParams) : undefined;
        if (errors.length > 0) {
            return createErrors(errors);
        }
        return createOk(person as Person);
    }

    validate(): Optional<boolean> {
        // TODO: implement:
        this._attributes._isValid = true;
        return true;
    }

    isValid(): Optional<boolean> {
        return this._isValid;
    }

    /**
     * Validates attributes types for Person.
     * @param dirtyParams The parameters to validate.
     * @param displayName The name of the object to validate, for error display
     * @returns Error[] TODO: specialize this error class
     */
    static validateParams(dirtyParams: { [key: string]: unknown }, displayName = 'Person'): Error[] {
        const errors: Error[] = [];

        // Validate params object:
        errors.push(...ParamsValidatorUtils.isRequired('params', dirtyParams, displayName));
        errors.push(...ParamsValidatorUtils.isObject('params', dirtyParams, displayName));

        // Validate _uuid:
        errors.push(...Uuidable.validateParams(dirtyParams));

        // Validate _isValid:
        errors.push(...ParamsValidatorUtils.isBoolean('_isValid', dirtyParams._isValid, displayName));

        // Validate _weights:
        errors.push(...validateWeights(dirtyParams._weights as Optional<Weight[]>));

        errors.push(...ParamsValidatorUtils.isPositiveInteger('age', dirtyParams.age, displayName));

        for (let i = 0, countI = stringAttributes.length; i < countI; i++) {
            const stringAttribute = stringAttributes[i];
            errors.push(...ParamsValidatorUtils.isString(stringAttribute, dirtyParams[stringAttribute], displayName));
        }

        errors.push(...ParamsValidatorUtils.isArrayOfStrings('transitPasses', dirtyParams.transitPasses, displayName));

        // Validate new attributes
        errors.push(
            ...ParamsValidatorUtils.isObject(
                'previousWeekRemoteWorkDays',
                dirtyParams.previousWeekRemoteWorkDays,
                displayName
            )
        );
        errors.push(
            ...ParamsValidatorUtils.isObject(
                'previousWeekTravelToWorkDays',
                dirtyParams.previousWeekTravelToWorkDays,
                displayName
            )
        );
        errors.push(
            ...ParamsValidatorUtils.isUuid(
                'whoWillAnswerForThisPerson',
                dirtyParams.whoWillAnswerForThisPerson,
                displayName
            )
        );
        errors.push(...ParamsValidatorUtils.isBoolean('isProxy', dirtyParams.isProxy, displayName));

        const workPlacesAttributes =
            dirtyParams.workPlaces !== undefined ? (dirtyParams.workPlaces as { [key: string]: unknown }[]) : [];
        for (let i = 0, countI = workPlacesAttributes.length; i < countI; i++) {
            const workPlaceAttributes = workPlacesAttributes[i];
            errors.push(...WorkPlace.validateParams(workPlaceAttributes, `WorkPlace ${i}`));
        }

        const schoolPlacesAttributes =
            dirtyParams.schoolPlaces !== undefined ? (dirtyParams.schoolPlaces as { [key: string]: unknown }[]) : [];
        for (let i = 0, countI = schoolPlacesAttributes.length; i < countI; i++) {
            const schoolPlaceAttributes = schoolPlacesAttributes[i];
            errors.push(...SchoolPlace.validateParams(schoolPlaceAttributes, `SchoolPlace ${i}`));
        }

        const journeysAttributes =
            dirtyParams.journeys !== undefined ? (dirtyParams.journeys as { [key: string]: unknown }[]) : [];
        for (let i = 0, countI = journeysAttributes.length; i < countI; i++) {
            const journeyAttributes = journeysAttributes[i];
            errors.push(...Journey.validateParams(journeyAttributes, `Journey ${i}`));
        }

        const vehiclesAttributes =
            dirtyParams.vehicles !== undefined ? (dirtyParams.vehicles as { [key: string]: unknown }[]) : [];
        for (let i = 0, countI = vehiclesAttributes.length; i < countI; i++) {
            const vehicleAttributes = vehiclesAttributes[i];
            errors.push(...Vehicle.validateParams(vehicleAttributes, `Vehicle ${i}`));
        }

        return errors;
    }
}
