/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Routing, RoutingAttributes, ExtendedRoutingAttributes, routingAttributes } from '../Routing';
import { v4 as uuidV4 } from 'uuid';
import { isOk, hasErrors, unwrap } from '../../../types/Result.type';

describe('Routing', () => {
    const validAttributes: RoutingAttributes = {
        _uuid: uuidV4(),
        arrivalDate: '2023-05-22',
        departureDate: '2023-05-21',
        arrivalTime: 7200,
        departureTime: 3600,
        calculatedOn: Date.now(),
        mode: 'walking',
        status: 'success',
        travelTimeS: 3600,
        travelDistanceM: 5000,
    };

    const extendedAttributes: ExtendedRoutingAttributes = {
        ...validAttributes,
        customAttribute: 'custom value',
    };

    test('should create a Routing instance with valid attributes', () => {
        const routing = new Routing(validAttributes);
        expect(routing).toBeInstanceOf(Routing);
        expect(routing.attributes).toEqual(validAttributes);
    });

    test('should have a validateParams section for each attribute', () => {
        const validateParamsCode = Routing.validateParams.toString();
        routingAttributes.forEach((attributeName) => {
            expect(validateParamsCode).toContain(attributeName);
        });
    });

    test('should get uuid', () => {
        const routing = new Routing({ ...validAttributes, _uuid: '11b78eb3-a5d8-484d-805d-1f947160bb9e' });
        expect(routing._uuid).toBe('11b78eb3-a5d8-484d-805d-1f947160bb9e');
    });

    test('should create a Routing instance with valid attributes', () => {
        const result = Routing.create(validAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Routing);
    });

    test('should return an error for invalid params', () => {
        const invalidAttributes = 'foo' as any;
        const result = Routing.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[])).toHaveLength(1);
    });

    test('should create a Routing instance with extended attributes', () => {
        const result = Routing.create(extendedAttributes);
        expect(isOk(result)).toBe(true);
        expect(unwrap(result)).toBeInstanceOf(Routing);
    });

    test('should create a new Routing instance with extended attributes', () => {
        const routing = new Routing(extendedAttributes);
        expect(routing).toBeInstanceOf(Routing);
    });

    test('should return errors for invalid attributes', () => {
        const invalidAttributes = { ...validAttributes, arrivalDate: 123 };
        const result = Routing.create(invalidAttributes);
        expect(hasErrors(result)).toBe(true);
        expect((unwrap(result) as Error[]).length).toBeGreaterThan(0);
    });

    test('should unserialize a Routing instance', () => {
        const routing = Routing.unserialize(validAttributes);
        expect(routing).toBeInstanceOf(Routing);
        expect(routing.attributes).toEqual(validAttributes);
    });

    test('should validate Routing attributes', () => {
        const errors = Routing.validateParams(validAttributes);
        expect(errors).toHaveLength(0);
    });

    test('should return errors for invalid Routing attributes', () => {
        const invalidAttributes = { ...validAttributes, mode: 123 };
        const errors = Routing.validateParams(invalidAttributes);
        expect(errors).toHaveLength(1);
    });

    describe('validateParams', () => {
        test.each([
            ['arrivalDate', 123],
            ['departureDate', 123],
            ['arrivalTime', -1],
            ['departureTime', -1],
            ['calculatedOn', -1],
            ['mode', 123],
            ['status', 123],
            ['travelTimeS', -1],
            ['travelDistanceM', -1],
        ])('should return an error for invalid %s', (param, value) => {
            const invalidAttributes = { ...validAttributes, [param]: value };
            const errors = Routing.validateParams(invalidAttributes);
            expect(errors).toHaveLength(1);
        });

        test('should return no errors for valid attributes', () => {
            const errors = Routing.validateParams(validAttributes);
            expect(errors).toHaveLength(0);
        });
    });

    describe('Getters and Setters', () => {
        test.each([
            ['arrivalDate', '2023-05-23'],
            ['departureDate', '2023-05-20'],
            ['arrivalTime', 5400],
            ['departureTime', 1800],
            ['calculatedOn', Date.now()],
            ['mode', 'cycling'],
            ['status', 'noRoutingFound'],
            ['travelTimeS', 5400],
            ['travelDistanceM', 7000],
        ])('should set and get %s', (attribute, value) => {
            const routing = new Routing(validAttributes);
            routing[attribute] = value;
            expect(routing[attribute]).toEqual(value);
        });
    });

    describe('Getters for attributes with no setters', () => {
        test.each([
            ['_uuid', extendedAttributes._uuid],
            ['customAttributes', { customAttribute: extendedAttributes.customAttribute }],
            ['attributes', validAttributes],
        ])('should set and get %s', (attribute, value) => {
            const routing = new Routing(extendedAttributes);
            expect(routing[attribute]).toEqual(value);
        });
    });
});
