/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Household, HouseholdAttributes, ExtendedHouseholdAttributes, householdAttributes } from '../Household';
import { Person, PersonAttributes } from '../Person';
import { Place, PlaceAttributes } from '../Place';
import { Address } from '../Address';
import { v4 as uuidV4 } from 'uuid';
import { WeightMethod, WeightMethodAttributes } from '../WeightMethod';
import { isOk, hasErrors, unwrap } from '../../../types/Result.type';

describe('Household', () => {
    const weightMethodAttributes: WeightMethodAttributes = {
        _uuid: uuidV4(),
        shortname: 'sample-shortname',
        name: 'Sample Weight Method',
        description: 'Sample weight method description',
    };

    const validAttributes: { [key: string]: unknown } = {
        _uuid: uuidV4(),
        size: 4,
        carNumber: 2,
        twoWheelNumber: 1,
        pluginHybridCarNumber: 0,
        electricCarNumber: 1,
        category: 'family',
        wouldLikeToParticipateToOtherSurveys: true,
        homeCarParkings: ['drivewayWithoutGarage', 'streetside'],
        incomeLevel: 'high',
        contactPhoneNumber: '1234567890',
        contactEmail: 'test@example.com',
        _weights: [{ weight: 1.5, method: new WeightMethod(weightMethodAttributes) }],
        _isValid: true,
    };

    const extendedAttributes: { [key: string]: unknown } = {
        ...validAttributes,
        customAttribute: 'custom value',
        members: [
            {
                _uuid: uuidV4(),
                age: 30,
                ageGroup: 'adult',
                gender: 'male',
                _isValid: true,
            },
            {
                _uuid: uuidV4(),
                age: 28,
                ageGroup: 'adult',
                gender: 'female',
                _isValid: true,
            },
        ],
        home: {
            _uuid: uuidV4(),
            name: 'Sample Home',
            shortname: 'Sample home description',
            _isValid: true,
        }
    };

    test('should create a Household instance with valid attributes', () => {
        const household = new Household(validAttributes);
        expect(household).toBeInstanceOf(Household);
        expect(household.attributes).toEqual(validAttributes);
    });

    test('should have a validateParams section for each attribute', () => {
        const validateParamsCode = Household.validateParams.toString();
        householdAttributes.filter((attribute) => attribute !== '_uuid' && attribute !== '_weights').forEach((attributeName) => {
            expect(validateParamsCode).toContain('\'' + attributeName + '\'');
        });
    });

    test('should get uuid', () => {
        const household = new Household({ ...validAttributes, _uuid: '11b78eb3-a5d8-484d-805d-1f947160bb9e' });
        expect(household._uuid).toBe('11b78eb3-a5d8-484d-805d-1f947160bb9e');
    });

    test('should create a Household instance with valid attributes', () => {
        const result = Household.create(validAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Household);
    });

    test('should return an error for invalid params', () => {
        const invalidAttributes = 'foo' as any;
        const result = Household.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should create a Household instance with extended attributes', () => {
        const result = Household.create(extendedAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Household);
    });

    test('should return errors for invalid attributes', () => {
        const invalidAttributes = { ...validAttributes, size: -1 };
        const result = Household.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should unserialize a Household instance', () => {
        const household = Household.unserialize(validAttributes);
        expect(household).toBeInstanceOf(Household);
        expect(household.attributes).toEqual(validAttributes);
    });

    test('should validate Household attributes', () => {
        const errors = Household.validateParams(validAttributes);
        expect(errors).toHaveLength(0);
    });

    test('should return errors for invalid Household attributes', () => {
        const invalidAttributes = { ...validAttributes, size: 'invalid' };
        const errors = Household.validateParams(invalidAttributes);
        expect(errors).toHaveLength(1);
    });

    test('should validate a Household instance', () => {
        const household = new Household(validAttributes);
        expect(household.validate()).toBe(true);
        expect(household.isValid()).toBe(true);
    });

    test('should create a Household instance with custom attributes', () => {
        const customAttributes = {
            customAttribute1: 'value1',
            customAttribute2: 'value2',
        };
        const householdAttributes = {
            ...validAttributes,
            ...customAttributes,
        };
        const household = new Household(householdAttributes);
        expect(household).toBeInstanceOf(Household);
        expect(household.attributes).toEqual(validAttributes);
        expect(household.customAttributes).toEqual(customAttributes);
    });

    describe('Getters and Setters', () => {
        test.each([
            ['size', 5],
            ['carNumber', 3],
            ['twoWheelNumber', 2],
            ['pluginHybridCarNumber', 1],
            ['electricCarNumber', 2],
            ['category', 'couple'],
            ['wouldLikeToParticipateToOtherSurveys', false],
            ['homeCarParkings', ['interior', 'exterior']],
            ['incomeLevel', 'medium'],
            ['contactPhoneNumber', '9876543210'],
            ['contactEmail', 'updated@example.com'],
        ])('should set and get %s', (attribute, value) => {
            const household = new Household(validAttributes);
            household[attribute] = value;
            expect(household[attribute]).toEqual(value);
        });

        describe('Getters for attributes with no setters', () => {
            test.each([
                ['_uuid', extendedAttributes._uuid],
                ['customAttributes', { customAttribute: extendedAttributes.customAttribute }],
                ['attributes', validAttributes],
            ])('should set and get %s', (attribute, value) => {
                const household = new Household(extendedAttributes);
                expect(household[attribute]).toEqual(value);
            });
        });

        test.each([
            ['_isValid', false],
            ['_weights', [{ weight: 2.0, method: new WeightMethod(weightMethodAttributes) }]],
            ['members', extendedAttributes.members],
        ])('should set and get %s', (attribute, value) => {
            const household = new Household(validAttributes);
            household[attribute] = value;
            expect(household[attribute]).toEqual(value);
        });
    });

    test('should create Person instances for members when creating a Household instance', () => {
        const membersAttributes: { [key: string]: unknown }[] = [
            {
                _uuid: uuidV4(),
                age: 30,
                ageGroup: 'adult',
                gender: 'male',
                _isValid: true,
            },
            {
                _uuid: uuidV4(),
                age: 28,
                ageGroup: 'adult',
                gender: 'female',
                _isValid: true,
            },
        ];

        const householdAttributes: { [key: string]: unknown } = {
            ...validAttributes,
            members: membersAttributes,
        };

        const result = Household.create(householdAttributes);
        expect(isOk(result)).toBe(true);
        const household = unwrap(result) as Household;
        expect(household.members).toBeDefined();
        expect(household.members?.length).toBe(2);
        expect(household.members?.[0]).toBeInstanceOf(Person);
        expect(household.members?.[0].attributes).toEqual(membersAttributes[0]);
        expect(household.members?.[1]).toBeInstanceOf(Person);
        expect(household.members?.[1].attributes).toEqual(membersAttributes[1]);
    });

    test('should return errors for invalid members attributes when creating a Household instance', () => {
        const invalidMembersAttributes = [
            {
                _uuid: uuidV4(),
                age: 'invalid', // Invalid type, should be number
                ageGroup: 'adult',
                gender: 'male',
                _isValid: true,
            },
            {
                _uuid: uuidV4(),
                age: 28,
                ageGroup: 123, // Invalid type, should be string
                gender: 'female',
                _isValid: true,
            },
        ];

        const householdAttributes: { [key: string]: unknown } = {
            ...validAttributes,
            members: invalidMembersAttributes,
        };

        const result = Household.create(householdAttributes);
        expect(hasErrors(result)).toBe(true);
        const errors = unwrap(result) as Error[];
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('Person validateParams');
    });

    test('should create a Place instance for home when creating a Household instance', () => {
        const homeAttributes: { [key: string]: unknown } = {
            _uuid: uuidV4(),
            name: 'Home',
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

        const householdAttributes: { [key: string]: unknown } = {
            ...validAttributes,
            home: homeAttributes,
        };

        const result = Household.create(householdAttributes);
        expect(isOk(result)).toBe(true);
        const household = unwrap(result) as Household;
        expect(household.home).toBeInstanceOf(Place);
        expect(household.home?.attributes).toEqual(homeAttributes);
    });

    test('should return errors for invalid home attributes when creating a Household instance', () => {
        const invalidHomeAttributes = {
            _uuid: uuidV4(),
            name: 123, // Invalid type, should be string
            _isValid: true,
        };

        const householdAttributes: { [key: string]: unknown } = {
            ...validAttributes,
            home: invalidHomeAttributes,
        };

        const result = Household.create(householdAttributes);
        expect(hasErrors(result)).toBe(true);
        const errors = unwrap(result) as Error[];
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('Home validateParams: name should be a string');
    });

    test('should create an Address instance for home.address when creating a Household instance', () => {
        const addressAttributes: { [key: string]: unknown } = {
            _uuid: uuidV4(),
            civicNumber: 123,
            streetName: 'Main Street',
            municipalityName: 'City',
            country: 'Country',
            _isValid: true,
        };

        const homeAttributes: { [key: string]: unknown } = {
            _uuid: uuidV4(),
            name: 'Home',
            geography: {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [0, 0],
                },
                properties: {},
            },
            address: addressAttributes,
            _isValid: true,
        };

        const householdAttributes: { [key: string]: unknown } = {
            ...validAttributes,
            home: homeAttributes,
        };

        const result = Household.create(householdAttributes);
        expect(isOk(result)).toBe(true);
        const household = unwrap(result) as Household;
        expect(household.home?.address).toBeInstanceOf(Address);
        expect(household.home?.address?.attributes).toEqual(addressAttributes);
    });

    test('should return errors for invalid home.address attributes when creating a Household instance', () => {
        const invalidAddressAttributes = {
            _uuid: uuidV4(),
            civicNumber: {}, // Invalid type, should be number
            _isValid: true,
        };

        const homeAttributes: { [key: string]: unknown } = {
            _uuid: uuidV4(),
            name: 'Home',
            geography: {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [0, 0],
                },
                properties: {},
            },
            address: invalidAddressAttributes,
            _isValid: true,
        };

        const householdAttributes: { [key: string]: unknown } = {
            ...validAttributes,
            home: homeAttributes,
        };

        const result = Household.create(householdAttributes);
        expect(hasErrors(result)).toBe(true);
        const errors = unwrap(result) as Error[];
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].message).toContain('Address validateParams: civicNumber should be a positive integer');
    });

});
