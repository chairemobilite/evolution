/*
 * Copyright 2023, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Uuidable } from '../Uuidable';
import { validate as uuidValidate, v4 as uuidV4 } from 'uuid';

describe('Uuidable Class', () => {

    it('should have a _uuid property when instantiated without parameters', () => {
        const uuidBaseInstance = new Uuidable();
        expect(uuidBaseInstance).toHaveProperty('_uuid');
    });

    it('should have a valid UUID for the _uuid property when instantiated without parameters', () => {
        const uuidBaseInstance = new Uuidable();
        const isValidUUID = uuidValidate(uuidBaseInstance._uuid);
        expect(isValidUUID).toBeTruthy();
    });

    it('should accept and use a valid UUID provided as a parameter', () => {
        const validUuid = uuidV4();
        const uuidBaseInstance = new Uuidable(validUuid);
        expect(uuidBaseInstance._uuid).toEqual(validUuid);
    });

    it('should throw an error when provided with an invalid UUID', () => {
        const invalidUuid = 'invalid-uuid';
        expect(() => new Uuidable(invalidUuid)).toThrow('Uuidable: invalid uuid');
    });

    it('should return errors for invalid params and accept empty or valid uuid', () => {
        expect(Uuidable.validateParams({ _uuid: 'invalid-uuid' })).toEqual([new Error('Uuidable validateParams: invalid uuid')]);
        expect(Uuidable.validateParams({})).toEqual([]);
        expect(Uuidable.validateParams({ _uuid: uuidV4() })).toEqual([]);
    });
});
