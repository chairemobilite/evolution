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
import { WorkPlace } from './WorkPlace';
import { SchoolPlace } from './SchoolPlace';
import { ExtendedPlaceAttributes } from './Place';
import { VisitedPlace } from './VisitedPlace';
import * as PAttr from './attributeTypes/PersonAttributes';
import { Result, createErrors, createOk } from '../../types/Result.type';
import { ParamsValidatorUtils } from '../../utils/ParamsValidatorUtils';
import { ConstructorUtils } from '../../utils/ConstructorUtils';
import { Vehicle, ExtendedVehicleAttributes, SerializedExtendedVehicleAttributes } from './Vehicle';
import { Journey, ExtendedJourneyAttributes, SerializedExtendedJourneyAttributes } from './Journey';
import { SerializedExtendedPlaceAttributes } from './Place';
import projectConfig from '../../config/project.config';
import { SurveyObjectUnserializer } from './SurveyObjectUnserializer';
import { SurveyObjectsRegistry } from './SurveyObjectsRegistry';
import { Household } from './Household';

export const personAttributes = [
    '_weights',
    '_isValid',
    '_uuid',
    '_sequence',
    '_color',
    '_keepDiscard',
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
    'schoolTypeOtherSpecify',
    'whoWillAnswerForThisPerson',
    'isProxy',
    'nickname',
    'contactPhoneNumber',
    'contactEmail'
];

export const personAttributesWithComposedAttributes = [
    ...personAttributes,
    '_workPlaces',
    '_schoolPlaces',
    '_journeys',
    '_vehicles'
];

export const nonStringAttributes = [
    '_weights',
    '_isValid',
    '_uuid',
    '_sequence',
    'age',
    'transitPasses',
    'whoWillAnswerForThisPerson',
    'isProxy'
];

export const stringAttributes = personAttributes.filter((attr) => !nonStringAttributes.includes(attr));

export type PersonAttributes = {
    /**
     * Sequence number for ordering nested composed objects.
     * NOTE: This will be removed when we use objects directly inside the interview process.
     * Right now, since nested composed objects are still using objects with uuid as key,
     * they need a _sequence attribute to be able to order them.
     */
    _sequence?: Optional<number>;
    _color?: Optional<string>; // used for reviewing to color each person's trips on map
    _keepDiscard?: Optional<string>; // 'Keep' or 'Discard'
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
    _workPlaces?: Optional<ExtendedPlaceAttributes[]>;
    _schoolPlaces?: Optional<ExtendedPlaceAttributes[]>;
    _journeys?: Optional<ExtendedJourneyAttributes[]>;
    _vehicles?: Optional<ExtendedVehicleAttributes[]>;
};

export type ExtendedPersonAttributes = PersonWithComposedAttributes & { [key: string]: unknown };

export type SerializedExtendedPersonAttributes = {
    _attributes?: ExtendedPersonAttributes;
    _customAttributes?: { [key: string]: unknown };
    _workPlaces?: SerializedExtendedPlaceAttributes[];
    _schoolPlaces?: SerializedExtendedPlaceAttributes[];
    _journeys?: SerializedExtendedJourneyAttributes[];
    _vehicles?: SerializedExtendedVehicleAttributes[];
};

/**
 * A person is a member of a household. it can have these composed objects:
 * workPlaces, schoolPlaces, journeys, vehicles
 */
export class Person extends Uuidable implements IValidatable {
    private _surveyObjectsRegistry: SurveyObjectsRegistry;
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

    constructor(params: ExtendedPersonAttributes, surveyObjectsRegistry: SurveyObjectsRegistry) {
        super(params._uuid);

        this._surveyObjectsRegistry = surveyObjectsRegistry;

        this._attributes = {};
        this._customAttributes = {};

        const { attributes, customAttributes } = ConstructorUtils.initializeAttributes(
            _omit(params, [
                '_workPlaces',
                '_schoolPlaces',
                '_journeys',
                '_vehicles',
                'workPlaces',
                'schoolPlaces',
                'journeys',
                'vehicles',
                '_householdUuid'
            ]),
            personAttributes,
            personAttributesWithComposedAttributes
        );
        this._attributes = attributes;
        this._customAttributes = customAttributes;

        this.workPlaces = ConstructorUtils.initializeComposedArrayAttributes(
            params._workPlaces,
            (params) => WorkPlace.unserialize(params, this._surveyObjectsRegistry),
            this._surveyObjectsRegistry
        );
        this.schoolPlaces = ConstructorUtils.initializeComposedArrayAttributes(
            params._schoolPlaces,
            (params) => SchoolPlace.unserialize(params, this._surveyObjectsRegistry),
            this._surveyObjectsRegistry
        );
        this.journeys = ConstructorUtils.initializeComposedArrayAttributes(
            params._journeys,
            (params) => Journey.unserialize(params, this._surveyObjectsRegistry),
            this._surveyObjectsRegistry
        );
        this.vehicles = ConstructorUtils.initializeComposedArrayAttributes(
            params._vehicles,
            (params) => Vehicle.unserialize(params, this._surveyObjectsRegistry),
            this._surveyObjectsRegistry
        );
        this.householdUuid = params._householdUuid as Optional<string>;

        this._surveyObjectsRegistry.registerPerson(this);
    }

