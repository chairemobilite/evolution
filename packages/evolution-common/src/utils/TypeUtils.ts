/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

// this type will return all the properties of a type T that are not functions (exclude methods)
export type ExcludeFunctionPropertyNames<T> = Pick<
    T,
    {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
        [K in keyof T]: T[K] extends Function ? never : K;
    }[keyof T]
>;
