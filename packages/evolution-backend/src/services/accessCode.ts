/*
 * Copyright 2022, Polytechnique Montreal and contributors
 *
 * This file is licensed under the MIT License.
 * License text available at https://opensource.org/licenses/MIT
 */
import { _isBlank } from 'chaire-lib-common/lib/utils/LodashExtensions';

export const oneDigitHashSum = 0;

// By default, all access codes are valid
let accessCodeValidationFunction = (accessCode: string): boolean => !_isBlank(accessCode);

/**
 * Register the access code validation function for a project
 * @param isAccessCodeValid The function to validate the access code. It takes
 * an accessCode as parameter and returns whether it is valid or not.
 */
export const registerAccessCodeValidationFunction = (isAccessCodeValid: (accessCode: string) => boolean) => {
    accessCodeValidationFunction = isAccessCodeValid;
};

export const validateAccessCode = (accessCode: string): boolean => {
    try {
        return accessCodeValidationFunction(accessCode);
    } catch (e) {
        return false;
    }
};
