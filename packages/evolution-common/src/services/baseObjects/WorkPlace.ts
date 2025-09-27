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
 * WorkPlace place class for household home locations
 * Represents the primary residence of a household
 * This is an alias of Place with custom validation display name
 */
export class WorkPlace extends Place {
    constructor(dirtyParams: { [key: string]: unknown }) {
        super(dirtyParams);
    }

    /**
     * Creates a WorkPlace object from sanitized parameters
     * @param {ExtendedPlaceAttributes | SerializedExtendedPlaceAttributes} params - Sanitized place parameters
     * @returns {WorkPlace} New WorkPlace instance
     */
    static unserialize(params: ExtendedPlaceAttributes | SerializedExtendedPlaceAttributes): WorkPlace {
        const flattenedParams = SurveyObjectUnserializer.flattenSerializedData(params);
        return new WorkPlace(flattenedParams as ExtendedPlaceAttributes);
    }

    /**
     * Factory that validates input and creates a WorkPlace object
     * @param {Object} dirtyParams - Raw input parameters to validate
     * @returns {Result<WorkPlace>} Either a valid WorkPlace object or validation errors
     */
    static create(dirtyParams: { [key: string]: unknown }): Result<WorkPlace> {
        const errors = Place.validateParams(dirtyParams, 'WorkPlace');
        const home = errors.length === 0 ? new WorkPlace(dirtyParams as ExtendedPlaceAttributes) : undefined;
        if (errors.length > 0) {
            return createErrors(errors);
        }
        return createOk(home as WorkPlace);
    }
}
