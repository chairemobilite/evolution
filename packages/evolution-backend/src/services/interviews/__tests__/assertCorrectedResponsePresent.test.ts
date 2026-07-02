/*
 * Copyright Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import TrError from 'chaire-lib-common/lib/utils/TrError';
import type { InterviewAttributes } from 'evolution-common/lib/services/questionnaire/types';
import {
    assertCorrectedResponsePresent,
    CORRECTED_RESPONSE_REQUIRED_ERROR_CODE
} from '../assertCorrectedResponsePresent';

describe('assertCorrectedResponsePresent', () => {
    test.each([
        ['undefined', { corrected_response: undefined }],
        ['null', { corrected_response: null }],
        ['empty string', { corrected_response: '' }],
        ['empty object', { corrected_response: {} }]
    ])('throws when corrected_response is %s', (_label, interview) => {
        expect(() => assertCorrectedResponsePresent(interview as Pick<InterviewAttributes, 'corrected_response'>)).toThrow(
            TrError
        );

        try {
            assertCorrectedResponsePresent(interview as Pick<InterviewAttributes, 'corrected_response'>);
        } catch (error) {
            expect(TrError.isTrError(error)).toBe(true);
            const exportedError = (error as TrError).export();
            expect(exportedError.errorCode).toBe(CORRECTED_RESPONSE_REQUIRED_ERROR_CODE);
            expect(exportedError.localizedMessage).toBe('CorrectedResponseRequired');
        }
    });

    test('does not throw when corrected_response is populated', () => {
        expect(() =>
            assertCorrectedResponsePresent({
                corrected_response: { household: { persons: {} } }
            } as Pick<InterviewAttributes, 'corrected_response'>)
        ).not.toThrow();
    });
});
