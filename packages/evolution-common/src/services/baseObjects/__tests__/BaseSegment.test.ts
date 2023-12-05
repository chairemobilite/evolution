/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { BaseSegment, BaseSegmentAttributes, ExtendedSegmentAttributes } from '../BaseSegment';
import { BaseVehicle, BaseVehicleAttributes } from '../BaseVehicle';
import * as VAttr from '../attributeTypes/VehicleAttributes';
import * as SAttr from '../attributeTypes/SegmentAttributes';

const validUUID = uuidV4();

describe('BaseSegment', () => {
    const baseVehicleAttributes: BaseVehicleAttributes = {
        _uuid: uuidV4(),
        make: 'Toyota' as VAttr.Make,
        model: 'Camry' as VAttr.Model,
        licensePlateNumber: 'ABC123',
        capacitySeated: 5,
        capacityStanding: 2
    };

    const baseSegmentAttributes: BaseSegmentAttributes = {
        _uuid: validUUID,
        baseVehicle: new BaseVehicle(baseVehicleAttributes),
        modeCategory: 'car' as SAttr.ModeCategory,
        mode: 'carDriver' as SAttr.Mode,
    };

    it('should create a new BaseSegment instance', () => {
        const segment = new BaseSegment(baseSegmentAttributes);
        expect(segment).toBeInstanceOf(BaseSegment);
        expect(segment._uuid).toEqual(validUUID);
        expect(segment.baseVehicle).toBeInstanceOf(BaseVehicle);
        expect(segment.modeCategory).toEqual('car');
        expect(segment.mode).toEqual('carDriver');
    });

    it('should create a new BaseSegment instance with minimal attributes', () => {
        const minimalAttributes: BaseSegmentAttributes = {
            _uuid: validUUID,
        };

        const segment = new BaseSegment(minimalAttributes);
        expect(segment).toBeInstanceOf(BaseSegment);
        expect(segment._uuid).toEqual(validUUID);
        expect(segment.baseVehicle).toBeUndefined();
        expect(segment.modeCategory).toBeUndefined();
        expect(segment.mode).toBeUndefined();
    });

    it('should validate a BaseSegment instance', () => {
        const segment = new BaseSegment(baseSegmentAttributes);
        expect(segment.isValid()).toBeUndefined();
        const validationResult = segment.validate();
        expect(validationResult).toBe(true);
        expect(segment.isValid()).toBe(true);
    });

    it('should accept extended attributes', () => {
        const extendedAttributes: ExtendedSegmentAttributes = {
            ...baseSegmentAttributes,
            customAttribute: 'Custom Value',
        };

        const segment = new BaseSegment(extendedAttributes);
        expect(segment).toBeInstanceOf(BaseSegment);
    });

    it('should return an empty array for valid parameters', () => {
        const params = {
            modeCategory: 'walk',
            mode: 'walk',
            baseVehicle: new BaseVehicle({}),
        };

        const result = BaseSegment.validateParams(params);

        expect(result).toEqual([]);
    });

    it('should accept empty params', () => {
        const params = {};

        const result = BaseSegment.validateParams(params);

        expect(result).toHaveLength(0);
    });

    it('should return an array of errors for invalid modeCategory', () => {
        const params = {
            modeCategory: 42, // Invalid type
            mode: new Date(), // Invalid type
            baseVehicle: new BaseVehicle({}),
        };

        const result = BaseSegment.validateParams(params);

        expect(result).toHaveLength(2);
        expect(result[0]).toBeInstanceOf(Error);
        expect(result).toEqual([
            new Error('BaseSegment validateParams: modeCategory should be a string'),
            new Error('BaseSegment validateParams: mode should be a string')
        ]);
    });

    it('should return an array of errors for missing vehicleType in baseVehicle', () => {
        const params = {
            modeCategory: 'transit',
            mode: 'tram',
            baseVehicle: {}, // wrong vehicleType
        };

        const result = BaseSegment.validateParams(params);

        expect(result).toHaveLength(1);
        expect(result).toEqual([
            new Error('BaseSegment validateParams: baseVehicle should be an instance of BaseVehicle'),
        ]);
    });
});
