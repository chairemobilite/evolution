/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Segment, segmentAttributes } from '../Segment';
import { v4 as uuidV4 } from 'uuid';
import { WeightMethod, WeightMethodAttributes } from '../WeightMethod';
import { isOk, hasErrors, unwrap } from '../../../types/Result.type';
import { Junction } from '../Junction';
import { Routing } from '../Routing';
import { startEndDateAndTimesAttributes } from '../StartEndable';
import { modeValues, mapModeToModeCategory, modeCategoryValues, Mode } from '../attributeTypes/SegmentAttributes';

describe('Segment', () => {
    const weightMethodAttributes: WeightMethodAttributes = {
        _uuid: uuidV4(),
        shortname: 'sample-shortname',
        name: 'Sample Weight Method',
        description: 'Sample weight method description',
    };

    const validAttributes: { [key: string]: unknown } = {
        _uuid: uuidV4(),
        mode: 'transitBus',
        modeOtherSpecify: 'Other mode',
        endDate: '2023-05-22',
        startDate: '2023-05-21',
        endTime: 3600,
        startTime: 7200,
        startTimePeriod: 'am',
        endTimePeriod: 'pm',
        driverType: 'householdMember',
        driverUuid: uuidV4(),
        vehicleOccupancy: 2,
        carType: 'householdCar',
        paidForParking: true,
        onDemandType: 'pickupAtOrigin',
        busLines: ['Line 1', 'Line 2'],
        _weights: [{ weight: 1.2, method: new WeightMethod(weightMethodAttributes) }],
        _isValid: true
    };

    const extendedAttributes: { [key: string]: unknown } = {
        ...validAttributes,
        customAttribute: 'custom value',
        _origin: { name: 'Origin' },
        _destination: { name: 'Destination' },
        _transitDeclaredRouting: { mode: 'transit' },
        _walkingDeclaredRouting: { mode: 'walking' },
        _cyclingDeclaredRouting: { mode: 'cycling' },
        _drivingDeclaredRouting: { mode: 'driving' },
        _transitCalculatedRoutings: [{ mode: 'transit' }],
        _walkingCalculatedRoutings: [{ mode: 'walking' }],
        _cyclingCalculatedRoutings: [{ mode: 'cycling' }],
        _drivingCalculatedRoutings: [{ mode: 'driving' }],
    };

    test('should create a Segment instance with valid attributes', () => {
        const segment = new Segment(validAttributes);
        expect(segment).toBeInstanceOf(Segment);
        expect(segment.attributes).toEqual(validAttributes);
    });

    test('should have a validateParams section for each attribute', () => {
        const validateParamsCode = Segment.validateParams.toString();
        segmentAttributes.filter((attribute) => attribute !== '_uuid' && attribute !== '_weights' && !(startEndDateAndTimesAttributes as unknown as string[]).includes(attribute)).forEach((attributeName) => {
            expect(validateParamsCode).toContain('\'' + attributeName + '\'');
        });
    });

    test('should get uuid', () => {
        const segment = new Segment({ ...validAttributes, _uuid: '11b78eb3-a5d8-484d-805d-1f947160bb9e' });
        expect(segment._uuid).toBe('11b78eb3-a5d8-484d-805d-1f947160bb9e');
    });

    test('should create a Segment instance with valid extended attributes', () => {
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
        const invalidAttributes = { ...validAttributes, endDate: 123 };
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
            ['mode', 123],
            ['modeOtherSpecify', 123],
            ['endDate', 123],
            ['startDate', 123],
            ['endTime', -1],
            ['startTime', -1],
            ['startTimePeriod', 123],
            ['endTimePeriod', 123],
            ['driverType', 123],
            ['driverUuid', 123],
            ['vehicleOccupancy', -1],
            ['carType', 123],
            ['paidForParking', 'invalid'],
            ['onDemandType', 123],
            ['busLines', 'invalid'],
            ['busLines', [undefined, 'Line']],
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
            ['mode', 'walk'],
            ['modeOtherSpecify', 'Other mode updated'],
            ['endDate', '2023-05-20'],
            ['startDate', '2023-05-23'],
            ['endTime', 1800],
            ['startTime', 5400],
            ['startTimePeriod', 'am'],
            ['endTimePeriod', 'pm'],
            ['driverType', 'colleague'],
            ['driverUuid', uuidV4()],
            ['vehicleOccupancy', 3],
            ['carType', 'rentalCar'],
            ['paidForParking', false],
            ['onDemandType', 'pickupAtOrigin'],
            ['busLines', ['Line 3', 'Line 4']],
        ])('should set and get %s', (attribute, value) => {
            const segment = new Segment(validAttributes);
            segment[attribute] = value;
            expect(segment[attribute]).toEqual(value);
        });

        test.each([
            ['_isValid', false],
            ['_weights', [{ weight: 2.0, method: new WeightMethod(weightMethodAttributes) }]],
            ['_origin', new Junction({ name: 'Updated Origin' })],
            ['_destination', new Junction({ name: 'Updated Destination' })],
            ['_transitDeclaredRouting', new Routing({ mode: 'transit' })],
            ['_walkingDeclaredRouting', new Routing({ mode: 'walking' })],
            ['_cyclingDeclaredRouting', new Routing({ mode: 'cycling' })],
            ['_drivingDeclaredRouting', new Routing({ mode: 'driving' })],
            ['_transitCalculatedRoutings', [new Routing({ mode: 'transit' }), new Routing({ mode: 'transit' })]],
            ['_walkingCalculatedRoutings', [new Routing({ mode: 'walking' }), new Routing({ mode: 'walking' })]],
            ['_cyclingCalculatedRoutings', [new Routing({ mode: 'cycling' }), new Routing({ mode: 'cycling' })]],
            ['_drivingCalculatedRoutings', [new Routing({ mode: 'driving' }), new Routing({ mode: 'driving' })]],
        ])('should set and get %s', (attribute, value) => {
            const segment = new Segment(validAttributes);
            segment[attribute] = value;
            expect(segment[attribute]).toEqual(value);
        });

        describe('Getters for attributes with no setters', () => {
            test.each([
                ['_uuid', extendedAttributes._uuid],
                ['modeCategory', 'transit'],
                ['customAttributes', { customAttribute: extendedAttributes.customAttribute }],
                ['attributes', validAttributes],
            ])('should set and get %s', (attribute, value) => {
                const segment = new Segment(extendedAttributes);
                expect(segment[attribute]).toEqual(value);
            });
        });

        test.each([
            ['_origin', undefined],
            ['_destination', undefined],
            ['_transitDeclaredRouting', undefined],
            ['_walkingDeclaredRouting', undefined],
            ['_cyclingDeclaredRouting', undefined],
            ['_drivingDeclaredRouting', undefined]
        ])('should get and set %s to undefined', (attribute, value) => {
            const segment = new Segment(validAttributes);
            segment[attribute] = value;
            expect(segment[attribute]).toBeUndefined();
        });

        test.each([
            ['_transitCalculatedRoutings', []],
            ['_walkingCalculatedRoutings', []],
            ['_cyclingCalculatedRoutings', []],
            ['_drivingCalculatedRoutings', []]
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
                _transitDeclaredRouting: invalidRouting
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: Uuidable validateParams: _uuid should be a valid uuid');
        });

        it('should report errors for invalid transitDeclaredRouting', () => {
            const invalidRouting = 123;
            const segment = Segment.create({
                _transitDeclaredRouting: invalidRouting
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: TransitRouting validateParams: params should be an object');
        });

        it('should report errors for invalid walkingDeclaredRouting', () => {
            const invalidRouting = { '_uuid': 'foo' };
            const segment = Segment.create({
                _walkingDeclaredRouting: invalidRouting
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: Uuidable validateParams: _uuid should be a valid uuid');
        });

        it('should report errors for invalid walkingDeclaredRouting', () => {
            const invalidRouting = 123;
            const segment = Segment.create({
                _walkingDeclaredRouting: invalidRouting
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: WalkingRouting validateParams: params should be an object');
        });

        it('should report errors for invalid cyclingDeclaredRouting', () => {
            const invalidRouting = { '_uuid': 'foo' };
            const segment = Segment.create({
                _cyclingDeclaredRouting: invalidRouting
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: Uuidable validateParams: _uuid should be a valid uuid');
        });

        it('should report errors for invalid cyclingDeclaredRouting', () => {
            const invalidRouting = 123;
            const segment = Segment.create({
                _cyclingDeclaredRouting: invalidRouting
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: CyclingRouting validateParams: params should be an object');
        });

        it('should report errors for invalid drivingDeclaredRouting', () => {
            const invalidRouting = { '_uuid': 'foo' };
            const segment = Segment.create({
                _drivingDeclaredRouting: invalidRouting
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: Uuidable validateParams: _uuid should be a valid uuid');
        });

        it('should report errors for invalid drivingDeclaredRouting', () => {
            const invalidRouting = 123;
            const segment = Segment.create({
                _drivingDeclaredRouting: invalidRouting
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: DrivingRouting validateParams: params should be an object');
        });


        // Arrays:
        it('should report errors for invalid transitCalculatedRoutings', () => {
            const invalidRouting = { '_uuid': 'bar' };
            const segment = Segment.create({
                _transitCalculatedRoutings: [invalidRouting]
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: Uuidable validateParams: _uuid should be a valid uuid');
        });

        it('should report errors for invalid transitCalculatedRoutings', () => {
            const invalidRouting = 123;
            const segment = Segment.create({
                _transitCalculatedRoutings: [invalidRouting]
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: TransitRouting validateParams: params should be an object');
        });

        it('should report errors for invalid walkingCalculatedRoutings', () => {
            const invalidRouting = { '_uuid': 'bar' };
            const segment = Segment.create({
                _walkingCalculatedRoutings: [invalidRouting]
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: Uuidable validateParams: _uuid should be a valid uuid');
        });

        it('should report errors for invalid walkingCalculatedRoutings', () => {
            const invalidRouting = 123;
            const segment = Segment.create({
                _walkingCalculatedRoutings: [invalidRouting]
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: WalkingRouting validateParams: params should be an object');
        });

        it('should report errors for invalid cyclingCalculatedRoutings', () => {
            const invalidRouting = { '_uuid': 'bar' };
            const segment = Segment.create({
                _cyclingCalculatedRoutings: [invalidRouting]
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: Uuidable validateParams: _uuid should be a valid uuid');
        });

        it('should report errors for invalid cyclingCalculatedRoutings', () => {
            const invalidRouting = 123;
            const segment = Segment.create({
                _cyclingCalculatedRoutings: [invalidRouting]
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: CyclingRouting validateParams: params should be an object');
        });

        it('should report errors for invalid drivingCalculatedRoutings', () => {
            const invalidRouting = { '_uuid': 'bar' };
            const segment = Segment.create({
                _drivingCalculatedRoutings: [invalidRouting]
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: Uuidable validateParams: _uuid should be a valid uuid');
        });

        it('should report errors for invalid drivingCalculatedRoutings', () => {
            const invalidRouting = 123;
            const segment = Segment.create({
                _drivingCalculatedRoutings: [invalidRouting]
            });
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: DrivingRouting validateParams: params should be an object');
        });

    });

    describe('Mode to Mode Category Mapping', () => {
        test.each(modeValues)('mode "%s" should have a matching category', (mode) => {
            const category = mapModeToModeCategory[mode];
            expect(category).toBeDefined();
            expect(modeCategoryValues).toContain(category);
        });

        test.each(modeCategoryValues)('category "%s" should have at least one corresponding mode', (category) => {
            const matchingModes = modeValues.filter((mode) => mapModeToModeCategory[mode] === category);
            expect(matchingModes.length).toBeGreaterThan(0);
        });

        test('should return undefined for undefined mode', () => {
            const segment = new Segment({ mode: undefined });
            expect(segment.modeCategory).toBeUndefined();
        });
    });

    describe('Segment', () => {
        test.each([
            ['transitBus', true],
            ['transitBRT', true],
            ['transitSchoolBus', false],
            ['transitStreetCar', true],
            ['transitFerry', true],
            ['transitGondola', true],
            ['transitMonorail', true],
            ['transitRRT', true],
            ['transitRegionalRail', true],
            ['walk', false],
            ['bicycle', false],
            ['carDriver', false],
            ['carPassenger', false],
            ['taxi', false],
            ['schoolBus', false],
            ['other', false],
            ['dontKnow', false],
        ])('isTransit("%s") should return %s', (mode, expected) => {
            const segment = new Segment({ mode: mode as Mode });
            expect(segment.isTransit()).toBe(expected);
        });
    });
});
