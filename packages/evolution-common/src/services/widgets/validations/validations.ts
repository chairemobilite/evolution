/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { type ValidationFunction } from '../../questionnaire/types';
import * as surveyHelperNew from '../../../utils/helpers';
import projectConfig from '../../../config/project.config';

/**
 * Make sure the question is answered.
 *
 * @see {@link ValidationFunction}
 */
export const requiredValidation: ValidationFunction = (value) => {
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

/**
 * Optional question.
 *
 * @see {@link ValidationFunction}
 */
export const optionalValidation: ValidationFunction = () => [];

/**
 * Make sure the InputRange is answered with a positive number.
 *
 * The value must be a positive number or 'na'.
 *
 * @see {@link ValidationFunction}
 */
export const inputRangeValidation: ValidationFunction = (value) => {
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

/**
 * Verify if the value is a valid household size.
 *
 * The household size must be an integer between 1 and 18.
 *
 * @see {@link ValidationFunction}
 */
export const householdSizeValidation: ValidationFunction = (value) => {
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

/**
 * Verify if the value is a valid number of cars.
 *
 * The number of cars must be an integer between 0 and 13.
 * The number of cars should not be more than 3 times the number of people in the household.
 *
 * Required interview.response fields: 'household.size'
 *
 * @see {@link ValidationFunction}
 */
export const carNumberValidation: ValidationFunction = (value, _customValue, interview, _path, _customPath) => {
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
        }
    ];
};

/**
 * Verify if the value is a valid number of bicycles.
 *
 * The number of bicycles must be an integer between 0 and 20.
 * The number of bicycles should not be more than 5 times the number of people in the household.
 *
 * Required interview.response fields: 'household.size'
 *
 * @see {@link ValidationFunction}
 */
export const bicycleNumberValidation: ValidationFunction = (value, _customValue, interview, _path, _customPath) => {
    const householdSize = surveyHelperNew.getResponse(interview, 'household.size', null);
    const maxBicyclesPerPerson = 5;

    return [
        {
            validation: isNaN(Number(value)) || !Number.isInteger(Number(value)),
            errorMessage: {
                fr: 'Le nombre de vélos est invalide.',
                en: 'The number of bicycles is invalid.'
            }
        },
        {
            validation: _isBlank(value),
            errorMessage: {
                fr: 'Le nombre de vélos est requis.',
                en: 'The number of bicycles is required.'
            }
        },
        {
            validation: Number(value) < 0,
            errorMessage: {
                fr: 'Le nombre de vélos doit être au moins de 0.',
                en: 'The number of bicycles must be at least 0.'
            }
        },
        // The number of bicycles should not be 5 times greater than the number of people in the household
        {
            validation:
                !_isBlank(householdSize) &&
                !isNaN(Number(householdSize)) &&
                typeof householdSize === 'number' &&
                Number(value) / householdSize > maxBicyclesPerPerson,
            errorMessage: {
                fr: `Le nombre de vélos doit être au maximum ${Number(householdSize) * maxBicyclesPerPerson} pour le nombre de personnes dans le ménage. Ne pas inclure les vélos de collection ou les vélos qui ne sont pas utilisés régulièrement.`,
                en: `The number of bicycles must be at most ${Number(householdSize) * maxBicyclesPerPerson} for the number of people in the household. Do not include collection bicycles or bicycles that are not used on a regular basis.`
            }
        },
        {
            validation: Number(value) > 20,
            errorMessage: {
                fr: 'Le nombre de vélos doit être au maximum 20.',
                en: 'The number of bicycles must be at most to 20.'
            }
        }
    ];
};

/**
 * Verify if the value is a valid age.
 *
 * The age must be an integer between 0 and 115.
 *
 * @see {@link ValidationFunction}
 */
export const ageValidation: ValidationFunction = (value) => {
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

/**
 * Verify if the value is a valid email.
 *
 * The email must be in a valid email format.
 *
 * @see {@link ValidationFunction}
 */
export const emailValidation: ValidationFunction = (value) => {
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

// Regexes developed from discussion with AI
const northAmericanPhoneValidationRegex =
    /^(?:(?:\+1[-.\s]?|(?!1)?)?(?:\(?([2-9][0-9]{2})\)?[-.\s]?)?([0-9]{3})[-.\s]?([0-9]{4}))$/;
const internationalNotNaPhoneValidationRegex = /^(?:\+(?:[\s\-.()]*\d){10,15}[\s\-.()]*$)/;
const validateNorthAmericanOrInternationalPhoneNumber = (phoneNumber: string) =>
    northAmericanPhoneValidationRegex.test(phoneNumber) || internationalNotNaPhoneValidationRegex.test(phoneNumber);
/**
 * Verify if the value is a valid phone number. This validation is optional.
 * Note if only validates the format, not the content.
 *
 * The phone number must be in the format 123-456-7890.
 *
 * TODO This validation is from a north american perspective, ie numbers in
 * north america do not need the country code, other international numbers do.
 * We should support more localizations in the future.
 *
 * @see {@link ValidationFunction}
 */
export const phoneValidation: ValidationFunction = (value) => {
    return [
        {
            // Trim and remove all whitespace characters (spaces, tabs, non-breaking spaces, etc.) before validating
            validation:
                !_isBlank(value) && !validateNorthAmericanOrInternationalPhoneNumber(String(value).replace(/\s+/g, '')),
            errorMessage: (t) => t('survey:errors:phoneNumberInvalid')
        }
    ];
};

// To be valid in Canada, the postal code cannot have the letters D, F, I, O, Q, or U. It also cannot have W or Z in the first character.
// See: https://en.wikipedia.org/wiki/Postal_codes_in_Canada#Number_of_possible_postal_codes
const canadianPostalCodeRegex = /^[abceghj-nprstvxy][0-9][abceghj-nprstv-z]( )?[0-9][abceghj-nprstv-z][0-9]\s*$/i;
// Quebec postal codes starts with 'G', 'H' or 'J'. Some 'K' also exist in Gatineau. See https://www150.statcan.gc.ca/n1/pub/92-195-x/2011001/other-autre/pc-cp/tbl/tbl9-eng.htm
const quebecPostalCodeRegex = /^[ghjk][0-9][abceghj-nprstv-z]( )?[0-9][abceghj-nprstv-z][0-9]\s*$/i;
// Other region postal codes can be any string
const otherPostalCodeRegex = /^.*$/;
/**
 * Get the appropriate postal code regex based on the configured region.
 *
 * TODO Support more countries and regions
 *
 * @returns The regular expression for validating postal codes in the configured
 * region
 */
export const getPostalCodeRegex = (): RegExp => {
    switch (projectConfig.postalCodeRegion) {
    case 'canada':
        return canadianPostalCodeRegex;
    case 'quebec':
        return quebecPostalCodeRegex;
    case 'other':
    default:
        return otherPostalCodeRegex;
    }
};

/**
 * Verify the value is a valid postal code.
 *
 * The postal code must be in a valid Canadian format.
 *
 * @see {@link ValidationFunction}
 */
export const postalCodeValidation: ValidationFunction = (value) => {
    return [
        {
            validation: _isBlank(value),
            errorMessage: (t) => t('survey:errors:postalCodeRequired')
        },
        {
            validation: !getPostalCodeRegex().test(String(value)),
            errorMessage: (t) =>
                t('survey:errors:postalCodeInvalid', {
                    context: projectConfig.postalCodeRegion
                })
        }
    ];
};

// Eight digits access code validation regex
const eightDigitsAccessCodeValidation = /^\d{4}-? *\d{4}$/i;
// FIXME Support more access code formats in the future. For now, only one format is supported if using this validation function
const getAccessCodeRegex = () => eightDigitsAccessCodeValidation;
export const accessCodeValidation: ValidationFunction = (value) => {
    return [
        {
            validation: _isBlank(value),
            errorMessage: (t) => t('survey:errors:accessCodeRequired')
        },
        {
            validation: !getAccessCodeRegex().test(String(value)),
            errorMessage: (t) => t('survey:errors:accessCodeInvalid')
        }
    ];
};
