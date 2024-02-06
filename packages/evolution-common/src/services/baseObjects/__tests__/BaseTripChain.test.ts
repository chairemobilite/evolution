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
import * as TCAttr from '../attributeTypes/TripChainAttributes';
import * as VPAttr from '../attributeTypes/VisitedPlaceAttributes';

const validUUID = uuidV4();

describe('BaseTripChain', () => {
    const baseTripAttributes: BaseTripAttributes = {
        _uuid: uuidV4()
    };

    const weightMethodAttributes = {
        _uuid: uuidV4(),
        shortname: 'sample-shortname3',
        name: 'Sample Weight Method3',
        description: 'Sample weight method description3',
    };

    const baseTripChainAttributes: BaseTripChainAttributes = {
        _uuid: validUUID,
        _weights: [{ weight: 0.0, method: new WeightMethod(weightMethodAttributes) }],
        isMultiloop: false,
        isConstrained: true,
        category: 'simple' as TCAttr.TripChainCategory,
        mainActivityCategory: 'work' as VPAttr.ActivityCategory,
        mainActivity: 'workOther' as VPAttr.Activity,
    };

    it('should create a new BaseTripChain instance', () => {
        const tripChain = new BaseTripChain(baseTripChainAttributes);
        expect(tripChain).toBeInstanceOf(BaseTripChain);
        expect(tripChain._uuid).toEqual(validUUID);
        expect(tripChain.isMultiloop).toEqual(false);
        expect(tripChain.isConstrained).toEqual(true);
        expect(tripChain.category).toEqual('simple');
        expect(tripChain.mainActivityCategory).toEqual('work');
        expect(tripChain.mainActivity).toEqual('workOther');
    });

    it('should create a new BaseTripChain instance with minimal attributes', () => {
        const minimalAttributes: BaseTripChainAttributes = {
            _uuid: validUUID,
            isMultiloop: true,
            isConstrained: false,
            category: 'complex' as TCAttr.TripChainCategory,
        };

        const tripChain = new BaseTripChain(minimalAttributes);
        expect(tripChain).toBeInstanceOf(BaseTripChain);
        expect(tripChain._uuid).toEqual(validUUID);
        expect(tripChain.isMultiloop).toEqual(true);
        expect(tripChain.isConstrained).toEqual(false);
        expect(tripChain.category).toEqual('complex');
        expect(tripChain.mainActivityCategory).toBeUndefined();
        expect(tripChain.mainActivity).toBeUndefined();
        expect(tripChain._weights).toBeUndefined();
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
        const weight: Weight = tripChain._weights?.[0] as Weight;
        expect(weight.weight).toBe(0);
        expect(weight.method).toBeInstanceOf(WeightMethod);
        expect(weight.method.shortname).toEqual('sample-shortname3');
        expect(weight.method.name).toEqual('Sample Weight Method3');
        expect(weight.method.description).toEqual('Sample weight method description3');
    });

    it('should return an empty array for valid parameters', () => {
        const params = {
            _uuid: uuidV4(),
            isMultiloop: true,
            isConstrained: false,
            category: 'category',
            mainActivityCategory: 'work',
            mainActivity: 'workUsual',
            _weights: [{ weight: 1, method: new WeightMethod(weightMethodAttributes) }],
        };

        const errors = BaseTripChain.validateParams(params);
        expect(errors).toEqual([]);
    });

    it('should return errors for invalid parameters', () => {
        const params = {
            _uuid: 'invalid uuid',
            isMultiloop: new Date(),
            isConstrained: Infinity,
            category: 2355,
            mainActivityCategory: -324.5,
            mainActivity: {},
            _weights: [{ weight: 1, method: new WeightMethod(weightMethodAttributes) }],
        };

        const errors = BaseTripChain.validateParams(params);
        expect(errors).toEqual([
            new Error('Uuidable validateParams: invalid uuid'),
            new Error('BaseTripChain validateParams: isMultiloop should be a boolean'),
            new Error('BaseTripChain validateParams: isConstrained should be a boolean'),
            new Error('BaseTripChain validateParams: category should be a string'),
            new Error('BaseTripChain validateParams: mainActivityCategory should be a string'),
            new Error('BaseTripChain validateParams: mainActivity should be a string'),
        ]);
    });

    it('should accept empty params', () => {
        const params = {};
        const errors = BaseTripChain.validateParams(params);
        expect(errors).toHaveLength(0);
    });

    it('should unserialize object', () => {
        const instance = BaseTripChain.unserialize(baseTripChainAttributes);
        expect(instance).toBeInstanceOf(BaseTripChain);
        expect(instance.category).toEqual(baseTripChainAttributes.category);
    });

});
