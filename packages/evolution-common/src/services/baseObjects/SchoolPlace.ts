/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Place, ExtendedPlaceAttributes, SerializedExtendedPlaceAttributes } from './Place';
import { Result, createErrors, createOk } from '../../types/Result.type';
import { SurveyObjectUnserializer } from './SurveyObjectUnserializer';

/**
 * SchoolPlace place class for household home locations
 * Represents the primary residence of a household
 * This is an alias of Place with custom validation display name
 */
export class SchoolPlace extends Place {
    constructor(dirtyParams: { [key: string]: unknown }) {
        super(dirtyParams);
    }

    /**
     * Creates a SchoolPlace object from sanitized parameters
     * @param {ExtendedPlaceAttributes | SerializedExtendedPlaceAttributes} params - Sanitized place parameters
     * @returns {SchoolPlace} New SchoolPlace instance
     */
    static unserialize(params: ExtendedPlaceAttributes | SerializedExtendedPlaceAttributes): SchoolPlace {
        const flattenedParams = SurveyObjectUnserializer.flattenSerializedData(params);
        return new SchoolPlace(flattenedParams as ExtendedPlaceAttributes);
    }

    /**
     * Factory that validates input and creates a SchoolPlace object
     * @param {Object} dirtyParams - Raw input parameters to validate
     * @returns {Result<SchoolPlace>} Either a valid SchoolPlace object or validation errors
     */
    static create(dirtyParams: { [key: string]: unknown }): Result<SchoolPlace> {
        const errors = Place.validateParams(dirtyParams, 'SchoolPlace');
        const home = errors.length === 0 ? new SchoolPlace(dirtyParams as ExtendedPlaceAttributes) : undefined;
        if (errors.length > 0) {
            return createErrors(errors);
        }
        return createOk(home as SchoolPlace);
    }
}
