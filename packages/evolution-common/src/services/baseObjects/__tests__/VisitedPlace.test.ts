/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { VisitedPlace, VisitedPlaceAttributes, ExtendedVisitedPlaceAttributes, visitedPlaceAttributes } from '../VisitedPlace';
import { ExtendedPlaceAttributes } from '../Place';
import { v4 as uuidV4 } from 'uuid';
import { WeightMethod, WeightMethodAttributes } from '../WeightMethod';
import { isOk, hasErrors, unwrap } from '../../../types/Result.type';
import { startEndDateAndTimesAttributes } from '../StartEndable';
import { SurveyObjectsRegistry } from '../SurveyObjectsRegistry';

describe('VisitedPlace', () => {
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

    const validPlaceAttributes: ExtendedPlaceAttributes = {
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

    const validVisitedPlaceAttributes: VisitedPlaceAttributes = {
        _uuid: uuidV4(),
        startDate: '2023-05-21',
        endDate: '2023-05-21',
        startTime: 3600,
        endTime: 7200,
        startTimePeriod: 'am',
        endTimePeriod: 'pm',
        activity: 'work',
        activityCategory: 'work',
        shortcut: uuidV4(),
        _sequence: 1,
        _weights: [{ weight: 1.2, method: new WeightMethod(weightMethodAttributes) }],
        _isValid: true
    };

    const validVisitedPlaceAttributesWithPlace: ExtendedVisitedPlaceAttributes = {
        ...validVisitedPlaceAttributes,
        _place: validPlaceAttributes
    };

    const extendedVisitedPlaceAttributes: ExtendedVisitedPlaceAttributes = {
        ...validVisitedPlaceAttributesWithPlace,
        customAttribute1: 'value1',
        customAttribute2: 'value2',
    };

    test('should create a VisitedPlace instance with valid attributes', () => {
        const visitedPlace = new VisitedPlace(validVisitedPlaceAttributesWithPlace, registry);
        expect(visitedPlace).toBeInstanceOf(VisitedPlace);
        expect(visitedPlace.attributes).toEqual(validVisitedPlaceAttributes);
    });

    test('should have a validateParams section for each attribute', () => {
        const validateParamsCode = VisitedPlace.validateParams.toString();
        visitedPlaceAttributes.filter((attribute) => attribute !== '_uuid' && attribute !== '_weights' && !(startEndDateAndTimesAttributes as unknown as string[]).includes(attribute)).forEach((attributeName) => {
            expect(validateParamsCode).toContain('\'' + attributeName + '\'');
        });
    });

    test('should get uuid', () => {
        const place = new VisitedPlace({ ...validVisitedPlaceAttributesWithPlace, _uuid: '11b78eb3-a5d8-484d-805d-1f947160bb9e' }, registry);
        expect(place._uuid).toBe('11b78eb3-a5d8-484d-805d-1f947160bb9e');
    });

    test('should create a VisitedPlace instance with valid attributes', () => {
        const result = VisitedPlace.create(validVisitedPlaceAttributesWithPlace, registry);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(VisitedPlace);
    });

    test('should return an error for invalid params', () => {
        const invalidAttributes = 'foo' as any;
        const result = VisitedPlace.create(invalidAttributes, registry);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[])).toHaveLength(1);
    });

    test('should create a VisitedPlace instance with extended attributes', () => {
        const result = VisitedPlace.create(extendedVisitedPlaceAttributes, registry);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(VisitedPlace);
    });

    test('should return errors for invalid attributes', () => {
        const invalidAttributes = { ...validVisitedPlaceAttributesWithPlace, _place: { ...validPlaceAttributes, name: -1 } };
        const result = VisitedPlace.create(invalidAttributes, registry);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should unserialize a VisitedPlace instance', () => {
        const visitedPlace = VisitedPlace.unserialize(validVisitedPlaceAttributesWithPlace, registry);
        expect(visitedPlace).toBeInstanceOf(VisitedPlace);
        expect(visitedPlace.attributes).toEqual(validVisitedPlaceAttributes);
    });

    test('should validate VisitedPlace attributes', () => {
        const errors = VisitedPlace.validateParams(validVisitedPlaceAttributesWithPlace);
        expect(errors).toHaveLength(0);
    });

    test('should return errors for self-reference shortcut', () => {
        const invalidAttributes = { ...validVisitedPlaceAttributesWithPlace, shortcut: validVisitedPlaceAttributesWithPlace._uuid };
        const errors = VisitedPlace.validateParams(invalidAttributes);
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toEqual('VisitedPlace validateParams: shortcut cannot reference itself');
    });

    test('should allow shortcut to be undefined', () => {
        const attrs = { ...validVisitedPlaceAttributesWithPlace };
        delete (attrs as any).shortcut;
        const errors = VisitedPlace.validateParams(attrs);
        expect(errors).toHaveLength(0);
    });

    test('should return errors for invalid VisitedPlace attributes', () => {
        const invalidAttributes = { ...validVisitedPlaceAttributesWithPlace, startDate: 123 };
        const errors = VisitedPlace.validateParams(invalidAttributes);
        expect(errors).toHaveLength(1);
    });

    test('should validate a VisitedPlace instance', () => {
        const visitedPlace = new VisitedPlace(validVisitedPlaceAttributesWithPlace, registry);
        expect(visitedPlace.validate()).toBe(true);
        expect(visitedPlace.isValid()).toBe(true);
    });

    test('should create a VisitedPlace instance with custom attributes', () => {
        const customAttributes = {
            customAttribute1: 'value1',
            customAttribute2: 'value2',
        };
        const visitedPlaceAttributesWithCustom = {
            ...validVisitedPlaceAttributesWithPlace,
            ...customAttributes,
        };
        const visitedPlace = new VisitedPlace(visitedPlaceAttributesWithCustom, registry);
        expect(visitedPlace).toBeInstanceOf(VisitedPlace);
        expect(visitedPlace.attributes).toEqual(validVisitedPlaceAttributes);
        expect(visitedPlace.customAttributes).toEqual(customAttributes);
    });

    describe('validateParams', () => {
        test.each([
            ['startDate', 123],
            ['endDate', 123],
            ['startTime', 'invalid'],
            ['endTime', 'invalid'],
            ['startTimePeriod', 123],
            ['endTimePeriod', 123],
            ['activity', 123],
            ['activityCategory', 123],
            ['shortcut', 'invalid-uuid'],
            ['_sequence', 'invalid'],
            ['preData', 'invalid'],
            ['preData', []],
            ['preData', new Date() as any],
            ['preData', true as any]
        ])('should return an error for invalid %s', (param, value) => {
            const invalidAttributes = { ...validVisitedPlaceAttributesWithPlace, [param]: value };
            const errors = VisitedPlace.validateParams(invalidAttributes);
            expect(errors[0].toString()).toContain(param);
            expect(errors).toHaveLength(1);
        });

        test('should return no errors for valid attributes', () => {
            const errors = VisitedPlace.validateParams(validVisitedPlaceAttributesWithPlace);
            expect(errors).toHaveLength(0);
        });
    });

    describe('Getters and Setters', () => {
        test.each([
            ['startDate', '2023-05-22'],
            ['endDate', '2023-05-22'],
            ['startTime', 7200],
            ['endTime', 10800],
            ['startTimePeriod', 'am'],
            ['endTimePeriod', 'pm'],
            ['activity', 'leisure'],
            ['activityCategory', 'leisure'],
            ['shortcut', uuidV4()],
            ['_sequence', 2],
            ['preData', { importedVisitedPlaceData: 'value', duration: 30 }],
        ])('should set and get %s', (attribute, value) => {
            const visitedPlace = new VisitedPlace(validVisitedPlaceAttributesWithPlace, registry);
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
                const visitedPlace = new VisitedPlace(extendedVisitedPlaceAttributes, registry);
                expect(visitedPlace[attribute]).toEqual(value);
            });
        });

        test.each([
            ['_isValid', false],
            ['_weights', [{ weight: 2.0, method: new WeightMethod(weightMethodAttributes) }]],
            ['journeyUuid', uuidV4()],
            ['_place', validPlaceAttributes],
        ])('should set and get %s', (attribute, value) => {
            const visitedPlace = new VisitedPlace(validVisitedPlaceAttributesWithPlace, registry);
            visitedPlace[attribute] = value;
            expect(visitedPlace[attribute]).toEqual(value);
        });
    });

    describe('preData serialization', () => {
        test('should preserve preData through (un)serialize', () => {
            const attrs = { ...validVisitedPlaceAttributesWithPlace, preData: { importedVisitedPlaceData: 'value', duration: 30 } };
            const vp1 = new VisitedPlace(attrs, registry);
            const vp2 = VisitedPlace.unserialize(attrs, registry);
            expect(vp1.preData).toEqual({ importedVisitedPlaceData: 'value', duration: 30 });
            expect(vp2.preData).toEqual({ importedVisitedPlaceData: 'value', duration: 30 });
        });
    });
});

