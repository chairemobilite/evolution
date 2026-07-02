/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import TrError from 'chaire-lib-common/lib/utils/TrError';
import type { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';

/** Error code when survey objects and audits are requested without a corrected response. */
export const CORRECTED_RESPONSE_REQUIRED_ERROR_CODE = 'SRVINT0001' as const;

/**
 * Ensures an interview has a populated corrected response before survey-object work.
 * @param interview - Interview whose corrected response must be present
 * @throws TrError with {@link CORRECTED_RESPONSE_REQUIRED_ERROR_CODE} when blank
 */
export const assertCorrectedResponsePresent = (interview: Pick<InterviewAttributes, 'corrected_response'>): void => {
    if (_isBlank(interview.corrected_response)) {
        throw new TrError(
            'Corrected response is required to create survey objects and audits',
            CORRECTED_RESPONSE_REQUIRED_ERROR_CODE,
            'CorrectedResponseRequired'
        );
    }
};
