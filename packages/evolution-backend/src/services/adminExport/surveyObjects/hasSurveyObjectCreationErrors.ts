/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import type { ErrorsBySurveyObject } from 'evolution-common/lib/services/baseObjects/types';

/**
 * Whether at least one survey object of an interview could not be created.
 * All the errors of `errorsByObject` are checked, whether stored as a list
 * (singleton objects) or by object uuid (nested objects), so that object
 * types added later are checked too.
 *
 * @param {ErrorsBySurveyObject} errorsByObject - Creation errors of the survey objects of
 * an interview
 * @returns {boolean} True when at least one object has creation errors
 */
export const hasSurveyObjectCreationErrors = (errorsByObject: ErrorsBySurveyObject): boolean =>
    Object.values(errorsByObject).some((errors) => {
        if (Array.isArray(errors)) {
            return errors.length > 0;
        }
        // The other values are either errors by object uuid, or the uuid of a singleton object
        return (
            typeof errors === 'object' &&
            errors !== null &&
            Object.values(errors as { [uuid: string]: Error[] }).some((objectErrors) => objectErrors.length > 0)
        );
    });
