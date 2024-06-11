/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { WeightMethod } from './WeightMethod';
import { Optional } from '../../types/Optional.type';

/**
 * This is for interview objects that can be individually weighted after validation, using a specific weight method.
 */

export type Weight = {
    weight: number;
    method?: Optional<WeightMethod>;
};

export type WeightableAttributes = {
    _weights?: Optional<Weight[]>;
};

export type Weightable = WeightableAttributes; // deprecated, kept for compatibility (base objects)

export function validateWeights(_weights?: Optional<Weight[]>): Error[] {
    const errors: Error[] = [];
    if (_weights !== undefined && !Array.isArray(_weights)) {
        errors.push(new Error('Weightable validateWeights: _weights should be an array'));
    } else if (_weights !== undefined && Array.isArray(_weights) && _weights.length > 0) {
        for (let i = 0, countI = _weights.length; i < countI; i++) {
            const _weight = _weights[i];
            if (_weight !== undefined && (typeof _weight.weight !== 'number' || _weight.weight < 0)) {
                errors.push(new Error(`Weightable validateWeights: weight at index ${i} must be a positive number`));
            } else if (
                _weight !== undefined &&
                _weight.method !== undefined &&
                !(_weight.method instanceof WeightMethod)
            ) {
                errors.push(
                    new Error(`Weightable validateWeights: method at index ${i} must be an instance of WeightMethod`)
                );
            }
        }
    }
    return errors;
}
