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
        vehicle: new BaseVehicle(baseVehicleAttributes),
        modeCategory: 'car' as SAttr.ModeCategory,
        mode: 'carDriver' as SAttr.Mode,
    };

    it('should create a new BaseSegment instance', () => {
        const segment = new BaseSegment(baseSegmentAttributes);
        expect(segment).toBeInstanceOf(BaseSegment);
        expect(segment._uuid).toEqual(validUUID);
        expect(segment.vehicle).toBeInstanceOf(BaseVehicle);
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
        expect(segment.vehicle).toBeUndefined();
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
});
