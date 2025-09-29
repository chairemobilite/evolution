/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Household, householdAttributes } from '../Household';
import { Person } from '../Person';
import { Vehicle } from '../Vehicle';
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
        bicycleNumber: 3,
        electricBicycleNumber: 1,
        pluginHybridCarNumber: 0,
        electricCarNumber: 1,
        hybridCarNumber: 2,
        category: 'family',
        homeCarParkings: ['drivewayWithoutGarage', 'streetside'],
        incomeLevel: 'high',
        homeOwnership: 'owned',
        contactPhoneNumber: '1234567890',
        contactEmail: 'test@example.com',
        atLeastOnePersonWithDisability: 'yes',
        _weights: [{ weight: 1.5, method: new WeightMethod(weightMethodAttributes) }],
        _isValid: true,
    };

    const extendedAttributes: { [key: string]: unknown } = {
        ...validAttributes,
        customAttribute: 'custom value',
        _members: [
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
        _vehicles: [
            {
                _uuid: uuidV4(),
                make: 'Toyota',
                model: 'Corolla',
                modelYear: 2020,
                _isValid: true,
            },
            {
                _uuid: uuidV4(),
                make: 'Honda',
                model: 'Civic',
                modelYear: 2021,
                _isValid: true,
            },
        ]
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

    test.each([
        ['size', 'invalid'],
        ['carNumber', 'invalid'],
        ['twoWheelNumber', 'invalid'],
        ['bicycleNumber', 'invalid'],
        ['bicycleNumber', -1],
        ['electricBicycleNumber', 'invalid'],
        ['electricBicycleNumber', -1],
        ['pluginHybridCarNumber', 'invalid'],
        ['pluginHybridCarNumber', -1],
        ['electricCarNumber', 'invalid'],
        ['electricCarNumber', -1],
        ['hybridCarNumber', 'invalid'],
        ['hybridCarNumber', -1],
        ['category', 123],
        ['homeCarParkings', 123],
        ['incomeLevel', 123],
        ['homeOwnership', 123],
        ['contactPhoneNumber', 123],
        ['contactEmail', 123],
        ['atLeastOnePersonWithDisability', 123],
    ])('should return an error for invalid %s', (param, value) => {
        const invalidAttributes = { ...validAttributes, [param]: value };
        const errors = Household.validateParams(invalidAttributes);
        expect(errors[0].toString()).toContain(param);
        expect(errors).toHaveLength(1);
    });

    test('should accept zero for new counts', () => {
        const ok = {
            ...validAttributes,
            bicycleNumber: 0,
            electricBicycleNumber: 0,
            pluginHybridCarNumber: 0,
            electricCarNumber: 0,
            hybridCarNumber: 0,
        };
        expect(Household.validateParams(ok)).toHaveLength(0);
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

    test('should allow clearing optional fields with undefined', () => {
        const household = new Household(validAttributes);
        household.bicycleNumber = undefined;
        expect(household.bicycleNumber).toBeUndefined();
    });

    describe('Getters and Setters', () => {
        test.each([
            ['size', 5],
            ['carNumber', 3],
            ['twoWheelNumber', 2],
            ['bicycleNumber', 4],
            ['electricBicycleNumber', 2],
            ['pluginHybridCarNumber', 1],
            ['electricCarNumber', 2],
            ['hybridCarNumber', 3],
            ['category', 'couple'],
            ['homeCarParkings', ['interior', 'exterior']],
            ['incomeLevel', 'medium'],
            ['homeOwnership', 'rented'],
            ['contactPhoneNumber', '9876543210'],
            ['contactEmail', 'updated@example.com'],
            ['atLeastOnePersonWithDisability', 'no'],
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
            ['_members', extendedAttributes._members],
            ['_vehicles', extendedAttributes._vehicles],
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
            _members: membersAttributes,
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

    test('should create Vehicle instances for vehicles when creating a Household instance', () => {
        const vehiclesAttributes: { [key: string]: unknown }[] = [
            {
                _uuid: uuidV4(),
                make: 'Toyota',
                model: 'Corolla',
                modelYear: 2020,
                _isValid: true,
            },
        ];

        const householdAttributes: { [key: string]: unknown } = {
            ...validAttributes,
            _vehicles: vehiclesAttributes,
        };

        const result = Household.create(householdAttributes);
        expect(isOk(result)).toBe(true);
        const household = unwrap(result) as Household;
        expect(household.vehicles).toBeDefined();
        expect(household.vehicles?.length).toBe(1);
        expect(household.vehicles?.[0]).toBeInstanceOf(Vehicle);
        expect(household.vehicles?.[0].attributes).toEqual(vehiclesAttributes[0]);
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
            _members: invalidMembersAttributes,
        };

        const result = Household.create(householdAttributes);
        expect(hasErrors(result)).toBe(true);
        const errors = unwrap(result) as Error[];
        expect(errors.length).toBe(2);
        expect(errors[0].message).toContain('Person 0 validateParams: age should be a positive integer');
        expect(errors[1].message).toContain('Person 1 validateParams: ageGroup should be a string');
    });

    test('should return errors for invalid vehicles attributes when creating a Household instance', () => {
        const invalidVehiclesAttributes = [
            {
                _uuid: uuidV4(),
                make: 123, // Invalid type, should be string
                model: 'Civic',
                modelYear: 2021,
                _isValid: true,
            },
        ];

        const householdAttributes: { [key: string]: unknown } = {
            ...validAttributes,
            _vehicles: invalidVehiclesAttributes,
        };

        const result = Household.create(householdAttributes);
        expect(hasErrors(result)).toBe(true);
        const errors = unwrap(result) as Error[];
        expect(errors.length).toBe(1);
        expect(errors[0].message).toContain('Vehicle 0 validateParams: make should be a string');
    });

});
