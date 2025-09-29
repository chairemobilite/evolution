/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { WorkPlace } from '../WorkPlace';
import { placeAttributes } from '../Place';
import { v4 as uuidV4 } from 'uuid';
import { WeightMethod, WeightMethodAttributes } from '../WeightMethod';
import { isOk, hasErrors, unwrap } from '../../../types/Result.type';
import { SurveyObjectsRegistry } from '../SurveyObjectsRegistry';

describe('WorkPlace', () => {
    let registry: SurveyObjectsRegistry;

    beforeEach(() => {
        registry = new SurveyObjectsRegistry();
        registry.clear();
    });

    const weightMethodAttributes : WeightMethodAttributes = {
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
        propertyRegistryId: 'ABCD1234',
        buildingId: '1',
        internalId: '1',
        geocodingPrecisionCategory: 'precise',
        geocodingPrecisionMeters: 10,
        geocodingQueryString: 'Test Place',
        geocodingName: 'Test Place Name',
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

    const validWorkPlaceAttributes: { [key: string]: unknown } = {
        ...validPlaceAttributes,
        parkingType: 'interiorAssignedOrGuaranteed',
        parkingFeeType: 'paidByEmployee',
    };

    const extendedWorkPlaceAttributes: { [key: string]: unknown } = {
        ...validWorkPlaceAttributes,
        customAttribute1: 'value1',
        customAttribute2: 'value2',
    };

    test('should create a WorkPlace instance with valid attributes', () => {
        const workPlace = new WorkPlace(validWorkPlaceAttributes, registry);
        expect(workPlace).toBeInstanceOf(WorkPlace);
        expect(workPlace.attributes).toEqual(validWorkPlaceAttributes);
    });

    test('should have a validateParams section for each attribute', () => {
        const validateParamsCode = WorkPlace.validateParams.toString();
        placeAttributes.filter((attribute) => attribute !== '_uuid' && attribute !== '_weights').forEach((attributeName) => {
            expect(validateParamsCode).toContain('\''+attributeName+'\'');
        });
    });

    test('should get uuid', () => {
        const place = new WorkPlace({ ...validWorkPlaceAttributes, _uuid: '11b78eb3-a5d8-484d-805d-1f947160bb9e' }, registry);
        expect(place._uuid).toBe('11b78eb3-a5d8-484d-805d-1f947160bb9e');
    });

    test('should create a WorkPlace instance with valid attributes', () => {
        const result = WorkPlace.create(validPlaceAttributes, registry);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(WorkPlace);
    });

    test('should create a WorkPlace instance with extended attributes', () => {
        const result = WorkPlace.create(extendedWorkPlaceAttributes, registry);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(WorkPlace);
    });

    test('should return an error for invalid params', () => {
        const invalidAttributes = 'foo' as any;
        const result = WorkPlace.create(invalidAttributes, registry);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[])).toHaveLength(1);
    });

    test('should return errors for invalid attributes', () => {
        const invalidAttributes = { ...validPlaceAttributes, name: -1 };
        const result = WorkPlace.create(invalidAttributes, registry);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should unserialize a WorkPlace instance', () => {
        const workPlace = WorkPlace.unserialize(validWorkPlaceAttributes, registry);
        expect(workPlace).toBeInstanceOf(WorkPlace);
        expect(workPlace.attributes).toEqual(validWorkPlaceAttributes);
    });

    test('should validate WorkPlace attributes', () => {
        const errors = WorkPlace.validateParams(validWorkPlaceAttributes);
        expect(errors).toHaveLength(0);
    });

    test('should return errors for invalid WorkPlace attributes', () => {
        const invalidAttributes = { ...validWorkPlaceAttributes, parkingType: 123 };
        const errors = WorkPlace.validateParams(invalidAttributes);
        expect(errors).toHaveLength(1);
    });

    test('should validate a WorkPlace instance', () => {
        const workPlace = new WorkPlace(validPlaceAttributes, registry);
        expect(workPlace.validate()).toBe(true);
        expect(workPlace.isValid()).toBe(true);
    });

    test('should create a WorkPlace instance with custom attributes', () => {
        const customAttributes = {
            customAttribute1: 'value1',
            customAttribute2: 'value2',
        };
        const placeAttributes = {
            ...validPlaceAttributes,
            ...customAttributes,
        };
        const place = new WorkPlace(placeAttributes, registry);
        expect(place).toBeInstanceOf(WorkPlace);
        expect(place.attributes).toEqual(validPlaceAttributes);
        expect(place.customAttributes).toEqual(customAttributes);
    });

    describe('validateParams', () => {
        test.each([
            ['parkingType', 123],
            ['parkingFeeType', 123],
        ])('should return an error for invalid %s', (param, value) => {
            const invalidAttributes = { ...validWorkPlaceAttributes, [param]: value };
            const errors = WorkPlace.validateParams(invalidAttributes);
            expect(errors[0].toString()).toContain(param);
            expect(errors).toHaveLength(1);
        });

        test('should return no errors for valid attributes', () => {
            const errors = WorkPlace.validateParams(validWorkPlaceAttributes);
            expect(errors).toHaveLength(0);
        });
    });

    describe('Getters and Setters', () => {
        test.each([
            ['parkingType', 'exteriorAssignedOrGuaranteed'],
            ['parkingFeeType', 'free'],
        ])('should set and get %s', (attribute, value) => {
            const workPlace = new WorkPlace(validWorkPlaceAttributes, registry);
            workPlace[attribute] = value;
            expect(workPlace[attribute]).toEqual(value);
        });

        describe('Getters for attributes with no setters', () => {
            test.each([
                ['_uuid', validWorkPlaceAttributes._uuid],
                ['customAttributes', {
                    customAttribute1: extendedWorkPlaceAttributes.customAttribute1,
                    customAttribute2: extendedWorkPlaceAttributes.customAttribute2
                }],
                ['attributes', validWorkPlaceAttributes],
            ])('should set and get %s', (attribute, value) => {
                const workPlace = new WorkPlace(extendedWorkPlaceAttributes, registry);
                expect(workPlace[attribute]).toEqual(value);
            });
        });

        test.each([
            ['_isValid', false],
            ['_weights', [{ weight: 2.0, method: new WeightMethod(weightMethodAttributes) }]],
        ])('should set and get %s', (attribute, value) => {
            const workPlace = new WorkPlace(validWorkPlaceAttributes, registry);
            workPlace[attribute] = value;
            expect(workPlace[attribute]).toEqual(value);
        });
    });

});
