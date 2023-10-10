/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { BasePerson, BasePersonAttributes, ExtendedPersonAttributes } from '../BasePerson';
import { v4 as uuidV4 } from 'uuid';
import * as PAttr from '../attributeTypes/PersonAttributes';
import { BaseTrip, BaseTripAttributes } from '../BaseTrip';
import { BaseVisitedPlace, BaseVisitedPlaceAttributes } from '../BaseVisitedPlace';
import { BasePlace, BasePlaceAttributes } from '../BasePlace';
import { BaseVehicle, BaseVehicleAttributes } from '../BaseVehicle';
import { Weight } from '../Weight';
import { WeightMethod } from '../WeightMethod';

describe('BasePerson', () => {

    const validUuid = uuidV4(); // Generate a valid UUID

    const weightMethodAttributes = {
        _uuid: uuidV4(),
        shortname: 'sample-shortname',
        name: 'Sample Weight Method',
        description: 'Sample weight method description',
    };

    const personAttributes: ExtendedPersonAttributes = {
        _uuid: validUuid,
        age: 30, // Valid age
        ageGroup: '30-34' as PAttr.AgeGroup, // Valid age group
        gender: 'male' as PAttr.Gender, // Valid gender
        drivingLicenseOwnership: 'yes' as PAttr.DrivingLicenseOwnership, // Valid driving license ownership
        transitPassOwnership: 'no' as PAttr.TransitPassOwnership, // Valid transit pass ownership
        carsharingMember: 'yes' as PAttr.CarsharingMember, // Valid carsharing membership
        carsharingUser: 'yes' as PAttr.CarsharingUser, // Valid carsharing user status
        bikesharingMember: 'no' as PAttr.BikesharingMember, // Valid bikesharing membership
        bikesharingUser: 'no' as PAttr.BikesharingUser, // Valid bikesharing user status
        ridesharingMember: 'dontKnow' as PAttr.RidesharingMember, // Valid ridesharing membership
        ridesharingUser: 'nonApplicable' as PAttr.RidesharingUser, // Valid ridesharing user status
        occupation: 'fullTimeWorker' as PAttr.Occupation, // Valid occupation
        jobCategory: 'Software Developer' as PAttr.JobCategory, // Valid job category
        jobName: 'Software Engineer' as PAttr.JobName, // Valid job name
        isOnTheRoadWorker: 'no' as PAttr.IsOnTheRoadWorker, // Valid on-the-road worker status
        isJobTelecommuteCompatible: 'yes' as PAttr.IsJobTelecommuteCompatible, // Valid telecommute compatibility status
        educationalAttainment: 'PhD' as PAttr.EducationalAttainment, // Valid educational attainment
        baseTrips: [new BaseTrip({} as BaseTripAttributes), new BaseTrip({} as BaseTripAttributes)], // Valid trips
        baseVisitedPlaces: [new BaseVisitedPlace({} as BaseVisitedPlaceAttributes)], // Valid visited places
        baseVehicles: [new BaseVehicle({} as BaseVehicleAttributes)], // Empty baseVehicles
        baseWorkPlaces: [new BasePlace({} as BasePlaceAttributes)], // Valid workPlaces
        baseSchoolPlaces: [new BasePlace({} as BasePlaceAttributes)], // Valid schoolPlaces
        baseHome: new BasePlace({} as BasePlaceAttributes), // Valid home
        _weights: [{ weight: 1.5, method: new WeightMethod(weightMethodAttributes) }],
        foo: 'bar', // extended attribute
    };

    it('should create a BasePerson instance with valid attributes', () => {


        const person = new BasePerson(personAttributes);

        expect(person).toBeInstanceOf(BasePerson);
        expect(person._uuid).toBe(validUuid);
        expect(person.age).toBe(30);
        expect(person.ageGroup).toBe('30-34');
        expect(person.gender).toBe('male');
        expect(person.drivingLicenseOwnership).toBe('yes');
        expect(person.transitPassOwnership).toBe('no');
        expect(person.carsharingMember).toBe('yes');
        expect(person.carsharingUser).toBe('yes');
        expect(person.bikesharingMember).toBe('no');
        expect(person.bikesharingUser).toBe('no');
        expect(person.ridesharingMember).toBe('dontKnow');
        expect(person.ridesharingUser).toBe('nonApplicable');
        expect(person.occupation).toBe('fullTimeWorker');
        expect(person.jobCategory).toBe('Software Developer');
        expect(person.jobName).toBe('Software Engineer');
        expect(person.isOnTheRoadWorker).toBe('no');
        expect(person.isJobTelecommuteCompatible).toBe('yes');
        expect(person.educationalAttainment).toBe('PhD');
        expect(person.baseVisitedPlaces?.length).toEqual(1);
        expect(person.baseTrips?.length).toEqual(2);
        expect(person.baseVehicles?.length).toEqual(1);
    });

    it('should allow empty arrays and home', () => {

        const personAttributes2: ExtendedPersonAttributes = {
            _uuid: validUuid,
            baseTrips: [], // Empty trips
            baseVisitedPlaces: [], // Empty visited places
            baseVehicles: [], // Empty vehicles
            baseWorkPlaces: [], // Empty work places
            baseSchoolPlaces: [], // Empty school places
            baseHome: undefined,
            foo: 'bar', // extended attribute
        };
        const person2 = new BasePerson(personAttributes2);
        expect(person2.baseVisitedPlaces?.length).toEqual(0);
        expect(person2.baseTrips?.length).toEqual(0);
        expect(person2.baseVehicles?.length).toEqual(0);
        expect(person2.baseWorkPlaces?.length).toEqual(0);
        expect(person2.baseSchoolPlaces?.length).toEqual(0);
        expect(person2.baseHome).toBeUndefined();
    });

    it('should validate a BasePerson instance', () => {
        const personAttributes = new BasePerson({} as BasePersonAttributes);
        const person = new BasePerson(personAttributes);
        expect(person.isValid()).toBeUndefined();
        const validationResult = person.validate();
        expect(validationResult).toBe(true);
        expect(person.isValid()).toBe(true);
    });

    it('should set weight and method correctly', () => {
        const person = new BasePerson(personAttributes);
        const weight: Weight = person._weights?.[0] as Weight;
        expect(weight.weight).toBe(1.5);
        expect(weight.method).toBeInstanceOf(WeightMethod);
        expect(weight.method.shortname).toEqual('sample-shortname');
        expect(weight.method.name).toEqual('Sample Weight Method');
        expect(weight.method.description).toEqual('Sample weight method description');
    });

    test('validateParams with valid parameters', () => {
        const params = {
            _uuid: uuidV4(),
            age: 23,
            ageGroup: '20-24',
            gender: 'male',
            drivingLicenseOwnership: 'yes',
            transitPassOwnership: 'no',
            carsharingMember: 'yes',
            carsharingUser: 'yes',
            bikesharingMember: 'no',
            bikesharingUser: 'yes',
            ridesharingMember: 'no',
            ridesharingUser: 'yes',
            occupation: 'retired',
            jobCategory: 'technology',
            jobName: 'Software Developer',
            isOnTheRoadWorker: true,
            isJobTelecommuteCompatible: false,
            educationalAttainment: 'Ph.D',
            baseWorkPlaces: [new BasePlace({})],
            baseSchoolPlaces: [new BasePlace({})],
            baseHome: new BasePlace({}),
            baseVisitedPlaces: [new BaseVisitedPlace({})],
            baseTrips: [new BaseTrip({})],
            baseVehicles: [new BaseVehicle({})],
            nickname: 'John Doe',
            contactPhoneNumber: '123-456-7890',
            contactEmail: 'john.doe@example.com',
        };

        const errors = BasePerson.validateParams(params);
        expect(errors.length).toBe(0);
    });

    test('validateParams with invalid parameters', () => {
        const params = {
            _uuid: 'invalid_uuid',
            age: 'InvalidAge',
            gender: 123,
            drivingLicenseOwnership: 4343,
            transitPassOwnership: {},
            carsharingMember: null,
            carsharingUser: -932.34,
            bikesharingMember: 44,
            bikesharingUser: 324,
            ridesharingMember: new Date(),
            ridesharingUser: [],
            occupation: [1,2,3],
            jobCategory: ['foo', 'bar'],
            jobName: 123,
            isOnTheRoadWorker: Infinity,
            isJobTelecommuteCompatible: 1234,
            educationalAttainment: 5678,
            baseWorkPlaces: 'InvalidArray', // Invalid type
            baseSchoolPlaces: [new BasePlace({}), 'InvalidPlace'], // Invalid type in array
            baseHome: 'InvalidPlace', // Invalid type
            baseVisitedPlaces: [new BaseVisitedPlace({}), 'InvalidPlace'], // Invalid type in array
            baseTrips: [new BaseTrip({}), 'InvalidTrip'], // Invalid type in array
            baseVehicles: [new BaseVehicle({}), 'InvalidVehicle'], // Invalid type in array
            contactPhoneNumber: 123, // Invalid type
            contactEmail: 'invalid-email', // Invalid email format
        };

        const errors = BasePerson.validateParams(params);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors).toEqual([
            new Error('Uuidable validateParams: invalid uuid'),
            new Error('BasePerson validateParams: age must be a positive integer'),
            new Error('BasePerson validateParams: gender is not a valid value'),
            new Error('BasePerson validateParams: drivingLicenseOwnership is not a valid value'),
            new Error('BasePerson validateParams: transitPassOwnership is not a valid value'),
            new Error('BasePerson validateParams: carsharingMember is not a valid value'),
            new Error('BasePerson validateParams: carsharingUser is not a valid value'),
            new Error('BasePerson validateParams: bikesharingMember is not a valid value'),
            new Error('BasePerson validateParams: bikesharingUser is not a valid value'),
            new Error('BasePerson validateParams: ridesharingMember is not a valid value'),
            new Error('BasePerson validateParams: ridesharingUser is not a valid value'),
            new Error('BasePerson validateParams: occupation is not a valid value'),
            new Error('BasePerson validateParams: jobCategory is not a valid value'),
            new Error('BasePerson validateParams: jobName should be a string'),
            new Error('BasePerson validateParams: isOnTheRoadWorker should be a boolean'),
            new Error('BasePerson validateParams: isJobTelecommuteCompatible should be a boolean'),
            new Error('BasePerson validateParams: educationalAttainment is not a valid value'),
            new Error('BasePerson validateParams: baseWorkPlaces should be an array of BasePlace'),
            new Error('BasePerson validateParams: baseSchoolPlaces should be an array of BasePlace'),
            new Error('BasePerson validateParams: baseHome should be an instance of BasePlace'),
            new Error('BasePerson validateParams: baseVisitedPlaces should be an array of BaseVisitedPlace'),
            new Error('BasePerson validateParams: baseTrips should be an array of BaseTrip'),
            new Error('BasePerson validateParams: baseVehicles should be an array of BaseVehicle'),
            new Error('BasePerson validateParams: contactPhoneNumber should be a string'),
            new Error('BasePerson validateParams: contactEmail is invalid'),
        ]);
    });

    test('validateParams with invalid age', () => {
        const params = {
            age: -324
        };

        const errors = BasePerson.validateParams(params);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors).toEqual([
            new Error('BasePerson validateParams: age must be a positive integer')
        ]);

        const params2 = {
            age: 34.5
        };

        const errors2 = BasePerson.validateParams(params2);
        expect(errors2.length).toBeGreaterThan(0);
        expect(errors).toEqual([
            new Error('BasePerson validateParams: age must be a positive integer')
        ]);

        const params3 = {
            age: -99.23434
        };

        const errors3 = BasePerson.validateParams(params3);
        expect(errors3.length).toBeGreaterThan(0);
        expect(errors).toEqual([
            new Error('BasePerson validateParams: age must be a positive integer')
        ]);
    });

    test('validateParams with empty parameters', () => {
        const params = {};

        const errors = BasePerson.validateParams(params);
        expect(errors.length).toBe(0);
    });

    test('validateParams with valid optional parameters', () => {
        const params = {
            _uuid: uuidV4(),
            age: 25,
            gender: 'female',
            drivingLicenseOwnership: 'no',
            transitPassOwnership: 'no',
            carsharingMember: 'yes',
            carsharingUser: 'yes',
            bikesharingMember: 'no',
            bikesharingUser: 'yes',
            ridesharingMember: 'no',
            ridesharingUser: 'no',
            occupation: 'other',
            jobCategory: 'Technology',
            isOnTheRoadWorker: true,
            isJobTelecommuteCompatible: false,
            educationalAttainment: 'none',
            baseWorkPlaces: [new BasePlace({})],
            baseSchoolPlaces: [new BasePlace({})],
            baseHome: new BasePlace({}),
            baseVisitedPlaces: [new BaseVisitedPlace({})],
            baseTrips: [new BaseTrip({})],
            baseVehicles: [new BaseVehicle({})],
            nickname: 'John Doe',
            contactPhoneNumber: '123-456-7890',
            contactEmail: 'john.doe@example.com',
        };

        const errors = BasePerson.validateParams(params);
        expect(errors.length).toBe(0);
    });

});
