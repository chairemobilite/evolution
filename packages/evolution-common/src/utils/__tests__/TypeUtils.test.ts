/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { ExcludeFunctionPropertyNames } from '../TypeUtils';

describe('TypeUtils', () => {
    describe('ExcludeFunctionPropertyNames', () => {
        class TestClass {
            prop1: string;
            prop2: number;
            method1() { return 'method1'; }
            method2() { return true; }

            constructor(prop1: string, prop2: number) {
                this.prop1 = prop1;
                this.prop2 = prop2;
            }
        }

        test('should exclude function property names from a type', () => {
            type NonFunctionProps = ExcludeFunctionPropertyNames<TestClass>;
            const nonFunctionProps: NonFunctionProps = {
                prop1: 'value1',
                prop2: 123,
            };
            expect(Object.keys(nonFunctionProps)).toEqual(['prop1', 'prop2']);
        });
    });
});
