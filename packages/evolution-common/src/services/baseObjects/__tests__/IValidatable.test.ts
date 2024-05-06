/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { IValidatable } from '../IValidatable';
import { Optional } from '../../../types/Optional.type';

class MockValidatable implements IValidatable {
    _isValid: Optional<boolean>;

    constructor(isValid?: Optional<boolean>) {
        this._isValid = isValid;
    }

    validate(): Optional<boolean> {
        this._isValid = true;
        return this._isValid;
    }

    isValid(): Optional<boolean> {
        return this._isValid;
    }
}

describe('IValidatable', () => {
    test('should have an _isValid property of type Optional<boolean>', () => {
        const validatable: IValidatable = new MockValidatable();
        expect(validatable._isValid).toBeUndefined();
    });

    test('validate method should set _isValid to true and return true', () => {
        const validatable: IValidatable = new MockValidatable();
        const result = validatable.validate();
        expect(result).toBe(true);
        expect(validatable._isValid).toBe(true);
    });

    test('isValid method should return the value of _isValid', () => {
        const validatable1: IValidatable = new MockValidatable(true);
        expect(validatable1.isValid()).toBe(true);

        const validatable2: IValidatable = new MockValidatable(false);
        expect(validatable2.isValid()).toBe(false);

        const validatable3: IValidatable = new MockValidatable();
        expect(validatable3.isValid()).toBeUndefined();
    });
});
