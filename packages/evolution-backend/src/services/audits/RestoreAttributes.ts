/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */

import { Optional } from 'evolution-common/lib/types/Optional.type';
import { AttributesToRestore } from './types';
import { CorrectedResponse, InterviewResponse } from 'evolution-common/lib/services/questionnaire/types';

/**
 * Restores specific attributes from the original responses that may have been overwritten during review (like interview language)
 * @param {AttributesToRestore} attributesToRestore - Configuration of attributes to restore by object type
 * @param {string} surveyObjectType - The type of survey object to restore attributes for
 * @param {string | undefined} surveyObjectPath - The path to the survey object to restore attributes for (excluding the root response/corrected_response)
 * @param {CorrectedResponse} correctedResponse - The interview responses being processed (possibly corrected)
 * @param {InterviewResponse} originalResponse - The original interview responses from the participant
 * @returns {CorrectedResponse} The corrected response with the restored attributes
 */
export function restoreAttributes(
    attributesToRestore: AttributesToRestore,
    surveyObjectType: string,
    surveyObjectPath: Optional<string>,
    correctedResponse: CorrectedResponse,
    originalResponse: InterviewResponse
): CorrectedResponse {
    if (attributesToRestore && attributesToRestore[surveyObjectType]) {
        for (const attribute of attributesToRestore[surveyObjectType]) {
            if (surveyObjectPath) {
                correctedResponse[surveyObjectPath][attribute] = originalResponse[surveyObjectPath][attribute];
            } else {
                correctedResponse[attribute] = originalResponse[attribute];
            }
        }
        return correctedResponse;
    }
    return correctedResponse;
}
