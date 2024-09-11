/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { Validations } from '../types/inputTypes';
import * as surveyHelperNew from 'evolution-common/lib/utils/helpers';

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
            // Check if the value is less than 0 and not 'na'
            validation: !(Number(value) >= 0) && value !== 'na',
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

// Verify if the value is a valid household size
export const householdSizeValidation: Validations = (value) => {
    return [
        {
            validation: isNaN(Number(value)) || !Number.isInteger(Number(value)),
            errorMessage: {
                fr: 'La taille du ménage est invalide.',
                en: 'Household size is invalid.'
            }
        },
        {
            validation: _isBlank(value),
            errorMessage: {
                fr: 'La taille du ménage est requise.',
                en: 'Household size is required.'
            }
        },
        {
            validation: Number(value) > 18,
            errorMessage: {
                fr: 'La taille du ménage doit être au maximum 18.',
                en: 'Household size must be at most 18.'
            }
        },
        {
            validation: Number(value) <= 0,
            errorMessage: {
                fr: 'La taille du ménage doit être au moins de 1 (vous devez vous inclure).',
                en: 'Household size must be at least 1 (you need to include yourself).'
            }
        }
    ];
};

// Verify if the value is a valid number of cars
export const carNumberValidation: Validations = (value, _customValue, interview, _path, _customPath) => {
    const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
    const maxCarsPerPerson = 3;

    return [
        {
            validation: isNaN(Number(value)) || !Number.isInteger(Number(value)),
            errorMessage: {
                fr: 'Le nombre de véhicules est invalide.',
                en: 'The number of vehicles is invalid.'
            }
        },
        {
            validation: _isBlank(value),
            errorMessage: {
                fr: 'Le nombre de véhicules est requis.',
                en: 'The number of vehicles is required.'
            }
        },
        {
            validation: Number(value) < 0,
            errorMessage: {
                fr: 'Le nombre de véhicules doit être au moins de 0.',
                en: 'The number of vehicles must be at least 0.'
            }
        },
        // The number of vehicles should not be 3 times greater than the number of people in the household
        {
            validation:
                !_isBlank(householdSize) &&
                !isNaN(Number(householdSize)) &&
                typeof householdSize === 'number' &&
                Number(value) / householdSize > maxCarsPerPerson,
            errorMessage: {
                fr: `Le nombre de véhicules doit être au maximum ${Number(householdSize) * maxCarsPerPerson} pour le nombre de personnes dans le ménage. Ne pas inclure les véhicules de collection ou les véhicules qui ne sont pas utilisés régulièrement.`,
                en: `The number of vehicles must be at most ${Number(householdSize) * maxCarsPerPerson} for the number of people in the household. Do not include collection vehicles or vehicles that are not used on a regular basis.`
            }
        },
        {
            validation: Number(value) > 13,
            errorMessage: {
                fr: 'Le nombre de véhicules doit être au maximum 13.',
                en: 'The number of vehicles must be at most 13.'
            }
        },
    ];
};

// Verify if the value is a valid number of bikes
export const bikeNumberValidation: Validations = (value, _customValue, interview, _path, _customPath) => {
    const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
    const maxBikesPerPerson = 5;

    return [
        {
            validation: isNaN(Number(value)) || !Number.isInteger(Number(value)),
            errorMessage: {
                fr: 'Le nombre de vélos est invalide.',
                en: 'The number of bikes is invalid.'
            }
        },
        {
            validation: _isBlank(value),
            errorMessage: {
                fr: 'Le nombre de vélos est requis.',
                en: 'The number of bikes is required.'
            }
        },
        {
            validation: Number(value) < 0,
            errorMessage: {
                fr: 'Le nombre de vélos doit être au moins de 0.',
                en: 'The number of bikes must be at least 0.'
            }
        },
        // The number of bikes should not be 5 times greater than the number of people in the household
        {
            validation:
                !_isBlank(householdSize) &&
                !isNaN(Number(householdSize)) &&
                typeof householdSize === 'number' &&
                (Number(value) / householdSize) > maxBikesPerPerson,
            errorMessage: {
                fr: `Le nombre de vélos doit être au maximum ${Number(householdSize) * maxBikesPerPerson} pour le nombre de personnes dans le ménage. Ne pas inclure les vélos de collection ou les vélos qui ne sont pas utilisés régulièrement.`,
                en: `The number of bikes must be at most ${Number(householdSize) * maxBikesPerPerson} for the number of people in the household. Do not include collection bikes or bikes that are not used on a regular basis.`
            }
        },
        {
            validation: Number(value) > 20,
            errorMessage: {
                fr: 'Le nombre de vélos doit être au maximum 20.',
                en: 'The number of bikes must be at most to 20.'
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
                !/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
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
            // To be valid in Canada, the postal code cannot have the letters D, F, I, O, Q, or U. It also cannot have W or Z in the first character.
            // See: https://en.wikipedia.org/wiki/Postal_codes_in_Canada#Number_of_possible_postal_codes
            // TODO: Instead of directly writing the validation, make a function that takes the country/region as input and returns the right regex.
            validation: !/^[abceghj-nprstvxy][0-9][abceghj-nprstv-z]( )?[0-9][abceghj-nprstv-z][0-9]\s*$/i.test(String(value)),
            errorMessage: {
                fr: 'Le code postal est invalide. Vous devez résider au Canada pour compléter ce questionnaire.',
                en: 'Postal code is invalid. You must live in Canada to fill this questionnaire.'
            }
        }
    ];
};
