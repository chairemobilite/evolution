/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Junction, junctionAttributes } from '../Junction';
import { placeAttributes } from '../Place';
import { v4 as uuidV4 } from 'uuid';
import { WeightMethod, WeightMethodAttributes } from '../WeightMethod';
import { isOk, hasErrors, unwrap } from '../../../types/Result.type';

describe('Junction', () => {

    const weightMethodAttributes: WeightMethodAttributes = {
        _uuid: uuidV4(),
        shortname: 'sample-shortname',
        name: 'Sample Weight Method',
        description: 'Sample weight method description',
    };

    const validPlaceAttributes: { [key: string]: unknown } = {
        _uuid: uuidV4(),
        name: 'Test Place',
        shortname: 'Test',
        osmId: '123',
        landRoleId: 'residential',
        postalId: '12345',
        buildingId: '1',
        internalId: '1',
        geocodingPrecisionCategory: 'precise',
        geocodingPrecisionMeters: 10,
        geocodingQueryString: 'Test Place',
        lastAction: 'findPlace',
        deviceUsed: 'tablet',
        zoom: 15,
        geography: {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [0, 0],
            },
            properties: {},
        },
        _weights: [{ weight: 1.2, method: new WeightMethod(weightMethodAttributes) }],
        _isValid: true
    };

    const validJunctionAttributes: { [key: string]: unknown } = {
        ...validPlaceAttributes,
        startDate: '2023-05-21',
        endDate: '2023-05-22',
        startTime: 3600,
        endTime: 7200,
        parkingType: 'streetside',
        parkingFeeType: 'free',
        transitPlaceType: 'trainStation'
    };

    const extendedJunctionAttributes: { [key: string]: unknown } = {
        ...validJunctionAttributes,
        customAttribute1: 'value1',
        customAttribute2: 'value2',
    };

    test('should create a Junction instance with valid attributes', () => {
        const junction = new Junction(validJunctionAttributes);
        expect(junction).toBeInstanceOf(Junction);
        expect(junction.attributes).toEqual(validJunctionAttributes);
    });

    test('should have a validateParams section for each attribute', () => {
        const validateParamsCode = Junction.validateParams.toString();
        junctionAttributes.filter((attribute) => attribute !== '_uuid' && attribute !== '_weights' && !placeAttributes.includes(attribute)).forEach((attributeName) => {
            expect(validateParamsCode).toContain('\'' + attributeName + '\'');
        });
    });

    test('should get uuid', () => {
        const place = new Junction({ ...validJunctionAttributes, _uuid: '11b78eb3-a5d8-484d-805d-1f947160bb9e' });
        expect(place._uuid).toBe('11b78eb3-a5d8-484d-805d-1f947160bb9e');
    });

    test('should create a Junction instance with valid attributes', () => {
        const result = Junction.create(validPlaceAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Junction);
    });

    test('should return an error for invalid params', () => {
        const invalidAttributes = 'foo' as any;
        const result = Junction.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[])).toHaveLength(1);
    });

    test('should create a Junction instance with extended attributes', () => {
        const result = Junction.create(extendedJunctionAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Junction);
    });

    test('should return errors for invalid attributes', () => {
        const invalidAttributes = { ...validPlaceAttributes, name: -1 };
        const result = Junction.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should unserialize a Junction instance', () => {
        const junction = Junction.unserialize(validJunctionAttributes);
        expect(junction).toBeInstanceOf(Junction);
        expect(junction.attributes).toEqual(validJunctionAttributes);
    });

    test('should validate Junction attributes', () => {
        const errors = Junction.validateParams(validJunctionAttributes);
        expect(errors).toHaveLength(0);
    });

    test('should return errors for invalid Junction attributes', () => {
        const invalidAttributes = { ...validJunctionAttributes, startDate: 123 };
        const errors = Junction.validateParams(invalidAttributes);
        expect(errors).toHaveLength(1);
    });

    test('should validate a Junction instance', () => {
        const junction = new Junction(validPlaceAttributes);
        expect(junction.validate()).toBe(true);
        expect(junction.isValid()).toBe(true);
    });

    test('should create a Junction instance with custom attributes', () => {
        const customAttributes = {
            customAttribute1: 'value1',
            customAttribute2: 'value2',
        };
        const placeAttributes = {
            ...validPlaceAttributes,
            ...customAttributes,
        };
        const place = new Junction(placeAttributes);
        expect(place).toBeInstanceOf(Junction);
        expect(place.attributes).toEqual(validPlaceAttributes);
        expect(place.customAttributes).toEqual(customAttributes);
    });

    describe('validateParams', () => {
        test.each([
            ['startDate', 123],
            ['endDate', 123],
            ['startTime', -1],
            ['endTime', -1],
            ['parkingType', 123],
            ['parkingFeeType', 123],
            ['transitPlaceType', 123],
        ])('should return an error for invalid %s', (param, value) => {
            const invalidAttributes = { ...validJunctionAttributes, [param]: value };
            const errors = Junction.validateParams(invalidAttributes);
            expect(errors[0].toString()).toContain(param);
            expect(errors).toHaveLength(1);
        });

        test('should return no errors for valid attributes', () => {
            const errors = Junction.validateParams(validJunctionAttributes);
            expect(errors).toHaveLength(0);
        });
    });

    describe('Getters and Setters', () => {
        test.each([
            ['startDate', '2023-05-20'],
            ['endDate', '2023-05-23'],
            ['startTime', 1800],
            ['endTime', 5400],
            ['parkingType', 'interiorAssignedOrGuaranteed'],
            ['parkingFeeType', 'paidByEmployer'],
            ['transitPlaceType', 'busStation'],
        ])('should set and get %s', (attribute, value) => {
            const junction = new Junction(validJunctionAttributes);
            junction[attribute] = value;
            expect(junction[attribute]).toEqual(value);
        });

        describe('Getters for attributes with no setters', () => {
            test.each([
                ['_uuid', extendedJunctionAttributes._uuid],
                ['customAttributes', {
                    customAttribute1: extendedJunctionAttributes.customAttribute1,
                    customAttribute2: extendedJunctionAttributes.customAttribute2
                }],
                ['attributes', validJunctionAttributes],
            ])('should set and get %s', (attribute, value) => {
                const junction = new Junction(extendedJunctionAttributes);
                expect(junction[attribute]).toEqual(value);
            });
        });

        test.each([
            ['_isValid', false],
            ['_weights', [{ weight: 2.0, method: new WeightMethod(weightMethodAttributes) }]],
        ])('should set and get %s', (attribute, value) => {
            const junction = new Junction(validJunctionAttributes);
            junction[attribute] = value;
            expect(junction[attribute]).toEqual(value);
        });
    });
});
