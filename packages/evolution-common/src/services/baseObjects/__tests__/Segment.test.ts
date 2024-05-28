/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Segment, SegmentAttributes, ExtendedSegmentAttributes, segmentAttributes } from '../Segment';
import { v4 as uuidV4 } from 'uuid';
import { WeightMethod, WeightMethodAttributes } from '../WeightMethod';
import { isOk, hasErrors, unwrap } from '../../../types/Result.type';
import { Junction } from '../Junction';
import { Routing } from '../Routing';

describe('Segment', () => {
    const weightMethodAttributes: WeightMethodAttributes = {
        _uuid: uuidV4(),
        shortname: 'sample-shortname',
        name: 'Sample Weight Method',
        description: 'Sample weight method description',
    };

    const validAttributes: SegmentAttributes = {
        _uuid: uuidV4(),
        modeCategory: 'transit',
        mode: 'bus',
        modeOtherSpecify: 'Other mode',
        departureDate: '2023-05-21',
        arrivalDate: '2023-05-22',
        departureTime: 3600,
        arrivalTime: 7200,
        driver: 'householdMember',
        driverUuid: uuidV4(),
        vehicleOccupancy: 2,
        carType: 'householdCar',
        _weights: [{ weight: 1.2, method: new WeightMethod(weightMethodAttributes) }],
        _isValid: true
    };

    const extendedAttributes: ExtendedSegmentAttributes = {
        ...validAttributes,
        customAttribute: 'custom value',
        origin: { name: 'Origin' },
        destination: { name: 'Destination' },
        transitDeclaredRouting: { mode: 'transit' },
        walkingDeclaredRouting: { mode: 'walking' },
        cyclingDeclaredRouting: { mode: 'cycling' },
        drivingDeclaredRouting: { mode: 'driving' },
        transitCalculatedRoutings: [{ mode: 'transit' }],
        walkingCalculatedRoutings: [{ mode: 'walking' }],
        cyclingCalculatedRoutings: [{ mode: 'cycling' }],
        drivingCalculatedRoutings: [{ mode: 'driving' }],
    };

    test('should create a Segment instance with valid attributes', () => {
        const segment = new Segment(validAttributes);
        expect(segment).toBeInstanceOf(Segment);
        expect(segment.attributes).toEqual(validAttributes);
    });

    test('should have a validateParams section for each attribute', () => {
        const validateParamsCode = Segment.validateParams.toString();
        segmentAttributes.filter((attribute) => attribute !== '_uuid' && attribute !== '_weights').forEach((attributeName) => {
            expect(validateParamsCode).toContain('\'' + attributeName + '\'');
        });
    });

    test('should get uuid', () => {
        const segment = new Segment({ ...validAttributes, _uuid: '11b78eb3-a5d8-484d-805d-1f947160bb9e' });
        expect(segment._uuid).toBe('11b78eb3-a5d8-484d-805d-1f947160bb9e');
    });

    test('should create a Segment instance with valid attributes', () => {
        const result = Segment.create(extendedAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Segment);
    });

    test('should return an error for invalid params', () => {
        const invalidAttributes = 'foo' as any;
        const result = Segment.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[])).toHaveLength(1);
    });

    test('should create a Segment instance with extended attributes', () => {
        const result = Segment.create(extendedAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Segment);
    });

    test('should return errors for invalid attributes', () => {
        const invalidAttributes = { ...validAttributes, modeCategory: -1 };
        const result = Segment.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should unserialize a Segment instance', () => {
        const segment = Segment.unserialize(validAttributes);
        expect(segment).toBeInstanceOf(Segment);
        expect(segment.attributes).toEqual(validAttributes);
    });

    test('should validate Segment attributes', () => {
        const errors = Segment.validateParams(validAttributes);
        expect(errors).toHaveLength(0);
    });

    test('should return errors for invalid Segment attributes', () => {
        const invalidAttributes = { ...validAttributes, departureDate: 123 };
        const errors = Segment.validateParams(invalidAttributes);
        expect(errors).toHaveLength(1);
    });

    test('should validate a Segment instance', () => {
        const segment = new Segment(validAttributes);
        expect(segment.validate()).toBe(true);
        expect(segment.isValid()).toBe(true);
    });

    test('should create a Segment instance with custom attributes', () => {
        const customAttributes = {
            customAttribute1: 'value1',
            customAttribute2: 'value2',
        };
        const segmentAttributes = {
            ...validAttributes,
            ...customAttributes,
        };
        const segment = new Segment(segmentAttributes);
        expect(segment).toBeInstanceOf(Segment);
        expect(segment.attributes).toEqual(validAttributes);
        expect(segment.customAttributes).toEqual(customAttributes);
    });

    describe('validateParams', () => {
        test.each([
            ['modeCategory', 123],
            ['mode', 123],
            ['modeOtherSpecify', 123],
            ['departureDate', 123],
            ['arrivalDate', 123],
            ['departureTime', -1],
            ['arrivalTime', -1],
            ['driver', 123],
            ['driverUuid', 123],
            ['vehicleOccupancy', -1],
            ['carType', 123],
        ])('should return an error for invalid %s', (param, value) => {
            const invalidAttributes = { ...validAttributes, [param]: value };
            const errors = Segment.validateParams(invalidAttributes);
            expect(errors).toHaveLength(1);
        });

        test('should return no errors for valid attributes', () => {
            const errors = Segment.validateParams(validAttributes);
            expect(errors).toHaveLength(0);
        });
    });

    describe('Getters and Setters', () => {
        test.each([
            ['modeCategory', 'walk'],
            ['mode', 'walk'],
            ['modeOtherSpecify', 'Other mode updated'],
            ['departureDate', '2023-05-20'],
            ['arrivalDate', '2023-05-23'],
            ['departureTime', 1800],
            ['arrivalTime', 5400],
            ['driver', 'colleague'],
            ['driverUuid', uuidV4()],
            ['vehicleOccupancy', 3],
            ['carType', 'rentalCar'],
        ])('should set and get %s', (attribute, value) => {
            const segment = new Segment(validAttributes);
            segment[attribute] = value;
            expect(segment[attribute]).toEqual(value);
        });

        test.each([
            ['_isValid', false],
            ['_weights', [{ weight: 2.0, method: new WeightMethod(weightMethodAttributes) }]],
            ['origin', new Junction({ name: 'Updated Origin' })],
            ['destination', new Junction({ name: 'Updated Destination' })],
            ['transitDeclaredRouting', new Routing({ mode: 'transit' })],
            ['walkingDeclaredRouting', new Routing({ mode: 'walking' })],
            ['cyclingDeclaredRouting', new Routing({ mode: 'cycling' })],
            ['drivingDeclaredRouting', new Routing({ mode: 'driving' })],
            ['transitCalculatedRoutings', [new Routing({ mode: 'transit' }), new Routing({ mode: 'transit' })]],
            ['walkingCalculatedRoutings', [new Routing({ mode: 'walking' }), new Routing({ mode: 'walking' })]],
            ['cyclingCalculatedRoutings', [new Routing({ mode: 'cycling' }), new Routing({ mode: 'cycling' })]],
            ['drivingCalculatedRoutings', [new Routing({ mode: 'driving' }), new Routing({ mode: 'driving' })]],
        ])('should set and get %s', (attribute, value) => {
            const segment = new Segment(validAttributes);
            segment[attribute] = value;
            expect(segment[attribute]).toEqual(value);
        });

        describe('Getters for attributes with no setters', () => {
            test.each([
                ['_uuid', extendedAttributes._uuid],
                ['customAttributes', { customAttribute: extendedAttributes.customAttribute }],
                ['attributes', validAttributes],
            ])('should set and get %s', (attribute, value) => {
                const segment = new Segment(extendedAttributes);
                expect(segment[attribute]).toEqual(value);
            });
        });

        test.each([
            ['origin', undefined],
            ['destination', undefined],
            ['transitDeclaredRouting', undefined],
            ['walkingDeclaredRouting', undefined],
            ['cyclingDeclaredRouting', undefined],
            ['drivingDeclaredRouting', undefined]
        ])('should get and set %s to undefined', (attribute, value) => {
            const segment = new Segment(validAttributes);
            segment[attribute] = value;
            expect(segment[attribute]).toBeUndefined();
        });

        test.each([
            ['transitCalculatedRoutings', []],
            ['walkingCalculatedRoutings', []],
            ['cyclingCalculatedRoutings', []],
            ['drivingCalculatedRoutings', []]
        ])('should set and get empty arrays for %s', (attribute, value) => {
            const segment = new Segment(validAttributes);
            segment[attribute] = value;
            expect(segment[attribute]).toEqual([]);
        });
    });

    describe('Invalid Routing Attributes', () => {

        it('should report errors for invalid transitDeclaredRouting', () => {
            const invalidRouting = { '_uuid': 'foo' };
            const segment = Segment.create({
                transitDeclaredRouting: invalidRouting
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: Uuidable validateParams: _uuid should be a valid uuid');
        });

        it('should report errors for invalid transitDeclaredRouting', () => {
            const invalidRouting = 123;
            const segment = Segment.create({
                transitDeclaredRouting: invalidRouting
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: TransitRouting validateParams: params should be an object');
        });

        it('should report errors for invalid walkingDeclaredRouting', () => {
            const invalidRouting = { '_uuid': 'foo' };
            const segment = Segment.create({
                walkingDeclaredRouting: invalidRouting
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: Uuidable validateParams: _uuid should be a valid uuid');
        });

        it('should report errors for invalid walkingDeclaredRouting', () => {
            const invalidRouting = 123;
            const segment = Segment.create({
                walkingDeclaredRouting: invalidRouting
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: WalkingRouting validateParams: params should be an object');
        });

        it('should report errors for invalid cyclingDeclaredRouting', () => {
            const invalidRouting = { '_uuid': 'foo' };
            const segment = Segment.create({
                cyclingDeclaredRouting: invalidRouting
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: Uuidable validateParams: _uuid should be a valid uuid');
        });

        it('should report errors for invalid cyclingDeclaredRouting', () => {
            const invalidRouting = 123;
            const segment = Segment.create({
                cyclingDeclaredRouting: invalidRouting
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: CyclingRouting validateParams: params should be an object');
        });

        it('should report errors for invalid drivingDeclaredRouting', () => {
            const invalidRouting = { '_uuid': 'foo' };
            const segment = Segment.create({
                drivingDeclaredRouting: invalidRouting
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: Uuidable validateParams: _uuid should be a valid uuid');
        });

        it('should report errors for invalid drivingDeclaredRouting', () => {
            const invalidRouting = 123;
            const segment = Segment.create({
                drivingDeclaredRouting: invalidRouting
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: DrivingRouting validateParams: params should be an object');
        });


        // Arrays:
        it('should report errors for invalid transitCalculatedRoutings', () => {
            const invalidRouting = { '_uuid': 'bar' };
            const segment = Segment.create({
                transitCalculatedRoutings: [invalidRouting]
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: Uuidable validateParams: _uuid should be a valid uuid');
        });

        it('should report errors for invalid transitCalculatedRoutings', () => {
            const invalidRouting = 123;
            const segment = Segment.create({
                transitCalculatedRoutings: [invalidRouting]
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: TransitRouting validateParams: params should be an object');
        });

        it('should report errors for invalid walkingCalculatedRoutings', () => {
            const invalidRouting = { '_uuid': 'bar' };
            const segment = Segment.create({
                walkingCalculatedRoutings: [invalidRouting]
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: Uuidable validateParams: _uuid should be a valid uuid');
        });

        it('should report errors for invalid walkingCalculatedRoutings', () => {
            const invalidRouting = 123;
            const segment = Segment.create({
                walkingCalculatedRoutings: [invalidRouting]
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: WalkingRouting validateParams: params should be an object');
        });

        it('should report errors for invalid cyclingCalculatedRoutings', () => {
            const invalidRouting = { '_uuid': 'bar' };
            const segment = Segment.create({
                cyclingCalculatedRoutings: [invalidRouting]
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: Uuidable validateParams: _uuid should be a valid uuid');
        });

        it('should report errors for invalid cyclingCalculatedRoutings', () => {
            const invalidRouting = 123;
            const segment = Segment.create({
                cyclingCalculatedRoutings: [invalidRouting]
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: CyclingRouting validateParams: params should be an object');
        });

        it('should report errors for invalid drivingCalculatedRoutings', () => {
            const invalidRouting = { '_uuid': 'bar' };
            const segment = Segment.create({
                drivingCalculatedRoutings: [invalidRouting]
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: Uuidable validateParams: _uuid should be a valid uuid');
        });

        it('should report errors for invalid drivingCalculatedRoutings', () => {
            const invalidRouting = 123;
            const segment = Segment.create({
                drivingCalculatedRoutings: [invalidRouting]
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: DrivingRouting validateParams: params should be an object');
        });

    });
});
