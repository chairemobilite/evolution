/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Vehicle, VehicleAttributes, ExtendedVehicleAttributes, vehicleAttributes } from '../Vehicle';
import { v4 as uuidV4 } from 'uuid';
import { WeightMethod, WeightMethodAttributes } from '../WeightMethod';
import { isOk, hasErrors, unwrap } from '../../../types/Result.type';
import { SurveyObjectsRegistry } from '../SurveyObjectsRegistry';

describe('Vehicle', () => {
    let registry: SurveyObjectsRegistry;

    beforeEach(() => {
        registry = new SurveyObjectsRegistry();
    });

    const weightMethodAttributes: WeightMethodAttributes = {
        _uuid: uuidV4(),
        shortname: 'sample-shortname',
        name: 'Sample Weight Method',
        description: 'Sample weight method description',
    };

    const validAttributes: VehicleAttributes = {
        _uuid: uuidV4(),
        make: 'Toyota',
        model: 'Camry',
        type: 'Sedan',
        capacitySeated: 5,
        capacityStanding: 0,
        modelYear: 2022,
        isElectric: false,
        isPluginHybrid: false,
        isHybrid: true,
        isHydrogen: false,
        acquiredYear: 2023,
        licensePlateNumber: 'ABC123',
        internalId: 'V001',
        _weights: [{ weight: 1.5, method: new WeightMethod(weightMethodAttributes) }],
        _isValid: true,
    };

    const extendedAttributes: ExtendedVehicleAttributes = {
        ...validAttributes,
        customAttribute: 'Custom Value',
    };

    test('should create a Vehicle instance with valid attributes', () => {
        const vehicle = new Vehicle(validAttributes, registry);
        expect(vehicle).toBeInstanceOf(Vehicle);
        expect(vehicle.attributes).toEqual(validAttributes);
    });

    test('should have a validateParams section for each attribute', () => {
        const validateParamsCode = Vehicle.validateParams.toString();
        vehicleAttributes.filter((attribute) => attribute !== '_uuid' && attribute !== '_weights').forEach((attributeName) => {
            expect(validateParamsCode).toContain('\'' + attributeName + '\'');
        });
    });

    test('should get uuid', () => {
        const vehicle = new Vehicle({ ...validAttributes, _uuid: '11b78eb3-a5d8-484d-805d-1f947160bb9e' }, registry);
        expect(vehicle._uuid).toBe('11b78eb3-a5d8-484d-805d-1f947160bb9e');
    });

    test('should create a Vehicle instance with valid attributes', () => {
        const result = Vehicle.create(validAttributes, registry);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Vehicle);
    });

    test('should return an error for invalid params', () => {
        const invalidAttributes = 'foo' as any;
        const result = Vehicle.create(invalidAttributes, registry);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should create a Vehicle instance with extended attributes', () => {
        const result = Vehicle.create(extendedAttributes, registry);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Vehicle);
    });

    test('should return errors for invalid attributes', () => {
        const invalidAttributes = { ...validAttributes, capacitySeated: -1 };
        const result = Vehicle.create(invalidAttributes, registry);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should unserialize a Vehicle instance', () => {
        const vehicle = Vehicle.unserialize(validAttributes, registry);
        expect(vehicle).toBeInstanceOf(Vehicle);
        expect(vehicle.attributes).toEqual(validAttributes);
    });

    test('should validate Vehicle attributes', () => {
        const errors = Vehicle.validateParams(validAttributes);
        expect(errors).toHaveLength(0);
    });

    test.each([
        ['make', 123],
        ['model', 123],
        ['type', 123],
        ['capacitySeated', 'invalid'],
        ['capacityStanding', 'invalid'],
        ['modelYear', 'invalid'],
        ['isElectric', 'invalid'],
        ['isPluginHybrid', 'invalid'],
        ['isHybrid', 'invalid'],
        ['acquiredYear', 'invalid'],
        ['licensePlateNumber', 123],
        ['internalId', 123],
    ])('should return an error for invalid %s', (param, value) => {
        const invalidAttributes = { ...validAttributes, [param]: value };
        const errors = Vehicle.validateParams(invalidAttributes);
        expect(errors[0].toString()).toContain(param);
        expect(errors).toHaveLength(1);
    });

    test('should validate a Vehicle instance', () => {
        const vehicle = new Vehicle(validAttributes, registry);
        expect(vehicle.validate()).toBe(true);
        expect(vehicle.isValid()).toBe(true);
    });

    test('should create a Vehicle instance with custom attributes', () => {
        const customAttributes = {
            customAttribute1: 'value1',
            customAttribute2: 'value2',
        };
        const vehicleAttributes = {
            ...validAttributes,
            ...customAttributes,
        };
        const vehicle = new Vehicle(vehicleAttributes, registry);
        expect(vehicle).toBeInstanceOf(Vehicle);
        expect(vehicle.attributes).toEqual(validAttributes);
        expect(vehicle.customAttributes).toEqual(customAttributes);
    });

    describe('Getters and Setters', () => {
        test.each([
            ['make', 'Honda'],
            ['model', 'Accord'],
            ['type', 'SUV'],
            ['capacitySeated', 7],
            ['capacityStanding', 2],
            ['modelYear', 2021],
            ['isElectric', true],
            ['isPluginHybrid', false],
            ['isHybrid', false],
            ['isHydrogen', false],
            ['acquiredYear', 2022],
            ['licensePlateNumber', 'XYZ789'],
            ['internalId', 'V002'],
        ])('should set and get %s', (attribute, value) => {
            const vehicle = new Vehicle(validAttributes, registry);
            vehicle[attribute] = value;
            expect(vehicle[attribute]).toEqual(value);
        });

        describe('Getters for attributes with no setters', () => {
            test.each([
                ['_uuid', extendedAttributes._uuid],
                ['customAttributes', { customAttribute: extendedAttributes.customAttribute }],
                ['attributes', validAttributes],
            ])('should set and get %s', (attribute, value) => {
                const vehicle = new Vehicle(extendedAttributes, registry);
                expect(vehicle[attribute]).toEqual(value);
            });
        });

        test.each([
            ['_isValid', false],
            ['_weights', [{ weight: 2.0, method: new WeightMethod(weightMethodAttributes) }]],
        ])('should set and get %s', (attribute, value) => {
            const vehicle = new Vehicle(validAttributes, registry);
            vehicle[attribute] = value;
            expect(vehicle[attribute]).toEqual(value);
        });
    });

    describe('Owner and Organization UUIDs', () => {
        test('should set and get ownerUuid', () => {
            const vehicle = new Vehicle(validAttributes, registry);
            const ownerUuid = uuidV4();
            vehicle.ownerUuid = ownerUuid;
            expect(vehicle.ownerUuid).toEqual(ownerUuid);
        });

        test('should set and get organizationUuid', () => {
            const vehicle = new Vehicle(validAttributes, registry);
            const organizationUuid = uuidV4();
            vehicle.organizationUuid = organizationUuid;
            expect(vehicle.organizationUuid).toEqual(organizationUuid);
        });
    });
});
