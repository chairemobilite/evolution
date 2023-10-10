/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { WeightMethod, WeightMethodAttributes } from '../WeightMethod';

describe('WeightMethod', () => {
    const validUUID = uuidV4();
    const weightMethodAttributes: WeightMethodAttributes = {
        _uuid: validUUID,
        shortname: 'ShortName',
        name: 'Test Weight Method',
        description: 'Description of the weight method',
    };

    it('should create a new WeightMethod instance', () => {
        const weightMethod = new WeightMethod(weightMethodAttributes);
        expect(weightMethod).toBeInstanceOf(WeightMethod);
        expect(weightMethod._uuid).toEqual(validUUID);
        expect(weightMethod.shortname).toEqual('ShortName');
        expect(weightMethod.name).toEqual('Test Weight Method');
        expect(weightMethod.description).toEqual('Description of the weight method');
    });

    it('should create a new WeightMethod instance with minimal attributes', () => {
        const minimalAttributes: WeightMethodAttributes = {
            _uuid: validUUID,
            shortname: 'ShortName',
            name: 'Minimal Test Weight Method',
        };

        const weightMethod = new WeightMethod(minimalAttributes);
        expect(weightMethod).toBeInstanceOf(WeightMethod);
        expect(weightMethod._uuid).toEqual(validUUID);
        expect(weightMethod.shortname).toEqual('ShortName');
        expect(weightMethod.name).toEqual('Minimal Test Weight Method');
        expect(weightMethod.description).toBeUndefined();
    });


});

describe('WeightMethod validateParams', () => {
    it('should return an empty array for valid params', () => {
        const validParams = {
            _uuid: uuidV4(),
            name: 'Valid Weight Method',
            shortname: 'VWM',
            description: 'A valid weight method.',
        };

        const errors = WeightMethod.validateParams(validParams);

        expect(errors).toEqual([]);
    });

    it('should return an array of errors for invalid params', () => {
        const invalidParams = {
            _uuid: 12345, // Invalid UUID
            name: 123, // Should be a string
            shortname: 123, // Should be a string
            description: 123, // Should be a string
        };

        const errors = WeightMethod.validateParams(invalidParams);

        expect(errors).toEqual([
            new Error('Uuidable validateParams: invalid uuid'),
            new Error('WeightMethod validateParams: name should be a string'),
            new Error('WeightMethod validateParams: shortname should be a string'),
            new Error('WeightMethod validateParams: description should be a string'),
        ]);
    });

    it('should return an array of errors for missing required params', () => {
        const missingParams = {
            // Missing _uuid, name, and shortname
        };

        const errors = WeightMethod.validateParams(missingParams);

        expect(errors).toEqual([
            new Error('WeightMethod validateParams: name is required'),
            new Error('WeightMethod validateParams: shortname is required'),
        ]);
    });
});
