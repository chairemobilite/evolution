/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { BaseTrip, BaseTripAttributes } from '../BaseTrip';
import { BaseTripChain, BaseTripChainAttributes, ExtendedTripChainAttributes } from '../BaseTripChain';
import { Weight } from '../Weight';
import { WeightMethod } from '../WeightMethod';

const validUUID = uuidV4();

describe('BaseTripChain', () => {
    const baseTripAttributes: BaseTripAttributes = {
        _uuid: uuidV4(),
        origin: undefined,
        destination: undefined,
        segments: [],
    };

    const weightMethodAttributes = {
        _uuid: uuidV4(),
        shortname: 'sample-shortname3',
        name: 'Sample Weight Method3',
        description: 'Sample weight method description3',
    };

    const baseTripChainAttributes: BaseTripChainAttributes = {
        _uuid: validUUID,
        _weight: { weight: 0.0, method: new WeightMethod(weightMethodAttributes) },
        trips: [new BaseTrip(baseTripAttributes)],
    };

    it('should create a new BaseTripChain instance', () => {
        const tripChain = new BaseTripChain(baseTripChainAttributes);
        expect(tripChain).toBeInstanceOf(BaseTripChain);
        expect(tripChain._uuid).toEqual(validUUID);
        expect(tripChain.trips.length).toEqual(1);
        expect(tripChain.trips[0]).toBeInstanceOf(BaseTrip);
        expect(tripChain.trips[0]._uuid).toEqual(baseTripAttributes._uuid);
        expect(tripChain.trips[0].segments.length).toEqual(0);
    });

    it('should create a new BaseTripChain instance with minimal attributes', () => {
        const minimalAttributes: BaseTripChainAttributes = {
            _uuid: validUUID,
            trips: [],
        };

        const tripChain = new BaseTripChain(minimalAttributes);
        expect(tripChain).toBeInstanceOf(BaseTripChain);
        expect(tripChain._uuid).toEqual(validUUID);
        expect(tripChain.trips).toEqual([]);
    });

    it('should validate a BaseTripChain instance', () => {
        const tripChain = new BaseTripChain(baseTripChainAttributes);
        expect(tripChain.isValid()).toBeUndefined();
        const validationResult = tripChain.validate();
        expect(validationResult).toBe(true);
        expect(tripChain.isValid()).toBe(true);
    });

    it('should accept extended attributes', () => {
        const extendedAttributes: ExtendedTripChainAttributes = {
            ...baseTripChainAttributes,
            customAttribute: 'Custom Value',
        };

        const tripChain = new BaseTripChain(extendedAttributes);
        expect(tripChain).toBeInstanceOf(BaseTripChain);
    });

    it('should set weight and method correctly', () => {
        const tripChain = new BaseTripChain(baseTripChainAttributes);
        const weight: Weight = tripChain._weight as Weight;
        expect(weight.weight).toBe(0);
        expect(weight.method).toBeInstanceOf(WeightMethod);
        expect(weight.method.shortname).toEqual('sample-shortname3');
        expect(weight.method.name).toEqual('Sample Weight Method3');
        expect(weight.method.description).toEqual('Sample weight method description3');
    });
});
