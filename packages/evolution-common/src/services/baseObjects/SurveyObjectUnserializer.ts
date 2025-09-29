/**
 * Utility for unserializing survey objects that come from serialized survey objects
 * with the structure: { _attributes: {...}, _customAttributes: {...}, ...otherProps }
 */
export class SurveyObjectUnserializer {
    /**
     * Flattens serialized data by concatenating _attributes and _customAttributes
     * Preserves composed objects (starting with _) at top level for constructors
     * @param backendData - Data from backend with _attributes and _customAttributes at top level
     * @returns Flattened params ready for the object constructor
     */
    static flattenSerializedData<T extends Record<string, unknown>>(
        backendData: T & { _attributes?: Record<string, unknown>; _customAttributes?: Record<string, unknown> }
    ): T {
        // Extract the nested structures
        const attributes = backendData._attributes || {};
        const customAttributes = backendData._customAttributes || {};

        // Remove the nested _attributes and _customAttributes from the top level
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _attributes: _, _customAttributes: __, ...otherProps } = backendData;

        // Simply concatenate everything - let the constructors handle composed objects
        const flattenedParams = {
            ...otherProps,
            ...attributes,
            ...customAttributes
        };

        return flattenedParams as unknown as T;
    }
}
