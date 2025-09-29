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
 * Home place class for household home locations
 * Represents the primary residence of a household
 * This is an alias of Place with custom validation display name
 * uuid for home must be equal to the uuid of the household and the uuid of the interview
 */
export class Home extends Place {
    constructor(dirtyParams: ExtendedPlaceAttributes, surveyObjectsRegistry: SurveyObjectsRegistry) {
        super(dirtyParams, surveyObjectsRegistry);
    }

    /**
     * Creates a Home object from sanitized parameters
     * @param {ExtendedPlaceAttributes | SerializedExtendedPlaceAttributes} params - Sanitized place parameters
     * @returns {Home} New Place instance
     */
    static unserialize(
        params: ExtendedPlaceAttributes | SerializedExtendedPlaceAttributes,
        surveyObjectsRegistry: SurveyObjectsRegistry
    ): Home {
        const flattenedParams = SurveyObjectUnserializer.flattenSerializedData(params);
        return new Home(flattenedParams as ExtendedPlaceAttributes, surveyObjectsRegistry);
    }

    /**
     * Factory that validates input and creates a Home object
     * @param {Object} dirtyParams - Raw input parameters to validate
     * @returns {Result<Home>} Either a valid Home object or validation errors
     */
    static create(dirtyParams: { [key: string]: unknown }, surveyObjectsRegistry: SurveyObjectsRegistry): Result<Home> {
        const errors = Place.validateParams(dirtyParams, 'Home');
        const home =
            errors.length === 0 ? new Home(dirtyParams as ExtendedPlaceAttributes, surveyObjectsRegistry) : undefined;
        if (errors.length > 0) {
            return createErrors(errors);
        }
        return createOk(home as Home);
    }
}