    get attributes(): PersonAttributes {
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

    get _color(): Optional<string> {
        return this._attributes._color;
    }

    set _color(value: Optional<string>) {
        this._attributes._color = value;
    }

    get _keepDiscard(): Optional<string> {
        return this._attributes._keepDiscard;
    }

    set _keepDiscard(value: Optional<string>) {
        this._attributes._keepDiscard = value;
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

    get household(): Optional<Household> {
        if (!this._householdUuid) {
            return undefined;
        }
        return this._surveyObjectsRegistry.getHousehold(this._householdUuid);
    }

    /**
     * Add a journey to this person
     */
    addJourney(journey: Journey): void {
        if (!this._journeys) {
            this._journeys = [];
        }
        this._journeys.push(journey);
    }

    /**
     * Insert a journey at a specific index
     */
    insertJourney(journey: Journey, index: number): void {
        if (!this._journeys) {
            this._journeys = [];
        }
        this._journeys.splice(index, 0, journey);
    }

    /**
     * Insert a journey after another journey with the specified UUID
     */
    insertJourneyAfterUuid(journey: Journey, afterUuid: string): boolean {
        if (!this._journeys) {
            this._journeys = [];
        }

        // If array is empty, add the journey
        if (this._journeys.length === 0) {
            this._journeys.push(journey);
            return true;
        }

        const index = this._journeys.findIndex((j) => j._uuid === afterUuid);
        if (index >= 0) {
            this._journeys.splice(index + 1, 0, journey);
            return true;
        }
        // If UUID not found in non-empty array, return false
        return false;
    }

    /**
     * Insert a journey before another journey with the specified UUID
     */
    insertJourneyBeforeUuid(journey: Journey, beforeUuid: string): boolean {
        if (!this._journeys) {
            this._journeys = [];
        }

        // If array is empty, add the journey
        if (this._journeys.length === 0) {
            this._journeys.push(journey);
            return true;
        }

        const index = this._journeys.findIndex((j) => j._uuid === beforeUuid);
        if (index >= 0) {
            this._journeys.splice(index, 0, journey);
            return true;
        }
        // If UUID not found in non-empty array, return false
        return false;
    }

    /**
     * Remove a journey from this person by UUID
     */
    removeJourney(journeyUuid: string): boolean {
        if (!this._journeys) {
            return false;
        }
        const index = this._journeys.findIndex((journey) => journey._uuid === journeyUuid);
        if (index >= 0) {
            this._journeys.splice(index, 1);
            return true;
        }
        return false;
    }

    /**
     * Get a journey by UUID
     */
    getJourneyByUuid(journeyUuid: string): Journey | undefined {
        if (!this._journeys) {
            return undefined;
        }
        return this._journeys.find((journey) => journey._uuid === journeyUuid);
    }

    /**
     * Find visited place by UUID in person's journeys
     * Searches through all journeys of this person to find a specific visited place
     * @param {string} uuid - UUID of the visited place to find
     * @returns {VisitedPlace | undefined} The found visited place or undefined if not found
     */
    findVisitedPlaceByUuid(uuid: string): VisitedPlace | undefined {
        // Look through all journeys to find the visited place
        const journeys = this._journeys || [];
        for (const journey of journeys) {
            const visitedPlaces = journey.visitedPlaces || [];
            const foundPlace = visitedPlaces.find((vp: VisitedPlace) => vp._uuid === uuid);
            if (foundPlace) {
                return foundPlace;
            }
        }
        return undefined;
    }

    /**
     * Setup work and school places by extracting usual places from visited places
     * This ensures usual places are available even if only declared in travel diary
     */
    setupWorkAndSchoolPlaces(): void {
        // Initialize arrays if undefined
        if (this.workPlaces === undefined) {
            this.workPlaces = [];
        }
        if (this.schoolPlaces === undefined) {
            this.schoolPlaces = [];
        }

        // Fetch existing coordinates to avoid adding them again
        const alreadyFetchedWorkCoordinatesStr: string[] = [];
        const alreadyFetchedSchoolCoordinatesStr: string[] = [];

        // Get existing work place coordinates
        for (let i = 0, countI = this.workPlaces.length; i < countI; i++) {
            const workPlace = this.workPlaces[i];
            const coordinates = workPlace.geography?.geometry?.coordinates;
            if (coordinates) {
                alreadyFetchedWorkCoordinatesStr.push(`${coordinates[0]},${coordinates[1]}`);
            }
        }

        // Get existing school place coordinates
        for (let i = 0, countI = this.schoolPlaces.length; i < countI; i++) {
            const schoolPlace = this.schoolPlaces[i];
            const coordinates = schoolPlace.geography?.geometry?.coordinates;
            if (coordinates) {
                alreadyFetchedSchoolCoordinatesStr.push(`${coordinates[0]},${coordinates[1]}`);
            }
        }

        // Get usual work visited places from all journeys
        const usualWorkVisitedPlaces = this.getUsualWorkVisitedPlaces();
        for (let i = 0, countI = usualWorkVisitedPlaces.length; i < countI; i++) {
            const visitedPlace = usualWorkVisitedPlaces[i];
            if (visitedPlace.geography !== undefined) {
                const lon = visitedPlace.geography?.geometry?.coordinates?.[0];
                const lat = visitedPlace.geography?.geometry?.coordinates?.[1];
                if (lat !== undefined && lon !== undefined) {
                    const coordinateStr = `${lon},${lat}`;
                    // Add to work places if not already present
                    if (!alreadyFetchedWorkCoordinatesStr.includes(coordinateStr)) {
                        alreadyFetchedWorkCoordinatesStr.push(coordinateStr);
                        const workPlace = WorkPlace.unserialize(
                            visitedPlace.place?.attributes || {},
                            this._surveyObjectsRegistry
                        ); // Clone
                        // Add name from visited place if needed
                        if (!workPlace.name && visitedPlace.name) {
                            workPlace.name = visitedPlace.name;
                        }
                        this.workPlaces.push(workPlace as WorkPlace);
                    }
                }
            }
        }

        // Get usual school visited places from all journeys
        const usualSchoolVisitedPlaces = this.getUsualSchoolVisitedPlaces();
        for (let i = 0, countI = usualSchoolVisitedPlaces.length; i < countI; i++) {
            const visitedPlace = usualSchoolVisitedPlaces[i];
            if (visitedPlace.geography !== undefined) {
                const lon = visitedPlace.geography?.geometry?.coordinates?.[0];
                const lat = visitedPlace.geography?.geometry?.coordinates?.[1];
                if (lat !== undefined && lon !== undefined) {
                    const coordinateStr = `${lon},${lat}`;
                    // Add to school places if not already present
                    if (!alreadyFetchedSchoolCoordinatesStr.includes(coordinateStr)) {
                        alreadyFetchedSchoolCoordinatesStr.push(coordinateStr);
                        const schoolPlace = SchoolPlace.unserialize(
                            visitedPlace.place?.attributes || {},
                            this._surveyObjectsRegistry
                        ); // Clone
                        // Add name from visited place if needed
                        if (!schoolPlace.name && visitedPlace.name) {
                            schoolPlace.name = visitedPlace.name;
                        }
                        this.schoolPlaces.push(schoolPlace as SchoolPlace);
                    }
                }
            }
        }
    }

    /**
     * Get usual work visited places from all journeys
     * @returns Array of visited places with workUsual activity only
     */
    private getUsualWorkVisitedPlaces(): VisitedPlace[] {
        const workVisitedPlaces: VisitedPlace[] = [];
        const journeys = this.journeys || [];

        for (const journey of journeys) {
            const visitedPlaces = journey.visitedPlaces || [];
            for (const visitedPlace of visitedPlaces) {
                // Check if this is a work-related activity at usual place
                if (visitedPlace.activity === 'workUsual') {
                    workVisitedPlaces.push(visitedPlace);
                }
            }
        }

        return workVisitedPlaces;
    }

    /**
     * Get usual school visited places from all journeys
     * @returns Array of visited places with schoolUsual activity only
     */
    private getUsualSchoolVisitedPlaces(): VisitedPlace[] {
        const schoolVisitedPlaces: VisitedPlace[] = [];
        const journeys = this.journeys || [];

        for (const journey of journeys) {
            const visitedPlaces = journey.visitedPlaces || [];
            for (const visitedPlace of visitedPlaces) {
                // Check if this is a school-related activity at usual place
                if (visitedPlace.activity === 'schoolUsual') {
                    schoolVisitedPlaces.push(visitedPlace);
                }
            }
        }

        return schoolVisitedPlaces;
    }

    /**
     * Creates a Person object from sanitized parameters
     * @param {ExtendedPersonAttributes | SerializedExtendedPersonAttributes} params - Sanitized person parameters
     * @returns {Person} New Person instance
     */
    static unserialize(
        params: ExtendedPersonAttributes | SerializedExtendedPersonAttributes,
        surveyObjectsRegistry: SurveyObjectsRegistry
    ): Person {
        const flattenedParams = SurveyObjectUnserializer.flattenSerializedData(params);
        return new Person(flattenedParams as ExtendedPersonAttributes, surveyObjectsRegistry);
    }

    /**
     * Factory that validates input from an interview and makes
     * sure types and required fields are valid before returning a new object
     * Custom attributes must be validated in each survey project
     * @param dirtyParams
     * @returns Person | Error[]
     */
    static create(
        dirtyParams: { [key: string]: unknown },
        surveyObjectsRegistry: SurveyObjectsRegistry
    ): Result<Person> {
        const errors = Person.validateParams(dirtyParams);
        const person = errors.length === 0 ? new Person(dirtyParams, surveyObjectsRegistry) : undefined;
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

        errors.push(...ParamsValidatorUtils.isPositiveInteger('_sequence', dirtyParams._sequence, displayName));

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
            ...ParamsValidatorUtils.isUuid(
                'whoWillAnswerForThisPerson',
                dirtyParams.whoWillAnswerForThisPerson,
                displayName
            )
        );
        errors.push(...ParamsValidatorUtils.isBoolean('isProxy', dirtyParams.isProxy, displayName));

        const workPlacesAttributes =
            dirtyParams._workPlaces !== undefined ? (dirtyParams._workPlaces as { [key: string]: unknown }[]) : [];
        for (let i = 0, countI = workPlacesAttributes.length; i < countI; i++) {
            const workPlaceAttributes = workPlacesAttributes[i];
            errors.push(...WorkPlace.validateParams(workPlaceAttributes, `WorkPlace ${i}`));
        }

        const schoolPlacesAttributes =
            dirtyParams._schoolPlaces !== undefined ? (dirtyParams._schoolPlaces as { [key: string]: unknown }[]) : [];
        for (let i = 0, countI = schoolPlacesAttributes.length; i < countI; i++) {
            const schoolPlaceAttributes = schoolPlacesAttributes[i];
            errors.push(...SchoolPlace.validateParams(schoolPlaceAttributes, `SchoolPlace ${i}`));
        }

        const journeysAttributes =
            dirtyParams._journeys !== undefined ? (dirtyParams._journeys as { [key: string]: unknown }[]) : [];
        for (let i = 0, countI = journeysAttributes.length; i < countI; i++) {
            const journeyAttributes = journeysAttributes[i];
            errors.push(...Journey.validateParams(journeyAttributes, `Journey ${i}`));
        }

        const vehiclesAttributes =
            dirtyParams._vehicles !== undefined ? (dirtyParams._vehicles as { [key: string]: unknown }[]) : [];
        for (let i = 0, countI = vehiclesAttributes.length; i < countI; i++) {
            const vehicleAttributes = vehiclesAttributes[i];
            errors.push(...Vehicle.validateParams(vehicleAttributes, `Vehicle ${i}`));
        }

        errors.push(...ParamsValidatorUtils.isUuid('_householdUuid', dirtyParams._householdUuid, displayName));

        return errors;
    }

    /**
     * Assign color to person from the configured color palette
     * Assigns a unique color to each person for visualization purposes, cycling through the palette
     * @param {number} personIndex - Index of the person in the household (for color cycling)
     * @returns {void}
     */
    assignColor(personIndex: number): void {
        const colorsPalette = projectConfig.personColorsPalette;

        // Cycle through the color palette if there are more persons than colors
        const colorIndex = personIndex % colorsPalette.length;
        const assignedColor = colorsPalette[colorIndex];

        // Assign color to person
        this._color = assignedColor;
    }
}
