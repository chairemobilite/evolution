/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Person, PersonAttributes, ExtendedPersonAttributes, nonStringAttributes, stringAttributes } from '../Person';
import { v4 as uuidV4 } from 'uuid';
import { Weight } from '../Weight';
import { WorkPlace, WorkPlaceAttributes } from '../WorkPlace';
import { SchoolPlace, SchoolPlaceAttributes } from '../SchoolPlace';
import { isOk, hasErrors, unwrap } from '../../../types/Result.type';
import { WeightMethod, WeightMethodAttributes } from '../WeightMethod';

describe('Person', () => {

    const weightMethodAttributes = {
        _uuid: uuidV4(),
        shortname: 'sample-shortname',
        name: 'Sample Weight Method',
        description: 'Sample weight method description',
    };

    const validAttributes: PersonAttributes = {
        _uuid: uuidV4(),
        age: 30,
        ageGroup: 'adult',
        gender: 'male',
        drivingLicenseOwnership: 'yes',
        transitPassOwnership: 'yes',
        transitPasses: ['pass1', 'pass2'],
        hasDisability: 'no',
        carsharingMember: 'no',
        carsharingUser: 'no',
        bikesharingMember: 'no',
        bikesharingUser: 'no',
        ridesharingMember: 'no',
        ridesharingUser: 'no',
        occupation: 'employed',
        schoolType: 'not_student',
        schoolPlaceType: 'none',
        studentType: 'not_student',
        workerType: 'full_time',
        workPlaceType: 'office',
        jobCategory: 'professional',
        jobName: 'engineer',
        isOnTheRoadWorker: 'no',
        isJobTelecommuteCompatible: 'yes',
        educationalAttainment: 'university',
        nickname: 'John',
        contactPhoneNumber: '1234567890',
        contactEmail: 'john@example.com',
        _weights: [{ weight: 1.5, method: new WeightMethod(weightMethodAttributes) }],
        _isValid: true,
    };

    const extendedAttributes: ExtendedPersonAttributes = {
        ...validAttributes,
        customAttribute: 'custom value',
        workPlaces: [{ _uuid: uuidV4(), placeType: 'office', _isValid: true }],
        schoolPlaces: [{ placeType: 'university', _isValid: true }],
    };

    const extendedInvalidWorkPlacesAttributes: { [key: string]: unknown } = {
        ...validAttributes,
        customAttribute: 'custom value',
        workPlaces: [{ custom: 123, _isValid: 123, parkingType: 123, parkingFeeType: 123 }],
    };

    const extendedInvalidSchoolPlacesAttributes: { [key: string]: unknown } = {
        ...validAttributes,
        customAttribute: 'custom value',
        schoolPlaces: [{ custom: 333, _isValid: 111, parkingType: 123, parkingFeeType: 123 }],
    };


    test('should have a validateParams section for each attribute', () => {
        const validateParamsCode = Person.validateParams.toString();
        // exclude string attributes, since they are validated automatically in a loop:
        nonStringAttributes.filter((attribute) => attribute !== '_uuid' && attribute !== '_weights').forEach((attributeName) => {
            expect(validateParamsCode).toContain('\''+attributeName+'\'');
        });
    });

    nonStringAttributes.forEach((attribute) => {
        test(`should return errors for invalid ${attribute}`, () => {
            const invalidAttributes = { ...validAttributes, [attribute]: 'invalid' }; // Replace 'invalid' with a string
            const result = Person.create(invalidAttributes);
            expect(hasErrors(result)).toBe(true);
            expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
        });
    });

    test('should create a Person instance with valid attributes', () => {
        const result = Person.create(validAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Person);
    });

    test('should create a Person instance with extended attributes', () => {
        const result = Person.create(extendedAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Person);
    });

    test('should return errors for invalid attributes', () => {
        const invalidAttributes = { ...validAttributes, age: -1 };
        const result = Person.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should unserialize a Person instance', () => {
        const person = Person.unserialize(validAttributes);
        expect(person).toBeInstanceOf(Person);
        expect(person.age).toBe(30);
    });

    test('should validate a Person instance', () => {
        const person = new Person(validAttributes);
        expect(person.validate()).toBe(true);
        expect(person.isValid()).toBe(true);
    });

    test('should get uuid', () => {
        const person = new Person({ ...validAttributes, _uuid: '11b78eb3-a5d8-484d-805d-1f947160bb9e' });
        expect(person._uuid).toBe('11b78eb3-a5d8-484d-805d-1f947160bb9e');
    });

    test('should create a Person instance with custom attributes', () => {
        const customAttributes = {
            customAttribute1: 'value1',
            customAttribute2: 'value2',
        };
        const placeAttributes = {
            ...validAttributes,
            ...customAttributes,
        };
        const person = new Person(placeAttributes);
        expect(person).toBeInstanceOf(Person);
        expect(person.attributes).toEqual(validAttributes);
        expect(person.customAttributes).toEqual(customAttributes);
    });

    test('should set and get custom attribute values', () => {
        const person = new Person(extendedAttributes);
        person.customAttributes.customAttribute = 'updated value';
        expect(person.customAttributes.customAttribute).toBe('updated value');
    });

    test('should set and get work places', () => {
        const person = new Person(extendedAttributes);
        const workPlace: WorkPlace = new WorkPlace({ parkingType: 'interiorAssignedOrGuaranteed', parkingFeeType: 'paidByEmployee', _isValid: true });
        person.workPlaces = [workPlace];
        expect(person.workPlaces).toHaveLength(1);
        expect(person.workPlaces[0]).toEqual(workPlace);
    });

    test('should set and get school places', () => {
        const person = new Person(extendedAttributes);
        const schoolPlace: SchoolPlace = new SchoolPlace({ parkingType: 'streetside', parkingFeeType: 'paidByStudent', _isValid: true });
        person.schoolPlaces = [schoolPlace];
        expect(person.schoolPlaces).toHaveLength(1);
        expect(person.schoolPlaces[0]).toEqual(schoolPlace);
    });

    test('should set and get household UUID', () => {
        const person = new Person(validAttributes);
        const householdId = uuidV4();
        person.householdUuid = householdId;
        expect(person.householdUuid).toBe(householdId);
    });

    describe('validateParams', () => {
        test.each([
            ['age', 'invalid'],
            ['_isValid', 'invalid'],
            ['_weights', 'invalid'],
        ])('should return an error for invalid %s', (param, value) => {
            const invalidAttributes = { ...validAttributes, [param]: value };
            const result = Person.create(invalidAttributes);
            expect(hasErrors(result)).toBe(true);
            const errors = unwrap(result) as Error[];
            expect(errors[0].toString()).toContain(param);
            expect(errors).toHaveLength(1);
        });

        test.each(stringAttributes)('should return an error for invalid %s', (param) => {
            const invalidAttributes = { ...validAttributes, [param]: 123 };
            const result = Person.create(invalidAttributes);
            expect(hasErrors(result)).toBe(true);
            const errors = unwrap(result) as Error[];
            expect(errors[0].toString()).toContain(param);
            expect(errors).toHaveLength(1);
        });

        test('should return an error for invalid params', () => {
            const invalidAttributes = 'foo' as any;
            const result = Person.create(invalidAttributes);
            expect(hasErrors(result)).toBe(true);
            expect((unwrap(result) as Error[])).toHaveLength(1);
        });

        test('should return no errors for valid attributes', () => {
            const result = Person.create(validAttributes);
            expect(isOk(result)).toBe(true);
            expect(unwrap(result)).toBeInstanceOf(Person);
        });
    });

    describe('Weights and WeightMethods', () => {
        test('should create a Person instance with valid weights', () => {
            const weightMethodAttributes: WeightMethodAttributes = {
                _uuid: uuidV4(),
                shortname: 'sample-shortname',
                name: 'Sample Weight Method',
                description: 'Sample weight method description',
            };
            const weightMethod = new WeightMethod(weightMethodAttributes);
            const weights: Weight[] = [{ weight: 1.5, method: weightMethod }];
            const personAttributes: PersonAttributes = { ...validAttributes, _weights: weights };
            const result = Person.create(personAttributes);
            expect(isOk(result)).toBe(true);
            const person = unwrap(result);
            expect((person as Person)._weights).toEqual(weights);
        });
    });

    describe('Work Places', () => {
        test('should create a Person instance with valid work places', () => {
            const workPlaceAttributes: WorkPlaceAttributes = {
                _uuid: '22b78eb3-a5d8-484d-805d-1f947160bb9e',
                parkingType: 'interiorAssignedOrGuaranteed',
                parkingFeeType: 'paidByEmployee',
                name: 'testName',
                geography: {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [0, 0],
                    },
                    properties: {},
                },
                _isValid: true,
            };
            const workPlace = new WorkPlace(workPlaceAttributes);
            const personAttributes: ExtendedPersonAttributes = { ...validAttributes, workPlaces: [workPlaceAttributes] };
            const result = Person.create(personAttributes);
            expect(isOk(result)).toBe(true);
            const person = unwrap(result);
            expect((person as Person).workPlaces).toHaveLength(1);
            expect((person as Person).workPlaces?.[0]).toEqual(workPlace);
        });

        test('should return an error for invalid work places', () => {
            const result = Person.create(extendedInvalidWorkPlacesAttributes);
            expect(hasErrors(result)).toBe(true);
            expect((unwrap(result) as Error[])).toHaveLength(3);
        });
    });

    describe('School Places', () => {
        test('should create a Person instance with valid school places', () => {
            const schoolPlaceAttributes: SchoolPlaceAttributes = {
                _uuid: '11b78eb3-a5d8-484d-805d-1f947160bb9e',
                parkingType: 'streetside',
                parkingFeeType: 'paidByStudent',
                name: 'testName',
                geography: {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [1, 1],
                    },
                    properties: {},
                },
                _isValid: true,
            };
            const schoolPlace = new SchoolPlace(schoolPlaceAttributes);
            const personAttributes: ExtendedPersonAttributes = { ...validAttributes, schoolPlaces: [schoolPlaceAttributes] };
            const result = Person.create(personAttributes);
            expect(isOk(result)).toBe(true);
            const person = unwrap(result);
            expect((person as Person).schoolPlaces).toHaveLength(1);
            expect((person as Person).schoolPlaces?.[0]).toEqual(schoolPlace);
        });

        test('should return an error for invalid school places', () => {
            const result = Person.create(extendedInvalidSchoolPlacesAttributes);
            expect(hasErrors(result)).toBe(true);
            expect((unwrap(result) as Error[])).toHaveLength(3);
        });
    });

    describe('Getters and Setters', () => {
        test.each([
            ['age', 35],
            ['ageGroup', 'senior'],
            ['gender', 'female'],
            ['drivingLicenseOwnership', 'no'],
            ['transitPassOwnership', 'no'],
            ['transitPasses', ['pass3', 'pass4']],
            ['hasDisability', 'yes'],
            ['carsharingMember', 'yes'],
            ['carsharingUser', 'yes'],
            ['bikesharingMember', 'yes'],
            ['bikesharingUser', 'yes'],
            ['ridesharingMember', 'yes'],
            ['ridesharingUser', 'yes'],
            ['occupation', 'unemployed'],
            ['schoolType', 'university'],
            ['schoolPlaceType', 'onLocation'],
            ['studentType', 'fullTime'],
            ['workerType', 'partTime'],
            ['workPlaceType', 'remote'],
            ['jobCategory', 'service'],
            ['jobName', 'manager'],
            ['isOnTheRoadWorker', 'yes'],
            ['isJobTelecommuteCompatible', 'no'],
            ['educationalAttainment', 'master'],
            ['nickname', 'Johnny'],
            ['contactPhoneNumber', '9876543210'],
            ['contactEmail', 'johnny@example.com'],
        ])('should set and get %s', (attribute, value) => {
            const person = new Person(validAttributes);
            person[attribute] = value;
            expect(person[attribute]).toEqual(value);
        });

        describe('Getters for attributes with no setters', () => {
            test.each([
                ['_uuid', extendedAttributes._uuid],
                ['customAttributes', { customAttribute: extendedAttributes.customAttribute }],
                ['attributes', validAttributes],
            ])('should set and get %s', (attribute, value) => {
                const person = new Person(extendedAttributes);
                expect(person[attribute]).toEqual(value);
            });
        });

        test.each([
            ['_isValid', false],
            ['_weights', [{ weight: 2.0, method: new WeightMethod(weightMethodAttributes) }]],
            ['workPlaces', [new WorkPlace({ placeType: 'home', _isValid: true })]],
            ['schoolPlaces', [new SchoolPlace({ placeType: 'college', _isValid: true })]],
            ['householdUuid', uuidV4()],
        ])('should set and get %s', (attribute, value) => {
            const person = new Person(validAttributes);
            person[attribute] = value;
            expect(person[attribute]).toEqual(value);
        });
    });

});


