/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { SchoolPlace, schoolPlaceAttributes } from '../SchoolPlace';
import { PlaceAttributes, placeAttributes } from '../Place';
import { v4 as uuidV4 } from 'uuid';
import { WeightMethod, WeightMethodAttributes } from '../WeightMethod';
import { isOk, hasErrors, unwrap } from '../../../types/Result.type';

describe('SchoolPlace', () => {

    const weightMethodAttributes: WeightMethodAttributes = {
        _uuid: uuidV4(),
        shortname: 'sample-shortname',
        name: 'Sample Weight Method',
        description: 'Sample weight method description',
    };

    const validPlaceAttributes: PlaceAttributes = {
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

    const validSchoolPlaceAttributes = {
        ...validPlaceAttributes,
        parkingType: 'interiorAssignedOrGuaranteed',
        parkingFeeType: 'paidByEmployee',
    };

    const extendedSchoolPlaceAttributes = {
        ...validSchoolPlaceAttributes,
        customAttribute1: 'value1',
        customAttribute2: 'value2',
    };

    test('should create a SchoolPlace instance with valid attributes', () => {
        const schoolPlace = new SchoolPlace(validSchoolPlaceAttributes);
        expect(schoolPlace).toBeInstanceOf(SchoolPlace);
        expect(schoolPlace.attributes).toEqual(validSchoolPlaceAttributes);
    });

    test('should have a validateParams section for each attribute', () => {
        const validateParamsCode = SchoolPlace.validateParams.toString();
        schoolPlaceAttributes.filter((attribute) => attribute !== '_uuid' && !placeAttributes.includes(attribute)).forEach((attributeName) => {
            expect(validateParamsCode).toContain('\''+attributeName+'\'');
        });
    });

    test('should get uuid', () => {
        const place = new SchoolPlace({ ...validSchoolPlaceAttributes, _uuid: '11b78eb3-a5d8-484d-805d-1f947160bb9e' });
        expect(place._uuid).toBe('11b78eb3-a5d8-484d-805d-1f947160bb9e');
    });

    test('should create a SchoolPlace instance with valid attributes', () => {
        const result = SchoolPlace.create(validPlaceAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(SchoolPlace);
    });

    test('should return an error for invalid params', () => {
        const invalidAttributes = 'foo' as any;
        const result = SchoolPlace.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[])).toHaveLength(1);
    });

    test('should create a SchoolPlace instance with extended attributes', () => {
        const result = SchoolPlace.create(extendedSchoolPlaceAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(SchoolPlace);
    });

    test('should return errors for invalid attributes', () => {
        const invalidAttributes = { ...validPlaceAttributes, name: -1 };
        const result = SchoolPlace.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should unserialize a SchoolPlace instance', () => {
        const schoolPlace = SchoolPlace.unserialize(validSchoolPlaceAttributes);
        expect(schoolPlace).toBeInstanceOf(SchoolPlace);
        expect(schoolPlace.attributes).toEqual(validSchoolPlaceAttributes);
    });

    test('should validate SchoolPlace attributes', () => {
        const errors = SchoolPlace.validateParams(validSchoolPlaceAttributes);
        expect(errors).toHaveLength(0);
    });

    test('should return errors for invalid SchoolPlace attributes', () => {
        const invalidAttributes = { ...validSchoolPlaceAttributes, parkingType: 123 };
        const errors = SchoolPlace.validateParams(invalidAttributes);
        expect(errors).toHaveLength(1);
    });

    test('should validate a SchoolPlace instance', () => {
        const schoolPlace = new SchoolPlace(validPlaceAttributes);
        expect(schoolPlace.validate()).toBe(true);
        expect(schoolPlace.isValid()).toBe(true);
    });

    test('should create a SchoolPlace instance with custom attributes', () => {
        const customAttributes = {
            customAttribute1: 'value1',
            customAttribute2: 'value2',
        };
        const placeAttributes = {
            ...validPlaceAttributes,
            ...customAttributes,
        };
        const place = new SchoolPlace(placeAttributes);
        expect(place).toBeInstanceOf(SchoolPlace);
        expect(place.attributes).toEqual(validPlaceAttributes);
        expect(place.customAttributes).toEqual(customAttributes);
    });

    describe('validateParams', () => {
        test.each([
            ['parkingType', 123],
            ['parkingFeeType', 123],
        ])('should return an error for invalid %s', (param, value) => {
            const invalidAttributes = { ...validSchoolPlaceAttributes, [param]: value };
            const errors = SchoolPlace.validateParams(invalidAttributes);
            expect(errors[0].toString()).toContain(param);
            expect(errors).toHaveLength(1);
        });

        test('should return no errors for valid attributes', () => {
            const errors = SchoolPlace.validateParams(validSchoolPlaceAttributes);
            expect(errors).toHaveLength(0);
        });
    });

    describe('Getters and Setters', () => {
        test.each([
            ['parkingType', 'streetside'],
            ['parkingFeeType', 'paidByStudent'],
        ])('should set and get %s', (attribute, value) => {
            const schoolPlace = new SchoolPlace(validSchoolPlaceAttributes);
            schoolPlace[attribute] = value;
            expect(schoolPlace[attribute]).toEqual(value);
        });

        describe('Getters for attributes with no setters', () => {
            test.each([
                ['_uuid', validSchoolPlaceAttributes._uuid],
                ['customAttributes', {
                    customAttribute1: extendedSchoolPlaceAttributes.customAttribute1,
                    customAttribute2: extendedSchoolPlaceAttributes.customAttribute2
                }],
                ['attributes', validSchoolPlaceAttributes],
            ])('should set and get %s', (attribute, value) => {
                const schoolPlace = new SchoolPlace(extendedSchoolPlaceAttributes);
                expect(schoolPlace[attribute]).toEqual(value);
            });
        });

        test.each([
            ['_isValid', false],
            ['_weights', [{ weight: 2.0, method: new WeightMethod(weightMethodAttributes) }]],
        ])('should set and get %s', (attribute, value) => {
            const schoolPlace = new SchoolPlace(validSchoolPlaceAttributes);
            schoolPlace[attribute] = value;
            expect(schoolPlace[attribute]).toEqual(value);
        });
    });
});
