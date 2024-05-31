/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Journey, JourneyAttributes, ExtendedJourneyAttributes, journeyAttributes } from '../Journey';
import { VisitedPlaceAttributes } from '../VisitedPlace';
import { TripAttributes } from '../Trip';
import { TripChainAttributes } from '../TripChain';
import { v4 as uuidV4 } from 'uuid';
import { WeightMethod, WeightMethodAttributes } from '../WeightMethod';
import { isOk, hasErrors, unwrap } from '../../../types/Result.type';

describe('Journey', () => {
    const weightMethodAttributes: WeightMethodAttributes = {
        _uuid: uuidV4(),
        shortname: 'sample-shortname',
        name: 'Sample Weight Method',
        description: 'Sample weight method description',
    };

    const validAttributes: JourneyAttributes = {
        _uuid: uuidV4(),
        startDate: '2023-05-21',
        startTime: 3600,
        endDate: '2023-05-21',
        endTime: 7200,
        name: 'Sample Journey',
        type: 'holiday',
        _weights: [{ weight: 1.5, method: new WeightMethod(weightMethodAttributes) }],
        _isValid: true,
    };

    const extendedAttributes: ExtendedJourneyAttributes = {
        ...validAttributes,
        customAttribute: 'Custom Value',
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
        ],
        trips: [
            {
                _uuid: uuidV4(),
                startDate: '2023-01-03',
                _isValid: true,
            },
        ],
        tripChains: [
            {
                _uuid: uuidV4(),
                category: 'simple',
                _isValid: true,
            },
        ],
    };

    test('should create a Journey instance with valid attributes', () => {
        const journey = new Journey(validAttributes);
        expect(journey).toBeInstanceOf(Journey);
        expect(journey.attributes).toEqual(validAttributes);
    });

    test('should have a validateParams section for each attribute', () => {
        const validateParamsCode = Journey.validateParams.toString();
        journeyAttributes.filter((attribute) => attribute !== '_uuid' && attribute !== '_weights').forEach((attributeName) => {
            expect(validateParamsCode).toContain('\'' + attributeName + '\'');
        });
    });

    test('should get uuid', () => {
        const journey = new Journey({ ...validAttributes, _uuid: '11b78eb3-a5d8-484d-805d-1f947160bb9e' });
        expect(journey._uuid).toBe('11b78eb3-a5d8-484d-805d-1f947160bb9e');
    });

    test('should create a Journey instance with valid attributes', () => {
        const result = Journey.create(validAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Journey);
    });

    test('should return an error for invalid params', () => {
        const invalidAttributes = 'foo' as any;
        const result = Journey.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should create a Journey instance with extended attributes', () => {
        const result = Journey.create(extendedAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Journey);
    });

    test('should return errors for invalid attributes', () => {
        const invalidAttributes = { ...validAttributes, startTime: 'invalid' };
        const result = Journey.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should unserialize a Journey instance', () => {
        const journey = Journey.unserialize(validAttributes);
        expect(journey).toBeInstanceOf(Journey);
        expect(journey.attributes).toEqual(validAttributes);
    });

    test('should validate Journey attributes', () => {
        const errors = Journey.validateParams(validAttributes);
        expect(errors).toHaveLength(0);
    });

    test('should return errors for invalid Journey attributes', () => {
        const invalidAttributes = { ...validAttributes, startDate: 'invalid' };
        const errors = Journey.validateParams(invalidAttributes);
        expect(errors).toHaveLength(1);
    });

    test('should validate a Journey instance', () => {
        const journey = new Journey(validAttributes);
        expect(journey.validate()).toBe(true);
        expect(journey.isValid()).toBe(true);
    });

    test('should create a Journey instance with custom attributes', () => {
        const customAttributes = {
            customAttribute1: 'value1',
            customAttribute2: 'value2',
        };
        const journeyAttributes = {
            ...validAttributes,
            ...customAttributes,
        };
        const journey = new Journey(journeyAttributes);
        expect(journey).toBeInstanceOf(Journey);
        expect(journey.attributes).toEqual(validAttributes);
        expect(journey.customAttributes).toEqual(customAttributes);
    });

    describe('validateParams', () => {
        test.each([
            ['startDate', 123],
            ['startTime', 'invalid'],
            ['endDate', 123],
            ['endTime', 'invalid'],
            ['name', 123],
            ['type', 123],
        ])('should return an error for invalid %s', (param, value) => {
            const invalidAttributes = { ...validAttributes, [param]: value };
            const errors = Journey.validateParams(invalidAttributes);
            expect(errors[0].toString()).toContain(param);
            expect(errors).toHaveLength(1);
        });

        test('should return no errors for valid attributes', () => {
            const errors = Journey.validateParams(validAttributes);
            expect(errors).toHaveLength(0);
        });
    });

    describe('Getters and Setters', () => {
        test.each([
            ['startDate', '2023-05-22'],
            ['startTime', 7200],
            ['endDate', '2023-05-22'],
            ['endTime', 10800],
            ['name', 'Updated Journey'],
            ['type', 'work'],
        ])('should set and get %s', (attribute, value) => {
            const journey = new Journey(validAttributes);
            journey[attribute] = value;
            expect(journey[attribute]).toEqual(value);
        });

        describe('Getters for attributes with no setters', () => {
            test.each([
                ['_uuid', extendedAttributes._uuid],
                ['customAttributes', { customAttribute: extendedAttributes.customAttribute }],
                ['attributes', validAttributes],
            ])('should set and get %s', (attribute, value) => {
                const journey = new Journey(extendedAttributes);
                expect(journey[attribute]).toEqual(value);
            });
        });

        test.each([
            ['_isValid', false],
            ['_weights', [{ weight: 2.0, method: new WeightMethod(weightMethodAttributes) }]],
            ['visitedPlaces', extendedAttributes.visitedPlaces],
            ['trips', extendedAttributes.trips],
            ['tripChains', extendedAttributes.tripChains],
            ['personUuid', uuidV4()],
        ])('should set and get %s', (attribute, value) => {
            const journey = new Journey(validAttributes);
            journey[attribute] = value;
            expect(journey[attribute]).toEqual(value);
        });
    });

    describe('Composed Attributes', () => {
        test('should create VisitedPlace instances for visitedPlaces when creating a Journey instance', () => {
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
            ];

            const journeyAttributes: ExtendedJourneyAttributes = {
                ...validAttributes,
                visitedPlaces: visitedPlaceAttributes,
            };

            const result = Journey.create(journeyAttributes);
            expect(isOk(result)).toBe(true);
            const journey = unwrap(result) as Journey;
            expect(journey.visitedPlaces).toBeDefined();
            expect(journey.visitedPlaces?.length).toBe(1);
            expect(journey.visitedPlaces?.[0].attributes).toEqual(visitedPlaceAttributes[0]);
        });

        test('should create Trip instances for trips when creating a Journey instance', () => {
            const tripAttributes: TripAttributes[] = [
                {
                    _uuid: uuidV4(),
                    endDate: '2024-01-13',
                    _isValid: true,
                },
            ];

            const journeyAttributes: ExtendedJourneyAttributes = {
                ...validAttributes,
                trips: tripAttributes,
            };

            const result = Journey.create(journeyAttributes);
            expect(isOk(result)).toBe(true);
            const journey = unwrap(result) as Journey;
            expect(journey.trips).toBeDefined();
            expect(journey.trips?.length).toBe(1);
            expect(journey.trips?.[0].attributes).toEqual(tripAttributes[0]);
        });

        test('should create TripChain instances for tripChains when creating a Journey instance', () => {
            const tripChainAttributes: TripChainAttributes[] = [
                {
                    _uuid: uuidV4(),
                    category: 'simple',
                    _isValid: true,
                },
            ];

            const journeyAttributes: ExtendedJourneyAttributes = {
                ...validAttributes,
                tripChains: tripChainAttributes,
            };

            const result = Journey.create(journeyAttributes);
            expect(isOk(result)).toBe(true);
            const journey = unwrap(result) as Journey;
            expect(journey.tripChains).toBeDefined();
            expect(journey.tripChains?.length).toBe(1);
            expect(journey.tripChains?.[0].attributes).toEqual(tripChainAttributes[0]);
        });
    });
});
