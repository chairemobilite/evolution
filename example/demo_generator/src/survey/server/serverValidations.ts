/*
 * Copyright 2025, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { validateAccessCode } from 'evolution-backend/lib/services/accessCode';
import { getResponse } from 'evolution-common/lib/utils/helpers';

// The access code format is enforced by the configured `accessCodeFormat` (here the default '0000-0000').

export default {
    accessCode: {
        validations: [
            {
                validation: (value) => typeof value === 'string' && !validateAccessCode(value),
                errorMessage: { text: 'survey:errors:accessCodeInvalid' }
            }
        ]
    },
    confirmAccessCode: {
        validations: [
            {
                validation: (value, interview) => {
                    const accessCode = getResponse(interview, 'accessCode');
                    return typeof accessCode !== 'string' || !validateAccessCode(accessCode);
                },
                errorMessage: { text: 'survey:errors:accessCodeInvalid' }
            }
        ]
    }
};
