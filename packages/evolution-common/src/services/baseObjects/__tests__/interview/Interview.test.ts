/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Interview } from '../../Interview';
import { Result, isOk, hasErrors, unwrap } from '../../../../types/Result.type';

describe('Interview', () => {
    const validParams = {
        _uuid: '123e4567-e89b-12d3-a456-426614174000',
        accessCode: 'ABC123',
        assignedDate: '2023-09-30',
        _startedAt: 1632929461
    };

    describe('constructor', () => {
        it('should create an Interview instance', () => {
            const interview = new Interview(validParams);
            expect(interview).toBeInstanceOf(Interview);
        });

        it('should throw an error for invalid params', () => {
            const invalidParams = { ...validParams, _uuid: 'invalid-uuid' };
            expect(() => new Interview(invalidParams)).toThrow();
        });
    });

    describe('create', () => {
        it('should create a valid Interview instance', () => {
            const result = Interview.create(validParams) as Result<Interview>;
            expect(isOk(result)).toBe(true);
            if (isOk(result)) {
                expect(unwrap(result)).toBeInstanceOf(Interview);
            }
        });

        it('should return errors for invalid params', () => {
            const invalidParams = { ...validParams, _uuid: 'invalid-uuid', _startedAt: 'not-a-number' };
            const result = Interview.create(invalidParams) as Result<Interview>;
            expect(hasErrors(result)).toBe(true);
            if (hasErrors(result)) {
                const errors = unwrap(result) as Error[];
                expect(errors.length).toBeGreaterThan(0);
                expect(errors.some((e) => e.message.includes('_uuid'))).toBe(true);
                expect(errors.some((e) => e.message.includes('_startedAt'))).toBe(true);
            }
        });
    });

    describe('unserialize', () => {
        it('should unserialize an Interview instance', () => {
            const interview = Interview.unserialize(validParams);
            expect(interview).toBeInstanceOf(Interview);
        });

        it('should throw an error for invalid params', () => {
            const invalidParams = { ...validParams, _uuid: 'invalid-uuid' };
            expect(() => Interview.unserialize(invalidParams)).toThrow();
        });
    });

    describe('uuid', () => {
        it('should have a valid uuid', () => {
            const interview = new Interview(validParams);
            expect(interview._uuid).toBe(validParams._uuid);
        });

        it('should throw an error for invalid uuid', () => {
            const invalidParams = { ...validParams, _uuid: 'invalid-uuid' };
            expect(() => new Interview(invalidParams)).toThrow();
        });
    });
});
