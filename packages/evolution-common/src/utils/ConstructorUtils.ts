/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Optional } from '../types/Optional.type';
import { SurveyObjectsRegistry } from '../services/baseObjects/SurveyObjectsRegistry';
export class ConstructorUtils {
    /**
     * Initializes the attributes and custom attributes of an object based on the provided parameters.
     *
     * @template T - The type of the params object.
     * @param params - The parameters object containing the attribute values (includes named attributes, custom attributes and composed attributes, which are ignored here).
     * @param attributeNames - The array of attributes names.
     * @param attributeWithComposedAttributes - The array of attributes names including composed attributes names. Undefined if the class has no composed objects. Composed attributes are ignored here and must be sent to initializeComposedAttribute/initializeComposedArrayAttributes.
     * @returns An object containing the attributes and custom attributes.
     */
    static initializeAttributes<T>(
        params: T,
        attributeNames: readonly string[],
        attributeWithComposedAttributes?: readonly string[]
    ) {
        const initializedAttributes = {} as T;
        const initializedCustomAttributes = {} as { [key: string]: unknown };
        if (attributeWithComposedAttributes === undefined) {
            attributeWithComposedAttributes = attributeNames;
        }

        for (const attribute in params) {
            if (attributeNames.includes(attribute)) {
                // If the key exists in the attributes object, assign the value to the initialized attributes
                initializedAttributes[attribute] = params[attribute];
            } else if (!attributeWithComposedAttributes.includes(attribute)) {
                // ignore composed attributes, dealt with later in the constructor
                // If the key doesn't exist in the attributes object, assign the value to the initialized custom attributes
                initializedCustomAttributes[attribute] = params[attribute];
            }
        }

        return { attributes: initializedAttributes, customAttributes: initializedCustomAttributes };
    }

    /**
     * Initializes a composed attribute of an object based on the provided parameters.
     *
     * @template U - The type of the unserialized attribute item.
     * @template P - The type of the attribute item parameters.
     * @param params - The parameters object containing the composed attribute values. Undefined array elements are allowed but will be ignored
     * @param unserializeFunc - The function used to unserialize each attribute item.
     * @param surveyObjectsRegistry - The survey objects registry.
     * @returns An array of unserialized attribute items.
     */
    static initializeComposedArrayAttributes<U, P>(
        attributeParams: Optional<P[]>,
        unserializeFunc: (params: P, surveyObjectsRegistry: SurveyObjectsRegistry) => U,
        surveyObjectsRegistry: SurveyObjectsRegistry
    ): U[] {
        const attributeList: U[] = [];

        if (attributeParams) {
            for (const itemParams of attributeParams) {
                if (itemParams !== undefined) {
                    // Unserialize each attribute item using the provided unserialize function
                    attributeList.push(unserializeFunc(itemParams, surveyObjectsRegistry));
                }
            }
        }

        return attributeList;
    }

    /**
     * Initializes a composed attribute of an object based on the provided parameters.
     *
     * @template U - The type of the unserialized attribute item.
     * @template P - The type of the attribute item parameters.
     * @param params - The composed parameters values.
     * @param unserializeFunc - The function used to unserialize each attribute item.
     * @param surveyObjectsRegistry - The survey objects registry.
     * @returns the unserialized attribute items.
     */
    static initializeComposedAttribute<U, P>(
        params: Optional<P>,
        unserializeFunc: (params: P, surveyObjectsRegistry: SurveyObjectsRegistry) => U,
        surveyObjectsRegistry: SurveyObjectsRegistry
    ): Optional<U> {
        if (params !== undefined) {
            return unserializeFunc(params, surveyObjectsRegistry);
        } else {
            return undefined;
        }
    }
}
