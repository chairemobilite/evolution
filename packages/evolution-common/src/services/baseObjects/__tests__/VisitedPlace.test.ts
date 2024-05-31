/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { VisitedPlace, VisitedPlaceAttributes, ExtendedVisitedPlaceAttributes, visitedPlaceAttributes } from '../VisitedPlace';
import { PlaceAttributes, placeAttributes } from '../Place';
import { v4 as uuidV4 } from 'uuid';
import { WeightMethod, WeightMethodAttributes } from '../WeightMethod';
import { isOk, hasErrors, unwrap } from '../../../types/Result.type';

describe('VisitedPlace', () => {
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

    const validVisitedPlaceAttributes: VisitedPlaceAttributes = {
        ...validPlaceAttributes,
        startDate: '2023-05-21',
        endDate: '2023-05-21',
        startTime: 3600,
        endTime: 7200,
        activity: 'work',
        activityCategory: 'work',
    };

    const extendedVisitedPlaceAttributes: ExtendedVisitedPlaceAttributes = {
        ...validVisitedPlaceAttributes,
        customAttribute1: 'value1',
        customAttribute2: 'value2',
    };

    test('should create a VisitedPlace instance with valid attributes', () => {
        const visitedPlace = new VisitedPlace(validVisitedPlaceAttributes);
        expect(visitedPlace).toBeInstanceOf(VisitedPlace);
        expect(visitedPlace.attributes).toEqual(validVisitedPlaceAttributes);
    });

    test('should have a validateParams section for each attribute', () => {
        const validateParamsCode = VisitedPlace.validateParams.toString();
        visitedPlaceAttributes.filter((attribute) => attribute !== '_uuid' && attribute !== '_weights' && !placeAttributes.includes(attribute)).forEach((attributeName) => {
            expect(validateParamsCode).toContain('\'' + attributeName + '\'');
        });
    });

    test('should get uuid', () => {
        const place = new VisitedPlace({ ...validVisitedPlaceAttributes, _uuid: '11b78eb3-a5d8-484d-805d-1f947160bb9e' });
        expect(place._uuid).toBe('11b78eb3-a5d8-484d-805d-1f947160bb9e');
    });

    test('should create a VisitedPlace instance with valid attributes', () => {
        const result = VisitedPlace.create(validPlaceAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(VisitedPlace);
    });

    test('should return an error for invalid params', () => {
        const invalidAttributes = 'foo' as any;
        const result = VisitedPlace.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[])).toHaveLength(1);
    });

    test('should create a VisitedPlace instance with extended attributes', () => {
        const result = VisitedPlace.create(extendedVisitedPlaceAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(VisitedPlace);
    });

    test('should return errors for invalid attributes', () => {
        const invalidAttributes = { ...validPlaceAttributes, name: -1 };
        const result = VisitedPlace.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should unserialize a VisitedPlace instance', () => {
        const visitedPlace = VisitedPlace.unserialize(validVisitedPlaceAttributes);
        expect(visitedPlace).toBeInstanceOf(VisitedPlace);
        expect(visitedPlace.attributes).toEqual(validVisitedPlaceAttributes);
    });

    test('should validate VisitedPlace attributes', () => {
        const errors = VisitedPlace.validateParams(validVisitedPlaceAttributes);
        expect(errors).toHaveLength(0);
    });

    // ... (previous test cases)

    test('should return errors for invalid VisitedPlace attributes', () => {
        const invalidAttributes = { ...validVisitedPlaceAttributes, startDate: 123 };
        const errors = VisitedPlace.validateParams(invalidAttributes);
        expect(errors).toHaveLength(1);
    });

    test('should validate a VisitedPlace instance', () => {
        const visitedPlace = new VisitedPlace(validPlaceAttributes);
        expect(visitedPlace.validate()).toBe(true);
        expect(visitedPlace.isValid()).toBe(true);
    });

    test('should create a VisitedPlace instance with custom attributes', () => {
        const customAttributes = {
            customAttribute1: 'value1',
            customAttribute2: 'value2',
        };
        const placeAttributes = {
            ...validPlaceAttributes,
            ...customAttributes,
        };
        const place = new VisitedPlace(placeAttributes);
        expect(place).toBeInstanceOf(VisitedPlace);
        expect(place.attributes).toEqual(validPlaceAttributes);
        expect(place.customAttributes).toEqual(customAttributes);
    });

    describe('validateParams', () => {
        test.each([
            ['startDate', 123],
            ['endDate', 123],
            ['startTime', 'invalid'],
            ['endTime', 'invalid'],
            ['activity', 123],
            ['activityCategory', 123],
        ])('should return an error for invalid %s', (param, value) => {
            const invalidAttributes = { ...validVisitedPlaceAttributes, [param]: value };
            const errors = VisitedPlace.validateParams(invalidAttributes);
            expect(errors[0].toString()).toContain(param);
            expect(errors).toHaveLength(1);
        });

        test('should return no errors for valid attributes', () => {
            const errors = VisitedPlace.validateParams(validVisitedPlaceAttributes);
            expect(errors).toHaveLength(0);
        });
    });

    describe('Getters and Setters', () => {
        test.each([
            ['startDate', '2023-05-22'],
            ['endDate', '2023-05-22'],
            ['startTime', 7200],
            ['endTime', 10800],
            ['activity', 'leisure'],
            ['activityCategory', 'leisure'],
        ])('should set and get %s', (attribute, value) => {
            const visitedPlace = new VisitedPlace(validVisitedPlaceAttributes);
            visitedPlace[attribute] = value;
            expect(visitedPlace[attribute]).toEqual(value);
        });

        describe('Getters for attributes with no setters', () => {
            test.each([
                ['_uuid', validVisitedPlaceAttributes._uuid],
                ['customAttributes', {
                    customAttribute1: extendedVisitedPlaceAttributes.customAttribute1,
                    customAttribute2: extendedVisitedPlaceAttributes.customAttribute2
                }],
                ['attributes', validVisitedPlaceAttributes],
            ])('should set and get %s', (attribute, value) => {
                const visitedPlace = new VisitedPlace(extendedVisitedPlaceAttributes);
                expect(visitedPlace[attribute]).toEqual(value);
            });
        });

        test.each([
            ['_isValid', false],
            ['_weights', [{ weight: 2.0, method: new WeightMethod(weightMethodAttributes) }]],
            ['journeyUuid', uuidV4()],
        ])('should set and get %s', (attribute, value) => {
            const visitedPlace = new VisitedPlace(validVisitedPlaceAttributes);
            visitedPlace[attribute] = value;
            expect(visitedPlace[attribute]).toEqual(value);
        });
    });
});

