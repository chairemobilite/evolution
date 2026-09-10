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
import { SurveyObjectsRegistry } from '../SurveyObjectsRegistry';
import { completableAttributeNames, type CompletableAttributeName } from '../attributeTypes/CompletableAttributes';
import {
    describeCompletableSurveyObjectMixinValues,
    describeCreateRejectsNonBooleanCompletableParams
} from './completableSurveyObjectTestHelpers';

describe('Segment', () => {
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
        vehicleOccupancy: { status: 'answered', value: 2 },
        carType: 'householdCar',
        paidForParking: { status: 'answered', value: true },
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
        const segment = new Segment(validAttributes, registry);
        expect(segment).toBeInstanceOf(Segment);
        expect(segment.attributes).toEqual(validAttributes);
    });

    test('should have a validateParams section for each attribute', () => {
        const validateParamsCode = Segment.validateParams.toString();
        segmentAttributes
            .filter(
                (attribute) =>
                    attribute !== '_uuid' &&
                    attribute !== '_weights' &&
                    !completableAttributeNames.includes(attribute as CompletableAttributeName) &&
                    !(startEndDateAndTimesAttributes as unknown as string[]).includes(attribute)
            )
            .forEach((attributeName) => {
                expect(validateParamsCode).toContain('\'' + attributeName + '\'');
            });
    });

    test('should get uuid', () => {
        const segment = new Segment({ ...validAttributes, _uuid: '11b78eb3-a5d8-484d-805d-1f947160bb9e' }, registry);
        expect(segment._uuid).toBe('11b78eb3-a5d8-484d-805d-1f947160bb9e');
    });

    test('should create a Segment instance with valid extended attributes', () => {
        const result = Segment.create(extendedAttributes, registry);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Segment);
    });

    test('should return an error for invalid params', () => {
        const invalidAttributes = 'foo' as any;
        const result = Segment.create(invalidAttributes, registry);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[])).toHaveLength(1);
    });

    test('should create a Segment instance with extended attributes', () => {
        const result = Segment.create(extendedAttributes, registry);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Segment);
    });

    // Questionnaires store these two answers as plain values, so `create` wraps
    // them in their status. A survey's own choices, like a `yes` for a boolean,
    // are its parser's job to map.
    describe('create wraps the answers stored as plain values', () => {
        test.each([
            {
                description: 'an answered occupancy',
                attribute: 'vehicleOccupancy',
                stored: 2,
                expected: { status: 'answered', value: 2 }
            },
            {
                description: 'an occupancy the respondent does not know',
                attribute: 'vehicleOccupancy',
                stored: 'dontKnow',
                expected: { status: 'dont_know' }
            },
            {
                description: 'an occupancy stored as a string',
                attribute: 'vehicleOccupancy',
                stored: '3',
                expected: { status: 'answered', value: 3 }
            },
            {
                description: 'an answered parking',
                attribute: 'paidForParking',
                stored: false,
                expected: { status: 'answered', value: false }
            },
            {
                description: 'a parking that does not apply',
                attribute: 'paidForParking',
                stored: 'nonApplicable',
                expected: { status: 'not_applicable' }
            },
            {
                description: 'a parking refused',
                attribute: 'paidForParking',
                stored: 'preferNotToAnswer',
                expected: { status: 'refusal' }
            },
            {
                description: 'an answer already wrapped',
                attribute: 'paidForParking',
                stored: { status: 'refusal' },
                expected: { status: 'refusal' }
            }
        ])('$description', ({ attribute, stored, expected }) => {
            const result = Segment.create({ ...validAttributes, [attribute]: stored }, registry);
            expect(isOk(result)).toBe(true);
            expect((unwrap(result) as any)[attribute]).toEqual(expected);
        });

        // An answer that wraps to nothing leaves no trace of the stored value,
        // so exports and audits see an attribute that was never answered
        test.each([
            { attribute: 'vehicleOccupancy', stored: '' },
            { attribute: 'paidForParking', stored: null }
        ])('$attribute left blank has no attribute at all', ({ attribute, stored }) => {
            const result = Segment.create({ ...validAttributes, [attribute]: stored }, registry);
            expect(isOk(result)).toBe(true);
            expect(Object.keys((unwrap(result) as Segment).attributes)).not.toContain(attribute);
        });

        test('an occupancy that is not a number is rejected', () => {
            const result = Segment.create({ ...validAttributes, vehicleOccupancy: '3abc' }, registry);
            expect(hasErrors(result)).toBe(true);
        });
    });

    test('should unserialize a Segment instance', () => {
        const segment = Segment.unserialize(validAttributes, registry);
        expect(segment).toBeInstanceOf(Segment);
        expect(segment.attributes).toEqual(validAttributes);
    });

    // The serialized form of a segment comes from a segment built by `create`,
    // so the answers reach `unserialize` already wrapped and go through as they
    // are, whatever their status
    test('should unserialize the answers that come with a status', () => {
        const segment = Segment.unserialize(
            {
                _attributes: {
                    ...validAttributes,
                    vehicleOccupancy: { status: 'answered', value: 4 },
                    paidForParking: { status: 'dont_know' }
                }
            },
            registry
        );
        expect(segment.vehicleOccupancy).toEqual({ status: 'answered', value: 4 });
        expect(segment.paidForParking).toEqual({ status: 'dont_know' });
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
        const segment = new Segment(validAttributes, registry);
        expect(segment.validate()).toBe(true);
        expect(segment.isValid()).toBe(true);
    });

    describeCompletableSurveyObjectMixinValues<Segment>({
        createDefault: () => new Segment(validAttributes, registry)
    });

    describeCreateRejectsNonBooleanCompletableParams('Segment', Segment.create, () => validAttributes, () => registry);

    test('should create a Segment instance with custom attributes', () => {
        const customAttributes = {
            customAttribute1: 'value1',
            customAttribute2: 'value2',
        };
        const segmentAttributes = {
            ...validAttributes,
            ...customAttributes,
        };
        const segment = new Segment(segmentAttributes, registry);
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
            ['vehicleOccupancy', { status: 'answered', value: -1 }],
            ['vehicleOccupancy', 2], // an answer has to come wrapped in its status
            ['carType', 123],
            ['paidForParking', { status: 'answered', value: 'invalid' }],
            ['paidForParking', { status: 'maybe' }],
            ['paidForParking', true], // an answer has to come wrapped in its status
            ['onDemandType', 123],
            ['busLines', 'invalid'],
            ['busLines', [undefined, 'Line']],
            ['hasMinimum', 'invalid'],
            ['isCompleted', 'invalid'],
            ['isStarted', 'invalid'],
            ['preData', 'invalid'],
            ['preData', []],
            ['preData', new Date() as any],
            ['preData', true as any]
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
            ['vehicleOccupancy', { status: 'answered', value: 3 }],
            ['carType', 'rentalCar'],
            ['paidForParking', { status: 'refusal' }],
            ['onDemandType', 'pickupAtOrigin'],
            ['busLines', ['Line 3', 'Line 4']],
            ['preData', { importedSegmentData: 'value', mode: 'bus' }],
            ['hasNextMode', true],
        ])('should set and get %s', (attribute, value) => {
            const segment = new Segment(validAttributes, registry);
            segment[attribute] = value;
            expect(segment[attribute]).toEqual(value);
        });

        test.each([
            ['_isValid', () => false],
            ['_weights', () => [{ weight: 2.0, method: new WeightMethod(weightMethodAttributes) }]],
            ['_origin', () => new Junction({ name: 'Updated Origin' }, registry)],
            ['_destination', () => new Junction({ name: 'Updated Destination' }, registry)],
            ['_transitDeclaredRouting', () => new Routing({ mode: 'transit' })],
            ['_walkingDeclaredRouting', () => new Routing({ mode: 'walking' })],
            ['_cyclingDeclaredRouting', () => new Routing({ mode: 'cycling' })],
            ['_drivingDeclaredRouting', () => new Routing({ mode: 'driving' })],
            ['_transitCalculatedRoutings', () => [new Routing({ mode: 'transit' }), new Routing({ mode: 'transit' })]],
            ['_walkingCalculatedRoutings', () => [new Routing({ mode: 'walking' }), new Routing({ mode: 'walking' })]],
            ['_cyclingCalculatedRoutings', () => [new Routing({ mode: 'cycling' }), new Routing({ mode: 'cycling' })]],
            ['_drivingCalculatedRoutings', () => [new Routing({ mode: 'driving' }), new Routing({ mode: 'driving' })]],
        ])('should set and get %s', (attribute, valueFactory) => {
            const segment = new Segment(validAttributes, registry);
            const value = valueFactory();
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
                const segment = new Segment(extendedAttributes, registry);
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
            const segment = new Segment(validAttributes, registry);
            segment[attribute] = value;
            expect(segment[attribute]).toBeUndefined();
        });

        test.each([
            ['_transitCalculatedRoutings', []],
            ['_walkingCalculatedRoutings', []],
            ['_cyclingCalculatedRoutings', []],
            ['_drivingCalculatedRoutings', []]
        ])('should set and get empty arrays for %s', (attribute, value) => {
            const segment = new Segment(validAttributes, registry);
            segment[attribute] = value;
            expect(segment[attribute]).toEqual([]);
        });
    });

    describe('preData serialization', () => {
        test('should preserve preData through (un)serialize', () => {
            const attrs = { ...validAttributes, preData: { importedSegmentData: 'value', mode: 'bus' } };
            const s1 = new Segment(attrs, registry);
            const s2 = Segment.unserialize(attrs, registry);
            expect(s1.preData).toEqual({ importedSegmentData: 'value', mode: 'bus' });
            expect(s2.preData).toEqual({ importedSegmentData: 'value', mode: 'bus' });
        });
    });

    describe('Invalid Routing Attributes', () => {

        it('should report errors for invalid transitDeclaredRouting', () => {
            const invalidRouting = { '_uuid': 'foo' };
            const segment = Segment.create({
                _transitDeclaredRouting: invalidRouting
            }, registry);
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: Uuidable validateParams: _uuid should be a valid uuid');
        });

        it('should report errors for invalid transitDeclaredRouting', () => {
            const invalidRouting = 123;
            const segment = Segment.create({
                _transitDeclaredRouting: invalidRouting
            }, registry);
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: TransitRouting validateParams: params should be a plain object (Record)');
        });

        it('should report errors for invalid walkingDeclaredRouting', () => {
            const invalidRouting = { '_uuid': 'foo' };
            const segment = Segment.create({
                _walkingDeclaredRouting: invalidRouting
            }, registry);
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: Uuidable validateParams: _uuid should be a valid uuid');
        });

        it('should report errors for invalid walkingDeclaredRouting', () => {
            const invalidRouting = 123;
            const segment = Segment.create({
                _walkingDeclaredRouting: invalidRouting
            }, registry);
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: WalkingRouting validateParams: params should be a plain object (Record)');
        });

        it('should report errors for invalid cyclingDeclaredRouting', () => {
            const invalidRouting = { '_uuid': 'foo' };
            const segment = Segment.create({
                _cyclingDeclaredRouting: invalidRouting
            }, registry);
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: Uuidable validateParams: _uuid should be a valid uuid');
        });

        it('should report errors for invalid cyclingDeclaredRouting', () => {
            const invalidRouting = 123;
            const segment = Segment.create({
                _cyclingDeclaredRouting: invalidRouting
            }, registry);
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: CyclingRouting validateParams: params should be a plain object (Record)');
        });

        it('should report errors for invalid drivingDeclaredRouting', () => {
            const invalidRouting = { '_uuid': 'foo' };
            const segment = Segment.create({
                _drivingDeclaredRouting: invalidRouting
            }, registry);
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: Uuidable validateParams: _uuid should be a valid uuid');
        });

        it('should report errors for invalid drivingDeclaredRouting', () => {
            const invalidRouting = 123;
            const segment = Segment.create({
                _drivingDeclaredRouting: invalidRouting
            }, registry);
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: DrivingRouting validateParams: params should be a plain object (Record)');
        });


        // Arrays:
        it('should report errors for invalid transitCalculatedRoutings', () => {
            const invalidRouting = { '_uuid': 'bar' };
            const segment = Segment.create({
                _transitCalculatedRoutings: [invalidRouting]
            }, registry);
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: Uuidable validateParams: _uuid should be a valid uuid');
        });

        it('should report errors for invalid transitCalculatedRoutings', () => {
            const invalidRouting = 123;
            const segment = Segment.create({
                _transitCalculatedRoutings: [invalidRouting]
            }, registry);
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: TransitRouting validateParams: params should be a plain object (Record)');
        });

        it('should report errors for invalid walkingCalculatedRoutings', () => {
            const invalidRouting = { '_uuid': 'bar' };
            const segment = Segment.create({
                _walkingCalculatedRoutings: [invalidRouting]
            }, registry);
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: Uuidable validateParams: _uuid should be a valid uuid');
        });

        it('should report errors for invalid walkingCalculatedRoutings', () => {
            const invalidRouting = 123;
            const segment = Segment.create({
                _walkingCalculatedRoutings: [invalidRouting]
            }, registry);
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: WalkingRouting validateParams: params should be a plain object (Record)');
        });

        it('should report errors for invalid cyclingCalculatedRoutings', () => {
            const invalidRouting = { '_uuid': 'bar' };
            const segment = Segment.create({
                _cyclingCalculatedRoutings: [invalidRouting]
            }, registry);
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: Uuidable validateParams: _uuid should be a valid uuid');
        });

        it('should report errors for invalid cyclingCalculatedRoutings', () => {
            const invalidRouting = 123;
            const segment = Segment.create({
                _cyclingCalculatedRoutings: [invalidRouting]
            }, registry);
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: CyclingRouting validateParams: params should be a plain object (Record)');
        });

        it('should report errors for invalid drivingCalculatedRoutings', () => {
            const invalidRouting = { '_uuid': 'bar' };
            const segment = Segment.create({
                _drivingCalculatedRoutings: [invalidRouting]
            }, registry);
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: Uuidable validateParams: _uuid should be a valid uuid');
        });

        it('should report errors for invalid drivingCalculatedRoutings', () => {
            const invalidRouting = 123;
            const segment = Segment.create({
                _drivingCalculatedRoutings: [invalidRouting]
            }, registry);
            expect(hasErrors(segment)).toBe(true);
            expect(unwrap(segment)).toHaveLength(1);
            expect(unwrap(segment)[0].toString()).toEqual('Error: DrivingRouting validateParams: params should be a plain object (Record)');
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
            const segment = new Segment({ mode: undefined }, registry);
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
            const segment = new Segment({ mode: mode as Mode }, registry);
            expect(segment.isTransit()).toBe(expected);
        });
    });
});
