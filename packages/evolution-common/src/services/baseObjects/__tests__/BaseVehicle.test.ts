/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { BaseVehicle, BaseVehicleAttributes, ExtendedVehicleAttributes } from '../BaseVehicle';
import * as VAttr from '../attributeTypes/VehicleAttributes';
import { Weight } from '../Weight';
import { WeightMethod } from '../WeightMethod';

const validUUID = uuidV4();

describe('BaseVehicle', () => {

    const weightMethodAttributes = {
        _uuid: uuidV4(),
        shortname: 'sample-shortname4',
        name: 'Sample Weight Method4',
        description: 'Sample weight method description4',
    };

    const baseVehicleAttributes: BaseVehicleAttributes = {
        _uuid: validUUID,
        make: 'Toyota' as VAttr.Make,
        model: 'Camry' as VAttr.Model,
        licensePlateNumber: 'ABC123',
        capacitySeated: 5,
        capacityStanding: 0,
        _weights: [{ weight: 0.0001, method: new WeightMethod(weightMethodAttributes) }],
    };

    it('should create a new BaseVehicle instance', () => {
        const vehicle = new BaseVehicle(baseVehicleAttributes);
        expect(vehicle).toBeInstanceOf(BaseVehicle);
        expect(vehicle._uuid).toEqual(validUUID);
        expect(vehicle.make).toEqual('Toyota');
        expect(vehicle.model).toEqual('Camry');
        expect(vehicle.licensePlateNumber).toEqual('ABC123');
        expect(vehicle.capacitySeated).toEqual(5);
        expect(vehicle.capacityStanding).toEqual(0);
    });

    it('should create a new BaseVehicle instance with minimal attributes', () => {
        const minimalAttributes: BaseVehicleAttributes = {
            _uuid: validUUID,
            make: 'Honda' as VAttr.Make,
            model: 'Civic' as VAttr.Model,
        };

        const vehicle = new BaseVehicle(minimalAttributes);
        expect(vehicle).toBeInstanceOf(BaseVehicle);
        expect(vehicle._uuid).toEqual(validUUID);
        expect(vehicle.make).toEqual('Honda');
        expect(vehicle.model).toEqual('Civic');
        expect(vehicle.licensePlateNumber).toBeUndefined();
        expect(vehicle.capacitySeated).toBeUndefined();
        expect(vehicle.capacityStanding).toBeUndefined();
    });

    it('should validate a BaseVehicle instance', () => {
        const vehicle = new BaseVehicle(baseVehicleAttributes);
        expect(vehicle.isValid()).toBeUndefined();
        const validationResult = vehicle.validate();
        expect(validationResult).toBe(true);
        expect(vehicle.isValid()).toBe(true);
    });

    it('should accept extended attributes', () => {
        const extendedAttributes: ExtendedVehicleAttributes = {
            ...baseVehicleAttributes,
            customAttribute: 'Custom Value',
        };

        const vehicle = new BaseVehicle(extendedAttributes);
        expect(vehicle).toBeInstanceOf(BaseVehicle);
    });

    it('should set weight and method correctly', () => {
        const vehicle = new BaseVehicle(baseVehicleAttributes);
        const weight: Weight = vehicle._weights?.[0] as Weight;
        expect(weight.weight).toBe(.0001);
        expect(weight.method).toBeInstanceOf(WeightMethod);
        expect(weight.method?.shortname).toEqual('sample-shortname4');
        expect(weight.method?.name).toEqual('Sample Weight Method4');
        expect(weight.method?.description).toEqual('Sample weight method description4');
    });

    it('should return an empty array for valid params', () => {
        const params = {
            _uuid: uuidV4(),
            make: 'Toyota',
            model: 'Camry',
            licensePlateNumber: 'ABC123',
            capacitySeated: 5,
            capacityStanding: 0,
        };

        const errors = BaseVehicle.validateParams(params);
        expect(errors).toEqual([]);
    });

    it('should return an error for invalid make', () => {
        const params = {
            _uuid: -34,
            make: 123,
            model: 456,
            licensePlateNumber: {},
            capacitySeated: new Date(),
            capacityStanding: -34.65,
        };

        const errors = BaseVehicle.validateParams(params);
        expect(errors).toEqual([
            new Error('Uuidable validateParams: _uuid should be a valid uuid'),
            new Error('BaseVehicle validateParams: make should be a string'),
            new Error('BaseVehicle validateParams: model should be a string'),
            new Error('BaseVehicle validateParams: licensePlateNumber should be a string'),
            new Error('BaseVehicle validateParams: capacitySeated should be a positive integer'),
            new Error('BaseVehicle validateParams: capacityStanding should be a positive integer'),
        ]);
    });

    it('should accept empty params', () => {
        const params = {};
        const errors = BaseVehicle.validateParams(params);
        expect(errors).toHaveLength(0);
    });

    it('should unserialize object', () => {
        const instance = BaseVehicle.unserialize(baseVehicleAttributes);
        expect(instance).toBeInstanceOf(BaseVehicle);
        expect(instance.make).toEqual(baseVehicleAttributes.make);
    });

});
