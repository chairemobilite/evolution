/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { Validations } from "evolution-common/lib/services/surveyGenerator/types/inputTypes";

// Make sure the question is answered
export const requiredValidation: Validations = (value) => {
    return [
        {
            validation: _isBlank(value),
            errorMessage: {
                fr: 'Cette réponse est requise.',
                en: 'This answer is required.'
            }
        }
    ];
};

// Optional question
export const optionalValidation: Validations = () => [{ validation: false }];

// Make sure the InputRange is answered with a positive number
export const inputRangeValidation: Validations = (value) => {
    return [
        {
            validation: !(Number(value) >= 0),
            errorMessage: {
                fr: 'Cette réponse doit être d\'une valeur minimum de 0.',
                en: 'This answer must be a minimum value of 0.'
            }
        },
        {
            validation: _isBlank(value),
            errorMessage: {
                fr: 'Cette réponse est requise.',
                en: 'This answer is required.'
            }
        }
    ];
};

// Verify if the value is a valid age
export const ageValidation: Validations = (value) => {
    return [
        {
            validation: _isBlank(value),
            errorMessage: {
                fr: 'L\'âge est requis.',
                en: 'Age is required.'
            }
        },
        {
            validation: isNaN(Number(value)) || !Number.isInteger(Number(value)),
            errorMessage: {
                fr: 'L\'âge est invalide.',
                en: 'Age is invalid.'
            }
        },
        {
            validation: Number(value) < 0,
            errorMessage: {
                fr: 'L\'âge doit être au moins de 0.',
                en: 'Age must be at least 0.'
            }
        },
        {
            validation: Number(value) > 115,
            errorMessage: {
                fr: 'L\'âge est trop élevé, veuillez vérifier.',
                en: 'Age is too high, please validate.'
            }
        }
    ];
};

// Verify if the value is a valid email
export const emailValidation: Validations = (value) => {
    return [
        {
            validation: _isBlank(value),
            errorMessage: {
                fr: 'Le courriel est requis.',
                en: 'Email is required.'
            }
        },
        {
            validation:
                !_isBlank(value) &&
                !/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
                    String(value)
                ),
            errorMessage: {
                fr: 'Le courriel est invalide.',
                en: 'Email is invalid'
            }
        }
    ];
};

// Verify if the value is a valid phone number. This validation is optional.
export const phoneValidation: Validations = (value) => {
    return [
        {
            validation: !_isBlank(value) && !/^\d{3}[-\s]?\d{3}[-\s]?\d{4}$/.test(String(value)), // Accept 3 numbers, a dash space or nothing, 3 numbers, a dash space or nothing, 4 numbers
            errorMessage: {
                fr: 'Le numéro de téléphone est invalide. (ex.: 514-123-1234).',
                en: 'Phone number is invalid (e.g.: 514-123-1234).'
            }
        }
    ];
};

// Verify the value is a valid postal code
export const postalCodeValidation: Validations = (value) => {
    return [
        {
            validation: _isBlank(value),
            errorMessage: {
                fr: 'Veuillez spécifier votre code postal.',
                en: 'Please specify your postal code.'
            }
        },
        {
            validation: !/^[GHJKghjk][0-9][A-Za-z]( )?[0-9][A-Za-z][0-9]\s*$/.test(String(value)),
            errorMessage: {
                fr: 'Le code postal est invalide. Vous devez résider au Canada pour compléter ce questionnaire.',
                en: 'Postal code is invalid. You must live in Canada to fill this questionnaire.'
            }
        }
    ];
};
