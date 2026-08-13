/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

/**
 * Whether two arrays contain the same values with the same counts, regardless
 * of order.
 *
 * @param left first array
 * @param right second array
 */
export const isSameMultiset = (left: readonly (string | number)[], right: readonly (string | number)[]): boolean => {
    if (left.length !== right.length) {
        return false;
    }
    const remaining = new Map<string | number, number>();
    for (const value of left) {
        remaining.set(value, (remaining.get(value) ?? 0) + 1);
    }
    for (const value of right) {
        const count = remaining.get(value);
        if (count === undefined || count < 1) {
            return false;
        }
        remaining.set(value, count - 1);
    }
    return true;
};
