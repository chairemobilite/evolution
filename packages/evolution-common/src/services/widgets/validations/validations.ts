/*
 * Copyright 2024, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';
import { type ValidationFunction } from '../../questionnaire/types';
import projectConfig from '../../../config/project.config';
import { getAccessCodeFormat, matchesAccessCodeFormat } from '../../accessCode/accessCodeFormats';

/**
 * Make sure the question is answered.
 *
 * @see {@link ValidationFunction}
 */
export const requiredValidation: ValidationFunction = (value) => {
    return [
        {
            validation: _isBlank(value),
            errorMessage: (t) => t('survey:errors:answerRequired')
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
            errorMessage: (t) => t('survey:errors:inputRangeMinZero')
        },
        {
            validation: _isBlank(value),
            errorMessage: (t) => t('survey:errors:answerRequired')
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
            errorMessage: (t) => t('survey:errors:householdSizeInvalid')
        },
        {
            validation: _isBlank(value),
            errorMessage: (t) => t('survey:errors:householdSizeRequired')
        },
        {
            validation: Number(value) > projectConfig.maxHouseholdSize,
            errorMessage: (t) => t('survey:errors:householdSizeOverMax', { max: projectConfig.maxHouseholdSize })
        },
        {
            validation: Number(value) <= 0,
            errorMessage: (t) => t('survey:errors:householdSizeMinOne')
        }
    ];
};

export {
    carNumberValidation,
    bicycleNumberValidation,
    twoWheelNumberValidation
} from './householdAssetCountValidation';

/**
 * Verify if the value is a valid age.
 *
 * The age must be an integer between 0 and {@link projectConfig.ages.maxPersonAge}.
 *
 * @see {@link ValidationFunction}
 */
export const ageValidation: ValidationFunction = (value) => {
    return [
        {
            validation: _isBlank(value),
            errorMessage: (t) => t('survey:errors:ageRequired')
        },
        {
            validation: isNaN(Number(value)) || !Number.isInteger(Number(value)),
            errorMessage: (t) => t('survey:errors:ageInvalid')
        },
        {
            validation: Number(value) < 0,
            errorMessage: (t) => t('survey:errors:ageMinZero')
        },
        {
            validation: Number(value) > projectConfig.ages.maxPersonAge,
            errorMessage: (t) => t('survey:errors:ageTooHigh')
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
            errorMessage: (t) => t('survey:errors:emailRequired')
        },
        {
            validation:
                !_isBlank(value) &&
                !/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(
                    String(value)
                ),
            errorMessage: (t) => t('survey:errors:emailInvalid')
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

export const accessCodeValidation: ValidationFunction = (value) => {
    return [
        {
            validation: _isBlank(value),
            errorMessage: (t) => t('survey:errors:accessCodeRequired')
        },
        {
            validation: !matchesAccessCodeFormat(String(value), getAccessCodeFormat(projectConfig.accessCodeFormat)),
            errorMessage: (t) => t('survey:errors:accessCodeInvalid')
        }
    ];
};
