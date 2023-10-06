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
        trips: [new BaseTrip({} as BaseTripAttributes), new BaseTrip({} as BaseTripAttributes)], // Valid trips
        visitedPlaces: [new BaseVisitedPlace(new BasePlace(undefined, {} as BasePlaceAttributes), {} as BaseVisitedPlaceAttributes)], // Valid visited places
        vehicles: [new BaseVehicle({} as BaseVehicleAttributes)], // Empty vehicles
        workPlaces: [new BasePlace(undefined, {} as BasePlaceAttributes)], // Valid workPlaces
        schoolPlaces: [new BasePlace(undefined, {} as BasePlaceAttributes)], // Valid schoolPlaces
        home: new BasePlace(undefined, {} as BasePlaceAttributes), // Valid home
        _weight: { weight: 1.5, method: new WeightMethod(weightMethodAttributes) },
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
        expect(person.visitedPlaces?.length).toEqual(1);
        expect(person.trips?.length).toEqual(2);
        expect(person.vehicles?.length).toEqual(1);
    });

    it('should allow empty arrays and home', () => {

        const personAttributes2: ExtendedPersonAttributes = {
            _uuid: validUuid,
            trips: [], // Empty trips
            visitedPlaces: [], // Empty visited places
            vehicles: [], // Empty vehicles
            workPlaces: [], // Empty work places
            schoolPlaces: [], // Empty school places
            home: undefined,
            foo: 'bar', // extended attribute
        };
        const person2 = new BasePerson(personAttributes2);
        expect(person2.visitedPlaces?.length).toEqual(0);
        expect(person2.trips?.length).toEqual(0);
        expect(person2.vehicles?.length).toEqual(0);
        expect(person2.workPlaces?.length).toEqual(0);
        expect(person2.schoolPlaces?.length).toEqual(0);
        expect(person2.home).toBeUndefined();
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
        const weight: Weight = person._weight as Weight;
        expect(weight.weight).toBe(1.5);
        expect(weight.method).toBeInstanceOf(WeightMethod);
        expect(weight.method.shortname).toEqual('sample-shortname');
        expect(weight.method.name).toEqual('Sample Weight Method');
        expect(weight.method.description).toEqual('Sample weight method description');
    });

});
