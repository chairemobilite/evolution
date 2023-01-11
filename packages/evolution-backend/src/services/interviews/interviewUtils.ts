/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
/** Change the prefixes in the valuesByPath and unsetPaths from responses to validated_data. */
export const mapResponsesToValidatedData = (
    valuesByPath: { [key: string]: unknown },
    origUnsetPaths: string[]
): { valuesByPath: { [key: string]: unknown }; unsetPaths: string[] } => {
    // Content in valuesByPath and unsetPaths with prefix 'responses' should
    // be put in 'validated_data' instead. This route should not modify the
    // responses
    const renameKey = (oldKey: string): string => {
        if (oldKey.startsWith('responses.') || oldKey === 'responses') {
            return oldKey.replace('responses', 'validated_data');
        }
        return oldKey;
    };
    Object.keys(valuesByPath).forEach((key) => {
        const newKey = renameKey(key);
        if (newKey !== key) {
            valuesByPath[newKey] = valuesByPath[key];
            delete valuesByPath[key];
        }
    });
    const unsetPaths = origUnsetPaths.map(renameKey);
    return { valuesByPath, unsetPaths };
};
