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
 * WorkPlace place class for person usual work locations
 * Represents the primary work location of a person
 * This is an alias of Place with custom validation display name
 */
export class WorkPlace extends Place {
    constructor(dirtyParams: ExtendedPlaceAttributes, surveyObjectsRegistry: SurveyObjectsRegistry) {
        super(dirtyParams, surveyObjectsRegistry);
    }

    /**
     * Creates a WorkPlace object from sanitized parameters
     * @param {ExtendedPlaceAttributes | SerializedExtendedPlaceAttributes} params - Sanitized place parameters
     * @returns {WorkPlace} New WorkPlace instance
     */
    static unserialize(
        params: ExtendedPlaceAttributes | SerializedExtendedPlaceAttributes,
        surveyObjectsRegistry: SurveyObjectsRegistry
    ): WorkPlace {
        const flattenedParams = SurveyObjectUnserializer.flattenSerializedData(params);
        return new WorkPlace(flattenedParams as ExtendedPlaceAttributes, surveyObjectsRegistry);
    }

    /**
     * Factory that validates input and creates a WorkPlace object
     * @param {Object} dirtyParams - Raw input parameters to validate
     * @returns {Result<WorkPlace>} Either a valid WorkPlace object or validation errors
     */
    static create(
        dirtyParams: { [key: string]: unknown },
        surveyObjectsRegistry: SurveyObjectsRegistry
    ): Result<WorkPlace> {
        const errors = Place.validateParams(dirtyParams, 'WorkPlace');
        const workPlace =
            errors.length === 0
                ? new WorkPlace(dirtyParams as ExtendedPlaceAttributes, surveyObjectsRegistry)
                : undefined;
        if (errors.length > 0) {
            return createErrors(errors);
        }
        return createOk(workPlace as WorkPlace);
    }
}
