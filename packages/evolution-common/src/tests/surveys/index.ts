/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

export { interviewAttributesForTestCases } from './testCasesInterview';

/**
 * Change all function properties in an object (or array) to
 * `expect.any(Function)` for easier testing with Jest
 * @param value The value for which to mask functions
 * @returns A value of the same type as the received one, but with function
 * properties masked
 */
export const maskFunctions = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(maskFunctions);
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([k, v]) => [
                k,
                typeof v === 'function' ? expect.any(Function) : maskFunctions(v)
            ])
        );
    }
    return value;
};
