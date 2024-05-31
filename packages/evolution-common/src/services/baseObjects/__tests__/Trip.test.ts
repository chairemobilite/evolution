/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Trip, TripAttributes, ExtendedTripAttributes, tripAttributes } from '../Trip';
import { VisitedPlaceAttributes } from '../VisitedPlace';
import { SegmentAttributes } from '../Segment';
import { JunctionAttributes } from '../Junction';
import { v4 as uuidV4 } from 'uuid';
import { WeightMethod, WeightMethodAttributes } from '../WeightMethod';
import { isOk, hasErrors, unwrap } from '../../../types/Result.type';

describe('Trip', () => {
    const weightMethodAttributes: WeightMethodAttributes = {
        _uuid: uuidV4(),
        shortname: 'sample-shortname',
        name: 'Sample Weight Method',
        description: 'Sample weight method description',
    };

    const validAttributes: TripAttributes = {
        _uuid: uuidV4(),
        startDate: '2023-05-21',
        endDate: '2023-05-21',
        startTime: 3600,
        endTime: 7200,
        _weights: [{ weight: 1.5, method: new WeightMethod(weightMethodAttributes) }],
        _isValid: true,
    };

    const extendedAttributes: ExtendedTripAttributes = {
        ...validAttributes,
        customAttribute: 'Custom Value',
        startPlace: {
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
        endPlace: {
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
        segments: [
            {
                _uuid: uuidV4(),
                mode: 'walk',
                _isValid: true,
            },
            {
                _uuid: uuidV4(),
                mode: 'bicycle',
                _isValid: true,
            },
        ],
        junctions: [
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

    test('should create a Trip instance with valid attributes', () => {
        const trip = new Trip(validAttributes);
        expect(trip).toBeInstanceOf(Trip);
        expect(trip.attributes).toEqual(validAttributes);
    });

    test('should have a validateParams section for each attribute', () => {
        const validateParamsCode = Trip.validateParams.toString();
        tripAttributes.filter((attribute) => attribute !== '_uuid' && attribute !== '_weights').forEach((attributeName) => {
            expect(validateParamsCode).toContain('\'' + attributeName + '\'');
        });
    });

    test('should get uuid', () => {
        const trip = new Trip({ ...validAttributes, _uuid: '11b78eb3-a5d8-484d-805d-1f947160bb9e' });
        expect(trip._uuid).toBe('11b78eb3-a5d8-484d-805d-1f947160bb9e');
    });

    test('should create a Trip instance with valid attributes', () => {
        const result = Trip.create(validAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Trip);
    });

    test('should return an error for invalid params', () => {
        const invalidAttributes = 'foo' as any;
        const result = Trip.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should create a Trip instance with extended attributes', () => {
        const result = Trip.create(extendedAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Trip);
    });

    test('should return errors for invalid attributes', () => {
        const invalidAttributes = { ...validAttributes, startTime: 'invalid' };
        const result = Trip.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should unserialize a Trip instance', () => {
        const trip = Trip.unserialize(validAttributes);
        expect(trip).toBeInstanceOf(Trip);
        expect(trip.attributes).toEqual(validAttributes);
    });

    test('should validate Trip attributes', () => {
        const errors = Trip.validateParams(validAttributes);
        expect(errors).toHaveLength(0);
    });

    test('should return errors for invalid Trip attributes', () => {
        const invalidAttributes = { ...validAttributes, startDate: 'invalid' };
        const errors = Trip.validateParams(invalidAttributes);
        expect(errors).toHaveLength(1);
    });

    test('should validate a Trip instance', () => {
        const trip = new Trip(validAttributes);
        expect(trip.validate()).toBe(true);
        expect(trip.isValid()).toBe(true);
    });

    test('should create a Trip instance with custom attributes', () => {
        const customAttributes = {
            customAttribute1: 'value1',
            customAttribute2: 'value2',
        };
        const tripAttributes = {
            ...validAttributes,
            ...customAttributes,
        };
        const trip = new Trip(tripAttributes);
        expect(trip).toBeInstanceOf(Trip);
        expect(trip.attributes).toEqual(validAttributes);
        expect(trip.customAttributes).toEqual(customAttributes);
    });

    describe('validateParams', () => {
        test.each([
            ['startDate', 123],
            ['endDate', 123],
            ['startTime', 'invalid'],
            ['endTime', 'invalid'],
        ])('should return an error for invalid %s', (param, value) => {
            const invalidAttributes = { ...validAttributes, [param]: value };
            const errors = Trip.validateParams(invalidAttributes);
            expect(errors[0].toString()).toContain(param);
            expect(errors).toHaveLength(1);
        });

        test('should return no errors for valid attributes', () => {
            const errors = Trip.validateParams(validAttributes);
            expect(errors).toHaveLength(0);
        });
    });

    describe('Getters and Setters', () => {
        test.each([
            ['startDate', '2023-05-22'],
            ['endDate', '2023-05-22'],
            ['startTime', 7200],
            ['endTime', 10800],
        ])('should set and get %s', (attribute, value) => {
            const trip = new Trip(validAttributes);
            trip[attribute] = value;
            expect(trip[attribute]).toEqual(value);
        });

        describe('Getters for attributes with no setters', () => {
            test.each([
                ['_uuid', extendedAttributes._uuid],
                ['customAttributes', { customAttribute: extendedAttributes.customAttribute }],
                ['attributes', validAttributes],
            ])('should set and get %s', (attribute, value) => {
                const trip = new Trip(extendedAttributes);
                expect(trip[attribute]).toEqual(value);
            });
        });

        test.each([
            ['_isValid', false],
            ['_weights', [{ weight: 2.0, method: new WeightMethod(weightMethodAttributes) }]],
            ['startPlace', extendedAttributes.startPlace],
            ['endPlace', extendedAttributes.endPlace],
            ['segments', extendedAttributes.segments],
            ['junctions', extendedAttributes.junctions],
            ['journeyUuid', uuidV4()],
            ['tripChainUuid', uuidV4()],
        ])('should set and get %s', (attribute, value) => {
            const trip = new Trip(validAttributes);
            trip[attribute] = value;
            expect(trip[attribute]).toEqual(value);
        });
    });

    describe('Composed Attributes', () => {
        test('should create VisitedPlace instances for startPlace and endPlace when creating a Trip instance', () => {
            const startPlaceAttributes: VisitedPlaceAttributes = {
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
            };

            const endPlaceAttributes: VisitedPlaceAttributes = {
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
            };

            const tripAttributes: ExtendedTripAttributes = {
                ...validAttributes,
                startPlace: startPlaceAttributes,
                endPlace: endPlaceAttributes,
            };

            const result = Trip.create(tripAttributes);
            expect(isOk(result)).toBe(true);
            const trip = unwrap(result) as Trip;
            expect(trip.startPlace).toBeDefined();
            expect(trip.startPlace?.attributes).toEqual(startPlaceAttributes);
            expect(trip.endPlace).toBeDefined();
            expect(trip.endPlace?.attributes).toEqual(endPlaceAttributes);
        });

        test('should create Segment instances for segments when creating a Trip instance', () => {
            const segmentAttributes: SegmentAttributes[] = [
                {
                    _uuid: uuidV4(),
                    mode: 'walk',
                    _isValid: true,
                },
                {
                    _uuid: uuidV4(),
                    mode: 'bicycle',
                    _isValid: true,
                },
            ];

            const tripAttributes: ExtendedTripAttributes = {
                ...validAttributes,
                segments: segmentAttributes,
            };

            const result = Trip.create(tripAttributes);
            expect(isOk(result)).toBe(true);
            const trip = unwrap(result) as Trip;
            expect(trip.segments).toBeDefined();
            expect(trip.segments?.length).toBe(2);
            expect(trip.segments?.[0].attributes).toEqual(segmentAttributes[0]);
            expect(trip.segments?.[1].attributes).toEqual(segmentAttributes[1]);
        });

        test('should create Junction instances for junctions when creating a Trip instance', () => {
            const junctionAttributes: JunctionAttributes[] = [
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

            const tripAttributes: ExtendedTripAttributes = {
                ...validAttributes,
                junctions: junctionAttributes,
            };

            const result = Trip.create(tripAttributes);
            expect(isOk(result)).toBe(true);
            const trip = unwrap(result) as Trip;
            expect(trip.junctions).toBeDefined();
            expect(trip.junctions?.length).toBe(2);
            expect(trip.junctions?.[0].attributes).toEqual(junctionAttributes[0]);
            expect(trip.junctions?.[1].attributes).toEqual(junctionAttributes[1]);
        });
    });
});
