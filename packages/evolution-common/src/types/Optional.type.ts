/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

// These are collection of optional types, that can mimic Rust Option<T> type

/**
 * Optional object of type T
 *
 * @export
 * @typedef {Optional}
 */
export type Optional<T> = T | undefined;
