/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Place, ExtendedPlaceAttributes, SerializedExtendedPlaceAttributes } from './Place';
import { Result, createErrors, createOk } from '../../types/Result.type';
import { SurveyObjectUnserializer } from './SurveyObjectUnserializer';
import { SurveyObjectsRegistry } from './SurveyObjectsRegistry';

/**
 * SchoolPlace place class for person usual school locations
 * Represents the primary school location of a person
 * This is an alias of Place with custom validation display name
 */
export class SchoolPlace extends Place {
    constructor(dirtyParams: ExtendedPlaceAttributes, surveyObjectsRegistry: SurveyObjectsRegistry) {
        super(dirtyParams, surveyObjectsRegistry);
    }

    /**
     * Creates a SchoolPlace object from sanitized parameters
     * @param {ExtendedPlaceAttributes | SerializedExtendedPlaceAttributes} params - Sanitized place parameters
     * @returns {SchoolPlace} New SchoolPlace instance
     */
    static unserialize(
        params: ExtendedPlaceAttributes | SerializedExtendedPlaceAttributes,
        surveyObjectsRegistry: SurveyObjectsRegistry
    ): SchoolPlace {
        const flattenedParams = SurveyObjectUnserializer.flattenSerializedData(params);
        return new SchoolPlace(flattenedParams as ExtendedPlaceAttributes, surveyObjectsRegistry);
    }

    /**
     * Factory that validates input and creates a SchoolPlace object
     * @param {Object} dirtyParams - Raw input parameters to validate
     * @returns {Result<SchoolPlace>} Either a valid SchoolPlace object or validation errors
     */
    static create(
        dirtyParams: { [key: string]: unknown },
        surveyObjectsRegistry: SurveyObjectsRegistry
    ): Result<SchoolPlace> {
        const errors = Place.validateParams(dirtyParams, 'SchoolPlace');
        const schoolPlace =
            errors.length === 0
                ? new SchoolPlace(dirtyParams as ExtendedPlaceAttributes, surveyObjectsRegistry)
                : undefined;
        if (errors.length > 0) {
            return createErrors(errors);
        }
        return createOk(schoolPlace as SchoolPlace);
    }
}
