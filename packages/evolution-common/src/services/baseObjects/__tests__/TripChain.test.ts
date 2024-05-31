/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { TripChain, TripChainAttributes, ExtendedTripChainAttributes, tripChainAttributes } from '../TripChain';
import { TripAttributes } from '../Trip';
import { VisitedPlaceAttributes } from '../VisitedPlace';
import { v4 as uuidV4 } from 'uuid';
import { WeightMethod, WeightMethodAttributes } from '../WeightMethod';
import { isOk, hasErrors, unwrap } from '../../../types/Result.type';

describe('TripChain', () => {
    const weightMethodAttributes: WeightMethodAttributes = {
        _uuid: uuidV4(),
        shortname: 'sample-shortname',
        name: 'Sample Weight Method',
        description: 'Sample weight method description',
    };

    const validAttributes: TripChainAttributes = {
        _uuid: uuidV4(),
        startDate: '2023-05-21',
        endDate: '2023-05-21',
        startTime: 3600,
        endTime: 7200,
        category: 'simple',
        isMultiLoop: false,
        isConstrained: true,
        mainActivity: 'work',
        mainActivityCategory: 'work',
        _weights: [{ weight: 1.5, method: new WeightMethod(weightMethodAttributes) }],
        _isValid: true,
    };

    const extendedAttributes: ExtendedTripChainAttributes = {
        ...validAttributes,
        customAttribute: 'Custom Value',
        trips: [
            {
                _uuid: uuidV4(),
                startDate: '2023-05-21',
                startTime: 3600,
                endDate: '2023-05-21',
                endTime: 5400,
                _isValid: true,
            },
            {
                _uuid: uuidV4(),
                startDate: '2023-05-21',
                startTime: 5400,
                endDate: '2023-05-21',
                endTime: 7200,
                _isValid: true,
            },
        ],
        visitedPlaces: [
            {
                _uuid: uuidV4(),
                geography: {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [0, 0],
                    },
                    properties: {},
                },
                _isValid: true,
            },
            {
                _uuid: uuidV4(),
                geography: {
                    type: 'Feature',
                    geometry: {
                        type: 'Point',
                        coordinates: [1, 1],
                    },
                    properties: {},
                },
                _isValid: true,
            },
        ],
    };

    test('should create a TripChain instance with valid attributes', () => {
        const tripChain = new TripChain(validAttributes);
        expect(tripChain).toBeInstanceOf(TripChain);
        expect(tripChain.attributes).toEqual(validAttributes);
    });

    test('should have a validateParams section for each attribute', () => {
        const validateParamsCode = TripChain.validateParams.toString();
        tripChainAttributes.filter((attribute) => attribute !== '_uuid' && attribute !== '_weights').forEach((attributeName) => {
            expect(validateParamsCode).toContain('\'' + attributeName + '\'');
        });
    });

    test('should get uuid', () => {
        const tripChain = new TripChain({ ...validAttributes, _uuid: '11b78eb3-a5d8-484d-805d-1f947160bb9e' });
        expect(tripChain._uuid).toBe('11b78eb3-a5d8-484d-805d-1f947160bb9e');
    });

    test('should create a TripChain instance with valid attributes', () => {
        const result = TripChain.create(validAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(TripChain);
    });

    test('should return an error for invalid params', () => {
        const invalidAttributes = 'foo' as any;
        const result = TripChain.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should create a TripChain instance with extended attributes', () => {
        const result = TripChain.create(extendedAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(TripChain);
    });

    test('should return errors for invalid attributes', () => {
        const invalidAttributes = { ...validAttributes, startTime: 'invalid' };
        const result = TripChain.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should unserialize a TripChain instance', () => {
        const tripChain = TripChain.unserialize(validAttributes);
        expect(tripChain).toBeInstanceOf(TripChain);
        expect(tripChain.attributes).toEqual(validAttributes);
    });

    test('should validate TripChain attributes', () => {
        const errors = TripChain.validateParams(validAttributes);
        expect(errors).toHaveLength(0);
    });

    test('should return errors for invalid TripChain attributes', () => {
        const invalidAttributes = { ...validAttributes, startDate: 'invalid' };
        const errors = TripChain.validateParams(invalidAttributes);
        expect(errors).toHaveLength(1);
    });

    test('should validate a TripChain instance', () => {
        const tripChain = new TripChain(validAttributes);
        expect(tripChain.validate()).toBe(true);
        expect(tripChain.isValid()).toBe(true);
    });

    test('should create a TripChain instance with custom attributes', () => {
        const customAttributes = {
            customAttribute1: 'value1',
            customAttribute2: 'value2',
        };
        const tripChainAttributes = {
            ...validAttributes,
            ...customAttributes,
        };
        const tripChain = new TripChain(tripChainAttributes);
        expect(tripChain).toBeInstanceOf(TripChain);
        expect(tripChain.attributes).toEqual(validAttributes);
        expect(tripChain.customAttributes).toEqual(customAttributes);
    });

    describe('validateParams', () => {
        test.each([
            ['startDate', 123],
            ['endDate', 123],
            ['startTime', 'invalid'],
            ['endTime', 'invalid'],
            ['category', 123],
            ['isMultiLoop', 'invalid'],
            ['isConstrained', 'invalid'],
            ['mainActivity', 123],
            ['mainActivityCategory', 123],
        ])('should return an error for invalid %s', (param, value) => {
            const invalidAttributes = { ...validAttributes, [param]: value };
            const errors = TripChain.validateParams(invalidAttributes);
            expect(errors[0].toString()).toContain(param);
            expect(errors).toHaveLength(1);
        });

        test('should return no errors for valid attributes', () => {
            const errors = TripChain.validateParams(validAttributes);
            expect(errors).toHaveLength(0);
        });
    });

    describe('Getters and Setters', () => {
        test.each([
            ['startDate', '2023-05-22'],
            ['endDate', '2023-05-22'],
            ['startTime', 7200],
            ['endTime', 10800],
            ['category', 'complex'],
            ['isMultiLoop', true],
            ['isConstrained', false],
            ['mainActivity', 'school'],
            ['mainActivityCategory', 'education'],
        ])('should set and get %s', (attribute, value) => {
            const tripChain = new TripChain(validAttributes);
            tripChain[attribute] = value;
            expect(tripChain[attribute]).toEqual(value);
        });

        describe('Getters for attributes with no setters', () => {
            test.each([
                ['_uuid', extendedAttributes._uuid],
                ['customAttributes', { customAttribute: extendedAttributes.customAttribute }],
                ['attributes', validAttributes],
            ])('should set and get %s', (attribute, value) => {
                const tripChain = new TripChain(extendedAttributes);
                expect(tripChain[attribute]).toEqual(value);
            });
        });

        test.each([
            ['_isValid', false],
            ['_weights', [{ weight: 2.0, method: new WeightMethod(weightMethodAttributes) }]],
            ['trips', extendedAttributes.trips],
            ['visitedPlaces', extendedAttributes.visitedPlaces],
            ['journeyUuid', uuidV4()],
        ])('should set and get %s', (attribute, value) => {
            const tripChain = new TripChain(validAttributes);
            tripChain[attribute] = value;
            expect(tripChain[attribute]).toEqual(value);
        });
    });

    describe('Composed Attributes', () => {
        test('should create Trip instances for trips when creating a TripChain instance', () => {
            const tripAttributes: TripAttributes[] = [
                {
                    _uuid: uuidV4(),
                    startDate: '2023-05-21',
                    startTime: 3600,
                    endDate: '2023-05-21',
                    endTime: 5400,
                    _isValid: true,
                },
                {
                    _uuid: uuidV4(),
                    startDate: '2023-05-21',
                    startTime: 5400,
                    endDate: '2023-05-21',
                    endTime: 7200,
                    _isValid: true,
                },
            ];

            const tripChainAttributes: ExtendedTripChainAttributes = {
                ...validAttributes,
                trips: tripAttributes,
            };

            const result = TripChain.create(tripChainAttributes);
            expect(isOk(result)).toBe(true);
            const tripChain = unwrap(result) as TripChain;
            expect(tripChain.trips).toBeDefined();
            expect(tripChain.trips?.length).toBe(2);
            expect(tripChain.trips?.[0].attributes).toEqual(tripAttributes[0]);
            expect(tripChain.trips?.[1].attributes).toEqual(tripAttributes[1]);
        });

        test('should create VisitedPlace instances for visitedPlaces when creating a TripChain instance', () => {
            const visitedPlaceAttributes: VisitedPlaceAttributes[] = [
                {
                    _uuid: uuidV4(),
                    geography: {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [0, 0],
                        },
                        properties: {},
                    },
                    _isValid: true,
                },
                {
                    _uuid: uuidV4(),
                    geography: {
                        type: 'Feature',
                        geometry: {
                            type: 'Point',
                            coordinates: [1, 1],
                        },
                        properties: {},
                    },
                    _isValid: true,
                },
            ];

            const tripChainAttributes: ExtendedTripChainAttributes = {
                ...validAttributes,
                visitedPlaces: visitedPlaceAttributes,
            };

            const result = TripChain.create(tripChainAttributes);
            expect(isOk(result)).toBe(true);
            const tripChain = unwrap(result) as TripChain;
            expect(tripChain.visitedPlaces).toBeDefined();
            expect(tripChain.visitedPlaces?.length).toBe(2);
            expect(tripChain.visitedPlaces?.[0].attributes).toEqual(visitedPlaceAttributes[0]);
            expect(tripChain.visitedPlaces?.[1].attributes).toEqual(visitedPlaceAttributes[1]);
        });
    });
});
