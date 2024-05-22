/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

// These are collection of result/status types, that can mimic Rust Result<T> type, but can have multiple errors

export interface ResultErrors {
    status: 'error';
    errors: Error[];
}

export interface ResultOk<T> {
    status: 'ok';
    result: T;
}

export type Result<T> = ResultOk<T> | ResultErrors;

// Function to easy creation of result objects
export function createErrors(errors: Error[]): ResultErrors {
    return { status: 'error', errors: errors };
}

export function createOk<T>(result: T): ResultOk<T> {
    return { status: 'ok', result: result };
}

// Type guards
export function hasErrors<T>(result: Result<T>): result is ResultErrors {
    return result.status === 'error';
}

export function isOk<T>(result: Result<T>): result is ResultOk<T> {
    return result.status === 'ok';
}

// alias for compatibility with Status objects:
export const isStatusOk = isOk;
export const isStatusError = hasErrors;

// Losely inspired by Rust
export function unwrap<T>(result: Result<T>): T | Error[] {
    if (isOk(result)) {
        return result.result;
    } else if (hasErrors(result)) {
        return result.errors;
    } else {
        // We did not receive a result
        throw 'Invalid Result object';
    }
}
