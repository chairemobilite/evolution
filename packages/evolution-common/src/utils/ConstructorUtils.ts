/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

export class ConstructorUtils {
    /**
     * Initializes the attributes and custom attributes of an object based on the provided parameters.
     *
     * @template T - The type of the params object.
     * @param params - The parameters object containing the attribute values.
     * @param attributeNames - The array of attributes names.
     * @returns An object containing the attributes and custom attributes.
     */
    static initializeAttributes<T>(params: T, attributeNames: string[]) {
        const initializedAttributes = {} as T;
        const initializedCustomAttributes = {} as { [key: string]: unknown };

        for (const attribute in params) {
            if (attributeNames.includes(attribute)) {
                // If the key exists in the attributes object, assign the value to the initialized attributes
                initializedAttributes[attribute] = params[attribute];
            } else {
                // If the key doesn't exist in the attributes object, assign the value to the initialized custom attributes
                initializedCustomAttributes[attribute] = params[attribute];
            }
        }

        return { attributes: initializedAttributes, customAttributes: initializedCustomAttributes };
    }

    /**
     * Initializes a composed attribute of an object based on the provided parameters.
     *
     * @template T - The type of the parameters object.
     * @template U - The type of the unserialized attribute item.
     * @param params - The parameters object containing the composed attribute values.
     * @param attributeKey - The key of the composed attribute in the parameters object.
     * @param unserializeFunc - The function used to unserialize each attribute item.
     * @returns An array of unserialized attribute items.
     */
    static initializeComposedArrayAttributes<T, U, P>(
        params: T,
        attributeKey: keyof T,
        unserializeFunc: (params: P) => U
    ): U[] {
        const attributeParams = params[attributeKey] as P[] | undefined;
        const attributeList: U[] = [];

        if (attributeParams) {
            for (const itemParams of attributeParams) {
                // Unserialize each attribute item using the provided unserialize function
                attributeList.push(unserializeFunc(itemParams));
            }
        }

        return attributeList;
    }

    /**
     * Initializes a composed attribute of an object based on the provided parameters.
     *
     * @template T - The type of the parameters object.
     * @template U - The type of the unserialized attribute item.
     * @param params - The parameters object containing the composed attribute values.
     * @param attributeKey - The key of the composed attribute in the parameters object.
     * @param unserializeFunc - The function used to unserialize each attribute item.
     * @returns the unserialized attribute items.
     */
    static initializeComposedAttribute<T, U, P>(
        params: T,
        attributeKey: keyof T,
        unserializeFunc: (params: P) => U
    ): U | undefined {
        const attributeParams = params[attributeKey] as P | undefined;

        if (attributeParams) {
            return unserializeFunc(attributeParams);
        } else {
            return undefined;
        }
    }
}
