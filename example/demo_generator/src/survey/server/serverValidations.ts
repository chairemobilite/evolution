import { validateAccessCode, registerAccessCodeValidationFunction } from 'evolution-backend/lib/services/accessCode';
import { getResponse } from 'evolution-common/lib/utils/helpers';

// Access code is 4 digits, dash, 4 digits
registerAccessCodeValidationFunction((accessCode) => accessCode.match(/^\d{4}-? *\d{4}$/gi) !== null);

export default {
    accessCode: {
        validations: [
            {
                validation: (value) => typeof value === 'string' && !validateAccessCode(value),
                errorMessage: {
                    fr: 'Code d\'accès invalide.',
                    en: 'Invalid access code.'
                }
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
                errorMessage: {
                    fr: 'Code d\'accès invalide.',
                    en: 'Invalid access code.'
                }
            }
        ]
    }
};
