/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { v4 as uuidV4 } from 'uuid';
import { Weight, WeightableAttributes, validateWeights } from '../Weight';
import { WeightMethod, WeightMethodAttributes } from '../WeightMethod';

const weightMethodAttributes: WeightMethodAttributes = {
    _uuid: uuidV4(),
    shortname: 'ShortName',
    name: 'Test Weight Method',
    description: 'Description of the weight method',
};

describe('Weight', () => {
    test('should have a weight property of type number', () => {
        const weight: Weight = { weight: 1.5, method: new WeightMethod(weightMethodAttributes) };
        expect(typeof weight.weight).toBe('number');
    });

    test('should have a method property of type WeightMethod', () => {
        const weight: Weight = { weight: 1.5, method: new WeightMethod(weightMethodAttributes) };
        expect(weight.method).toBeInstanceOf(WeightMethod);
    });
});

describe('Weightable', () => {
    test('should have an optional _weights property of type Weight[]', () => {
        const weightable: WeightableAttributes = { _weights: [{ weight: 1, method: new WeightMethod(weightMethodAttributes) }] };
        expect(Array.isArray(weightable._weights)).toBe(true);
        expect(weightable._weights?.[0]).toHaveProperty('weight');
        expect(weightable._weights?.[0]).toHaveProperty('method');
    });
});

describe('validateWeights', () => {
    test('should return an empty array if _weights is empty', () => {
        const errors = validateWeights([]);
        expect(errors).toEqual([]);
    });

    test('should return an error if _weights is not an array', () => {
        const errors = validateWeights({} as any);
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toBe('Weightable validateWeights: _weights should be an array');
    });

    test('should return an error if weight is not a positive number', () => {
        const errors = validateWeights([{ weight: -1, method: new WeightMethod(weightMethodAttributes) }]);
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toBe('Weightable validateWeights: weight at index 0 must be a positive number');
    });

    test('should return an error if method is not an instance of WeightMethod', () => {
        const errors = validateWeights([{ weight: 1, method: {} as any }]);
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toBe('Weightable validateWeights: method at index 0 must be an instance of WeightMethod');
    });

    test('should return an empty array if _weights is valid', () => {
        const errors = validateWeights([{ weight: 1, method: new WeightMethod(weightMethodAttributes) }]);
        expect(errors).toEqual([]);
    });
});
