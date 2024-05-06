/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Optional } from '../Optional.type';

describe('Optional Types', () => {
    test('Optional<boolean> should accept boolean or undefined', () => {
        const value1: Optional<boolean> = true;
        const value2: Optional<boolean> = undefined;
        expect(value1).toBe(true);
        expect(value2).toBeUndefined();
    });

    test('Optional<string> should accept string or undefined', () => {
        const value1: Optional<string> = 'hello';
        const value2: Optional<string> = undefined;
        expect(value1).toBe('hello');
        expect(value2).toBeUndefined();
    });

    test('Optional<Date> should accept Date or undefined', () => {
        const value1: Optional<Date> = new Date('2023-05-06');
        const value2: Optional<Date> = undefined;
        expect(value1).toEqual(new Date('2023-05-06'));
        expect(value2).toBeUndefined();
    });

    test('Optional<number> should accept number or undefined', () => {
        const value1: Optional<number> = 42;
        const value2: Optional<number> = undefined;
        expect(value1).toBe(42);
        expect(value2).toBeUndefined();
    });

    test('Optional<T> should accept object of type T or undefined', () => {
        const value1: Optional<{ name: string }> = { name: 'John' };
        const value2: Optional<{ name: string }> = undefined;
        expect(value1).toEqual({ name: 'John' });
        expect(value2).toBeUndefined();
    });

    test('Optional<T[]> should accept array of type T[] or undefined', () => {
        const value1: Optional<{ id: number }[]> = [{ id: 1 }, { id: 2 }];
        const value2: Optional<{ id: number }[]> = undefined;
        expect(value1).toEqual([{ id: 1 }, { id: 2 }]);
        expect(value2).toBeUndefined();
    });

    test('Optional<string[]> should accept array of string[] or undefined', () => {
        const value1: Optional<string[]> = ['apple', 'banana'];
        const value2: Optional<string[]> = undefined;
        expect(value1).toEqual(['apple', 'banana']);
        expect(value2).toBeUndefined();
    });

    test('Optional<number[]> should accept array of number[] or undefined', () => {
        const value1: Optional<number[]> = [1, 2, 3];
        const value2: Optional<number[]> = undefined;
        expect(value1).toEqual([1, 2, 3]);
        expect(value2).toBeUndefined();
    });

    test('Optional<Date[]> should accept array of Date[] or undefined', () => {
        const value1: Optional<Date[]> = [new Date('2023-05-06'), new Date('2023-05-07')];
        const value2: Optional<Date[]> = undefined;
        expect(value1).toEqual([new Date('2023-05-06'), new Date('2023-05-07')]);
        expect(value2).toBeUndefined();
    });
});
